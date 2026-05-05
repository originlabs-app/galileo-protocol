// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IGalileoCompliance} from "../interfaces/compliance/IGalileoCompliance.sol";
import {IComplianceModule} from "../interfaces/compliance/IComplianceModule.sol";

/**
 * @title GalileoCompliance
 * @author Galileo Protocol Contributors
 * @notice Standalone modular compliance implementation for the Galileo luxury ecosystem
 * @dev Implements IGalileoCompliance (which extends IModularCompliance) without inheriting
 *      the T-REX ModularCompliance to avoid upgradeable pattern conflicts.
 *
 *      Key capabilities:
 *      - Token binding (single token per compliance)
 *      - Ordered module management (up to 25 modules)
 *      - Batch compliance checks
 *      - Detailed failure reasons
 *      - Emergency pause
 *      - Module type introspection
 */
contract GalileoCompliance is IGalileoCompliance, Ownable {
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════

    uint256 public constant MAX_MODULES = 25;
    uint256 private constant _MAX_BATCH = 100;

    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    /// @dev The single token bound to this compliance
    address private _tokenBound;

    /// @dev Ordered list of compliance modules
    address[] private _modules;

    /// @dev O(1) membership check
    mapping(address => bool) private _moduleSet;

    /// @dev Address of the identity registry
    address private _identityRegistryAddress;

    /// @dev Emergency pause state
    bool private _paused;

    // ═══════════════════════════════════════════════════════════════════
    // ADDITIONAL ERRORS (beyond interface)
    // ═══════════════════════════════════════════════════════════════════

    error NotBoundToken(address caller);
    error AlreadyBound(address token);
    error TokenNotBound();
    error ModuleLimitReached(uint256 maximum);
    error ContractPaused();
    error ZeroAddress();
    error ModuleCallFailed(address module, bytes4 selector);
    error IndexOutOfBounds(uint256 index, uint256 length);

    // ═══════════════════════════════════════════════════════════════════
    // ADDITIONAL EVENTS (Pause)
    // ═══════════════════════════════════════════════════════════════════

    event CompliancePaused(address indexed by);
    event ComplianceUnpaused(address indexed by);
    event IdentityRegistrySet(address indexed registry);

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Deploy the compliance contract
     * @param admin_ Address granted owner role
     * @param identityRegistry_ Address of the identity registry (can be zero if not needed)
     */
    constructor(address admin_, address identityRegistry_) {
        if (admin_ == address(0)) revert ZeroAddress();
        _transferOwnership(admin_);
        _identityRegistryAddress = identityRegistry_;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyBoundToken() {
        if (msg.sender != _tokenBound) revert NotBoundToken(msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (_paused) revert ContractPaused();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    // TOKEN BINDING
    // ═══════════════════════════════════════════════════════════════════

    function bindToken(address _token) external override onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        if (_tokenBound != address(0)) revert AlreadyBound(_tokenBound);
        _tokenBound = _token;
        emit TokenBound(_token);
    }

    function unbindToken(address _token) external override onlyOwner {
        if (_tokenBound != _token) revert TokenNotBound();
        _tokenBound = address(0);
        emit TokenUnbound(_token);
    }

    function getTokenBound() external view override returns (address) {
        return _tokenBound;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function addModule(address _module) external override onlyOwner {
        if (_module == address(0)) revert ZeroAddress();
        if (_moduleSet[_module]) revert ModuleAlreadyAdded(_module);
        if (_modules.length >= MAX_MODULES) revert ModuleLimitReached(MAX_MODULES);

        IComplianceModule(_module).bindCompliance(address(this));
        _modules.push(_module);
        _moduleSet[_module] = true;

        bytes4 mType = IComplianceModule(_module).moduleType();
        string memory mName = IComplianceModule(_module).name();

        // Emit both IModularCompliance and IGalileoCompliance events
        emit ModuleAdded(_module);
        emit ModuleAdded(_module, mType, mName);
    }

    function removeModule(address _module) external override onlyOwner {
        if (!_moduleSet[_module]) revert ModuleNotFound(_module);

        bytes4 mType = IComplianceModule(_module).moduleType();

        IComplianceModule(_module).unbindCompliance(address(this));

        address[] memory oldOrder = _modules;

        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            if (_modules[i] == _module) {
                // Shift all subsequent elements left by 1 to preserve order
                for (uint256 j = i; j < len - 1; j++) {
                    _modules[j] = _modules[j + 1];
                }
                _modules.pop();
                break;
            }
        }
        _moduleSet[_module] = false;

        emit ModuleRemoved(_module);
        emit ModuleRemoved(_module, mType);
        if (len > 1) emit ModuleOrderChanged(oldOrder, _modules);
    }

    function isModuleBound(address _module) external view override returns (bool) {
        return _moduleSet[_module];
    }

    function getModules() external view override returns (address[] memory) {
        return _modules;
    }

    function callModuleFunction(bytes calldata callData, address _module) external override onlyOwner {
        if (!_moduleSet[_module]) revert ModuleNotFound(_module);
        bytes4 selector = callData.length >= 4 ? bytes4(callData[:4]) : bytes4(0);
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = _module.call(callData);
        if (!success) revert ModuleCallFailed(_module, selector);
        emit ModuleInteraction(_module, selector);
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPLIANCE HOOKS (only bound token)
    // ═══════════════════════════════════════════════════════════════════

    function transferred(address _from, address _to, uint256 _amount) external override onlyBoundToken {
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            IComplianceModule(_modules[i]).moduleTransferAction(_from, _to, _amount, address(this));
        }
    }

    function created(address _to, uint256 _amount) external override onlyBoundToken {
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            IComplianceModule(_modules[i]).moduleMintAction(_to, _amount, address(this));
        }
    }

    function destroyed(address _from, uint256 _amount) external override onlyBoundToken {
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            IComplianceModule(_modules[i]).moduleBurnAction(_from, _amount, address(this));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPLIANCE CHECKS
    // ═══════════════════════════════════════════════════════════════════

    function canTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external view override returns (bool) {
        if (_paused) return false;
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            if (!IComplianceModule(_modules[i]).moduleCheck(_from, _to, _amount, address(this))) {
                return false;
            }
        }
        return true;
    }

    function canTransferWithReason(
        address _from,
        address _to,
        uint256 _amount
    ) external view override returns (bool allowed, string memory reason, address failingModule) {
        if (_paused) {
            return (false, "Compliance paused", address(0));
        }
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            if (!IComplianceModule(_modules[i]).moduleCheck(_from, _to, _amount, address(this))) {
                string memory mName = "";
                try IComplianceModule(_modules[i]).name() returns (string memory n) {
                    mName = n;
                } catch {} // solhint-disable-line no-empty-blocks
                return (false, string(abi.encodePacked(mName, ": transfer not compliant")), _modules[i]);
            }
        }
        return (true, "", address(0));
    }

    function canTransferBatch(
        address[] calldata _from,
        address[] calldata _to,
        uint256[] calldata _amounts
    ) external view override returns (bool[] memory results) {
        if (_from.length != _to.length || _from.length != _amounts.length) {
            revert BatchArrayLengthMismatch(_from.length, _to.length, _amounts.length);
        }
        if (_from.length > _MAX_BATCH) revert BatchSizeTooLarge(_from.length, _MAX_BATCH);

        results = new bool[](_from.length);
        uint256 len = _modules.length;
        bool paused = _paused;

        for (uint256 i = 0; i < _from.length; i++) {
            if (paused) {
                results[i] = false;
                continue;
            }
            bool ok = true;
            for (uint256 j = 0; j < len; j++) {
                if (!IComplianceModule(_modules[j]).moduleCheck(_from[i], _to[i], _amounts[i], address(this))) {
                    ok = false;
                    break;
                }
            }
            results[i] = ok;
        }
    }

    function canTransferBatchWithReasons(
        address[] calldata _from,
        address[] calldata _to,
        uint256[] calldata _amounts
    ) external view override returns (
        bool[] memory allowed,
        string[] memory reasons,
        address[] memory failingModules
    ) {
        if (_from.length != _to.length || _from.length != _amounts.length) {
            revert BatchArrayLengthMismatch(_from.length, _to.length, _amounts.length);
        }
        if (_from.length > _MAX_BATCH) revert BatchSizeTooLarge(_from.length, _MAX_BATCH);

        allowed = new bool[](_from.length);
        reasons = new string[](_from.length);
        failingModules = new address[](_from.length);

        uint256 mLen = _modules.length;
        bool paused = _paused;

        for (uint256 i = 0; i < _from.length; i++) {
            if (paused) {
                allowed[i] = false;
                reasons[i] = "Compliance paused";
                failingModules[i] = address(0);
                continue;
            }
            bool ok = true;
            for (uint256 j = 0; j < mLen; j++) {
                if (!IComplianceModule(_modules[j]).moduleCheck(_from[i], _to[i], _amounts[i], address(this))) {
                    string memory mName = "";
                    try IComplianceModule(_modules[j]).name() returns (string memory n) {
                        mName = n;
                    } catch {} // solhint-disable-line no-empty-blocks
                    allowed[i] = false;
                    reasons[i] = string(abi.encodePacked(mName, ": transfer not compliant"));
                    failingModules[i] = _modules[j];
                    ok = false;
                    break;
                }
            }
            if (ok) {
                allowed[i] = true;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE INTROSPECTION
    // ═══════════════════════════════════════════════════════════════════

    function getModulesByType(bytes4 moduleType_) external view override returns (address[] memory) {
        uint256 count = 0;
        uint256 len = _modules.length;
        for (uint256 i = 0; i < len; i++) {
            try IComplianceModule(_modules[i]).moduleType() returns (bytes4 t) {
                if (t == moduleType_) count++;
            } catch {} // solhint-disable-line no-empty-blocks
        }
        address[] memory result = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < len; i++) {
            try IComplianceModule(_modules[i]).moduleType() returns (bytes4 t) {
                if (t == moduleType_) result[idx++] = _modules[i];
            } catch {} // solhint-disable-line no-empty-blocks
        }
        return result;
    }

    function isModuleEnabled(address module_) external view override returns (bool) {
        return _moduleSet[module_];
    }

    function moduleCount() external view override returns (uint256) {
        return _modules.length;
    }

    function getModuleAt(uint256 index) external view override returns (
        address module,
        bytes4 moduleType_,
        string memory moduleName
    ) {
        if (index >= _modules.length) revert IndexOutOfBounds(index, _modules.length);
        module = _modules[index];
        try IComplianceModule(module).moduleType() returns (bytes4 t) {
            moduleType_ = t;
        } catch {} // solhint-disable-line no-empty-blocks
        try IComplianceModule(module).name() returns (string memory n) {
            moduleName = n;
        } catch {} // solhint-disable-line no-empty-blocks
    }

    function getActiveModuleTypes() external view override returns (bytes4[] memory) {
        uint256 len = _modules.length;
        bytes4[] memory allTypes = new bytes4[](len);
        uint256 count = 0;

        for (uint256 i = 0; i < len; i++) {
            bytes4 t;
            try IComplianceModule(_modules[i]).moduleType() returns (bytes4 mt) {
                t = mt;
            } catch {
                continue;
            }
            // Check if already seen
            bool seen = false;
            for (uint256 j = 0; j < count; j++) {
                if (allTypes[j] == t) {
                    seen = true;
                    break;
                }
            }
            if (!seen) allTypes[count++] = t;
        }

        bytes4[] memory result = new bytes4[](count);
        for (uint256 i = 0; i < count; i++) result[i] = allTypes[i];
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE ORDERING
    // ═══════════════════════════════════════════════════════════════════

    function setModuleOrder(address[] calldata _newOrder) external override onlyOwner {
        uint256 len = _newOrder.length;
        if (len != _modules.length) revert InvalidModuleOrder(len, _modules.length);

        // Verify all new-order modules are currently bound (and no duplicates)
        for (uint256 i = 0; i < len; i++) {
            if (!_moduleSet[_newOrder[i]]) revert ModuleNotFound(_newOrder[i]);
            // Check for duplicate in newOrder
            for (uint256 j = 0; j < i; j++) {
                if (_newOrder[j] == _newOrder[i]) revert InvalidModuleOrder(i, len - 1);
            }
        }

        address[] memory oldOrder = _modules;
        for (uint256 i = 0; i < len; i++) {
            _modules[i] = _newOrder[i];
        }

        emit ModuleOrderChanged(oldOrder, _newOrder);
    }

    function getModuleOrder() external view override returns (address[] memory) {
        return _modules;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function maxBatchSize() external pure override returns (uint256) {
        return _MAX_BATCH;
    }

    function isPaused() external view override returns (bool) {
        return _paused;
    }

    function identityRegistry() external view override returns (address) {
        return _identityRegistryAddress;
    }

    function pause() external onlyOwner {
        _paused = true;
        emit CompliancePaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _paused = false;
        emit ComplianceUnpaused(msg.sender);
    }

    function setIdentityRegistry(address registry_) external onlyOwner {
        _identityRegistryAddress = registry_;
        emit IdentityRegistrySet(registry_);
    }

}
