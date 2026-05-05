// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ServiceCenterModule} from "../../../src/compliance/modules/ServiceCenterModule.sol";
import {ModuleTypes} from "../../../src/interfaces/compliance/IComplianceModule.sol";

contract ServiceCenterModuleTest is Test {
    // ─── Events ───────────────────────────────────────────────────────
    event ServiceCenterValidated(address indexed serviceCenter, bytes32 indexed serviceType, bool authorized);
    event MROTransferValidated(address indexed from, address indexed serviceCenter, bytes32 indexed serviceType, uint256 validatedAt);
    event ServiceCenterClaimTopicUpdated(uint256 indexed oldTopic, uint256 indexed newTopic, address indexed updatedBy);
    event ServiceTypeRequirementUpdated(bytes32 indexed serviceType, bool required, address indexed updatedBy);

    // ─── Fixtures ─────────────────────────────────────────────────────
    ServiceCenterModule internal module;

    address internal admin         = makeAddr("admin");
    address internal stranger      = makeAddr("stranger");
    address internal registry      = makeAddr("registry");
    address internal compliance    = makeAddr("compliance");
    address internal owner_        = makeAddr("owner_");
    address internal serviceCenter = makeAddr("serviceCenter");
    address internal unknown       = makeAddr("unknown");

    string internal constant BRAND_DID = "did:galileo:brand:patek";

    bytes4 internal batchVerifySelector = bytes4(keccak256("batchVerify(address,uint256[])"));

    bytes32 internal immutable REPAIR;
    bytes32 internal immutable RESTORATION;
    bytes32 internal immutable AUTH_TYPE;

    constructor() {
        REPAIR      = keccak256("SERVICE_TYPE_REPAIR");
        RESTORATION = keccak256("SERVICE_TYPE_RESTORATION");
        AUTH_TYPE   = keccak256("SERVICE_TYPE_AUTHENTICATION");
    }

    function setUp() public {
        module = new ServiceCenterModule(admin, registry, BRAND_DID, 0);
        vm.prank(compliance);
        module.bindCompliance(compliance);
    }

    // ─── Helpers ──────────────────────────────────────────────────────
    function _boolArrayWith(bool v) internal pure returns (bool[] memory arr) {
        arr = new bool[](1);
        arr[0] = v;
    }

    function _mockHasServiceClaim(address addr, bool result) internal {
        uint256 topic = uint256(keccak256("galileo.claim.service_center"));
        uint256[] memory topics = new uint256[](1);
        topics[0] = topic;
        vm.mockCall(
            registry,
            abi.encodeWithSelector(batchVerifySelector, addr, topics),
            abi.encode(_boolArrayWith(result))
        );
    }

    function _authorizeServiceCenter(address sc) internal {
        bytes32[] memory services = new bytes32[](2);
        services[0] = REPAIR;
        services[1] = RESTORATION;
        string[] memory certs = new string[](1);
        certs[0] = "ISO9001";
        vm.prank(admin);
        module.authorizeServiceCenter(sc, 0, services, certs);
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
        uint256 expected = uint256(keccak256("galileo.claim.service_center"));
        assertEq(module.serviceCenterClaimTopic(), expected);
    }

    function test_deploy_moduleType() public view {
        assertEq(module.moduleType(), ModuleTypes.SERVICE);
    }

    function test_deploy_moduleName() public view {
        assertEq(module.name(), "Service Center Module");
    }

    function test_deploy_revertsOnZeroAdmin() public {
        vm.expectRevert();
        new ServiceCenterModule(address(0), registry, BRAND_DID, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SERVICE TYPE CONSTANTS
    // ═══════════════════════════════════════════════════════════════════

    function test_serviceTypeConstants_repair() public view {
        assertEq(module.SERVICE_TYPE_REPAIR(), keccak256("SERVICE_TYPE_REPAIR"));
    }

    function test_serviceTypeConstants_restoration() public view {
        assertEq(module.SERVICE_TYPE_RESTORATION(), keccak256("SERVICE_TYPE_RESTORATION"));
    }

    function test_serviceTypeConstants_authentication() public view {
        assertEq(module.SERVICE_TYPE_AUTHENTICATION(), keccak256("SERVICE_TYPE_AUTHENTICATION"));
    }

    function test_serviceTypeConstants_customization() public view {
        assertEq(module.SERVICE_TYPE_CUSTOMIZATION(), keccak256("SERVICE_TYPE_CUSTOMIZATION"));
    }

    function test_serviceTypeConstants_inspection() public view {
        assertEq(module.SERVICE_TYPE_INSPECTION(), keccak256("SERVICE_TYPE_INSPECTION"));
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════════

    function test_authorizeServiceCenter_success() public {
        _authorizeServiceCenter(serviceCenter);
        assertTrue(module.isAuthorizedServiceCenter(serviceCenter));
    }

    function test_authorizeServiceCenter_revertsIfNotOwner() public {
        bytes32[] memory services = new bytes32[](0);
        string[] memory certs = new string[](0);
        vm.prank(stranger);
        vm.expectRevert();
        module.authorizeServiceCenter(serviceCenter, 0, services, certs);
    }

    function test_revokeServiceCenter_success() public {
        _authorizeServiceCenter(serviceCenter);
        vm.prank(admin);
        module.revokeServiceCenter(serviceCenter);
        assertFalse(module.isAuthorizedServiceCenter(serviceCenter));
    }

    function test_isAuthorizedServiceCenter_expiredReturnsFalse() public {
        bytes32[] memory services = new bytes32[](0);
        string[] memory certs = new string[](0);
        uint256 expiresAt = block.timestamp + 100;
        vm.prank(admin);
        module.authorizeServiceCenter(serviceCenter, expiresAt, services, certs);
        assertTrue(module.isAuthorizedServiceCenter(serviceCenter));
        vm.warp(block.timestamp + 200);
        assertFalse(module.isAuthorizedServiceCenter(serviceCenter));
    }

    function test_isAuthorizedForServiceType_whenAuthorized() public {
        _authorizeServiceCenter(serviceCenter);
        assertTrue(module.isAuthorizedForServiceType(serviceCenter, REPAIR));
        assertTrue(module.isAuthorizedForServiceType(serviceCenter, RESTORATION));
        assertFalse(module.isAuthorizedForServiceType(serviceCenter, AUTH_TYPE));
    }

    function test_isAuthorizedForServiceType_noRestriction_allAllowed() public {
        bytes32[] memory noServices = new bytes32[](0);
        string[] memory noCerts = new string[](0);
        vm.prank(admin);
        module.authorizeServiceCenter(serviceCenter, 0, noServices, noCerts);
        // No service restrictions → all types allowed
        assertTrue(module.isAuthorizedForServiceType(serviceCenter, AUTH_TYPE));
    }

    function test_getServiceCenterDetails() public {
        _authorizeServiceCenter(serviceCenter);
        (bool auth, uint256 exp, bytes32[] memory services, string[] memory certs) =
            module.getServiceCenterDetails(serviceCenter);
        assertTrue(auth);
        assertEq(exp, 0);
        assertEq(services.length, 2);
        assertEq(certs.length, 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MRO TRANSFER VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    function test_validateMROTransfer_authorized() public {
        _authorizeServiceCenter(serviceCenter);
        assertTrue(module.validateMROTransfer(owner_, serviceCenter, REPAIR));
    }

    function test_validateMROTransfer_notAuthorized() public view {
        assertFalse(module.validateMROTransfer(owner_, serviceCenter, REPAIR));
    }

    function test_validateMROTransfer_wrongServiceType() public {
        _authorizeServiceCenter(serviceCenter);
        assertFalse(module.validateMROTransfer(owner_, serviceCenter, AUTH_TYPE));
    }

    function test_validateMROTransferWithReason_authorized() public {
        _authorizeServiceCenter(serviceCenter);
        (bool valid, string memory reason, ) = module.validateMROTransferWithReason(owner_, serviceCenter, REPAIR);
        assertTrue(valid);
        assertEq(bytes(reason).length, 0);
    }

    function test_validateMROTransferWithReason_notAuthorized() public view {
        (bool valid, string memory reason, ) = module.validateMROTransferWithReason(owner_, serviceCenter, REPAIR);
        assertFalse(valid);
        assertGt(bytes(reason).length, 0);
    }

    function test_validateMROTransferWithReason_wrongType() public {
        _authorizeServiceCenter(serviceCenter);
        (bool valid, string memory reason, ) = module.validateMROTransferWithReason(owner_, serviceCenter, AUTH_TYPE);
        assertFalse(valid);
        assertGt(bytes(reason).length, 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CHECK
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleCheck_unknownAddress_passes() public view {
        // Not in service center list → not our concern → pass
        bool ok = module.moduleCheck(owner_, unknown, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_authorizedServiceCenter_passes() public {
        _authorizeServiceCenter(serviceCenter);
        bool ok = module.moduleCheck(owner_, serviceCenter, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_revokedServiceCenter_fails() public {
        _authorizeServiceCenter(serviceCenter);
        vm.prank(admin);
        module.revokeServiceCenter(serviceCenter);
        bool ok = module.moduleCheck(owner_, serviceCenter, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_burn_alwaysPasses() public view {
        bool ok = module.moduleCheck(owner_, address(0), 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_rejectsUnregisteredServiceCenter() public {
        // unknown holds a service center identity claim but is NOT in _serviceCenterList
        _mockHasServiceClaim(unknown, true);
        bool ok = module.moduleCheck(owner_, unknown, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_fallbackToRegistryClaim() public {
        // serviceCenter is in the list (after authorize) but with identity registry claim
        // First add it to the list via authorize, then revoke internal auth
        _authorizeServiceCenter(serviceCenter);
        vm.prank(admin);
        module.revokeServiceCenter(serviceCenter);
        // Now internal auth is revoked; if registry says it has the claim → still authorized
        // Actually after revoking, isAuthorizedServiceCenter checks internal first (false) then registry
        _mockHasServiceClaim(serviceCenter, true);
        bool ok = module.moduleCheck(owner_, serviceCenter, 1, compliance);
        assertTrue(ok); // registry fallback
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    function test_setServiceCenterClaimTopic_success() public {
        uint256 newTopic = 99999;
        vm.prank(admin);
        module.setServiceCenterClaimTopic(newTopic);
        assertEq(module.serviceCenterClaimTopic(), newTopic);
    }

    function test_setServiceCenterClaimTopic_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.setServiceCenterClaimTopic(1);
    }

    function test_setServiceTypeRequired_success() public {
        vm.prank(admin);
        module.setServiceTypeRequired(REPAIR, true);
        assertTrue(module.isServiceTypeRequired(REPAIR));
        bytes32[] memory required = module.getRequiredServiceTypes();
        assertEq(required.length, 1);
        assertEq(required[0], REPAIR);
    }

    function test_setServiceTypeRequired_unset() public {
        vm.prank(admin);
        module.setServiceTypeRequired(REPAIR, true);
        vm.prank(admin);
        module.setServiceTypeRequired(REPAIR, false);
        assertFalse(module.isServiceTypeRequired(REPAIR));
        assertEq(module.getRequiredServiceTypes().length, 0);
    }

    function test_setIdentityRegistry_success() public {
        address newReg = makeAddr("newReg");
        vm.prank(admin);
        module.setIdentityRegistry(newReg);
        assertEq(module.identityRegistry(), newReg);
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE HOOKS
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleTransferAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleTransferAction(owner_, serviceCenter, 1, compliance);
    }

    function test_moduleTransferAction_revertsIfNotBound() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.moduleTransferAction(owner_, serviceCenter, 1, compliance);
    }

    function test_moduleMintAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleMintAction(serviceCenter, 1, compliance);
    }

    function test_moduleBurnAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleBurnAction(owner_, 1, compliance);
    }
}
