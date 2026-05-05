// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IIdentityRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistry.sol";
import {IModularCompliance} from "@erc3643org/erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IGalileoToken} from "../interfaces/token/IGalileoToken.sol";
import {GalileoClaimTopics} from "../interfaces/identity/IClaimTopicsRegistry.sol";
import {IGalileoIdentityRegistry} from "../interfaces/identity/IIdentityRegistry.sol";

/**
 * @title GalileoToken
 * @author Galileo Luxury Standard
 * @notice ERC-3643 single-supply token representing a physical luxury product
 * @dev Implements IGalileoToken (which extends T-REX IToken) with:
 *      - Single-supply pattern: totalSupply is always 1, decimals = 0
 *        Each deployment represents exactly one physical luxury product.
 *      - Product metadata: DID, category, brandDID, productURI, GTIN, serial number
 *      - CPO (Certified Pre-Owned) certification management via identity claims
 *        (AUTHENTICATOR or SERVICE_CENTER claim topics from GalileoClaimTopics)
 *      - TransferWithReason: extends standard transfer with reason code audit trail
 *      - Decommission: explicit burn with reason for end-of-life tracking
 *
 *      Access control:
 *        DEFAULT_ADMIN_ROLE    — role management
 *        REGISTRY_ADMIN_ROLE  — admin functions (setName, setCompliance, etc.)
 *        AGENT_ROLE           — operational functions (pause, freeze, mint, burn, etc.)
 *
 *      Specification: GSPEC-TOKEN-001
 *
 * @custom:security-contact security@galileoprotocol.io
 */
