// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoToken} from "../../src/token/GalileoToken.sol";
import {IGalileoToken} from "../../src/interfaces/token/IGalileoToken.sol";
import {IIdentityRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistry.sol";
import {IModularCompliance} from "@erc3643org/erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IERC734} from "@onchain-id/solidity/contracts/interface/IERC734.sol";
import {GalileoClaimTopics} from "../../src/interfaces/identity/IClaimTopicsRegistry.sol";
import {IGalileoIdentityRegistry} from "../../src/interfaces/identity/IIdentityRegistry.sol";

/**
 * @title GalileoToken Unit Tests
 * @dev All external contracts are mocked with vm.mockCall to isolate the token logic.
 *
 *      Test structure:
 *        - Constructor: initialization, access control, metadata, single-supply mint
 *        - ERC-20 / IERC20: approve, transfer, transferFrom, allowance, balanceOf
 *        - Token info setters: setName, setSymbol, setOnchainID
 *        - Registry setters: setIdentityRegistry, setCompliance
 *        - Pause/Unpause
 *        - Freeze: setAddressFrozen, freezePartialTokens, unfreezePartialTokens, batches
 *        - Mint, Burn, ForcedTransfer
 *        - Recovery
 *        - CPO certification / revocation
 *        - TransferWithReason
 *        - Decommission
 *        - Product metadata views
 *        - Batch operations
 *        - Access control guards
 */
contract GalileoTokenTest is Test {
    // ============ Mirror events (Solidity 0.8.17 cannot use Interface.EventName) ============

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event UpdatedTokenInformation(
        string indexed _newName,
        string indexed _newSymbol,
        uint8 _newDecimals,
        string _newVersion,
        address indexed _newOnchainID
    );
    event IdentityRegistryAdded(address indexed _identityRegistry);
    event ComplianceAdded(address indexed _compliance);
    event Paused(address _userAddress);
    event Unpaused(address _userAddress);
    event AddressFrozen(address indexed _userAddress, bool indexed _isFrozen, address indexed _owner);
    event TokensFrozen(address indexed _userAddress, uint256 _amount);
    event TokensUnfrozen(address indexed _userAddress, uint256 _amount);
    event RecoverySuccess(
        address indexed _lostWallet,
        address indexed _newWallet,
        address indexed _investorOnchainID
    );
    event CPOCertified(
        address indexed token,
        address indexed certifier,
        uint256 timestamp,
        string certificationURI
    );
    event CPORevoked(
        address indexed token,
        address indexed revoker,
        uint256 timestamp,
        string reason
    );
    event TransferWithReason(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed reasonCode,
        string reasonDescription
    );
    event AgentAdded(address indexed _agent);
    event AgentRemoved(address indexed _agent);

    // ============ State ============

    GalileoToken token;

    address admin   = makeAddr("admin");
    address agent   = makeAddr("agent");
    address owner1  = makeAddr("owner1");
    address owner2  = makeAddr("owner2");
    address certifier = makeAddr("certifier");
    address nobody  = makeAddr("nobody");

    address identityRegistry = makeAddr("identityRegistry");
    address compliance       = makeAddr("compliance");
    address onchainIDAddr    = makeAddr("onchainID");

    GalileoToken.ProductConfig config;

    bytes32 constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 constant AGENT_ROLE = keccak256("AGENT_ROLE");

    bytes32 constant REASON_SALE = keccak256("SALE");
    bytes32 constant REASON_GIFT = keccak256("GIFT");
    bytes32 constant REASON_INHERITANCE = keccak256("INHERITANCE");
    bytes32 constant REASON_WARRANTY_CLAIM = keccak256("WARRANTY_CLAIM");
    bytes32 constant REASON_SERVICE_TRANSFER = keccak256("SERVICE_TRANSFER");
    bytes32 constant REASON_AUCTION = keccak256("AUCTION");
    bytes32 constant REASON_LOAN = keccak256("LOAN");

    // ============ Setup ============

    function setUp() public {
        // Mock compliance.bindToken (called in constructor)
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.bindToken.selector, address(0)),
            abi.encode()
        );
        // Mock compliance.created (called in constructor for initial mint)
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.created.selector),
            abi.encode()
        );

        config = GalileoToken.ProductConfig({
            tokenName: "Louis Vuitton Speedy 30",
            tokenSymbol: "LV-S30-SN1",
            productDID: "did:galileo:01:01234567890128:21:SN123456",
            productCategory: "HANDBAG",
            brandDID: "did:galileo:brand:lvmh-louis-vuitton",
            productURI: "ipfs://Qm.../product.json",
            gtin: "01234567890128",
            serialNumber: "SN123456"
        });

        vm.warp(1000); // Avoid block.timestamp edge cases
        token = new GalileoToken(admin, identityRegistry, compliance, config, owner1);

        // Grant agent role
        vm.prank(admin);
        token.grantRole(AGENT_ROLE, agent);
    }

    // ============ Helpers ============

    function _mockIsVerified(address user, bool result) internal {
        vm.mockCall(
            identityRegistry,
            abi.encodeWithSelector(IIdentityRegistry.isVerified.selector, user),
            abi.encode(result)
        );
    }

    function _mockCanTransfer(address from, address to, uint256 amount, bool result) internal {
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.canTransfer.selector, from, to, amount),
            abi.encode(result)
        );
    }

    function _mockTransferred(address from, address to, uint256 amount) internal {
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.transferred.selector, from, to, amount),
            abi.encode()
        );
    }

    function _mockCreated(address to, uint256 amount) internal {
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.created.selector, to, amount),
            abi.encode()
        );
    }

    function _mockDestroyed(address from, uint256 amount) internal {
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.destroyed.selector, from, amount),
            abi.encode()
        );
    }

    function _mockBatchVerify(address user, bool[2] memory results) internal {
        uint256[] memory topics = new uint256[](2);
        topics[0] = GalileoClaimTopics.AUTHENTICATOR;
        topics[1] = GalileoClaimTopics.SERVICE_CENTER;
        bool[] memory r = new bool[](2);
        r[0] = results[0];
        r[1] = results[1];
        vm.mockCall(
            identityRegistry,
            abi.encodeWithSelector(IGalileoIdentityRegistry.batchVerify.selector, user, topics),
            abi.encode(r)
        );
    }

    function _mockInvestorCountry(address user, uint16 country) internal {
        vm.mockCall(
            identityRegistry,
            abi.encodeWithSelector(IIdentityRegistry.investorCountry.selector, user),
            abi.encode(country)
        );
    }

    function _mockRegisterIdentity(address user, address id, uint16 country) internal {
        vm.mockCall(
            identityRegistry,
            abi.encodeWithSelector(IIdentityRegistry.registerIdentity.selector, user, id, country),
            abi.encode()
        );
    }

    function _mockDeleteIdentity(address user) internal {
        vm.mockCall(
            identityRegistry,
            abi.encodeWithSelector(IIdentityRegistry.deleteIdentity.selector, user),
            abi.encode()
        );
    }

    function _setupTransfer(address from, address to, uint256 amount) internal {
        _mockIsVerified(to, true);
        _mockCanTransfer(from, to, amount, true);
        _mockTransferred(from, to, amount);
    }

    // Transfer ownership1 token to owner2 (unpauses first)
    function _transferToOwner2() internal {
        vm.prank(agent);
        token.unpause();
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        token.transfer(owner2, 1);
    }

    // ============ SECTION: Constructor ============

    function test_constructor_setsRoles() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(REGISTRY_ADMIN_ROLE, admin));
    }

    function test_constructor_roleHierarchy() public view {
        assertEq(token.getRoleAdmin(REGISTRY_ADMIN_ROLE), token.DEFAULT_ADMIN_ROLE());
        assertEq(token.getRoleAdmin(AGENT_ROLE), REGISTRY_ADMIN_ROLE);
    }

    function test_constructor_setsTokenMetadata() public view {
        assertEq(token.name(), config.tokenName);
        assertEq(token.symbol(), config.tokenSymbol);
        assertEq(token.decimals(), 0);
        assertEq(token.version(), "4.1.3");
    }

    function test_constructor_setsProductMetadata() public view {
        assertEq(token.productDID(), config.productDID);
        assertEq(token.productCategory(), config.productCategory);
        assertEq(token.brandDID(), config.brandDID);
        assertEq(token.productURI(), config.productURI);
        assertEq(token.gtin(), config.gtin);
        assertEq(token.serialNumber(), config.serialNumber);
    }

    function test_constructor_setsTimestamps() public view {
        assertEq(token.createdAt(), 1000);
    }

    function test_constructor_startsPaused() public view {
        assertTrue(token.paused());
    }

    function test_constructor_mintsOneTokenToInitialOwner() public view {
        assertEq(token.totalSupply(), 1);
        assertEq(token.balanceOf(owner1), 1);
    }

    function test_constructor_setsIdentityRegistry() public view {
        assertEq(address(token.identityRegistry()), identityRegistry);
    }

    function test_constructor_setsCompliance() public view {
        assertEq(address(token.compliance()), compliance);
    }

    function test_constructor_onchainIDIsZeroInitially() public view {
        assertEq(token.onchainID(), address(0));
    }

    function test_constructor_notDecommissioned() public view {
        assertFalse(token.isDecommissioned());
    }

    function test_constructor_notCPOCertified() public view {
        assertFalse(token.isCPOCertified());
    }

    function test_constructor_reverts_zeroAdmin() public {
        vm.expectRevert("GalileoToken: zero admin");
        new GalileoToken(address(0), identityRegistry, compliance, config, owner1);
    }

    function test_constructor_reverts_zeroIdentityRegistry() public {
        vm.expectRevert("GalileoToken: zero identity registry");
        new GalileoToken(admin, address(0), compliance, config, owner1);
    }

    function test_constructor_reverts_zeroCompliance() public {
        vm.expectRevert("GalileoToken: zero compliance");
        new GalileoToken(admin, identityRegistry, address(0), config, owner1);
    }

    function test_constructor_reverts_emptyName() public {
        config.tokenName = "";
        vm.expectRevert("GalileoToken: empty name");
        new GalileoToken(admin, identityRegistry, compliance, config, owner1);
    }

    function test_constructor_reverts_emptySymbol() public {
        config.tokenSymbol = "";
        vm.expectRevert("GalileoToken: empty symbol");
        new GalileoToken(admin, identityRegistry, compliance, config, owner1);
    }

    function test_constructor_reverts_emptyProductDID() public {
        config.productDID = "";
        vm.expectRevert("GalileoToken: empty product DID");
        new GalileoToken(admin, identityRegistry, compliance, config, owner1);
    }

    function test_constructor_reverts_zeroInitialOwner() public {
        vm.expectRevert("GalileoToken: zero initial owner");
        new GalileoToken(admin, identityRegistry, compliance, config, address(0));
    }

    function test_constructor_emitsIdentityRegistryAdded() public {
        vm.expectEmit(true, false, false, false);
        emit IdentityRegistryAdded(identityRegistry);
        new GalileoToken(admin, identityRegistry, compliance, config, owner1);
    }

    function test_constructor_emitsComplianceAdded() public {
        vm.expectEmit(true, false, false, false);
        emit ComplianceAdded(compliance);
        new GalileoToken(admin, identityRegistry, compliance, config, owner1);
    }

    // ============ SECTION: Token info setters (REGISTRY_ADMIN_ROLE) ============

    function test_setName_updatesName() public {
        vm.prank(admin);
        token.setName("New Name");
        assertEq(token.name(), "New Name");
    }

    function test_setName_emitsEvent() public {
        vm.prank(admin);
        vm.expectEmit(false, false, false, false);
        emit UpdatedTokenInformation("New Name", "", 0, "", address(0));
        token.setName("New Name");
    }

    function test_setName_reverts_emptyString() public {
        vm.prank(admin);
        vm.expectRevert("invalid argument - empty string");
        token.setName("");
    }

    function test_setName_reverts_notAdmin() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.setName("x");
    }

    function test_setSymbol_updatesSymbol() public {
        vm.prank(admin);
        token.setSymbol("XYZ");
        assertEq(token.symbol(), "XYZ");
    }

    function test_setSymbol_reverts_emptyString() public {
        vm.prank(admin);
        vm.expectRevert("invalid argument - empty string");
        token.setSymbol("");
    }

    function test_setSymbol_reverts_notAdmin() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.setSymbol("x");
    }

    function test_setOnchainID_updatesID() public {
        vm.prank(admin);
        token.setOnchainID(onchainIDAddr);
        assertEq(token.onchainID(), onchainIDAddr);
    }

    function test_setOnchainID_allowsZeroAddress() public {
        vm.prank(admin);
        token.setOnchainID(onchainIDAddr);
        vm.prank(admin);
        token.setOnchainID(address(0));
        assertEq(token.onchainID(), address(0));
    }

    function test_setOnchainID_reverts_notAdmin() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.setOnchainID(onchainIDAddr);
    }

    // ============ SECTION: Registry setters ============

    function test_setIdentityRegistry_updatesRegistry() public {
        address newReg = makeAddr("newReg");
        vm.prank(admin);
        token.setIdentityRegistry(newReg);
        assertEq(address(token.identityRegistry()), newReg);
    }

    function test_setIdentityRegistry_emitsEvent() public {
        address newReg = makeAddr("newReg");
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit IdentityRegistryAdded(newReg);
        token.setIdentityRegistry(newReg);
    }

    function test_setIdentityRegistry_reverts_zeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("GalileoToken: zero address");
        token.setIdentityRegistry(address(0));
    }

    function test_setIdentityRegistry_reverts_notAdmin() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.setIdentityRegistry(makeAddr("x"));
    }

    function test_setCompliance_updatesCompliance() public {
        address newComp = makeAddr("newComp");
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.unbindToken.selector, address(token)),
            abi.encode()
        );
        vm.mockCall(
            newComp,
            abi.encodeWithSelector(IModularCompliance.bindToken.selector, address(token)),
            abi.encode()
        );
        vm.prank(admin);
        token.setCompliance(newComp);
        assertEq(address(token.compliance()), newComp);
    }

    function test_setCompliance_callsUnbindOnOld() public {
        address newComp = makeAddr("newComp");
        vm.mockCall(
            newComp,
            abi.encodeWithSelector(IModularCompliance.bindToken.selector, address(token)),
            abi.encode()
        );
        // Expect unbindToken on old compliance
        vm.expectCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.unbindToken.selector, address(token))
        );
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.unbindToken.selector, address(token)),
            abi.encode()
        );
        vm.prank(admin);
        token.setCompliance(newComp);
    }

    function test_setCompliance_emitsEvent() public {
        address newComp = makeAddr("newComp");
        vm.mockCall(
            compliance,
            abi.encodeWithSelector(IModularCompliance.unbindToken.selector, address(token)),
            abi.encode()
        );
        vm.mockCall(
            newComp,
            abi.encodeWithSelector(IModularCompliance.bindToken.selector, address(token)),
            abi.encode()
        );
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit ComplianceAdded(newComp);
        token.setCompliance(newComp);
    }

    function test_setCompliance_reverts_zeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("GalileoToken: zero address");
        token.setCompliance(address(0));
    }

    function test_setCompliance_reverts_notAdmin() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.setCompliance(makeAddr("x"));
    }

    // ============ SECTION: Pause / Unpause ============

    function test_pause_pausesToken() public {
        // Token starts paused — unpause first
        vm.prank(agent);
        token.unpause();
        assertFalse(token.paused());
        vm.prank(agent);
        token.pause();
        assertTrue(token.paused());
    }

    function test_pause_emitsEvent() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        vm.expectEmit(false, false, false, true);
        emit Paused(agent);
        token.pause();
    }

    function test_pause_reverts_whenAlreadyPaused() public {
        // Already paused from constructor; whenNotPaused modifier reverts with this message
        vm.prank(agent);
        vm.expectRevert("Pausable: paused");
        token.pause();
    }

    function test_pause_reverts_notAgent() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(nobody);
        vm.expectRevert();
        token.pause();
    }

    function test_unpause_unpausesToken() public {
        vm.prank(agent);
        token.unpause();
        assertFalse(token.paused());
    }

    function test_unpause_emitsEvent() public {
        vm.prank(agent);
        vm.expectEmit(false, false, false, true);
        emit Unpaused(agent);
        token.unpause();
    }

    function test_unpause_reverts_whenNotPaused() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        vm.expectRevert("Pausable: not paused"); // whenPaused modifier reverts with this message
        token.unpause();
    }

    function test_unpause_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.unpause();
    }

    // ============ SECTION: ERC-20 Approve / Allowance ============

    function test_approve_setsAllowance() public {
        vm.prank(owner1);
        token.approve(owner2, 1);
        assertEq(token.allowance(owner1, owner2), 1);
    }

    function test_approve_emitsEvent() public {
        vm.prank(owner1);
        vm.expectEmit(true, true, false, true);
        emit Approval(owner1, owner2, 1);
        token.approve(owner2, 1);
    }

    function test_increaseAllowance() public {
        vm.prank(owner1);
        token.approve(owner2, 1);
        vm.prank(owner1);
        token.increaseAllowance(owner2, 2);
        assertEq(token.allowance(owner1, owner2), 3);
    }

    function test_decreaseAllowance() public {
        vm.prank(owner1);
        token.approve(owner2, 5);
        vm.prank(owner1);
        token.decreaseAllowance(owner2, 3);
        assertEq(token.allowance(owner1, owner2), 2);
    }

    // ============ SECTION: Transfer ============

    function test_transfer_movesToken() public {
        vm.prank(agent);
        token.unpause();
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        assertTrue(token.transfer(owner2, 1));
        assertEq(token.balanceOf(owner1), 0);
        assertEq(token.balanceOf(owner2), 1);
    }

    function test_transfer_emitsTransfer() public {
        vm.prank(agent);
        token.unpause();
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner1, owner2, 1);
        token.transfer(owner2, 1);
    }

    function test_transfer_reverts_whenPaused() public {
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        vm.expectRevert("Pausable: paused");
        token.transfer(owner2, 1);
    }

    function test_transfer_reverts_senderFrozen() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        token.setAddressFrozen(owner1, true);
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        vm.expectRevert("wallet is frozen");
        token.transfer(owner2, 1);
    }

    function test_transfer_reverts_receiverFrozen() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        token.setAddressFrozen(owner2, true);
        _mockIsVerified(owner2, true);
        _mockCanTransfer(owner1, owner2, 1, true);
        vm.prank(owner1);
        vm.expectRevert("wallet is frozen");
        token.transfer(owner2, 1);
    }

    function test_transfer_reverts_insufficientBalance() public {
        vm.prank(agent);
        token.unpause();
        _mockIsVerified(owner2, true);
        _mockCanTransfer(owner1, owner2, 2, true);
        vm.prank(owner1);
        vm.expectRevert("Insufficient Balance");
        token.transfer(owner2, 2);
    }

    function test_transfer_reverts_receiverNotVerified() public {
        vm.prank(agent);
        token.unpause();
        _mockIsVerified(owner2, false);
        vm.prank(owner1);
        vm.expectRevert("Transfer not possible");
        token.transfer(owner2, 1);
    }

    function test_transfer_reverts_complianceBlocked() public {
        vm.prank(agent);
        token.unpause();
        _mockIsVerified(owner2, true);
        _mockCanTransfer(owner1, owner2, 1, false);
        vm.prank(owner1);
        vm.expectRevert("Transfer not possible");
        token.transfer(owner2, 1);
    }

    function test_transfer_reverts_decommissioned() public {
        vm.prank(agent);
        token.unpause();
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.decommission(owner1, "lost");
        // Try to transfer after decommission
        _mockIsVerified(owner2, true);
        _mockCanTransfer(owner1, owner2, 1, true);
        vm.prank(owner1);
        vm.expectRevert("Token decommissioned");
        token.transfer(owner2, 1);
    }

    function test_transfer_respectsFrozenTokens() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1); // freeze the 1 token
        _mockIsVerified(owner2, true);
        _mockCanTransfer(owner1, owner2, 1, true);
        vm.prank(owner1);
        vm.expectRevert("Insufficient Balance");
        token.transfer(owner2, 1);
    }

    // ============ SECTION: TransferFrom ============

    function test_transferFrom_movesToken() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(owner1);
        token.approve(owner2, 1);
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner2);
        assertTrue(token.transferFrom(owner1, owner2, 1));
        assertEq(token.balanceOf(owner1), 0);
        assertEq(token.balanceOf(owner2), 1);
    }

    function test_transferFrom_reducesAllowance() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(owner1);
        token.approve(owner2, 5);
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner2);
        token.transferFrom(owner1, owner2, 1);
        assertEq(token.allowance(owner1, owner2), 4);
    }

    function test_transferFrom_reverts_whenPaused() public {
        vm.prank(owner1);
        token.approve(owner2, 1);
        vm.prank(owner2);
        vm.expectRevert("Pausable: paused");
        token.transferFrom(owner1, owner2, 1);
    }

    function test_transferFrom_reverts_insufficientAllowance() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(owner1);
        token.approve(owner2, 0);
        vm.prank(owner2);
        vm.expectRevert();
        token.transferFrom(owner1, owner2, 1);
    }

    function test_transferFrom_reverts_receiverNotVerified() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(owner1);
        token.approve(owner2, 1);
        _mockIsVerified(owner2, false);
        vm.prank(owner2);
        vm.expectRevert("Transfer not possible");
        token.transferFrom(owner1, owner2, 1);
    }

    function test_transferFrom_revertsWhenSenderFrozen() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        token.setAddressFrozen(owner1, true);
        vm.prank(owner1);
        token.approve(owner2, 1);
        vm.prank(owner2);
        vm.expectRevert("wallet is frozen");
        token.transferFrom(owner1, owner2, 1);
    }

    function test_transferFrom_revertsWhenReceiverFrozen() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        token.setAddressFrozen(owner2, true);
        vm.prank(owner1);
        token.approve(owner2, 1);
        vm.prank(owner2);
        vm.expectRevert("wallet is frozen");
        token.transferFrom(owner1, owner2, 1);
    }

    function test_transferFrom_revertsWhenFrozenExceedsAvailable() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1); // freeze all tokens
        vm.prank(owner1);
        token.approve(owner2, 1);
        _mockIsVerified(owner2, true);
        _mockCanTransfer(owner1, owner2, 1, true);
        vm.prank(owner2);
        vm.expectRevert("Insufficient Balance");
        token.transferFrom(owner1, owner2, 1);
    }

    // ============ SECTION: Freeze ============

    function test_setAddressFrozen_freezesAddress() public {
        vm.prank(agent);
        token.setAddressFrozen(owner1, true);
        assertTrue(token.isFrozen(owner1));
    }

    function test_setAddressFrozen_unfreezesAddress() public {
        vm.prank(agent);
        token.setAddressFrozen(owner1, true);
        vm.prank(agent);
        token.setAddressFrozen(owner1, false);
        assertFalse(token.isFrozen(owner1));
    }

    function test_setAddressFrozen_emitsEvent() public {
        vm.prank(agent);
        vm.expectEmit(true, true, true, false);
        emit AddressFrozen(owner1, true, agent);
        token.setAddressFrozen(owner1, true);
    }

    function test_setAddressFrozen_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.setAddressFrozen(owner1, true);
    }

    function test_freezePartialTokens_freezesAmount() public {
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1);
        assertEq(token.getFrozenTokens(owner1), 1);
    }

    function test_freezePartialTokens_emitsEvent() public {
        vm.prank(agent);
        vm.expectEmit(true, false, false, true);
        emit TokensFrozen(owner1, 1);
        token.freezePartialTokens(owner1, 1);
    }

    function test_freezePartialTokens_reverts_exceedsBalance() public {
        vm.prank(agent);
        vm.expectRevert("Amount exceeds available balance");
        token.freezePartialTokens(owner1, 2);
    }

    function test_freezePartialTokens_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.freezePartialTokens(owner1, 1);
    }

    function test_unfreezePartialTokens_decreasesAmount() public {
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1);
        vm.prank(agent);
        token.unfreezePartialTokens(owner1, 1);
        assertEq(token.getFrozenTokens(owner1), 0);
    }

    function test_unfreezePartialTokens_emitsEvent() public {
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1);
        vm.prank(agent);
        vm.expectEmit(true, false, false, true);
        emit TokensUnfrozen(owner1, 1);
        token.unfreezePartialTokens(owner1, 1);
    }

    function test_unfreezePartialTokens_reverts_exceedsFrozen() public {
        vm.prank(agent);
        vm.expectRevert("Amount should be less than or equal to frozen tokens");
        token.unfreezePartialTokens(owner1, 1);
    }

    function test_unfreezePartialTokens_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.unfreezePartialTokens(owner1, 0);
    }

    // ============ SECTION: Mint ============

    function test_mint_mintsTokens() public {
        // Burn the existing token first so totalSupply == 0 (re-issuance scenario)
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.burn(owner1, 1);

        address newAddr = makeAddr("newAddr");
        _mockIsVerified(newAddr, true);
        _mockCanTransfer(address(0), newAddr, 1, true);
        _mockCreated(newAddr, 1);
        vm.prank(agent);
        token.mint(newAddr, 1);
        assertEq(token.balanceOf(newAddr), 1);
        assertEq(token.totalSupply(), 1);
    }

    function test_mint_emitsTransfer() public {
        // Burn the existing token first so totalSupply == 0 (re-issuance scenario)
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.burn(owner1, 1);

        address newAddr = makeAddr("newAddr");
        _mockIsVerified(newAddr, true);
        _mockCanTransfer(address(0), newAddr, 1, true);
        _mockCreated(newAddr, 1);
        vm.prank(agent);
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), newAddr, 1);
        token.mint(newAddr, 1);
    }

    function test_mint_reverts_notVerified() public {
        // Burn existing token so supply is 0, then hit the identity check
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.burn(owner1, 1);

        address newAddr = makeAddr("newAddr");
        _mockIsVerified(newAddr, false);
        vm.prank(agent);
        vm.expectRevert("Identity is not verified.");
        token.mint(newAddr, 1);
    }

    function test_mint_reverts_complianceBlocked() public {
        // Burn existing token so supply is 0, then hit the compliance check
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.burn(owner1, 1);

        address newAddr = makeAddr("newAddr");
        _mockIsVerified(newAddr, true);
        _mockCanTransfer(address(0), newAddr, 1, false);
        vm.prank(agent);
        vm.expectRevert("Compliance not followed");
        token.mint(newAddr, 1);
    }

    function test_mint_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.mint(owner2, 1);
    }

    function test_mint_reverts_secondMint() public {
        // totalSupply is already 1 from constructor — any further mint must revert
        address newAddr = makeAddr("newAddr");
        vm.prank(agent);
        vm.expectRevert("Token already minted");
        token.mint(newAddr, 1);
    }

    function test_batchMint_reverts_afterMint() public {
        // totalSupply is already 1 from constructor — batchMint must revert
        address[] memory tos = new address[](1);
        tos[0] = makeAddr("addr1");
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;
        vm.prank(agent);
        vm.expectRevert("Token already minted");
        token.batchMint(tos, amounts);
    }

    function test_batchMint_reverts_multipleRecipients() public {
        // Burn existing token so supply is 0, then try batch with 2 recipients
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.burn(owner1, 1);

        address[] memory tos = new address[](2);
        tos[0] = makeAddr("addr1");
        tos[1] = makeAddr("addr2");
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1;
        amounts[1] = 1;
        vm.prank(agent);
        vm.expectRevert("Single supply: batch limited to 1");
        token.batchMint(tos, amounts);
    }

    function test_mint_reverts_whenDecommissioned() public {
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.decommission(owner1, "destroyed");
        _mockIsVerified(owner2, true);
        _mockCanTransfer(address(0), owner2, 1, true);
        vm.prank(agent);
        vm.expectRevert("Token decommissioned");
        token.mint(owner2, 1);
    }

    // ============ SECTION: Burn ============

    function test_burn_reducesBalance() public {
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.burn(owner1, 1);
        assertEq(token.balanceOf(owner1), 0);
        assertEq(token.totalSupply(), 0);
    }

    function test_burn_emitsTransfer() public {
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner1, address(0), 1);
        token.burn(owner1, 1);
    }

    function test_burn_unfreezesExcessTokensFirst() public {
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1);
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        vm.expectEmit(true, false, false, true);
        emit TokensUnfrozen(owner1, 1);
        token.burn(owner1, 1);
        assertEq(token.getFrozenTokens(owner1), 0);
    }

    function test_burn_reverts_exceedsBalance() public {
        vm.prank(agent);
        vm.expectRevert("cannot burn more than balance");
        token.burn(owner1, 2);
    }

    function test_burn_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.burn(owner1, 1);
    }

    // ============ SECTION: ForcedTransfer ============

    function test_forcedTransfer_movesToken() public {
        _mockIsVerified(owner2, true);
        _mockTransferred(owner1, owner2, 1);
        vm.prank(agent);
        assertTrue(token.forcedTransfer(owner1, owner2, 1));
        assertEq(token.balanceOf(owner2), 1);
        assertEq(token.balanceOf(owner1), 0);
    }

    function test_forcedTransfer_unfreezesIfNeeded() public {
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1);
        _mockIsVerified(owner2, true);
        _mockTransferred(owner1, owner2, 1);
        vm.prank(agent);
        vm.expectEmit(true, false, false, true);
        emit TokensUnfrozen(owner1, 1);
        token.forcedTransfer(owner1, owner2, 1);
        assertEq(token.getFrozenTokens(owner1), 0);
    }

    function test_forcedTransfer_reverts_insufficientBalance() public {
        vm.prank(agent);
        vm.expectRevert("sender balance too low");
        token.forcedTransfer(owner1, owner2, 2);
    }

    function test_forcedTransfer_reverts_receiverNotVerified() public {
        _mockIsVerified(owner2, false);
        vm.prank(agent);
        vm.expectRevert("Transfer not possible");
        token.forcedTransfer(owner1, owner2, 1);
    }

    function test_forcedTransfer_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.forcedTransfer(owner1, owner2, 1);
    }

    function test_forcedTransfer_reverts_whenDecommissioned() public {
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.decommission(owner1, "destroyed");
        _mockIsVerified(owner2, true);
        _mockTransferred(owner1, owner2, 1);
        vm.prank(agent);
        vm.expectRevert("Token decommissioned");
        token.forcedTransfer(owner1, owner2, 1);
    }

    // ============ SECTION: Recovery ============

    function test_recoveryAddress_recoversTokens() public {
        address newWallet = makeAddr("newWallet");
        address investorID = makeAddr("investorID");

        // Mock keyHasPurpose: returns true
        bytes32 key = keccak256(abi.encode(newWallet));
        vm.mockCall(
            investorID,
            abi.encodeWithSelector(IERC734.keyHasPurpose.selector, key, 1),
            abi.encode(true)
        );
        _mockInvestorCountry(owner1, 840);
        _mockRegisterIdentity(newWallet, investorID, 840);
        _mockIsVerified(newWallet, true);
        _mockTransferred(owner1, newWallet, 1);
        _mockDeleteIdentity(owner1);

        vm.prank(agent);
        assertTrue(token.recoveryAddress(owner1, newWallet, investorID));
        assertEq(token.balanceOf(newWallet), 1);
        assertEq(token.balanceOf(owner1), 0);
    }

    function test_recoveryAddress_emitsRecoverySuccess() public {
        address newWallet = makeAddr("newWallet");
        address investorID = makeAddr("investorID");

        bytes32 key = keccak256(abi.encode(newWallet));
        vm.mockCall(
            investorID,
            abi.encodeWithSelector(IERC734.keyHasPurpose.selector, key, 1),
            abi.encode(true)
        );
        _mockInvestorCountry(owner1, 840);
        _mockRegisterIdentity(newWallet, investorID, 840);
        _mockIsVerified(newWallet, true);
        _mockTransferred(owner1, newWallet, 1);
        _mockDeleteIdentity(owner1);

        vm.prank(agent);
        vm.expectEmit(true, true, true, false);
        emit RecoverySuccess(owner1, newWallet, investorID);
        token.recoveryAddress(owner1, newWallet, investorID);
    }

    function test_recoveryAddress_reverts_noTokens() public {
        address newWallet = makeAddr("newWallet");
        address investorID = makeAddr("investorID");
        vm.prank(agent);
        vm.expectRevert("no tokens to recover");
        token.recoveryAddress(owner2, newWallet, investorID); // owner2 has no tokens
    }

    function test_recoveryAddress_reverts_keyNotPurpose1() public {
        address newWallet = makeAddr("newWallet");
        address investorID = makeAddr("investorID");
        bytes32 key = keccak256(abi.encode(newWallet));
        vm.mockCall(
            investorID,
            abi.encodeWithSelector(IERC734.keyHasPurpose.selector, key, 1),
            abi.encode(false)
        );
        vm.prank(agent);
        vm.expectRevert("Recovery not possible");
        token.recoveryAddress(owner1, newWallet, investorID);
    }

    function test_recoveryAddress_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.recoveryAddress(owner1, owner2, makeAddr("id"));
    }

    // ============ SECTION: CPO Certification ============

    function test_certifyCPO_setsCPOState() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.warp(2000);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert123");
        assertTrue(token.isCPOCertified());
        assertEq(token.cpoCertifier(), certifier);
        assertEq(token.cpoCertificationDate(), 2000);
        assertEq(token.cpoCertificationURI(), "ipfs://cert123");
    }

    function test_certifyCPO_worksWith_SERVICE_CENTER() public {
        _mockBatchVerify(certifier, [false, true]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://sc-cert");
        assertTrue(token.isCPOCertified());
    }

    function test_certifyCPO_emitsEvent() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.warp(3000);
        vm.prank(certifier);
        vm.expectEmit(true, true, false, false);
        emit CPOCertified(address(token), certifier, 3000, "ipfs://cert");
        token.certifyCPO("ipfs://cert");
    }

    function test_certifyCPO_reverts_notAuthorized() public {
        _mockBatchVerify(certifier, [false, false]);
        vm.prank(certifier);
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotAuthorizedCertifier.selector, certifier));
        token.certifyCPO("ipfs://cert");
    }

    function test_certifyCPO_reverts_alreadyCertified() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert1");
        // Try to certify again
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        vm.expectRevert(
            abi.encodeWithSelector(IGalileoToken.AlreadyCPOCertified.selector, address(token), certifier)
        );
        token.certifyCPO("ipfs://cert2");
    }

    function test_certifyCPO_fallsBackToFalse_ifRegistryNoBatchVerify() public {
        // Identity registry doesn't support batchVerify → try/catch returns false → NotAuthorizedCertifier
        // Use vm.expectRevert() without specific data since the revert path goes through a no-code address call
        _mockBatchVerify(certifier, [false, false]);
        vm.prank(certifier);
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotAuthorizedCertifier.selector, certifier));
        token.certifyCPO("ipfs://cert");
    }

    function test_certifyCPO_fallbackWhenBatchVerifyReverts() public {
        // batchVerify actually reverts → catch block returns false → NotAuthorizedCertifier
        uint256[] memory topics = new uint256[](2);
        topics[0] = GalileoClaimTopics.AUTHENTICATOR;
        topics[1] = GalileoClaimTopics.SERVICE_CENTER;
        vm.mockCallRevert(
            identityRegistry,
            abi.encodeWithSelector(IGalileoIdentityRegistry.batchVerify.selector, certifier, topics),
            "batchVerify: not supported"
        );
        vm.prank(certifier);
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotAuthorizedCertifier.selector, certifier));
        token.certifyCPO("ipfs://cert");
    }

    // ============ SECTION: CPO Views ============

    function test_cpoCertificationDate_reverts_notCertified() public {
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotCPOCertified.selector, address(token)));
        token.cpoCertificationDate();
    }

    function test_cpoCertifier_reverts_notCertified() public {
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotCPOCertified.selector, address(token)));
        token.cpoCertifier();
    }

    function test_cpoCertificationURI_reverts_notCertified() public {
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotCPOCertified.selector, address(token)));
        token.cpoCertificationURI();
    }

    // ============ SECTION: CPO Revocation ============

    function test_revokeCPO_byCertifier() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert");
        vm.prank(certifier);
        token.revokeCPO("damage");
        assertFalse(token.isCPOCertified());
    }

    function test_revokeCPO_byAgent() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert");
        vm.prank(agent);
        token.revokeCPO("agent revoke");
        assertFalse(token.isCPOCertified());
    }

    function test_revokeCPO_emitsEvent() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert");
        vm.warp(5000);
        vm.prank(certifier);
        vm.expectEmit(true, true, false, false);
        emit CPORevoked(address(token), certifier, 5000, "damage");
        token.revokeCPO("damage");
    }

    function test_revokeCPO_clearsCPOState() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert");
        vm.prank(certifier);
        token.revokeCPO("reason");
        assertFalse(token.isCPOCertified());
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotCPOCertified.selector, address(token)));
        token.cpoCertifier();
    }

    function test_revokeCPO_reverts_notCertified() public {
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotCPOCertified.selector, address(token)));
        token.revokeCPO("reason");
    }

    function test_revokeCPO_reverts_unauthorizedCaller() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert");
        vm.prank(nobody); // not certifier, not agent
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.NotAuthorizedCertifier.selector, nobody));
        token.revokeCPO("malicious");
    }

    function test_revokeCPO_canRecertifyAfterRevocation() public {
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert1");
        vm.prank(certifier);
        token.revokeCPO("reason");
        // Can certify again
        _mockBatchVerify(certifier, [true, false]);
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert2");
        assertTrue(token.isCPOCertified());
    }

    // ============ SECTION: TransferWithReason ============

    function test_transferWithReason_transfersToken() public {
        vm.prank(agent);
        token.unpause();
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        assertTrue(token.transferWithReason(owner2, 1, REASON_SALE, "Primary sale"));
        assertEq(token.balanceOf(owner2), 1);
        assertEq(token.balanceOf(owner1), 0);
    }

    function test_transferWithReason_emitsTransferWithReason() public {
        vm.prank(agent);
        token.unpause();
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        vm.expectEmit(true, true, true, true);
        emit TransferWithReason(owner1, owner2, 1, REASON_SALE, "Primary sale");
        token.transferWithReason(owner2, 1, REASON_SALE, "Primary sale");
    }

    function test_transferWithReason_emitsTransfer() public {
        vm.prank(agent);
        token.unpause();
        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner1, owner2, 1);
        token.transferWithReason(owner2, 1, REASON_GIFT, "Birthday gift");
    }

    function test_transferWithReason_allValidReasonCodes() public {
        bytes32[7] memory codes = [
            REASON_SALE, REASON_GIFT, REASON_INHERITANCE,
            REASON_WARRANTY_CLAIM, REASON_SERVICE_TRANSFER,
            REASON_AUCTION, REASON_LOAN
        ];
        for (uint256 i = 0; i < codes.length; i++) {
            // Re-deploy each time to have fresh token balance
            vm.mockCall(compliance, abi.encodeWithSelector(IModularCompliance.bindToken.selector), abi.encode());
            vm.mockCall(compliance, abi.encodeWithSelector(IModularCompliance.created.selector), abi.encode());
            GalileoToken t = new GalileoToken(admin, identityRegistry, compliance, config, owner1);
            vm.prank(admin);
            t.grantRole(AGENT_ROLE, agent);
            vm.prank(agent);
            t.unpause();
            _mockIsVerified(owner2, true);
            _mockCanTransfer(owner1, owner2, 1, true);
            _mockTransferred(owner1, owner2, 1);
            vm.prank(owner1);
            t.transferWithReason(owner2, 1, codes[i], "desc");
        }
    }

    function test_transferWithReason_reverts_invalidReasonCode() public {
        vm.prank(agent);
        token.unpause();
        bytes32 invalid = keccak256("INVALID_REASON");
        vm.prank(owner1);
        vm.expectRevert(abi.encodeWithSelector(IGalileoToken.InvalidReasonCode.selector, invalid));
        token.transferWithReason(owner2, 1, invalid, "bad");
    }

    function test_transferWithReason_reverts_whenPaused() public {
        vm.prank(owner1);
        vm.expectRevert("Pausable: paused");
        token.transferWithReason(owner2, 1, REASON_SALE, "sale");
    }

    function test_transferWithReason_reverts_senderFrozen() public {
        vm.prank(agent);
        token.unpause();
        vm.prank(agent);
        token.setAddressFrozen(owner1, true);
        vm.prank(owner1);
        vm.expectRevert("wallet is frozen");
        token.transferWithReason(owner2, 1, REASON_SALE, "sale");
    }

    function test_transferWithReason_reverts_decommissioned() public {
        vm.prank(agent);
        token.unpause();
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.decommission(owner1, "lost");
        vm.prank(owner1);
        vm.expectRevert("Token decommissioned");
        token.transferWithReason(owner2, 1, REASON_SALE, "sale");
    }

    // ============ SECTION: Decommission ============

    function test_decommission_setsFlag() public {
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.decommission(owner1, "destroyed in fire");
        assertTrue(token.isDecommissioned());
        assertEq(token.decommissionReason(), "destroyed in fire");
    }

    function test_decommission_burnsTokens() public {
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.decommission(owner1, "lost");
        assertEq(token.balanceOf(owner1), 0);
        assertEq(token.totalSupply(), 0);
    }

    function test_decommission_reverts_alreadyDecommissioned() public {
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.decommission(owner1, "first");
        vm.prank(agent);
        vm.expectRevert("Already decommissioned");
        token.decommission(owner1, "second");
    }

    function test_decommission_reverts_notAgent() public {
        vm.prank(nobody);
        vm.expectRevert();
        token.decommission(owner1, "reason");
    }

    // ============ SECTION: Batch operations ============

    function test_batchTransfer_executesAllTransfers() public {
        // Owner1 has 1 token; set up two sequential transfers
        vm.prank(agent);
        token.unpause();

        address[] memory tos = new address[](1);
        tos[0] = owner2;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        _setupTransfer(owner1, owner2, 1);
        vm.prank(owner1);
        token.batchTransfer(tos, amounts);
        assertEq(token.balanceOf(owner2), 1);
    }

    function test_batchMint_mintsToSingleRecipient() public {
        // Burn the existing token first so totalSupply == 0 (re-issuance scenario)
        _mockDestroyed(owner1, 1);
        vm.prank(agent);
        token.burn(owner1, 1);

        address addr1 = makeAddr("addr1");
        _mockIsVerified(addr1, true);
        _mockCanTransfer(address(0), addr1, 1, true);
        _mockCreated(addr1, 1);

        address[] memory tos = new address[](1);
        tos[0] = addr1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.prank(agent);
        token.batchMint(tos, amounts);
        assertEq(token.balanceOf(addr1), 1);
        assertEq(token.totalSupply(), 1);
    }

    function test_batchBurn_burnsAll() public {
        _mockDestroyed(owner1, 1);

        address[] memory addrs = new address[](1);
        addrs[0] = owner1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.prank(agent);
        token.batchBurn(addrs, amounts);
        assertEq(token.balanceOf(owner1), 0);
    }

    function test_batchSetAddressFrozen_freezesAll() public {
        address[] memory addrs = new address[](2);
        addrs[0] = owner1;
        addrs[1] = owner2;
        bool[] memory freezes = new bool[](2);
        freezes[0] = true;
        freezes[1] = true;

        vm.prank(agent);
        token.batchSetAddressFrozen(addrs, freezes);
        assertTrue(token.isFrozen(owner1));
        assertTrue(token.isFrozen(owner2));
    }

    function test_batchFreezePartialTokens_freezesAmounts() public {
        address[] memory addrs = new address[](1);
        addrs[0] = owner1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.prank(agent);
        token.batchFreezePartialTokens(addrs, amounts);
        assertEq(token.getFrozenTokens(owner1), 1);
    }

    function test_batchUnfreezePartialTokens_unfreezesAmounts() public {
        vm.prank(agent);
        token.freezePartialTokens(owner1, 1);

        address[] memory addrs = new address[](1);
        addrs[0] = owner1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.prank(agent);
        token.batchUnfreezePartialTokens(addrs, amounts);
        assertEq(token.getFrozenTokens(owner1), 0);
    }

    function test_batchForcedTransfer_transfersAll() public {
        _mockIsVerified(owner2, true);
        _mockTransferred(owner1, owner2, 1);

        address[] memory froms = new address[](1);
        froms[0] = owner1;
        address[] memory tos = new address[](1);
        tos[0] = owner2;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.prank(agent);
        token.batchForcedTransfer(froms, tos, amounts);
        assertEq(token.balanceOf(owner2), 1);
    }

    // ============ SECTION: Product metadata (additional) ============

    function test_productMetadata_allFieldsReadable() public view {
        assertEq(token.productDID(), "did:galileo:01:01234567890128:21:SN123456");
        assertEq(token.productCategory(), "HANDBAG");
        assertEq(token.brandDID(), "did:galileo:brand:lvmh-louis-vuitton");
        assertEq(token.productURI(), "ipfs://Qm.../product.json");
        assertEq(token.gtin(), "01234567890128");
        assertEq(token.serialNumber(), "SN123456");
    }

    function test_decommissionReason_emptyBeforeDecommission() public view {
        assertEq(token.decommissionReason(), "");
    }

    // ============ SECTION: Access control role admin ============

    function test_agentRole_canBeGrantedByRegistryAdmin() public {
        address newAgent = makeAddr("newAgent");
        vm.prank(admin); // admin has REGISTRY_ADMIN_ROLE which admins AGENT_ROLE
        token.grantRole(AGENT_ROLE, newAgent);
        assertTrue(token.hasRole(AGENT_ROLE, newAgent));
    }

    function test_agentRole_cannotBeGrantedByDefault() public {
        address newAgent = makeAddr("newAgent");
        vm.prank(nobody);
        vm.expectRevert();
        token.grantRole(AGENT_ROLE, newAgent);
    }

    function test_registryAdminRole_cannotBeGrantedByAgent() public {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(agent);
        vm.expectRevert();
        token.grantRole(REGISTRY_ADMIN_ROLE, newAdmin);
    }

    // ============ SECTION: ERC-3643 Agent Management wrappers (M-2) ============

    function test_addAgent_grantsAgentRole() public {
        address newAgent = makeAddr("newAgent");
        assertFalse(token.isAgent(newAgent));
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit AgentAdded(newAgent);
        token.addAgent(newAgent);
        assertTrue(token.isAgent(newAgent));
        assertTrue(token.hasRole(AGENT_ROLE, newAgent));
    }

    function test_removeAgent_revokesAgentRole() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit AgentRemoved(agent);
        token.removeAgent(agent);
        assertFalse(token.isAgent(agent));
        assertFalse(token.hasRole(AGENT_ROLE, agent));
    }

    function test_isAgent_returnsCorrectStatus() public view {
        assertTrue(token.isAgent(agent));
        assertFalse(token.isAgent(nobody));
    }

    function test_addAgent_revertsNonAdmin() public {
        address newAgent = makeAddr("newAgent");
        vm.prank(nobody);
        vm.expectRevert();
        token.addAgent(newAgent);
    }
}
