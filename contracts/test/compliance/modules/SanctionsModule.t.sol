// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {SanctionsModule} from "../../../src/compliance/modules/SanctionsModule.sol";
import {ModuleTypes} from "../../../src/interfaces/compliance/IComplianceModule.sol";

contract SanctionsModuleTest is Test {
    // ─── Events ───────────────────────────────────────────────────────
    event SanctionsOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event StrictModeChanged(bool strictMode);
    event HighValueThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AddressBlocked(address indexed blockedAddress, string reason, uint256 blockedAt);
    event AddressUnblocked(address indexed unblockedAddress, string reason);

    // ─── Fixtures ─────────────────────────────────────────────────────
    SanctionsModule internal module;

    address internal admin      = makeAddr("admin");
    address internal stranger   = makeAddr("stranger");
    address internal oracle     = makeAddr("oracle");
    address internal compliance = makeAddr("compliance");
    address internal alice      = makeAddr("alice");
    address internal bob        = makeAddr("bob");
    address internal sanctioned = makeAddr("sanctioned");

    bytes4 internal isSanctionedSel = bytes4(keccak256("isSanctioned(address)"));

    function setUp() public {
        module = new SanctionsModule(admin, oracle);
        vm.prank(compliance);
        module.bindCompliance(compliance);
        // Mock oracle: returns false by default
        vm.mockCall(oracle, abi.encodeWithSelector(isSanctionedSel, alice), abi.encode(false));
        vm.mockCall(oracle, abi.encodeWithSelector(isSanctionedSel, bob), abi.encode(false));
        vm.mockCall(oracle, abi.encodeWithSelector(isSanctionedSel, sanctioned), abi.encode(true));
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_deploy_setsOwner() public view {
        assertEq(module.owner(), admin);
    }

    function test_deploy_setsOracle() public view {
        assertEq(module.sanctionsOracle(), oracle);
    }

    function test_deploy_strictModeEnabled() public view {
        assertTrue(module.isStrictMode());
    }

    function test_deploy_moduleType() public view {
        assertEq(module.moduleType(), ModuleTypes.SANCTIONS);
    }

    function test_deploy_moduleName() public view {
        assertEq(module.name(), "Sanctions Module");
    }

    function test_deploy_zeroHighValueThreshold() public view {
        assertEq(module.highValueThreshold(), 0);
    }

    function test_deploy_revertsOnZeroAdmin() public {
        vm.expectRevert();
        new SanctionsModule(address(0), oracle);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SANCTIONS CHECKING
    // ═══════════════════════════════════════════════════════════════════

    function test_isSanctioned_cleanAddress() public view {
        assertFalse(module.isSanctioned(alice));
    }

    function test_isSanctioned_sanctionedViaOracle() public view {
        assertTrue(module.isSanctioned(sanctioned));
    }

    function test_isSanctioned_blocklisted() public {
        vm.prank(admin);
        module.addToBlocklist(alice, "test block");
        assertTrue(module.isSanctioned(alice));
    }

    function test_checkBothParties_neitherSanctioned() public view {
        (bool fromS, bool toS) = module.checkBothParties(alice, bob);
        assertFalse(fromS);
        assertFalse(toS);
    }

    function test_checkBothParties_senderSanctioned() public view {
        (bool fromS, bool toS) = module.checkBothParties(sanctioned, bob);
        assertTrue(fromS);
        assertFalse(toS);
    }

    function test_checkBothParties_receiverSanctioned() public view {
        (bool fromS, bool toS) = module.checkBothParties(alice, sanctioned);
        assertFalse(fromS);
        assertTrue(toS);
    }

    function test_batchCheckSanctions_mixed() public view {
        address[] memory addrs = new address[](3);
        addrs[0] = alice;
        addrs[1] = sanctioned;
        addrs[2] = bob;
        bool[] memory results = module.batchCheckSanctions(addrs);
        assertFalse(results[0]);
        assertTrue(results[1]);
        assertFalse(results[2]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CHECK
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleCheck_cleanTransfer() public view {
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_senderSanctioned() public view {
        bool ok = module.moduleCheck(sanctioned, bob, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_receiverSanctioned() public view {
        bool ok = module.moduleCheck(alice, sanctioned, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_mintWithCleanReceiver() public view {
        // from == address(0) → mint, skip sender check
        bool ok = module.moduleCheck(address(0), bob, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_burnFromSanctioned() public view {
        // to == address(0) → burn, skip receiver check
        // but still check sender if it's sanctioned
        bool ok = module.moduleCheck(sanctioned, address(0), 1, compliance);
        assertFalse(ok); // sender is sanctioned
    }

    function test_moduleCheck_oracleReverts_strictMode_blocks() public {
        // Mock oracle to revert
        vm.mockCallRevert(oracle, abi.encodeWithSelector(isSanctionedSel, alice), "Oracle down");
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertFalse(ok); // strict mode: fail safe
    }

    function test_moduleCheck_oracleReverts_nonStrict_allows() public {
        vm.prank(admin);
        module.setStrictMode(false);
        vm.mockCallRevert(oracle, abi.encodeWithSelector(isSanctionedSel, alice), "Oracle down");
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertTrue(ok); // non-strict: fail open
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function test_setSanctionsOracle_success() public {
        address newOracle = makeAddr("newOracle");
        vm.expectEmit(true, true, false, false);
        emit SanctionsOracleUpdated(oracle, newOracle);
        vm.prank(admin);
        module.setSanctionsOracle(newOracle);
        assertEq(module.sanctionsOracle(), newOracle);
    }

    function test_setSanctionsOracle_revertsOnZero() public {
        vm.prank(admin);
        vm.expectRevert();
        module.setSanctionsOracle(address(0));
    }

    function test_setSanctionsOracle_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.setSanctionsOracle(makeAddr("x"));
    }

    function test_setStrictMode_toFalse() public {
        vm.expectEmit(false, false, false, true);
        emit StrictModeChanged(false);
        vm.prank(admin);
        module.setStrictMode(false);
        assertFalse(module.isStrictMode());
    }

    function test_setHighValueThreshold_success() public {
        uint256 threshold = 10_000 ether;
        vm.expectEmit(false, false, false, true);
        emit HighValueThresholdUpdated(0, threshold);
        vm.prank(admin);
        module.setHighValueThreshold(threshold);
        assertEq(module.highValueThreshold(), threshold);
    }

    function test_isHighValueTransfer_belowThreshold() public {
        vm.prank(admin);
        module.setHighValueThreshold(1000 ether);
        assertFalse(module.isHighValueTransfer(500 ether));
    }

    function test_isHighValueTransfer_aboveThreshold() public {
        vm.prank(admin);
        module.setHighValueThreshold(1000 ether);
        assertTrue(module.isHighValueTransfer(2000 ether));
    }

    function test_isHighValueTransfer_zeroThresholdDisabled() public view {
        assertFalse(module.isHighValueTransfer(type(uint256).max));
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUPPLEMENTARY BLOCKLIST
    // ═══════════════════════════════════════════════════════════════════

    function test_addToBlocklist_success() public {
        vm.expectEmit(true, false, false, false);
        emit AddressBlocked(alice, "test", block.timestamp);
        vm.prank(admin);
        module.addToBlocklist(alice, "test");
        assertTrue(module.isOnBlocklist(alice));
    }

    function test_addToBlocklist_revertsIfAlreadyBlocked() public {
        vm.prank(admin);
        module.addToBlocklist(alice, "first");
        vm.prank(admin);
        vm.expectRevert();
        module.addToBlocklist(alice, "second");
    }

    function test_addToBlocklist_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.addToBlocklist(alice, "test");
    }

    function test_removeFromBlocklist_success() public {
        vm.prank(admin);
        module.addToBlocklist(alice, "test");
        vm.expectEmit(true, false, false, false);
        emit AddressUnblocked(alice, "cleared");
        vm.prank(admin);
        module.removeFromBlocklist(alice, "cleared");
        assertFalse(module.isOnBlocklist(alice));
    }

    function test_removeFromBlocklist_revertsIfNotBlocked() public {
        vm.prank(admin);
        vm.expectRevert();
        module.removeFromBlocklist(alice, "not blocked");
    }

    // ═══════════════════════════════════════════════════════════════════
    // GRACE PERIOD
    // ═══════════════════════════════════════════════════════════════════

    function test_setGracePeriod_success() public {
        vm.prank(admin);
        module.setGracePeriod(true, 3600);
    }

    function test_setGracePeriod_revertsIfTooLong() public {
        vm.prank(admin);
        vm.expectRevert();
        module.setGracePeriod(true, 86401); // > 24 hours
    }

    function test_isInGracePeriod_trueWhenActive() public {
        vm.prank(admin);
        module.setGracePeriod(true, 3600);
        vm.prank(admin);
        module.addToBlocklist(alice, "newly blocked");
        assertTrue(module.isInGracePeriod(alice));
        // Grace period means not yet blocked
        assertFalse(module.isSanctioned(alice)); // in grace period → not blocked
    }

    function test_isInGracePeriod_falseAfterExpiry() public {
        vm.prank(admin);
        module.setGracePeriod(true, 3600);
        vm.prank(admin);
        module.addToBlocklist(alice, "blocked");
        vm.warp(block.timestamp + 3601);
        assertFalse(module.isInGracePeriod(alice));
        assertTrue(module.isSanctioned(alice)); // now sanctioned
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE HOOKS
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleTransferAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleTransferAction(alice, bob, 1, compliance);
    }

    function test_moduleTransferAction_revertsIfNotBound() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.moduleTransferAction(alice, bob, 1, compliance);
    }
}