contract GalileoToken is IGalileoToken, AccessControlEnumerable {
    // ============ Constructor Config ============

    /**
     * @notice Configuration struct for product metadata (avoids stack too deep)
     * @param tokenName     Human-readable token name
     * @param tokenSymbol   Short token symbol
     * @param productDID    Product DID (did:galileo:01:{gtin}:21:{serial})
     * @param productCategory Product category string (e.g. "HANDBAG")
     * @param brandDID      Brand DID (did:galileo:brand:{identifier})
     * @param productURI    URI to off-chain product metadata
     * @param gtin          14-digit GS1 GTIN
     * @param serialNumber  Product serial number
     */
    struct ProductConfig {
        string tokenName;
        string tokenSymbol;
        string productDID;
        string productCategory;
        string brandDID;
        string productURI;
        string gtin;
        string serialNumber;
    }
    // ============ Roles ============

    /// @notice Role required for administrative token operations (owner-equivalent)
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    /// @notice Role required for operational token functions (agent-equivalent)
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    // ============ ERC-3643 Agent Management Events ============

    event AgentAdded(address indexed _agent);
    event AgentRemoved(address indexed _agent);

    // ============ Valid Reason Codes ============

    bytes32 private constant REASON_SALE = keccak256("SALE");
    bytes32 private constant REASON_GIFT = keccak256("GIFT");
    bytes32 private constant REASON_INHERITANCE = keccak256("INHERITANCE");
    bytes32 private constant REASON_WARRANTY_CLAIM = keccak256("WARRANTY_CLAIM");
    bytes32 private constant REASON_SERVICE_TRANSFER = keccak256("SERVICE_TRANSFER");
    bytes32 private constant REASON_AUCTION = keccak256("AUCTION");
    bytes32 private constant REASON_LOAN = keccak256("LOAN");

    // ============ State — ERC-20 / ERC-3643 base ============

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    string private _tokenName;
    string private _tokenSymbol;
    uint8 private constant _TOKEN_DECIMALS = 0;
    address private _tokenOnchainID;

    /// @dev T-REX token version — must match T-REX dependency
    string private constant _TOKEN_VERSION = "4.1.3";

    mapping(address => bool) private _frozen;
    mapping(address => uint256) private _frozenTokens;
    bool private _tokenPaused;

    IIdentityRegistry private _tokenIdentityRegistry;
    IModularCompliance private _tokenCompliance;

    // ============ State — Product metadata ============

    string private _productDID;
    string private _productCategory;
    string private _brandDID;
    string private _productURI;
    string private _gtin;
    string private _serialNumber;
    uint256 private _createdAt;
    bool private _isDecommissioned;
    string private _decommissionReason;

    // ============ State — CPO ============

    bool private _cpoCertified;
    address private _cpoCertifier;
    uint256 private _cpoCertificationDate;
    string private _cpoCertificationURI;

    // ============ Modifiers ============

    modifier whenNotPaused() {
        require(!_tokenPaused, "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(_tokenPaused, "Pausable: not paused");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Deploy a single-supply luxury product token
     * @param admin          Address granted DEFAULT_ADMIN_ROLE and REGISTRY_ADMIN_ROLE
     * @param identityRegistry_ Address of the Identity Registry for transfer checks
     * @param compliance_    Address of the Modular Compliance contract
     * @param config         Product metadata configuration struct
     * @param initialOwner_  Address that receives the single minted token
     */
    constructor(
        address admin,
        address identityRegistry_,
        address compliance_,
        ProductConfig memory config,
        address initialOwner_
    ) {
        require(admin != address(0), "GalileoToken: zero admin");
        require(identityRegistry_ != address(0), "GalileoToken: zero identity registry");
        require(compliance_ != address(0), "GalileoToken: zero compliance");
        require(bytes(config.tokenName).length > 0, "GalileoToken: empty name");
        require(bytes(config.tokenSymbol).length > 0, "GalileoToken: empty symbol");
        require(bytes(config.productDID).length > 0, "GalileoToken: empty product DID");
        require(initialOwner_ != address(0), "GalileoToken: zero initial owner");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(AGENT_ROLE, REGISTRY_ADMIN_ROLE);

        _tokenName = config.tokenName;
        _tokenSymbol = config.tokenSymbol;
        _productDID = config.productDID;
        _productCategory = config.productCategory;
        _brandDID = config.brandDID;
        _productURI = config.productURI;
        _gtin = config.gtin;
        _serialNumber = config.serialNumber;
        _createdAt = block.timestamp;
        _tokenPaused = true;

        // Bind identity registry
        _tokenIdentityRegistry = IIdentityRegistry(identityRegistry_);
        emit IdentityRegistryAdded(identityRegistry_);

        // Bind compliance and notify
        _tokenCompliance = IModularCompliance(compliance_);
        _tokenCompliance.bindToken(address(this));
        emit ComplianceAdded(compliance_);

        emit UpdatedTokenInformation(
            _tokenName, _tokenSymbol, _TOKEN_DECIMALS, _TOKEN_VERSION, _tokenOnchainID
        );

        // Mint the single product token to the initial owner (privileged constructor action)
        _mint(initialOwner_, 1);
        _tokenCompliance.created(initialOwner_, 1);
    }

    // ============ ERC-20 approve / allowance ============

    /**
     * @dev See {IERC20-approve}.
     */
    function approve(address _spender, uint256 _amount) external override returns (bool) {
        _approve(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * @dev Increase the allowance for `_spender` by `_addedValue`.
     */
    function increaseAllowance(address _spender, uint256 _addedValue) external returns (bool) {
        _approve(msg.sender, _spender, _allowances[msg.sender][_spender] + _addedValue);
        return true;
    }

    /**
     * @dev Decrease the allowance for `_spender` by `_subtractedValue`.
     */
    function decreaseAllowance(address _spender, uint256 _subtractedValue) external returns (bool) {
        _approve(msg.sender, _spender, _allowances[msg.sender][_spender] - _subtractedValue);
        return true;
    }

    // ============ IToken — admin-gated configuration (REGISTRY_ADMIN_ROLE) ============

    /**
     * @dev See {IToken-setName}.
     */
    function setName(string calldata _name) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        require(bytes(_name).length > 0, "invalid argument - empty string");
        _tokenName = _name;
        emit UpdatedTokenInformation(_tokenName, _tokenSymbol, _TOKEN_DECIMALS, _TOKEN_VERSION, _tokenOnchainID);
    }

    /**
     * @dev See {IToken-setSymbol}.
     */
    function setSymbol(string calldata _symbol) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        require(bytes(_symbol).length > 0, "invalid argument - empty string");
        _tokenSymbol = _symbol;
        emit UpdatedTokenInformation(_tokenName, _tokenSymbol, _TOKEN_DECIMALS, _TOKEN_VERSION, _tokenOnchainID);
    }

    /**
     * @dev See {IToken-setOnchainID}.
     */
    function setOnchainID(address _onchainID) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        _tokenOnchainID = _onchainID;
        emit UpdatedTokenInformation(_tokenName, _tokenSymbol, _TOKEN_DECIMALS, _TOKEN_VERSION, _tokenOnchainID);
    }

    /**
     * @dev See {IToken-setIdentityRegistry}.
     */
    function setIdentityRegistry(address _identityRegistry) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        require(_identityRegistry != address(0), "GalileoToken: zero address");
        _tokenIdentityRegistry = IIdentityRegistry(_identityRegistry);
        emit IdentityRegistryAdded(_identityRegistry);
    }

    /**
     * @dev See {IToken-setCompliance}.
     *      Unbinds token from old compliance before binding to new one.
     */
    function setCompliance(address _compliance) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        require(_compliance != address(0), "GalileoToken: zero address");
        if (address(_tokenCompliance) != address(0)) {
            _tokenCompliance.unbindToken(address(this));
        }
        _tokenCompliance = IModularCompliance(_compliance);
        _tokenCompliance.bindToken(address(this));
        emit ComplianceAdded(_compliance);
    }

    // ============ ERC-3643 Agent Management (DEFAULT_ADMIN_ROLE) ============

    /**
     * @notice Grant AGENT_ROLE to `_agent` (ERC-3643 AgentRole ABI wrapper)
     */
    function addAgent(address _agent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(AGENT_ROLE, _agent);
        emit AgentAdded(_agent);
    }

    /**
     * @notice Revoke AGENT_ROLE from `_agent` (ERC-3643 AgentRole ABI wrapper)
     */
    function removeAgent(address _agent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(AGENT_ROLE, _agent);
        emit AgentRemoved(_agent);
    }

    /**
     * @notice Returns true if `_agent` holds AGENT_ROLE (ERC-3643 AgentRole ABI wrapper)
     */
    function isAgent(address _agent) public view returns (bool) {
        return hasRole(AGENT_ROLE, _agent);
    }

    // ============ IToken — agent-gated operations (AGENT_ROLE) ============

    /**
     * @dev See {IToken-pause}.
     */
    function pause() external override onlyRole(AGENT_ROLE) whenNotPaused {
        _tokenPaused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev See {IToken-unpause}.
     */
    function unpause() external override onlyRole(AGENT_ROLE) whenPaused {
        _tokenPaused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @dev See {IToken-setAddressFrozen}.
     */
    function setAddressFrozen(address _userAddress, bool _freeze) public override onlyRole(AGENT_ROLE) {
        _frozen[_userAddress] = _freeze;
        emit AddressFrozen(_userAddress, _freeze, msg.sender);
    }

    /**
     * @dev See {IToken-freezePartialTokens}.
     */
    function freezePartialTokens(address _userAddress, uint256 _amount) public override onlyRole(AGENT_ROLE) {
        uint256 balance = balanceOf(_userAddress);
        require(balance >= _frozenTokens[_userAddress] + _amount, "Amount exceeds available balance");
        _frozenTokens[_userAddress] = _frozenTokens[_userAddress] + _amount;
        emit TokensFrozen(_userAddress, _amount);
    }

    /**
     * @dev See {IToken-unfreezePartialTokens}.
     */
    function unfreezePartialTokens(address _userAddress, uint256 _amount) public override onlyRole(AGENT_ROLE) {
        require(_frozenTokens[_userAddress] >= _amount, "Amount should be less than or equal to frozen tokens");
        _frozenTokens[_userAddress] = _frozenTokens[_userAddress] - _amount;
        emit TokensUnfrozen(_userAddress, _amount);
    }

    /**
     * @dev See {IToken-mint}.
     *      For the single-supply pattern, mint should only be used in rare
     *      re-issuance scenarios. Standard flow mints at construction.
     */
    function mint(address _to, uint256 _amount) public override onlyRole(AGENT_ROLE) {
        require(_totalSupply == 0, "Token already minted");
        require(!_isDecommissioned, "Token decommissioned");
        require(_tokenIdentityRegistry.isVerified(_to), "Identity is not verified.");
        require(_tokenCompliance.canTransfer(address(0), _to, _amount), "Compliance not followed");
        _mint(_to, _amount);
        _tokenCompliance.created(_to, _amount);
    }

    /**
     * @dev See {IToken-burn}.
     */
    function burn(address _userAddress, uint256 _amount) public override onlyRole(AGENT_ROLE) {
        require(balanceOf(_userAddress) >= _amount, "cannot burn more than balance");
        uint256 freeBalance = balanceOf(_userAddress) - _frozenTokens[_userAddress];
        if (_amount > freeBalance) {
            uint256 tokensToUnfreeze = _amount - freeBalance;
            _frozenTokens[_userAddress] = _frozenTokens[_userAddress] - tokensToUnfreeze;
            emit TokensUnfrozen(_userAddress, tokensToUnfreeze);
        }
        _burn(_userAddress, _amount);
        _tokenCompliance.destroyed(_userAddress, _amount);
    }

    /**
     * @dev See {IToken-forcedTransfer}.
     */
    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) public override onlyRole(AGENT_ROLE) returns (bool) {
        require(!_isDecommissioned, "Token decommissioned");
        require(balanceOf(_from) >= _amount, "sender balance too low");
        uint256 freeBalance = balanceOf(_from) - _frozenTokens[_from];
        if (_amount > freeBalance) {
            uint256 tokensToUnfreeze = _amount - freeBalance;
            _frozenTokens[_from] = _frozenTokens[_from] - tokensToUnfreeze;
            emit TokensUnfrozen(_from, tokensToUnfreeze);
        }
        if (_tokenIdentityRegistry.isVerified(_to)) {
            _transfer(_from, _to, _amount);
            _tokenCompliance.transferred(_from, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    /**
     * @dev See {IToken-recoveryAddress}.
     */
    function recoveryAddress(
        address _lostWallet,
        address _newWallet,
        address _investorOnchainID
    ) external override onlyRole(AGENT_ROLE) returns (bool) {
        require(balanceOf(_lostWallet) != 0, "no tokens to recover");
        IIdentity investorID = IIdentity(_investorOnchainID);
        bytes32 key = keccak256(abi.encode(_newWallet));
        if (investorID.keyHasPurpose(key, 1)) {
            uint256 investorTokens = balanceOf(_lostWallet);
            uint256 frozenTokens = _frozenTokens[_lostWallet];
            _tokenIdentityRegistry.registerIdentity(
                _newWallet,
                investorID,
                _tokenIdentityRegistry.investorCountry(_lostWallet)
            );
            forcedTransfer(_lostWallet, _newWallet, investorTokens);
            if (frozenTokens > 0) {
                freezePartialTokens(_newWallet, frozenTokens);
            }
            if (_frozen[_lostWallet]) {
                setAddressFrozen(_newWallet, true);
            }
            _tokenIdentityRegistry.deleteIdentity(_lostWallet);
            emit RecoverySuccess(_lostWallet, _newWallet, _investorOnchainID);
            return true;
        }
        revert("Recovery not possible");
    }

    // ============ IToken — batch operations ============

    /**
     * @dev See {IToken-batchTransfer}.
     */
    function batchTransfer(address[] calldata _toList, uint256[] calldata _amounts) external override {
        for (uint256 i = 0; i < _toList.length; i++) {
            transfer(_toList[i], _amounts[i]);
        }
    }

    /**
     * @dev See {IToken-batchForcedTransfer}.
     */
    function batchForcedTransfer(
        address[] calldata _fromList,
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external override {
        for (uint256 i = 0; i < _fromList.length; i++) {
            forcedTransfer(_fromList[i], _toList[i], _amounts[i]);
        }
    }

    /**
     * @dev See {IToken-batchMint}.
     */
    function batchMint(address[] calldata _toList, uint256[] calldata _amounts) external override {
        require(_totalSupply == 0, "Token already minted");
        require(_toList.length == 1, "Single supply: batch limited to 1");
        for (uint256 i = 0; i < _toList.length; i++) {
            mint(_toList[i], _amounts[i]);
        }
    }

    /**
     * @dev See {IToken-batchBurn}.
     */
    function batchBurn(address[] calldata _userAddresses, uint256[] calldata _amounts) external override {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            burn(_userAddresses[i], _amounts[i]);
        }
    }

    /**
     * @dev See {IToken-batchSetAddressFrozen}.
     */
    function batchSetAddressFrozen(
        address[] calldata _userAddresses,
        bool[] calldata _freeze
    ) external override {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            setAddressFrozen(_userAddresses[i], _freeze[i]);
        }
    }

    /**
     * @dev See {IToken-batchFreezePartialTokens}.
     */
    function batchFreezePartialTokens(
        address[] calldata _userAddresses,
        uint256[] calldata _amounts
    ) external override {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            freezePartialTokens(_userAddresses[i], _amounts[i]);
        }
    }

    /**
     * @dev See {IToken-batchUnfreezePartialTokens}.
     */
    function batchUnfreezePartialTokens(
        address[] calldata _userAddresses,
        uint256[] calldata _amounts
    ) external override {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            unfreezePartialTokens(_userAddresses[i], _amounts[i]);
        }
    }

    // ============ IToken / IERC20 — transfer ============

    /**
     * @dev See {IToken-transfer}.
     *      Checks freeze/pause, available balance, identity verification and compliance.
     */
    function transfer(address _to, uint256 _amount) public override whenNotPaused returns (bool) {
        require(!_frozen[_to] && !_frozen[msg.sender], "wallet is frozen");
        require(!_isDecommissioned, "Token decommissioned");
        require(_amount <= balanceOf(msg.sender) - _frozenTokens[msg.sender], "Insufficient Balance");
        if (_tokenIdentityRegistry.isVerified(_to) && _tokenCompliance.canTransfer(msg.sender, _to, _amount)) {
            _transfer(msg.sender, _to, _amount);
            _tokenCompliance.transferred(msg.sender, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    /**
     * @dev See {IERC20-transferFrom}.
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external override whenNotPaused returns (bool) {
        require(!_frozen[_to] && !_frozen[_from], "wallet is frozen");
        require(!_isDecommissioned, "Token decommissioned");
        require(_amount <= balanceOf(_from) - _frozenTokens[_from], "Insufficient Balance");
        if (_tokenIdentityRegistry.isVerified(_to) && _tokenCompliance.canTransfer(_from, _to, _amount)) {
            _approve(_from, msg.sender, _allowances[_from][msg.sender] - _amount);
            _transfer(_from, _to, _amount);
            _tokenCompliance.transferred(_from, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    // ============ IToken — views ============

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address _userAddress) public view override returns (uint256) {
        return _balances[_userAddress];
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address _owner, address _spender) external view override returns (uint256) {
        return _allowances[_owner][_spender];
    }

    /**
     * @dev See {IToken-decimals}.
     */
    function decimals() external pure override returns (uint8) {
        return _TOKEN_DECIMALS;
    }

    /**
     * @dev See {IToken-name}.
     */
    function name() external view override returns (string memory) {
        return _tokenName;
    }

    /**
     * @dev See {IToken-symbol}.
     */
    function symbol() external view override returns (string memory) {
        return _tokenSymbol;
    }

    /**
     * @dev See {IToken-onchainID}.
     */
    function onchainID() external view override returns (address) {
        return _tokenOnchainID;
    }

    /**
     * @dev See {IToken-version}.
     */
    function version() external pure override returns (string memory) {
        return _TOKEN_VERSION;
    }

    /**
     * @dev See {IToken-identityRegistry}.
     */
    function identityRegistry() external view override returns (IIdentityRegistry) {
        return _tokenIdentityRegistry;
    }

    /**
     * @dev See {IToken-compliance}.
     */
    function compliance() external view override returns (IModularCompliance) {
        return _tokenCompliance;
    }

    /**
     * @dev See {IToken-paused}.
     */
    function paused() external view override returns (bool) {
        return _tokenPaused;
    }

    /**
     * @dev See {IToken-isFrozen}.
     */
    function isFrozen(address _userAddress) external view override returns (bool) {
        return _frozen[_userAddress];
    }

    /**
     * @dev See {IToken-getFrozenTokens}.
     */
    function getFrozenTokens(address _userAddress) external view override returns (uint256) {
        return _frozenTokens[_userAddress];
    }

    // ============ IGalileoToken — product metadata ============

    /**
     * @dev See {IGalileoToken-productDID}.
     */
    function productDID() external view override returns (string memory) {
        return _productDID;
    }

    /**
     * @dev See {IGalileoToken-productCategory}.
     */
    function productCategory() external view override returns (string memory) {
        return _productCategory;
    }

    /**
     * @dev See {IGalileoToken-brandDID}.
     */
    function brandDID() external view override returns (string memory) {
        return _brandDID;
    }

    /**
     * @dev See {IGalileoToken-productURI}.
     */
    function productURI() external view override returns (string memory) {
        return _productURI;
    }

    /**
     * @dev See {IGalileoToken-gtin}.
     */
    function gtin() external view override returns (string memory) {
        return _gtin;
    }

    /**
     * @dev See {IGalileoToken-serialNumber}.
     */
    function serialNumber() external view override returns (string memory) {
        return _serialNumber;
    }

    /**
     * @dev See {IGalileoToken-createdAt}.
     */
    function createdAt() external view override returns (uint256) {
        return _createdAt;
    }

    /**
     * @dev See {IGalileoToken-isDecommissioned}.
     */
    function isDecommissioned() external view override returns (bool) {
        return _isDecommissioned;
    }

    /**
     * @dev See {IGalileoToken-decommissionReason}.
     */
    function decommissionReason() external view override returns (string memory) {
        return _decommissionReason;
    }

    // ============ IGalileoToken — CPO views ============

    /**
     * @dev See {IGalileoToken-isCPOCertified}.
     */
    function isCPOCertified() external view override returns (bool) {
        return _cpoCertified;
    }

    /**
     * @dev See {IGalileoToken-cpoCertificationDate}.
     */
    function cpoCertificationDate() external view override returns (uint256) {
        if (!_cpoCertified) revert NotCPOCertified(address(this));
        return _cpoCertificationDate;
    }

    /**
     * @dev See {IGalileoToken-cpoCertifier}.
     */
    function cpoCertifier() external view override returns (address) {
        if (!_cpoCertified) revert NotCPOCertified(address(this));
        return _cpoCertifier;
    }

    /**
     * @dev See {IGalileoToken-cpoCertificationURI}.
     */
    function cpoCertificationURI() external view override returns (string memory) {
        if (!_cpoCertified) revert NotCPOCertified(address(this));
        return _cpoCertificationURI;
    }

    // ============ IGalileoToken — CPO management ============

    /**
     * @dev See {IGalileoToken-certifyCPO}.
     *      Caller must have AUTHENTICATOR or SERVICE_CENTER claim verified via
     *      the identity registry (IGalileoIdentityRegistry.batchVerify).
     */
    function certifyCPO(string calldata certificationURI) external override {
        if (!_isCertifierAuthorized(msg.sender)) revert NotAuthorizedCertifier(msg.sender);
        if (_cpoCertified) revert AlreadyCPOCertified(address(this), _cpoCertifier);

        _cpoCertified = true;
        _cpoCertifier = msg.sender;
        _cpoCertificationDate = block.timestamp;
        _cpoCertificationURI = certificationURI;

        emit CPOCertified(address(this), msg.sender, block.timestamp, certificationURI);
    }

    /**
     * @dev See {IGalileoToken-revokeCPO}.
     *      Can be called by the original certifier or an AGENT_ROLE holder.
     */
    function revokeCPO(string calldata reason) external override {
        if (!_cpoCertified) revert NotCPOCertified(address(this));
        if (msg.sender != _cpoCertifier && !hasRole(AGENT_ROLE, msg.sender)) {
            revert NotAuthorizedCertifier(msg.sender);
        }

        _cpoCertified = false;
        _cpoCertifier = address(0);
        _cpoCertificationDate = 0;
        delete _cpoCertificationURI;

        emit CPORevoked(address(this), msg.sender, block.timestamp, reason);
    }

    // ============ IGalileoToken — transferWithReason ============

    /**
     * @dev See {IGalileoToken-transferWithReason}.
     *      Validates reason code, performs standard ERC-3643 transfer checks,
     *      then emits TransferWithReason in addition to the standard Transfer event.
     */
    function transferWithReason(
        address to,
        uint256 amount,
        bytes32 reasonCode,
        string calldata reasonDescription
    ) external override whenNotPaused returns (bool) {
        if (!_isValidReasonCode(reasonCode)) revert InvalidReasonCode(reasonCode);
        require(!_frozen[to] && !_frozen[msg.sender], "wallet is frozen");
        require(!_isDecommissioned, "Token decommissioned");
        require(amount <= balanceOf(msg.sender) - _frozenTokens[msg.sender], "Insufficient Balance");
        if (_tokenIdentityRegistry.isVerified(to) && _tokenCompliance.canTransfer(msg.sender, to, amount)) {
            _transfer(msg.sender, to, amount);
            _tokenCompliance.transferred(msg.sender, to, amount);
            emit TransferWithReason(msg.sender, to, amount, reasonCode, reasonDescription);
            return true;
        }
        revert("Transfer not possible");
    }

    // ============ Galileo-specific — decommission ============

    /**
     * @notice Decommission this product token with a reason
     * @dev Marks the token as decommissioned and burns the balance.
     *      Decommissioned tokens cannot be transferred.
     *      Only callable by AGENT_ROLE holders.
     *
     * @param _userAddress Address holding the token to burn
     * @param reason Human-readable reason for decommission
     */
    function decommission(address _userAddress, string calldata reason) external onlyRole(AGENT_ROLE) {
        require(!_isDecommissioned, "Already decommissioned");
        _isDecommissioned = true;
        _decommissionReason = reason;
        burn(_userAddress, balanceOf(_userAddress));
    }

    // ============ Internal — ERC-20 primitives ============

    function _transfer(address _from, address _to, uint256 _amount) internal {
        require(_from != address(0), "ERC20: transfer from the zero address");
        require(_to != address(0), "ERC20: transfer to the zero address");
        _balances[_from] = _balances[_from] - _amount;
        _balances[_to] = _balances[_to] + _amount;
        emit Transfer(_from, _to, _amount);
    }

    function _mint(address _userAddress, uint256 _amount) internal {
        require(_userAddress != address(0), "ERC20: mint to the zero address");
        _totalSupply = _totalSupply + _amount;
        _balances[_userAddress] = _balances[_userAddress] + _amount;
        emit Transfer(address(0), _userAddress, _amount);
    }

    function _burn(address _userAddress, uint256 _amount) internal {
        require(_userAddress != address(0), "ERC20: burn from the zero address");
        _balances[_userAddress] = _balances[_userAddress] - _amount;
        _totalSupply = _totalSupply - _amount;
        emit Transfer(_userAddress, address(0), _amount);
    }

    function _approve(address _owner, address _spender, uint256 _amount) internal {
        require(_owner != address(0), "ERC20: approve from the zero address");
        require(_spender != address(0), "ERC20: approve to the zero address");
        _allowances[_owner][_spender] = _amount;
        emit Approval(_owner, _spender, _amount);
    }

    // ============ Internal — helpers ============

    /**
     * @dev Checks if the caller is an authorized CPO certifier.
     *      Queries the identity registry (as IGalileoIdentityRegistry) for
     *      AUTHENTICATOR or SERVICE_CENTER claim topics.
     *      Falls back to false if the registry doesn't support batchVerify.
     */
    function _isCertifierAuthorized(address certifier) internal view returns (bool) {
        uint256[] memory topics = new uint256[](2);
        topics[0] = GalileoClaimTopics.AUTHENTICATOR;
        topics[1] = GalileoClaimTopics.SERVICE_CENTER;
        try IGalileoIdentityRegistry(address(_tokenIdentityRegistry)).batchVerify(certifier, topics)
            returns (bool[] memory results)
        {
            return results[0] || results[1];
        } catch {
            return false;
        }
    }

    /**
     * @dev Returns true if the given reason code is one of the seven valid codes.
     */
    function _isValidReasonCode(bytes32 code) internal pure returns (bool) {
        return code == REASON_SALE
            || code == REASON_GIFT
            || code == REASON_INHERITANCE
            || code == REASON_WARRANTY_CLAIM
            || code == REASON_SERVICE_TRANSFER
            || code == REASON_AUCTION
            || code == REASON_LOAN;
    }
}
