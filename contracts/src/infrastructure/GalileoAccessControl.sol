// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IGalileoAccessControl} from "../interfaces/infrastructure/IAccessControl.sol";
import {IIdentityRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistry.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";

/**
 * @title GalileoAccessControl
 * @author Galileo Protocol Contributors
 * @notice RBAC implementation with ONCHAINID integration, two-phase grants,
 *         role suspension, and emergency access for the Galileo ecosystem.
 * @dev Extends OpenZeppelin AccessControlEnumerable with identity-aware features.
 *      Implements IGalileoAccessControl (GSPEC-INFRA-001).
 */
contract GalileoAccessControl is AccessControlEnumerable, IGalileoAccessControl {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // ─────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────

    /// @notice Maximum duration for emergency access grants (7 days)
    uint256 public constant MAX_EMERGENCY_DURATION = 7 days;

    // ─────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────

    /// @dev Address of the identity registry used for claim verification
    address private _identityRegistryAddress;

    /// @dev role => required claim topic (0 = no requirement)
    mapping(bytes32 => uint256) private _roleClaimRequirements;

    /// @dev _keyFor(role, account) => suspended
    mapping(bytes32 => bool) private _suspensions;

    /// @dev _keyFor(role, account) => emergency access expiry timestamp
    mapping(bytes32 => uint256) private _emergencyExpiry;

    /// @dev _keyFor(role, account) => pending grant request
    mapping(bytes32 => GrantRequest) private _grantRequests;

    /// @dev role => time delay in seconds for two-phase grants (0 = disabled)
    mapping(bytes32 => uint256) private _roleGrantDelays;

    /// @dev All role identifiers ever used, for enumeration
    EnumerableSet.Bytes32Set private _knownRoles;

    struct GrantRequest {
        address requestedBy;
        uint256 requestedAt;
        uint256 canConfirmAt;
    }

    // ─────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────

    /**
     * @param admin Address that receives DEFAULT_ADMIN_ROLE
     */
    constructor(address admin) {
        require(admin != address(0), "GalileoAccessControl: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Register all predefined roles so enumeration works before any grants
        _knownRoles.add(DEFAULT_ADMIN_ROLE);
        _knownRoles.add(BRAND_ADMIN_ROLE());
        _knownRoles.add(OPERATOR_ROLE());
        _knownRoles.add(AUDITOR_ROLE());
        _knownRoles.add(REGULATOR_ROLE());
        _knownRoles.add(SERVICE_CENTER_ADMIN_ROLE());
    }

    // ─────────────────────────────────────────────────────────────────
    // Role constants  (interface: external pure)
    // ─────────────────────────────────────────────────────────────────

    function BRAND_ADMIN_ROLE() public pure override returns (bytes32) {
        return keccak256("BRAND_ADMIN_ROLE");
    }

    function OPERATOR_ROLE() public pure override returns (bytes32) {
        return keccak256("OPERATOR_ROLE");
    }

    function AUDITOR_ROLE() public pure override returns (bytes32) {
        return keccak256("AUDITOR_ROLE");
    }

    function REGULATOR_ROLE() public pure override returns (bytes32) {
        return keccak256("REGULATOR_ROLE");
    }

    function SERVICE_CENTER_ADMIN_ROLE() public pure override returns (bytes32) {
        return keccak256("SERVICE_CENTER_ADMIN_ROLE");
    }

    // ─────────────────────────────────────────────────────────────────
    // Identity registry management
    // ─────────────────────────────────────────────────────────────────

    /// @inheritdoc IGalileoAccessControl
    function setIdentityRegistry(address identityRegistry) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(identityRegistry != address(0), "GalileoAccessControl: zero address");
        address old = _identityRegistryAddress;
        _identityRegistryAddress = identityRegistry;
        emit IdentityRegistrySet(old, identityRegistry);
    }

    /// @inheritdoc IGalileoAccessControl
    function getIdentityRegistry() external view override returns (address) {
        return _identityRegistryAddress;
    }

    // ─────────────────────────────────────────────────────────────────
    // Claim requirement management
    // ─────────────────────────────────────────────────────────────────

    /// @inheritdoc IGalileoAccessControl
    function setRoleClaimRequirement(bytes32 role, uint256 claimTopic) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 prev = _roleClaimRequirements[role];
        _roleClaimRequirements[role] = claimTopic;
        emit RoleClaimRequirementSet(role, claimTopic, prev);
    }

    /// @inheritdoc IGalileoAccessControl
    function getRoleClaimRequirement(bytes32 role) external view override returns (uint256) {
        return _roleClaimRequirements[role];
    }

    // ─────────────────────────────────────────────────────────────────
    // Identity-aware role management
    // ─────────────────────────────────────────────────────────────────

    /// @inheritdoc IGalileoAccessControl
    function grantRoleWithIdentity(
        bytes32 role,
        address account,
        address identityAddress,
        uint256 requiredClaimTopic
    ) external override {
        _checkRole(getRoleAdmin(role));

        if (_identityRegistryAddress == address(0)) revert IdentityRegistryNotSet();
        if (_suspensions[_keyFor(role, account)]) revert RoleIsSuspended(role, account);

        // H-3b: use the stored topic for verification; caller-supplied topic is ignored when a
        //        requirement is configured, preventing a malicious admin from passing a weaker topic.
        uint256 actualClaimTopic = _roleClaimRequirements[role] != 0 ? _roleClaimRequirements[role] : requiredClaimTopic;
        (bool verified, string memory reason) = _checkIdentityClaim(account, identityAddress, actualClaimTopic);
        if (!verified) {
            emit RoleVerificationFailed(role, account, reason);
            // Provide a more precise revert
            IIdentityRegistry reg = IIdentityRegistry(_identityRegistryAddress);
            if (!reg.contains(account)) revert IdentityNotVerified(account);
            revert ClaimNotValid(account, actualClaimTopic);
        }

        _grantRole(role, account);
        emit RoleGrantedWithIdentity(role, account, identityAddress, actualClaimTopic, msg.sender);
    }

    /// @inheritdoc IGalileoAccessControl
    function hasRoleWithIdentity(bytes32 role, address account) external view override returns (bool) {
        if (!hasRole(role, account)) return false;

        uint256 requiredTopic = _roleClaimRequirements[role];
        if (requiredTopic == 0) return true;

        if (_identityRegistryAddress == address(0)) return false;
        IIdentityRegistry reg = IIdentityRegistry(_identityRegistryAddress);
        if (!reg.contains(account)) return false;

        IIdentity identity = reg.identity(account);
        return _hasValidClaim(identity, requiredTopic);
    }

    // ─────────────────────────────────────────────────────────────────
    // Two-phase role grants
    // ─────────────────────────────────────────────────────────────────

    /// @inheritdoc IGalileoAccessControl
    function requestRoleGrant(bytes32 role, address account) external override {
        _checkRole(getRoleAdmin(role));

        uint256 delay = _roleGrantDelays[role];
        require(delay > 0, "GalileoAccessControl: no delay configured for role");

        bytes32 key = _keyFor(role, account);
        require(_grantRequests[key].requestedBy == address(0), "GalileoAccessControl: pending request exists");

        uint256 confirmAt = block.timestamp + delay;
        _grantRequests[key] = GrantRequest({
            requestedBy: msg.sender,
            requestedAt: block.timestamp,
            canConfirmAt: confirmAt
        });

        emit RoleGrantRequested(role, account, msg.sender, confirmAt);
    }

    /// @inheritdoc IGalileoAccessControl
    function confirmRoleGrant(
        bytes32 role,
        address account,
        address identityAddress,
        uint256 claimTopic
    ) external override {
        _checkRole(getRoleAdmin(role));

        bytes32 key = _keyFor(role, account);
        GrantRequest memory req = _grantRequests[key];
        if (req.requestedBy == address(0)) revert NoValidGrantRequest(role, account);
        if (block.timestamp < req.canConfirmAt) {
            revert GrantDelayNotElapsed(role, account, req.canConfirmAt - block.timestamp);
        }

        delete _grantRequests[key];

        // Perform grant with optional identity verification
        // H-3: when a claim is required, identityAddress must be non-zero — passing address(0)
        //      previously bypassed verification by falling into the unconditional else branch.
        if (_roleClaimRequirements[role] != 0) {
            require(identityAddress != address(0), "Identity required for this role");
            if (_identityRegistryAddress == address(0)) revert IdentityRegistryNotSet();
            uint256 storedTopic = _roleClaimRequirements[role];
            (bool verified, string memory reason) = _checkIdentityClaim(account, identityAddress, storedTopic);
            if (!verified) {
                emit RoleVerificationFailed(role, account, reason);
                IIdentityRegistry reg = IIdentityRegistry(_identityRegistryAddress);
                if (!reg.contains(account)) revert IdentityNotVerified(account);
                revert ClaimNotValid(account, storedTopic);
            }
            _grantRole(role, account);
            emit RoleGrantedWithIdentity(role, account, identityAddress, storedTopic, msg.sender);
        } else {
            _grantRole(role, account);
        }
    }

    /// @inheritdoc IGalileoAccessControl
    function cancelRoleGrantRequest(bytes32 role, address account) external override {
        bytes32 key = _keyFor(role, account);
        GrantRequest memory req = _grantRequests[key];
        require(req.requestedBy != address(0), "GalileoAccessControl: no pending request");
        require(
            msg.sender == req.requestedBy || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "GalileoAccessControl: not authorized to cancel"
        );

        delete _grantRequests[key];
        emit RoleGrantRequestCancelled(role, account, msg.sender);
    }

    /// @inheritdoc IGalileoAccessControl
    function getRoleGrantRequest(bytes32 role, address account) external view override returns (
        address requestedBy,
        uint256 requestedAt,
        uint256 canConfirmAt
    ) {
        GrantRequest storage req = _grantRequests[_keyFor(role, account)];
        return (req.requestedBy, req.requestedAt, req.canConfirmAt);
    }

    // ─────────────────────────────────────────────────────────────────
    // Suspension mechanism
    // ─────────────────────────────────────────────────────────────────

    /// @inheritdoc IGalileoAccessControl
    function suspendRole(bytes32 role, address account, string calldata reason) external override {
        _checkRole(getRoleAdmin(role));
        require(hasRole(role, account), "GalileoAccessControl: account does not have role");

        bytes32 key = _keyFor(role, account);
        require(!_suspensions[key], "GalileoAccessControl: role already suspended");

        _suspensions[key] = true;
        emit RoleSuspended(role, account, reason, msg.sender);
    }

    /// @inheritdoc IGalileoAccessControl
    function reinstateRole(bytes32 role, address account) external override {
        _checkRole(getRoleAdmin(role));

        bytes32 key = _keyFor(role, account);
        require(_suspensions[key], "GalileoAccessControl: role is not suspended");

        _suspensions[key] = false;
        emit RoleReinstated(role, account, msg.sender);
    }

    /// @inheritdoc IGalileoAccessControl
    function isSuspended(bytes32 role, address account) external view override returns (bool) {
        return _suspensions[_keyFor(role, account)];
    }

    // ─────────────────────────────────────────────────────────────────
    // Emergency access
    // ─────────────────────────────────────────────────────────────────

    /// @inheritdoc IGalileoAccessControl
    function emergencyGrantRole(
        bytes32 role,
        address account,
        uint256 duration,
        string calldata reason
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (duration > MAX_EMERGENCY_DURATION) revert EmergencyDurationExceeded(duration, MAX_EMERGENCY_DURATION);
        require(bytes(reason).length > 0, "GalileoAccessControl: reason required");

        _knownRoles.add(role);
        bytes32 key = _keyFor(role, account);
        uint256 expiresAt = block.timestamp + duration;
        _emergencyExpiry[key] = expiresAt;

        emit EmergencyAccessGranted(role, account, duration, expiresAt, reason);
    }

    /// @inheritdoc IGalileoAccessControl
    function emergencyRevokeAll(address account, string calldata reason) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(reason).length > 0, "GalileoAccessControl: reason required");

        uint256 len = _knownRoles.length();
        for (uint256 i = 0; i < len; i++) {
            bytes32 role = _knownRoles.at(i);
            if (hasRole(role, account)) {
                _revokeRole(role, account);
            }
            bytes32 key = _keyFor(role, account);
            if (_emergencyExpiry[key] > 0) {
                _emergencyExpiry[key] = 0;
                emit EmergencyAccessEnded(role, account, false);
            }
        }
    }

    /// @inheritdoc IGalileoAccessControl
    function getEmergencyAccess(bytes32 role, address account) external view override returns (
        bool hasEmergency,
        uint256 expiresAt
    ) {
        uint256 expiry = _emergencyExpiry[_keyFor(role, account)];
        if (expiry == 0 || block.timestamp >= expiry) {
            return (false, expiry);
        }
        return (true, expiry);
    }

    // ─────────────────────────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────────────────────────

    /// @inheritdoc IGalileoAccessControl
    function getAccountRoles(address account) external view override returns (bytes32[] memory roles) {
        uint256 total = _knownRoles.length();
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            bytes32 role = _knownRoles.at(i);
            if (hasRole(role, account)) {
                count++;
            } else {
                uint256 expiry = _emergencyExpiry[_keyFor(role, account)];
                if (expiry > block.timestamp) count++;
            }
        }

        roles = new bytes32[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
            bytes32 role = _knownRoles.at(i);
            if (hasRole(role, account)) {
                roles[idx++] = role;
            } else {
                uint256 expiry = _emergencyExpiry[_keyFor(role, account)];
                if (expiry > block.timestamp) {
                    roles[idx++] = role;
                }
            }
        }
    }

    /// @inheritdoc IGalileoAccessControl
    function canExerciseRole(bytes32 role, address account) external view override returns (bool) {
        bytes32 key = _keyFor(role, account);
        if (_suspensions[key]) return false;
        if (hasRole(role, account)) return true;
        return _emergencyExpiry[key] > block.timestamp;
    }

    /// @inheritdoc IGalileoAccessControl
    function getRoleGrantDelay(bytes32 role) external view override returns (uint256) {
        return _roleGrantDelays[role];
    }

    // ─────────────────────────────────────────────────────────────────
    // Admin helpers (not in interface)
    // ─────────────────────────────────────────────────────────────────

    /**
     * @notice Set the time delay required for two-phase grants of a role
     * @dev Set to 0 to disable two-phase grant requirement for the role
     * @param role The role to configure
     * @param delay Delay in seconds (0 = no two-phase grant required)
     */
    function setRoleGrantDelay(bytes32 role, uint256 delay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _roleGrantDelays[role] = delay;
    }

    // ─────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * @dev Returns a unique key for a (role, account) pair
     */
    function _keyFor(bytes32 role, address account) internal pure returns (bytes32) {
        return keccak256(abi.encode(role, account));
    }

    /**
     * @dev Verifies that `account` is registered in the identity registry with
     *      `identityAddress` as their identity contract, and that the identity
     *      holds a valid claim for `claimTopic`.
     *
     * @return verified  True if all checks pass
     * @return reason    Human-readable failure reason when !verified
     */
    function _checkIdentityClaim(
        address account,
        address identityAddress,
        uint256 claimTopic
    ) internal view returns (bool verified, string memory reason) {
        IIdentityRegistry reg = IIdentityRegistry(_identityRegistryAddress);

        if (!reg.contains(account)) {
            return (false, "Identity not registered");
        }

        IIdentity identity = reg.identity(account);
        if (address(identity) != identityAddress) {
            return (false, "Identity address mismatch");
        }

        if (!_hasValidClaim(identity, claimTopic)) {
            return (false, "No valid claim for required topic");
        }

        return (true, "");
    }

    /**
     * @dev Checks whether `identity` has at least one valid claim for `claimTopic`.
     *      Iterates over all claim IDs for the topic and validates each one.
     */
    function _hasValidClaim(IIdentity identity, uint256 claimTopic) internal view returns (bool) {
        bytes32[] memory claimIds = identity.getClaimIdsByTopic(claimTopic);

        for (uint256 i = 0; i < claimIds.length; i++) {
            (, , address issuer, bytes memory sig, bytes memory data, ) = identity.getClaim(claimIds[i]);
            // solhint-disable-next-line no-empty-blocks
            try IClaimIssuer(issuer).isClaimValid(identity, claimTopic, sig, data) returns (bool valid) {
                if (valid) return true;
            } catch {
                // Skip unresponsive or malicious issuers
            }
        }

        return false;
    }

    /**
     * @dev Override _grantRole to track all role IDs in _knownRoles
     */
    function _grantRole(bytes32 role, address account) internal virtual override {
        _knownRoles.add(role);
        super._grantRole(role, account);
    }

    /**
     * @dev Override supportsInterface to satisfy both parents
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
