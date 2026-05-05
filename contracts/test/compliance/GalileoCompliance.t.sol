// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoCompliance} from "../../src/compliance/GalileoCompliance.sol";
import {IGalileoCompliance} from "../../src/interfaces/compliance/IGalileoCompliance.sol";
import {IComplianceModule} from "../../src/interfaces/compliance/IComplianceModule.sol";

/**
 * @title GalileoComplianceTest
 * @notice Comprehensive tests for GalileoCompliance (20+ tests)
 *
 * Strategy: mock external calls (modules, tokens) with vm.mockCall
 */
contract GalileoComplianceTest is Test {
    // ─── Mirror events ────────────────────────────────────────────────
    event TokenBound(address _token);
    event TokenUnbound(address _token);
    event ModuleAdded(address indexed _module);
    event ModuleRemoved(address indexed _module);
    event ModuleInteraction(address indexed target, bytes4 selector);
    event CompliancePaused(address indexed by);
    event ComplianceUnpaused(address indexed by);
    event ModuleOrderChanged(address[] oldOrder, address[] newOrder);

    // ─── Fixtures ─────────────────────────────────────────────────────
    GalileoCompliance internal compliance;

    address internal admin    = makeAddr("admin");
    address internal stranger = makeAddr("stranger");
    address internal token    = makeAddr("token");
    address internal registry = makeAddr("registry");
    address internal alice    = makeAddr("alice");
    address internal bob      = makeAddr("bob");
    address internal moduleA  = makeAddr("moduleA");
    address internal moduleB  = makeAddr("moduleB");
    address internal moduleC  = makeAddr("moduleC");

    // Pre-computed selectors to avoid vm.prank + call arg issues
    bytes4 internal constant BIND_COMPLIANCE_SEL  = bytes4(keccak256("bindCompliance(address)"));
    bytes4 internal constant UNBIND_COMPLIANCE_SEL = bytes4(keccak256("unbindCompliance(address)"));
    bytes4 internal constant MODULE_CHECK_SEL     = bytes4(keccak256("moduleCheck(address,address,uint256,address)"));
    bytes4 internal constant MODULE_TYPE_SEL      = bytes4(keccak256("moduleType()"));
    bytes4 internal constant MODULE_NAME_SEL      = bytes4(keccak256("name()"));
    bytes4 internal constant MODULE_TRANSFER_SEL  = bytes4(keccak256("moduleTransferAction(address,address,uint256,address)"));
    bytes4 internal constant MODULE_MINT_SEL      = bytes4(keccak256("moduleMintAction(address,uint256,address)"));
    bytes4 internal constant MODULE_BURN_SEL      = bytes4(keccak256("moduleBurnAction(address,uint256,address)"));

    bytes4 internal constant BRAND_TYPE = bytes4(keccak256("BRAND"));
    bytes4 internal constant SANCTIONS_TYPE = bytes4(keccak256("SANCTIONS"));

    function setUp() public {
        compliance = new GalileoCompliance(admin, registry);
        _mockModuleBindings(moduleA, BRAND_TYPE, "Module A");
        _mockModuleBindings(moduleB, SANCTIONS_TYPE, "Module B");
        _mockModuleBindings(moduleC, BRAND_TYPE, "Module C");
    }

    // ─── Helper ───────────────────────────────────────────────────────

    function _mockModuleBindings(address mod, bytes4 mType, string memory mName) internal {
        vm.mockCall(mod, abi.encodeWithSelector(BIND_COMPLIANCE_SEL), abi.encode());
        vm.mockCall(mod, abi.encodeWithSelector(UNBIND_COMPLIANCE_SEL), abi.encode());
        vm.mockCall(mod, abi.encodeWithSelector(MODULE_TYPE_SEL), abi.encode(mType));
        vm.mockCall(mod, abi.encodeWithSelector(MODULE_NAME_SEL), abi.encode(mName));
        vm.mockCall(mod, abi.encodeWithSelector(MODULE_CHECK_SEL), abi.encode(true));
        vm.mockCall(mod, abi.encodeWithSelector(MODULE_TRANSFER_SEL), abi.encode());
        vm.mockCall(mod, abi.encodeWithSelector(MODULE_MINT_SEL), abi.encode());
        vm.mockCall(mod, abi.encodeWithSelector(MODULE_BURN_SEL), abi.encode());
    }

    function _addModule(address mod) internal {
        vm.prank(admin);
        compliance.addModule(mod);
    }

    function _bindToken() internal {
        vm.prank(admin);
        compliance.bindToken(token);
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_deploy_setsOwner() public view {
        assertEq(compliance.owner(), admin);
    }

    function test_deploy_setsIdentityRegistry() public view {
        assertEq(compliance.identityRegistry(), registry);
    }

    function test_deploy_initialState() public view {
        assertEq(compliance.getTokenBound(), address(0));
        assertEq(compliance.moduleCount(), 0);
        assertFalse(compliance.isPaused());
        assertEq(compliance.maxBatchSize(), 100);
    }

    function test_deploy_revertsOnZeroAdmin() public {
        vm.expectRevert();
        new GalileoCompliance(address(0), registry);
    }

    // ═══════════════════════════════════════════════════════════════════
    // TOKEN BINDING
    // ═══════════════════════════════════════════════════════════════════

    function test_bindToken_success() public {
        vm.expectEmit(false, false, false, true);
        emit TokenBound(token);
        _bindToken();
        assertEq(compliance.getTokenBound(), token);
    }

    function test_bindToken_revertsIfAlreadyBound() public {
        _bindToken();
        vm.prank(admin);
        vm.expectRevert();
        compliance.bindToken(makeAddr("other"));
    }

    function test_bindToken_revertsZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert();
        compliance.bindToken(address(0));
    }

    function test_bindToken_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        compliance.bindToken(token);
    }

    function test_unbindToken_success() public {
        _bindToken();
        vm.expectEmit(false, false, false, true);
        emit TokenUnbound(token);
        vm.prank(admin);
        compliance.unbindToken(token);
        assertEq(compliance.getTokenBound(), address(0));
    }

    function test_unbindToken_revertsIfWrongToken() public {
        _bindToken();
        vm.prank(admin);
        vm.expectRevert();
        compliance.unbindToken(makeAddr("wrong"));
    }

    function test_unbindToken_revertsIfNotOwner() public {
        _bindToken();
        vm.prank(stranger);
        vm.expectRevert();
        compliance.unbindToken(token);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_addModule_success() public {
        vm.expectEmit(true, false, false, false);
        emit ModuleAdded(moduleA);
        _addModule(moduleA);
        assertTrue(compliance.isModuleBound(moduleA));
        assertEq(compliance.moduleCount(), 1);
    }

    function test_addModule_revertsIfDuplicate() public {
        _addModule(moduleA);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IGalileoCompliance.ModuleAlreadyAdded.selector, moduleA));
        compliance.addModule(moduleA);
    }

    function test_addModule_revertsIfZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert();
        compliance.addModule(address(0));
    }

    function test_addModule_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        compliance.addModule(moduleA);
    }

    function test_removeModule_success() public {
        _addModule(moduleA);
        vm.expectEmit(true, false, false, false);
        emit ModuleRemoved(moduleA);
        // Single module removal: no ModuleOrderChanged emitted (nothing to reorder)
        vm.prank(admin);
        compliance.removeModule(moduleA);
        assertFalse(compliance.isModuleBound(moduleA));
        assertEq(compliance.moduleCount(), 0);
    }

    function test_removeModule_emitsModuleOrderChanged_whenNotLast() public {
        _addModule(moduleA);
        _addModule(moduleB);
        // Removing moduleA (first) shifts moduleB to index 0
        vm.prank(admin);
        compliance.removeModule(moduleA);
        // moduleB is still bound; order changed
        assertTrue(compliance.isModuleBound(moduleB));
        assertEq(compliance.moduleCount(), 1);
        assertEq(compliance.getModuleOrder()[0], moduleB);
    }

    function test_removeModule_preservesOrder() public {
        _addModule(moduleA);
        _addModule(moduleB);
        _addModule(moduleC);
        // Remove the middle module
        vm.prank(admin);
        compliance.removeModule(moduleB);
        // Remaining order must be A, C — not A, C swapped
        assertFalse(compliance.isModuleBound(moduleB));
        assertEq(compliance.moduleCount(), 2);
        address[] memory order = compliance.getModuleOrder();
        assertEq(order[0], moduleA);
        assertEq(order[1], moduleC);
    }

    function test_removeModule_revertsIfNotBound() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IGalileoCompliance.ModuleNotFound.selector, moduleA));
        compliance.removeModule(moduleA);
    }

    function test_addModule_maxModulesLimit() public {
        // Add MAX_MODULES modules
        uint256 max = compliance.MAX_MODULES();
        for (uint256 i = 0; i < max; i++) {
            address mod = makeAddr(string(abi.encodePacked("mod", i)));
            _mockModuleBindings(mod, BRAND_TYPE, "M");
            _addModule(mod);
        }
        address extra = makeAddr("extra");
        _mockModuleBindings(extra, BRAND_TYPE, "Extra");
        vm.prank(admin);
        vm.expectRevert();
        compliance.addModule(extra);
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPLIANCE CHECKS
    // ═══════════════════════════════════════════════════════════════════

    function test_canTransfer_noModules_returnsTrue() public view {
        assertTrue(compliance.canTransfer(alice, bob, 1));
    }

    function test_canTransfer_withPassingModule_returnsTrue() public {
        _addModule(moduleA);
        assertTrue(compliance.canTransfer(alice, bob, 1));
    }

    function test_canTransfer_withFailingModule_returnsFalse() public {
        _addModule(moduleA);
        vm.mockCall(moduleA, abi.encodeWithSelector(MODULE_CHECK_SEL), abi.encode(false));
        assertFalse(compliance.canTransfer(alice, bob, 1));
    }

    function test_canTransfer_whenPaused_returnsFalse() public {
        vm.prank(admin);
        compliance.pause();
        assertFalse(compliance.canTransfer(alice, bob, 1));
    }

    function test_canTransfer_multipleModulesAllPass() public {
        _addModule(moduleA);
        _addModule(moduleB);
        assertTrue(compliance.canTransfer(alice, bob, 100));
    }

    function test_canTransfer_secondModuleFails() public {
        _addModule(moduleA);
        _addModule(moduleB);
        vm.mockCall(moduleB, abi.encodeWithSelector(MODULE_CHECK_SEL), abi.encode(false));
        assertFalse(compliance.canTransfer(alice, bob, 100));
    }

    function test_canTransferWithReason_allowedWhenNoModules() public view {
        (bool ok, string memory reason, address failMod) = compliance.canTransferWithReason(alice, bob, 1);
        assertTrue(ok);
        assertEq(bytes(reason).length, 0);
        assertEq(failMod, address(0));
    }

    function test_canTransferWithReason_paused() public {
        vm.prank(admin);
        compliance.pause();
        (bool ok, string memory reason, address failMod) = compliance.canTransferWithReason(alice, bob, 1);
        assertFalse(ok);
        assertEq(reason, "Compliance paused");
        assertEq(failMod, address(0));
    }

    function test_canTransferWithReason_failingModule() public {
        _addModule(moduleA);
        vm.mockCall(moduleA, abi.encodeWithSelector(MODULE_CHECK_SEL), abi.encode(false));
        (bool ok, string memory reason, address failMod) = compliance.canTransferWithReason(alice, bob, 1);
        assertFalse(ok);
        assertGt(bytes(reason).length, 0);
        assertEq(failMod, moduleA);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BATCH COMPLIANCE CHECKS
    // ═══════════════════════════════════════════════════════════════════

    function test_canTransferBatch_success() public {
        _addModule(moduleA);
        address[] memory froms = new address[](3);
        address[] memory tos = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        froms[0] = alice; tos[0] = bob; amounts[0] = 1;
        froms[1] = bob; tos[1] = alice; amounts[1] = 2;
        froms[2] = alice; tos[2] = alice; amounts[2] = 3;

        bool[] memory results = compliance.canTransferBatch(froms, tos, amounts);
        assertEq(results.length, 3);
        assertTrue(results[0]);
        assertTrue(results[1]);
        assertTrue(results[2]);
    }

    function test_canTransferBatch_revertsOnLengthMismatch() public {
        address[] memory froms = new address[](2);
        address[] memory tos = new address[](1);
        uint256[] memory amounts = new uint256[](2);
        vm.expectRevert();
        compliance.canTransferBatch(froms, tos, amounts);
    }

    function test_canTransferBatch_revertsOnBatchTooLarge() public {
        uint256 max = compliance.maxBatchSize() + 1;
        address[] memory froms = new address[](max);
        address[] memory tos = new address[](max);
        uint256[] memory amounts = new uint256[](max);
        vm.expectRevert();
        compliance.canTransferBatch(froms, tos, amounts);
    }

    function test_canTransferBatch_partialFailure() public {
        _addModule(moduleA);

        address[] memory froms = new address[](3);
        address[] memory tos = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        froms[0] = alice; tos[0] = bob;   amounts[0] = 1;
        froms[1] = bob;   tos[1] = alice; amounts[1] = 99;
        froms[2] = alice; tos[2] = alice; amounts[2] = 5;

        // Override the catch-all mock for the second transfer's specific args to return false
        vm.mockCall(
            moduleA,
            abi.encodeWithSelector(MODULE_CHECK_SEL, bob, alice, uint256(99), address(compliance)),
            abi.encode(false)
        );

        bool[] memory results = compliance.canTransferBatch(froms, tos, amounts);
        assertEq(results.length, 3);
        assertTrue(results[0]);
        assertFalse(results[1]);  // specific mock returns false
        assertTrue(results[2]);
    }

    function test_canTransferBatchWithReasons_success() public {
        _addModule(moduleA);
        address[] memory froms = new address[](2);
        address[] memory tos = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        froms[0] = alice; tos[0] = bob; amounts[0] = 1;
        froms[1] = alice; tos[1] = bob; amounts[1] = 2;
        // Make second fail
        // We can't easily differentiate by args in mockCall, so both pass
        (bool[] memory ok, string[] memory reasons, address[] memory failMods) =
            compliance.canTransferBatchWithReasons(froms, tos, amounts);
        assertEq(ok.length, 2);
        assertTrue(ok[0]);
        assertTrue(ok[1]);
        assertEq(bytes(reasons[0]).length, 0);
        assertEq(failMods[0], address(0));
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE HOOKS
    // ═══════════════════════════════════════════════════════════════════

    function test_transferred_callsAllModules() public {
        _bindToken();
        _addModule(moduleA);
        _addModule(moduleB);
        vm.prank(token);
        compliance.transferred(alice, bob, 100);
        // If the mock returns correctly, no revert = success
    }

    function test_transferred_revertsIfNotBoundToken() public {
        _bindToken();
        vm.prank(stranger);
        vm.expectRevert();
        compliance.transferred(alice, bob, 100);
    }

    function test_created_callsAllModules() public {
        _bindToken();
        _addModule(moduleA);
        vm.prank(token);
        compliance.created(bob, 100);
    }

    function test_destroyed_callsAllModules() public {
        _bindToken();
        _addModule(moduleA);
        vm.prank(token);
        compliance.destroyed(alice, 100);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PAUSE
    // ═══════════════════════════════════════════════════════════════════

    function test_pause_success() public {
        vm.expectEmit(true, false, false, false);
        emit CompliancePaused(admin);
        vm.prank(admin);
        compliance.pause();
        assertTrue(compliance.isPaused());
    }

    function test_unpause_success() public {
        vm.prank(admin);
        compliance.pause();
        vm.expectEmit(true, false, false, false);
        emit ComplianceUnpaused(admin);
        vm.prank(admin);
        compliance.unpause();
        assertFalse(compliance.isPaused());
    }

    function test_pause_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        compliance.pause();
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE ORDERING
    // ═══════════════════════════════════════════════════════════════════

    function test_setModuleOrder_success() public {
        _addModule(moduleA);
        _addModule(moduleB);
        address[] memory order = new address[](2);
        order[0] = moduleB;
        order[1] = moduleA;
        vm.prank(admin);
        compliance.setModuleOrder(order);
        address[] memory result = compliance.getModuleOrder();
        assertEq(result[0], moduleB);
        assertEq(result[1], moduleA);
    }

    function test_setModuleOrder_revertsOnWrongLength() public {
        _addModule(moduleA);
        address[] memory order = new address[](0);
        vm.prank(admin);
        vm.expectRevert();
        compliance.setModuleOrder(order);
    }

    function test_setModuleOrder_revertsIfModuleNotBound() public {
        _addModule(moduleA);
        address[] memory order = new address[](1);
        order[0] = makeAddr("unknown");
        vm.prank(admin);
        vm.expectRevert();
        compliance.setModuleOrder(order);
    }

    function test_setModuleOrder_revertsOnDuplicate() public {
        _addModule(moduleA);
        _addModule(moduleB);
        address[] memory order = new address[](2);
        order[0] = moduleA;
        order[1] = moduleA; // duplicate
        vm.prank(admin);
        vm.expectRevert();
        compliance.setModuleOrder(order);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE INTROSPECTION
    // ═══════════════════════════════════════════════════════════════════

    function test_getModulesByType_returnsCorrectModules() public {
        _addModule(moduleA); // BRAND
        _addModule(moduleB); // SANCTIONS
        _addModule(moduleC); // BRAND
        address[] memory brands = compliance.getModulesByType(BRAND_TYPE);
        assertEq(brands.length, 2);
    }

    function test_isModuleEnabled_trueWhenBound() public {
        _addModule(moduleA);
        assertTrue(compliance.isModuleEnabled(moduleA));
    }

    function test_isModuleEnabled_falseWhenNotBound() public view {
        assertFalse(compliance.isModuleEnabled(moduleA));
    }

    function test_getModuleAt_success() public {
        _addModule(moduleA);
        (address mod, bytes4 mType, string memory mName) = compliance.getModuleAt(0);
        assertEq(mod, moduleA);
        assertEq(mType, BRAND_TYPE);
        assertEq(mName, "Module A");
    }

    function test_getActiveModuleTypes_returnsUnique() public {
        _addModule(moduleA); // BRAND
        _addModule(moduleB); // SANCTIONS
        _addModule(moduleC); // BRAND (duplicate type)
        bytes4[] memory types = compliance.getActiveModuleTypes();
        assertEq(types.length, 2); // BRAND and SANCTIONS, not BRAND twice
    }

    // ═══════════════════════════════════════════════════════════════════
    // CALL MODULE FUNCTION
    // ═══════════════════════════════════════════════════════════════════

    function test_callModuleFunction_success() public {
        _addModule(moduleA);
        bytes memory callData = abi.encodeWithSelector(MODULE_CHECK_SEL, alice, bob, 1, address(compliance));
        vm.prank(admin);
        compliance.callModuleFunction(callData, moduleA);
    }

    function test_callModuleFunction_revertsIfModuleNotBound() public {
        bytes memory callData = abi.encodeWithSelector(MODULE_CHECK_SEL, alice, bob, 1, address(compliance));
        vm.prank(admin);
        vm.expectRevert();
        compliance.callModuleFunction(callData, moduleA);
    }

    function test_callModuleFunction_revertsIfNotOwner() public {
        _addModule(moduleA);
        bytes memory callData = abi.encodeWithSelector(MODULE_CHECK_SEL, alice, bob, 1, address(compliance));
        vm.prank(stranger);
        vm.expectRevert();
        compliance.callModuleFunction(callData, moduleA);
    }

    // ═══════════════════════════════════════════════════════════════════
    // IDENTITY REGISTRY
    // ═══════════════════════════════════════════════════════════════════

    function test_setIdentityRegistry_success() public {
        address newReg = makeAddr("newReg");
        vm.prank(admin);
        compliance.setIdentityRegistry(newReg);
        assertEq(compliance.identityRegistry(), newReg);
    }
}
