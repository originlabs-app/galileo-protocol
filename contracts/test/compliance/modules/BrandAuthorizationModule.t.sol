// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {BrandAuthorizationModule} from "../../../src/compliance/modules/BrandAuthorizationModule.sol";
import {ModuleTypes} from "../../../src/interfaces/compliance/IComplianceModule.sol";

contract BrandAuthorizationModuleTest is Test {
    // ─── Events ───────────────────────────────────────────────────────
    event ComplianceBound(address indexed compliance);
    event ComplianceUnbound(address indexed compliance);
    event ClaimTopicUpdated(uint256 indexed oldTopic, uint256 indexed newTopic, address indexed updatedBy);
    event PrimarySaleRequirementChanged(bool required, address indexed updatedBy);
    event PeerToPeerTransferSettingChanged(bool allowed, address indexed updatedBy);

    // ─── Fixtures ─────────────────────────────────────────────────────
    BrandAuthorizationModule internal module;

    address internal admin      = makeAddr("admin");
    address internal stranger   = makeAddr("stranger");
    address internal registry   = makeAddr("registry");
    address internal compliance = makeAddr("compliance");
    address internal retailer   = makeAddr("retailer");
    address internal consumer   = makeAddr("consumer");

    string internal constant BRAND_DID = "did:galileo:brand:chanel";

    // Pre-computed to avoid vm.prank + call arg issues
    uint256 internal claimTopic;
    bytes4  internal batchVerifySelector = bytes4(keccak256("batchVerify(address,uint256[])"));

    function setUp() public {
        claimTopic = uint256(keccak256("galileo.claim.authorized_retailer"));
        module = new BrandAuthorizationModule(admin, BRAND_DID, registry, 0);
        // compliance must self-bind (ERC-3643 pattern: compliance calls bindCompliance on module)
        vm.prank(compliance);
        module.bindCompliance(compliance);
    }

    // ─── Helper ───────────────────────────────────────────────────────
    function _mockHasClaim(address addr, bool result) internal {
        uint256[] memory topics = new uint256[](1);
        topics[0] = claimTopic;
        vm.mockCall(
            registry,
            abi.encodeWithSelector(batchVerifySelector, addr, topics),
            abi.encode(_boolArrayWith(result))
        );
    }

    function _boolArrayWith(bool v) internal pure returns (bool[] memory arr) {
        arr = new bool[](1);
        arr[0] = v;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_deploy_setsOwner() public view {
        assertEq(module.owner(), admin);
    }

    function test_deploy_setsBrandDID() public view {
        assertEq(module.brandDID(), BRAND_DID);
    }

    function test_deploy_setsIdentityRegistry() public view {
        assertEq(module.identityRegistry(), registry);
    }

    function test_deploy_setsDefaultClaimTopic() public view {
        uint256 expected = uint256(keccak256("galileo.claim.authorized_retailer"));
        assertEq(module.authorizedRetailerClaimTopic(), expected);
    }

    function test_deploy_defaultRequireRetailerForPrimarySale() public view {
        assertTrue(module.requireRetailerForPrimarySale());
    }

    function test_deploy_defaultNoPeerToPeer() public view {
        assertFalse(module.allowPeerToPeer());
    }

    function test_deploy_moduleType() public view {
        assertEq(module.moduleType(), ModuleTypes.BRAND);
    }

    function test_deploy_moduleName() public view {
        assertEq(module.name(), "Brand Authorization Module");
    }

    function test_deploy_revertsOnZeroAdmin() public {
        vm.expectRevert();
        new BrandAuthorizationModule(address(0), BRAND_DID, registry, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPLIANCE BINDING
    // ═══════════════════════════════════════════════════════════════════

    function test_bindCompliance_success() public {
        address newCompliance = makeAddr("newComp");
        vm.expectEmit(true, false, false, false);
        emit ComplianceBound(newCompliance);
        vm.prank(newCompliance);
        module.bindCompliance(newCompliance);
        assertTrue(module.isComplianceBound(newCompliance));
    }

    function test_bindCompliance_revertsIfAlreadyBound() public {
        vm.prank(compliance);
        vm.expectRevert();
        module.bindCompliance(compliance);
    }

    function test_bindCompliance_revertsIfCallerIsNotCompliance() public {
        address newCompliance = makeAddr("newComp2");
        vm.prank(stranger);
        vm.expectRevert();
        module.bindCompliance(newCompliance);
    }

    function test_unbindCompliance_success() public {
        vm.expectEmit(true, false, false, false);
        emit ComplianceUnbound(compliance);
        vm.prank(compliance);
        module.unbindCompliance(compliance);
        assertFalse(module.isComplianceBound(compliance));
    }

    function test_unbindCompliance_revertsIfNotBound() public {
        address unbound = makeAddr("unbound");
        vm.prank(unbound);
        vm.expectRevert();
        module.unbindCompliance(unbound);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CHECK — PRIMARY SALE
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleCheck_primarySale_requireRetailer_passes() public {
        _mockHasClaim(retailer, true);
        bool ok = module.moduleCheck(address(0), retailer, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_primarySale_requireRetailer_fails() public {
        _mockHasClaim(consumer, false);
        bool ok = module.moduleCheck(address(0), consumer, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_primarySale_noRetailerRequired_passes() public {
        vm.prank(admin);
        module.setRequireRetailerForPrimarySale(false);
        // No registry call needed
        bool ok = module.moduleCheck(address(0), consumer, 1, compliance);
        assertTrue(ok);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CHECK — SECONDARY TRANSFER
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleCheck_transfer_retailerCheck_passes() public {
        _mockHasClaim(retailer, true);
        bool ok = module.moduleCheck(consumer, retailer, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_transfer_retailerCheck_fails() public {
        _mockHasClaim(consumer, false);
        bool ok = module.moduleCheck(retailer, consumer, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_transfer_allowPeerToPeer_passes() public {
        vm.prank(admin);
        module.setAllowPeerToPeer(true);
        bool ok = module.moduleCheck(consumer, consumer, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_burn_alwaysPasses() public {
        bool ok = module.moduleCheck(consumer, address(0), 1, compliance);
        assertTrue(ok);
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTHORIZATION CHECKS
    // ═══════════════════════════════════════════════════════════════════

    function test_isAuthorizedRetailer_true() public {
        _mockHasClaim(retailer, true);
        assertTrue(module.isAuthorizedRetailer(retailer));
    }

    function test_isAuthorizedRetailer_false() public {
        _mockHasClaim(consumer, false);
        assertFalse(module.isAuthorizedRetailer(consumer));
    }

    function test_isAuthorizedRetailer_noRegistry() public {
        vm.prank(admin);
        module.setIdentityRegistry(address(0));
        assertFalse(module.isAuthorizedRetailer(retailer));
    }

    function test_getAuthorizationDetails_authorized() public {
        _mockHasClaim(retailer, true);
        (bool auth, uint256 expiresAt, string[] memory cats, string memory territory) =
            module.getAuthorizationDetails(retailer);
        assertTrue(auth);
        assertEq(expiresAt, 0);
        assertEq(cats.length, 0);
        assertEq(bytes(territory).length, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function test_setAuthorizedRetailerClaimTopic_success() public {
        uint256 newTopic = 12345;
        vm.expectEmit(true, true, true, true);
        emit ClaimTopicUpdated(claimTopic, newTopic, admin);
        vm.prank(admin);
        module.setAuthorizedRetailerClaimTopic(newTopic);
        assertEq(module.authorizedRetailerClaimTopic(), newTopic);
    }

    function test_setAuthorizedRetailerClaimTopic_revertsOnZero() public {
        vm.prank(admin);
        vm.expectRevert();
        module.setAuthorizedRetailerClaimTopic(0);
    }

    function test_setAuthorizedRetailerClaimTopic_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.setAuthorizedRetailerClaimTopic(999);
    }

    function test_setRequireRetailerForPrimarySale_success() public {
        vm.expectEmit(false, true, false, true);
        emit PrimarySaleRequirementChanged(false, admin);
        vm.prank(admin);
        module.setRequireRetailerForPrimarySale(false);
        assertFalse(module.requireRetailerForPrimarySale());
    }

    function test_setAllowPeerToPeer_success() public {
        vm.expectEmit(false, true, false, true);
        emit PeerToPeerTransferSettingChanged(true, admin);
        vm.prank(admin);
        module.setAllowPeerToPeer(true);
        assertTrue(module.allowPeerToPeer());
    }

    function test_setAllowPeerToPeer_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.setAllowPeerToPeer(true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE HOOKS
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleTransferAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleTransferAction(consumer, retailer, 1, compliance);
    }

    function test_moduleTransferAction_revertsIfNotBound() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.moduleTransferAction(consumer, retailer, 1, compliance);
    }

    function test_moduleMintAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleMintAction(retailer, 1, compliance);
    }

    function test_moduleBurnAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleBurnAction(consumer, 1, compliance);
    }
}
