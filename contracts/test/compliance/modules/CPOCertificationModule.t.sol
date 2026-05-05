// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {CPOCertificationModule} from "../../../src/compliance/modules/CPOCertificationModule.sol";
import {ICPOCertificationModule} from "../../../src/interfaces/compliance/modules/ICPOCertificationModule.sol";
import {ModuleTypes} from "../../../src/interfaces/compliance/IComplianceModule.sol";

contract CPOCertificationModuleTest is Test {
    // ─── Events ───────────────────────────────────────────────────────
    event CPOModeUpdated(
        ICPOCertificationModule.CPOMode indexed oldMode,
        ICPOCertificationModule.CPOMode indexed newMode,
        address indexed updatedBy
    );
    event TrustedCertifierAdded(address indexed certifier, string certifierName, address indexed addedBy);
    event TrustedCertifierRemoved(address indexed certifier, address indexed removedBy);
    event CPOCertificationVerified(address indexed token, address indexed certifier, uint256 certifiedAt);

    // ─── Fixtures ─────────────────────────────────────────────────────
    CPOCertificationModule internal module;

    address internal admin      = makeAddr("admin");
    address internal stranger   = makeAddr("stranger");
    address internal registry   = makeAddr("registry");
    address internal compliance = makeAddr("compliance");
    address internal certifier  = makeAddr("certifier");
    address internal token      = makeAddr("token");
    address internal buyer      = makeAddr("buyer");
    address internal seller     = makeAddr("seller");

    bytes4 internal getTokenBoundSel = bytes4(keccak256("getTokenBound()"));

    function setUp() public {
        module = new CPOCertificationModule(admin, registry, 0);
        vm.prank(compliance);
        module.bindCompliance(compliance);
        // Add a trusted certifier
        vm.prank(admin);
        module.addTrustedCertifier(certifier);
    }

    // ─── Helper ───────────────────────────────────────────────────────
    function _mockGetTokenBound(address comp, address tok) internal {
        vm.mockCall(comp, abi.encodeWithSelector(getTokenBoundSel), abi.encode(tok));
    }

    function _certifyToken(address tok) internal {
        vm.prank(certifier);
        module.certifyToken(tok, block.timestamp, 0, "brand_certified");
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_deploy_setsOwner() public view {
        assertEq(module.owner(), admin);
    }

    function test_deploy_defaultModeNotRequired() public view {
        assertEq(uint8(module.cpoMode()), uint8(ICPOCertificationModule.CPOMode.NOT_REQUIRED));
    }

    function test_deploy_moduleType() public view {
        assertEq(module.moduleType(), ModuleTypes.CERTIFICATION);
    }

    function test_deploy_moduleName() public view {
        assertEq(module.name(), "CPO Certification Module");
    }

    function test_deploy_defaultAuthenticityTopic() public view {
        uint256 expected = uint256(keccak256("galileo.claim.authenticity_verified"));
        assertEq(module.authenticityClaimTopic(), expected);
    }

    function test_deploy_revertsOnZeroAdmin() public {
        vm.expectRevert();
        new CPOCertificationModule(address(0), registry, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CPO MODE
    // ═══════════════════════════════════════════════════════════════════

    function test_setCPOMode_toRequired() public {
        vm.expectEmit(true, true, true, true);
        emit CPOModeUpdated(
            ICPOCertificationModule.CPOMode.NOT_REQUIRED,
            ICPOCertificationModule.CPOMode.REQUIRED_FOR_RESALE,
            admin
        );
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.REQUIRED_FOR_RESALE);
        assertEq(uint8(module.cpoMode()), uint8(ICPOCertificationModule.CPOMode.REQUIRED_FOR_RESALE));
    }

    function test_setCPOMode_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.setCPOMode(ICPOCertificationModule.CPOMode.ALWAYS_REQUIRED);
    }

    function test_isCPORequired_notRequired() public view {
        assertFalse(module.isCPORequired(seller, buyer));
    }

    function test_isCPORequired_alwaysRequired() public {
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.ALWAYS_REQUIRED);
        assertTrue(module.isCPORequired(seller, buyer));
        assertTrue(module.isCPORequired(address(0), buyer)); // even mint
    }

    function test_isCPORequired_forResale_primaryNotRequired() public {
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.REQUIRED_FOR_RESALE);
        assertFalse(module.isCPORequired(address(0), buyer)); // mint
        assertTrue(module.isCPORequired(seller, buyer)); // resale
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CHECK
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleCheck_notRequired_alwaysPasses() public view {
        bool ok = module.moduleCheck(seller, buyer, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_alwaysRequired_withCertification() public {
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.ALWAYS_REQUIRED);
        _mockGetTokenBound(compliance, token);
        _certifyToken(token);
        bool ok = module.moduleCheck(seller, buyer, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_alwaysRequired_noCertification() public {
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.ALWAYS_REQUIRED);
        _mockGetTokenBound(compliance, token);
        bool ok = module.moduleCheck(seller, buyer, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_forResale_primarySalePasses() public {
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.REQUIRED_FOR_RESALE);
        _mockGetTokenBound(compliance, token);
        // No certification — but primary sale passes
        bool ok = module.moduleCheck(address(0), buyer, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_forResale_secondaryRequiresCPO() public {
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.REQUIRED_FOR_RESALE);
        _mockGetTokenBound(compliance, token);
        bool ok = module.moduleCheck(seller, buyer, 1, compliance);
        assertFalse(ok); // no CPO
    }

    function test_moduleCheck_burn_alwaysPasses() public {
        vm.prank(admin);
        module.setCPOMode(ICPOCertificationModule.CPOMode.ALWAYS_REQUIRED);
        bool ok = module.moduleCheck(seller, address(0), 1, compliance);
        assertTrue(ok);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CPO CERTIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function test_certifyToken_success() public {
        vm.expectEmit(true, true, false, true);
        emit CPOCertificationVerified(token, certifier, block.timestamp);
        vm.prank(certifier);
        module.certifyToken(token, block.timestamp, 0, "brand_certified");
        assertTrue(module.hasCPOCertification(token));
    }

    function test_certifyToken_revertsIfNotTrustedCertifier() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.certifyToken(token, block.timestamp, 0, "third_party");
    }

    function test_hasCPOCertification_expiredReturnsFalse() public {
        vm.prank(certifier);
        module.certifyToken(token, block.timestamp, block.timestamp + 100, "brand_certified");
        // Fast-forward past expiry
        vm.warp(block.timestamp + 200);
        assertFalse(module.hasCPOCertification(token));
    }

    function test_hasCPOCertification_validNoExpiry() public {
        _certifyToken(token);
        assertTrue(module.hasCPOCertification(token));
    }

    function test_revokeCertification_success() public {
        _certifyToken(token);
        vm.prank(admin);
        module.revokeCertification(token);
        assertFalse(module.hasCPOCertification(token));
    }

    function test_getCPOCertificationDetails_certified() public {
        _certifyToken(token);
        (bool cert, address cert_, uint256 certAt, uint256 expAt, string memory level) =
            module.getCPOCertificationDetails(token);
        assertTrue(cert);
        assertEq(cert_, certifier);
        assertGt(certAt, 0);
        assertEq(expAt, 0);
        assertEq(level, "brand_certified");
    }

    // ═══════════════════════════════════════════════════════════════════
    // TRUSTED CERTIFIERS
    // ═══════════════════════════════════════════════════════════════════

    function test_addTrustedCertifier_success() public {
        address newCert = makeAddr("newCert");
        vm.expectEmit(true, false, true, false);
        emit TrustedCertifierAdded(newCert, "", admin);
        vm.prank(admin);
        module.addTrustedCertifier(newCert);
        assertTrue(module.isTrustedCertifier(newCert));
        assertEq(module.trustedCertifierCount(), 2); // certifier + newCert
    }

    function test_addTrustedCertifier_revertsIfDuplicate() public {
        vm.prank(admin);
        vm.expectRevert();
        module.addTrustedCertifier(certifier);
    }

    function test_removeTrustedCertifier_success() public {
        vm.expectEmit(true, true, false, false);
        emit TrustedCertifierRemoved(certifier, admin);
        vm.prank(admin);
        module.removeTrustedCertifier(certifier);
        assertFalse(module.isTrustedCertifier(certifier));
    }

    function test_removeTrustedCertifier_revertsIfNotInList() public {
        vm.prank(admin);
        vm.expectRevert();
        module.removeTrustedCertifier(makeAddr("unknown"));
    }

    function test_getTrustedCertifiers_returnsAll() public view {
        address[] memory certs = module.getTrustedCertifiers();
        assertEq(certs.length, 1);
        assertEq(certs[0], certifier);
    }

    function test_setMinValidityPeriod() public {
        vm.prank(admin);
        module.setMinValidityPeriod(3600);
        assertEq(module.minValidityPeriod(), 3600);
    }

    function test_setMinValidityPeriod_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.setMinValidityPeriod(3600);
    }

    function test_certifyToken_enforcesMinValidityPeriod() public {
        vm.prank(admin);
        module.setMinValidityPeriod(7 days);

        uint256 certifiedAt = block.timestamp;
        uint256 badExpiry = certifiedAt + 1 days; // less than 7 days
        vm.prank(certifier);
        vm.expectRevert();
        module.certifyToken(token, certifiedAt, badExpiry, "brand_certified");
    }

    function test_certifyToken_acceptsExpiryAboveMinValidityPeriod() public {
        vm.prank(admin);
        module.setMinValidityPeriod(7 days);

        uint256 certifiedAt = block.timestamp;
        uint256 goodExpiry = certifiedAt + 8 days;
        vm.prank(certifier);
        module.certifyToken(token, certifiedAt, goodExpiry, "brand_certified");
        assertTrue(module.hasCPOCertification(token));
    }

    function test_certifyToken_allowsZeroExpiry_withMinValiditySet() public {
        vm.prank(admin);
        module.setMinValidityPeriod(7 days);

        // expiresAt == 0 means "no expiry" — should be exempt from minValidity check
        vm.prank(certifier);
        module.certifyToken(token, block.timestamp, 0, "brand_certified");
        assertTrue(module.hasCPOCertification(token));
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE HOOKS
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleTransferAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleTransferAction(seller, buyer, 1, compliance);
    }

    function test_moduleTransferAction_revertsIfNotBound() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.moduleTransferAction(seller, buyer, 1, compliance);
    }
}
