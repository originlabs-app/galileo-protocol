// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoAccessControl} from "../../src/infrastructure/GalileoAccessControl.sol";
import {IGalileoAccessControl} from "../../src/interfaces/infrastructure/IAccessControl.sol";
import {IIdentityRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistry.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IERC735} from "@onchain-id/solidity/contracts/interface/IERC735.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";

contract GalileoAccessControlTest is Test {
    // Mirror IGalileoAccessControl events (Solidity 0.8.17 cannot emit interface-qualified events)
    event IdentityRegistrySet(address indexed oldRegistry, address indexed newRegistry);
    event RoleClaimRequirementSet(bytes32 indexed role, uint256 indexed claimTopic, uint256 previousClaimTopic);
    event RoleGrantedWithIdentity(bytes32 indexed role, address indexed account, address indexed identityAddress, uint256 claimTopic, address sender);
    event RoleSuspended(bytes32 indexed role, address indexed account, string reason, address suspendedBy);
    event RoleReinstated(bytes32 indexed role, address indexed account, address reinstatedBy);
    event EmergencyAccessGranted(bytes32 indexed role, address indexed account, uint256 duration, uint256 expiresAt, string reason);
    event RoleGrantRequestCancelled(bytes32 indexed role, address indexed account, address cancelledBy);

    GalileoAccessControl internal ac;

    address internal admin   = address(0xA001);
    address internal alice   = address(0xA002);
    address internal bob     = address(0xA003);
    address internal charlie = address(0xA004);

    // Mock addresses for identity infrastructure
    address internal mockRegistry = address(0xB001);
    address internal mockIdentity = address(0xB002);
    address internal mockIssuer  = address(0xB003);

    uint256 internal constant KYB_TOPIC = uint256(keccak256("galileo.kyb.verified"));
    uint256 internal constant SERVICE_TOPIC = uint256(keccak256("galileo.service_center"));
    bytes32 internal constant MOCK_CLAIM_ID = keccak256("mock_claim_id");
    bytes  internal constant MOCK_SIG  = abi.encodePacked("sig");
    bytes  internal constant MOCK_DATA = abi.encodePacked("data");

    // ─────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.prank(admin);
        ac = new GalileoAccessControl(admin);
    }

    // ─────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────

    function test_constructor_grantsDefaultAdminToAdmin() public view {
        assertTrue(ac.hasRole(ac.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_constructor_rejectsZeroAdmin() public {
        vm.expectRevert("GalileoAccessControl: zero admin");
        new GalileoAccessControl(address(0));
    }

    // ─────────────────────────────────────────────────────────────────
    // Role constants
    // ─────────────────────────────────────────────────────────────────

    function test_roleConstants_returnCorrectValues() public view {
        assertEq(ac.BRAND_ADMIN_ROLE(),         keccak256("BRAND_ADMIN_ROLE"));
        assertEq(ac.OPERATOR_ROLE(),            keccak256("OPERATOR_ROLE"));
        assertEq(ac.AUDITOR_ROLE(),             keccak256("AUDITOR_ROLE"));
        assertEq(ac.REGULATOR_ROLE(),           keccak256("REGULATOR_ROLE"));
        assertEq(ac.SERVICE_CENTER_ADMIN_ROLE(), keccak256("SERVICE_CENTER_ADMIN_ROLE"));
    }

    function test_roleConstants_areDistinct() public view {
        bytes32[5] memory roles = [
            ac.BRAND_ADMIN_ROLE(),
            ac.OPERATOR_ROLE(),
            ac.AUDITOR_ROLE(),
            ac.REGULATOR_ROLE(),
            ac.SERVICE_CENTER_ADMIN_ROLE()
        ];
        for (uint256 i = 0; i < roles.length; i++) {
            for (uint256 j = i + 1; j < roles.length; j++) {
                assertTrue(roles[i] != roles[j], "duplicate role");
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Identity registry management
    // ─────────────────────────────────────────────────────────────────

    function test_setIdentityRegistry_succeeds() public {
        vm.startPrank(admin);
        vm.expectEmit(true, true, false, false);
        emit IdentityRegistrySet(address(0), mockRegistry);
        ac.setIdentityRegistry(mockRegistry);
        vm.stopPrank();
        assertEq(ac.getIdentityRegistry(), mockRegistry);
    }

    function test_setIdentityRegistry_rejectsZeroAddress() public {
        vm.startPrank(admin);
        vm.expectRevert("GalileoAccessControl: zero address");
        ac.setIdentityRegistry(address(0));
        vm.stopPrank();
    }

    function test_setIdentityRegistry_onlyAdmin() public {
        vm.startPrank(alice);
        vm.expectRevert();
        ac.setIdentityRegistry(mockRegistry);
        vm.stopPrank();
    }

    function test_setIdentityRegistry_emitsOldAddress() public {
        vm.startPrank(admin);
        ac.setIdentityRegistry(mockRegistry);
        vm.stopPrank();

        address newReg = address(0xB999);
        vm.startPrank(admin);
        vm.expectEmit(true, true, false, false);
        emit IdentityRegistrySet(mockRegistry, newReg);
        ac.setIdentityRegistry(newReg);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────
    // Claim requirement management
    // ─────────────────────────────────────────────────────────────────

    function test_setRoleClaimRequirement_succeeds() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        vm.expectEmit(true, true, false, true);
        emit RoleClaimRequirementSet(role, KYB_TOPIC, 0);
        ac.setRoleClaimRequirement(role, KYB_TOPIC);
        vm.stopPrank();
        assertEq(ac.getRoleClaimRequirement(role), KYB_TOPIC);
    }

    function test_setRoleClaimRequirement_onlyAdmin() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(alice);
        vm.expectRevert();
        ac.setRoleClaimRequirement(role, KYB_TOPIC);
        vm.stopPrank();
    }

    function test_setRoleClaimRequirement_canClearRequirement() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.setRoleClaimRequirement(role, KYB_TOPIC);
        ac.setRoleClaimRequirement(role, 0);
        vm.stopPrank();
        assertEq(ac.getRoleClaimRequirement(role), 0);
    }

    function test_getRoleClaimRequirement_defaultsToZero() public view {
        assertEq(ac.getRoleClaimRequirement(ac.BRAND_ADMIN_ROLE()), 0);
    }

    // ─────────────────────────────────────────────────────────────────
    // Identity-aware role management
    // ─────────────────────────────────────────────────────────────────

    function _setupIdentityMocks(bool registered, bool identityMatches, bool claimValid) internal {
        vm.startPrank(admin);
        ac.setIdentityRegistry(mockRegistry);
        vm.stopPrank();

        // mock: registry.contains(alice)
        vm.mockCall(
            mockRegistry,
            abi.encodeWithSelector(IIdentityRegistry.contains.selector, alice),
            abi.encode(registered)
        );

        if (registered) {
            // mock: registry.identity(alice)
            address retIdentity = identityMatches ? mockIdentity : address(0xDEAD);
            vm.mockCall(
                mockRegistry,
                abi.encodeWithSelector(IIdentityRegistry.identity.selector, alice),
                abi.encode(retIdentity)
            );
        }

        if (registered && identityMatches) {
            // mock: identity.getClaimIdsByTopic(topic)
            bytes32[] memory ids = claimValid ? _singletonArray(MOCK_CLAIM_ID) : new bytes32[](0);
            vm.mockCall(
                mockIdentity,
                abi.encodeWithSelector(IERC735.getClaimIdsByTopic.selector, KYB_TOPIC),
                abi.encode(ids)
            );

            if (claimValid) {
                // mock: identity.getClaim(claimId)
                vm.mockCall(
                    mockIdentity,
                    abi.encodeWithSelector(bytes4(keccak256("getClaim(bytes32)")), MOCK_CLAIM_ID),
                    abi.encode(KYB_TOPIC, uint256(1), mockIssuer, MOCK_SIG, MOCK_DATA, "")
                );
                // mock: issuer.isClaimValid(...)
                vm.mockCall(
                    mockIssuer,
                    abi.encodeWithSelector(IClaimIssuer.isClaimValid.selector),
                    abi.encode(true)
                );
            }
        }
    }

    function test_grantRoleWithIdentity_succeeds() public {
        _setupIdentityMocks(true, true, true);
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        vm.startPrank(admin);
        vm.expectEmit(true, true, true, false);
        emit RoleGrantedWithIdentity(role, alice, mockIdentity, KYB_TOPIC, admin);
        ac.grantRoleWithIdentity(role, alice, mockIdentity, KYB_TOPIC);
        vm.stopPrank();

        assertTrue(ac.hasRole(role, alice));
    }

    function test_grantRoleWithIdentity_revertsWhenRegistryNotSet() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        vm.expectRevert(IGalileoAccessControl.IdentityRegistryNotSet.selector);
        ac.grantRoleWithIdentity(role, alice, mockIdentity, KYB_TOPIC);
        vm.stopPrank();
    }

    function test_grantRoleWithIdentity_revertsWhenNotRegistered() public {
        _setupIdentityMocks(false, false, false);
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        vm.startPrank(admin);
        vm.expectRevert(abi.encodeWithSelector(IGalileoAccessControl.IdentityNotVerified.selector, alice));
        ac.grantRoleWithIdentity(role, alice, mockIdentity, KYB_TOPIC);
        vm.stopPrank();
    }

    function test_grantRoleWithIdentity_revertsWhenIdentityMismatch() public {
        _setupIdentityMocks(true, false, false);
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        vm.startPrank(admin);
        vm.expectRevert(abi.encodeWithSelector(IGalileoAccessControl.ClaimNotValid.selector, alice, KYB_TOPIC));
        ac.grantRoleWithIdentity(role, alice, mockIdentity, KYB_TOPIC);
        vm.stopPrank();
    }

    function test_grantRoleWithIdentity_revertsWhenClaimInvalid() public {
        _setupIdentityMocks(true, true, false);
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        vm.startPrank(admin);
        vm.expectRevert(abi.encodeWithSelector(IGalileoAccessControl.ClaimNotValid.selector, alice, KYB_TOPIC));
        ac.grantRoleWithIdentity(role, alice, mockIdentity, KYB_TOPIC);
        vm.stopPrank();
    }

    function test_grantRoleWithIdentity_revertsWhenSuspended() public {
        _setupIdentityMocks(true, true, true);
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        // First grant, then suspend
        vm.startPrank(admin);
        ac.grantRoleWithIdentity(role, alice, mockIdentity, KYB_TOPIC);
        ac.suspendRole(role, alice, "investigation");

        // Attempt re-grant while suspended
        vm.expectRevert(
            abi.encodeWithSelector(IGalileoAccessControl.RoleIsSuspended.selector, role, alice)
        );
        ac.grantRoleWithIdentity(role, alice, mockIdentity, KYB_TOPIC);
        vm.stopPrank();
    }

    function test_grantRoleWithIdentity_onlyRoleAdmin() public {
        _setupIdentityMocks(true, true, true);
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        vm.startPrank(alice);
        vm.expectRevert();
        ac.grantRoleWithIdentity(role, bob, mockIdentity, KYB_TOPIC);
        vm.stopPrank();
    }

    function test_hasRoleWithIdentity_trueWhenNoClaimRequired() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        vm.stopPrank();
        assertTrue(ac.hasRoleWithIdentity(role, alice));
    }

    function test_hasRoleWithIdentity_trueWhenClaimValid() public {
        _setupIdentityMocks(true, true, true);
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        vm.startPrank(admin);
        ac.setRoleClaimRequirement(role, KYB_TOPIC);
        ac.grantRole(role, alice);
        vm.stopPrank();

        assertTrue(ac.hasRoleWithIdentity(role, alice));
    }

    function test_hasRoleWithIdentity_falseWhenRoleNotGranted() public view {
        assertFalse(ac.hasRoleWithIdentity(ac.BRAND_ADMIN_ROLE(), alice));
    }

    function test_hasRoleWithIdentity_falseWhenRegistryNotSet() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        ac.setRoleClaimRequirement(role, KYB_TOPIC);
        vm.stopPrank();

        assertFalse(ac.hasRoleWithIdentity(role, alice));
    }

    // ─────────────────────────────────────────────────────────────────
    // Two-phase role grants
    // ─────────────────────────────────────────────────────────────────

    function test_requestAndConfirmRoleGrant() public {
        uint256 delay = 2 days;
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, delay);
        ac.requestRoleGrant(role, alice);
        vm.stopPrank();

        (address reqBy, uint256 reqAt, uint256 canConfirm) = ac.getRoleGrantRequest(role, alice);
        assertEq(reqBy, admin);
        assertEq(reqAt, block.timestamp);
        assertEq(canConfirm, block.timestamp + delay);

        vm.warp(block.timestamp + delay);

        vm.startPrank(admin);
        ac.confirmRoleGrant(role, alice, address(0), 0);
        vm.stopPrank();
        assertTrue(ac.hasRole(role, alice));
    }

    function test_requestRoleGrant_revertsWithoutDelay() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        vm.expectRevert("GalileoAccessControl: no delay configured for role");
        ac.requestRoleGrant(role, alice);
        vm.stopPrank();
    }

    function test_requestRoleGrant_revertsDuplicateRequest() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, 1 days);
        ac.requestRoleGrant(role, alice);
        vm.expectRevert("GalileoAccessControl: pending request exists");
        ac.requestRoleGrant(role, alice);
        vm.stopPrank();
    }

    function test_confirmRoleGrant_revertsBeforeDelay() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, 2 days);
        ac.requestRoleGrant(role, alice);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        vm.startPrank(admin);
        vm.expectRevert(); // GrantDelayNotElapsed
        ac.confirmRoleGrant(role, alice, address(0), 0);
        vm.stopPrank();
    }

    function test_confirmRoleGrant_revertsWithNoRequest() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(IGalileoAccessControl.NoValidGrantRequest.selector, role, alice)
        );
        ac.confirmRoleGrant(role, alice, address(0), 0);
        vm.stopPrank();
    }

    function test_cancelRoleGrantRequest_byRequester() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, 1 days);
        ac.requestRoleGrant(role, alice);
        vm.expectEmit(true, true, false, false);
        emit RoleGrantRequestCancelled(role, alice, admin);
        ac.cancelRoleGrantRequest(role, alice);
        vm.stopPrank();

        (address reqBy,,) = ac.getRoleGrantRequest(role, alice);
        assertEq(reqBy, address(0));
    }

    function test_cancelRoleGrantRequest_revertsUnauthorized() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, 1 days);
        ac.requestRoleGrant(role, alice);
        vm.stopPrank();

        vm.startPrank(alice);
        vm.expectRevert("GalileoAccessControl: not authorized to cancel");
        ac.cancelRoleGrantRequest(role, alice);
        vm.stopPrank();
    }

    function test_cancelRoleGrantRequest_byDefaultAdmin() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, 1 days);
        ac.requestRoleGrant(role, alice);
        ac.cancelRoleGrantRequest(role, alice);
        vm.stopPrank();

        (address reqBy,,) = ac.getRoleGrantRequest(role, alice);
        assertEq(reqBy, address(0));
    }

    // ─────────────────────────────────────────────────────────────────
    // Suspension mechanism
    // ─────────────────────────────────────────────────────────────────

    function test_suspendRole_succeeds() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        vm.expectEmit(true, true, false, false);
        emit RoleSuspended(role, alice, "investigation", admin);
        ac.suspendRole(role, alice, "investigation");
        vm.stopPrank();

        assertTrue(ac.isSuspended(role, alice));
    }

    function test_suspendRole_revertsWhenNotHolder() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        vm.expectRevert("GalileoAccessControl: account does not have role");
        ac.suspendRole(role, alice, "investigation");
        vm.stopPrank();
    }

    function test_suspendRole_revertsAlreadySuspended() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        ac.suspendRole(role, alice, "reason");
        vm.expectRevert("GalileoAccessControl: role already suspended");
        ac.suspendRole(role, alice, "reason2");
        vm.stopPrank();
    }

    function test_reinstateRole_succeeds() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        ac.suspendRole(role, alice, "reason");
        vm.expectEmit(true, true, false, false);
        emit RoleReinstated(role, alice, admin);
        ac.reinstateRole(role, alice);
        vm.stopPrank();

        assertFalse(ac.isSuspended(role, alice));
    }

    function test_reinstateRole_revertsWhenNotSuspended() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        vm.expectRevert("GalileoAccessControl: role is not suspended");
        ac.reinstateRole(role, alice);
        vm.stopPrank();
    }

    function test_isSuspended_defaultsFalse() public view {
        assertFalse(ac.isSuspended(ac.OPERATOR_ROLE(), alice));
    }

    // ─────────────────────────────────────────────────────────────────
    // Emergency access
    // ─────────────────────────────────────────────────────────────────

    function test_emergencyGrantRole_succeeds() public {
        uint256 duration = 1 days;
        uint256 expiresAt = block.timestamp + duration;
        bytes32 role = ac.OPERATOR_ROLE();

        vm.startPrank(admin);
        vm.expectEmit(true, true, false, true);
        emit EmergencyAccessGranted(role, alice, duration, expiresAt, "incident");
        ac.emergencyGrantRole(role, alice, duration, "incident");
        vm.stopPrank();

        (bool hasEmergency, uint256 expiry) = ac.getEmergencyAccess(role, alice);
        assertTrue(hasEmergency);
        assertEq(expiry, expiresAt);
    }

    function test_emergencyGrantRole_revertsExceedMaxDuration() public {
        bytes32 role = ac.OPERATOR_ROLE();
        uint256 maxDuration = ac.MAX_EMERGENCY_DURATION();
        vm.startPrank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoAccessControl.EmergencyDurationExceeded.selector,
                8 days,
                maxDuration
            )
        );
        ac.emergencyGrantRole(role, alice, 8 days, "reason");
        vm.stopPrank();
    }

    function test_emergencyGrantRole_revertsEmptyReason() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        vm.expectRevert("GalileoAccessControl: reason required");
        ac.emergencyGrantRole(role, alice, 1 days, "");
        vm.stopPrank();
    }

    function test_emergencyGrantRole_onlyAdmin() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(alice);
        vm.expectRevert();
        ac.emergencyGrantRole(role, bob, 1 days, "reason");
        vm.stopPrank();
    }

    function test_getEmergencyAccess_falseWhenExpired() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.emergencyGrantRole(role, alice, 1 hours, "reason");
        vm.stopPrank();

        vm.warp(block.timestamp + 2 hours);

        (bool hasEmergency, uint256 expiry) = ac.getEmergencyAccess(role, alice);
        assertFalse(hasEmergency);
        assertTrue(expiry > 0); // expiry is set but in the past
    }

    function test_getEmergencyAccess_falseWhenNeverGranted() public view {
        (bool hasEmergency, uint256 expiry) = ac.getEmergencyAccess(ac.OPERATOR_ROLE(), alice);
        assertFalse(hasEmergency);
        assertEq(expiry, 0);
    }

    function test_emergencyRevokeAll_revokesRegularAndEmergencyRoles() public {
        bytes32 operatorRole = ac.OPERATOR_ROLE();
        bytes32 auditorRole = ac.AUDITOR_ROLE();
        bytes32 regulatorRole = ac.REGULATOR_ROLE();

        vm.startPrank(admin);
        ac.grantRole(operatorRole, alice);
        ac.grantRole(auditorRole, alice);
        ac.emergencyGrantRole(regulatorRole, alice, 1 days, "reason");
        vm.stopPrank();

        vm.startPrank(admin);
        ac.emergencyRevokeAll(alice, "security incident");
        vm.stopPrank();

        assertFalse(ac.hasRole(operatorRole, alice));
        assertFalse(ac.hasRole(auditorRole, alice));
        (bool hasEmergency,) = ac.getEmergencyAccess(regulatorRole, alice);
        assertFalse(hasEmergency);
    }

    function test_emergencyRevokeAll_revertsEmptyReason() public {
        vm.startPrank(admin);
        vm.expectRevert("GalileoAccessControl: reason required");
        ac.emergencyRevokeAll(alice, "");
        vm.stopPrank();
    }

    function test_emergencyRevokeAll_onlyAdmin() public {
        vm.startPrank(alice);
        vm.expectRevert();
        ac.emergencyRevokeAll(bob, "reason");
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────────────────────────

    function test_canExerciseRole_trueWhenHasRole() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        vm.stopPrank();
        assertTrue(ac.canExerciseRole(role, alice));
    }

    function test_canExerciseRole_falseWhenSuspended() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        ac.suspendRole(role, alice, "reason");
        vm.stopPrank();
        assertFalse(ac.canExerciseRole(role, alice));
    }

    function test_canExerciseRole_falseWhenNoRole() public view {
        assertFalse(ac.canExerciseRole(ac.OPERATOR_ROLE(), alice));
    }

    function test_canExerciseRole_trueWithActiveEmergencyAccess() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.emergencyGrantRole(role, alice, 1 days, "reason");
        vm.stopPrank();
        assertTrue(ac.canExerciseRole(role, alice));
    }

    function test_canExerciseRole_falseWhenEmergencyExpired() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.emergencyGrantRole(role, alice, 1 hours, "reason");
        vm.stopPrank();
        vm.warp(block.timestamp + 2 hours);
        assertFalse(ac.canExerciseRole(role, alice));
    }

    function test_getAccountRoles_returnsOwnedRoles() public {
        bytes32 operatorRole = ac.OPERATOR_ROLE();
        bytes32 auditorRole = ac.AUDITOR_ROLE();

        vm.startPrank(admin);
        ac.grantRole(operatorRole, alice);
        ac.grantRole(auditorRole, alice);
        vm.stopPrank();

        bytes32[] memory roles = ac.getAccountRoles(alice);
        assertEq(roles.length, 2);
        _assertContains(roles, operatorRole);
        _assertContains(roles, auditorRole);
    }

    function test_getAccountRoles_includesEmergencyAccess() public {
        bytes32 role = ac.REGULATOR_ROLE();
        vm.startPrank(admin);
        ac.emergencyGrantRole(role, alice, 1 days, "reason");
        vm.stopPrank();

        bytes32[] memory roles = ac.getAccountRoles(alice);
        _assertContains(roles, role);
    }

    function test_getAccountRoles_excludesExpiredEmergencyAccess() public {
        bytes32 role = ac.REGULATOR_ROLE();
        vm.startPrank(admin);
        ac.emergencyGrantRole(role, alice, 1 hours, "reason");
        vm.stopPrank();
        vm.warp(block.timestamp + 2 hours);

        bytes32[] memory roles = ac.getAccountRoles(alice);
        _assertNotContains(roles, role);
    }

    function test_getAccountRoles_emptyForUnknownAccount() public view {
        bytes32[] memory roles = ac.getAccountRoles(charlie);
        assertEq(roles.length, 0);
    }

    function test_getRoleGrantDelay_defaultsZero() public view {
        assertEq(ac.getRoleGrantDelay(ac.BRAND_ADMIN_ROLE()), 0);
    }

    function test_setRoleGrantDelay_updatesDelay() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, 3 days);
        vm.stopPrank();
        assertEq(ac.getRoleGrantDelay(role), 3 days);
    }

    // ─────────────────────────────────────────────────────────────────
    // Standard AccessControl compatibility
    // ─────────────────────────────────────────────────────────────────

    function test_standardGrantRole_works() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        vm.stopPrank();
        assertTrue(ac.hasRole(role, alice));
    }

    function test_standardRevokeRole_works() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        ac.revokeRole(role, alice);
        vm.stopPrank();
        assertFalse(ac.hasRole(role, alice));
    }

    function test_getRoleMemberCount_tracked() public {
        bytes32 role = ac.OPERATOR_ROLE();
        vm.startPrank(admin);
        ac.grantRole(role, alice);
        ac.grantRole(role, bob);
        vm.stopPrank();
        assertEq(ac.getRoleMemberCount(role), 2);
    }

    // ─────────────────────────────────────────────────────────────────
    // H-3 security fixes
    // ─────────────────────────────────────────────────────────────────

    /// @dev H-3: confirmRoleGrant must revert when the role has a claim requirement
    ///      and identityAddress is address(0), preventing the unconditional else-branch bypass.
    function test_confirmRoleGrant_revertsZeroIdentityWhenClaimRequired() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();
        uint256 delay = 1 days;

        vm.startPrank(admin);
        ac.setRoleGrantDelay(role, delay);
        ac.setRoleClaimRequirement(role, KYB_TOPIC);
        ac.requestRoleGrant(role, alice);
        vm.stopPrank();

        vm.warp(block.timestamp + delay);

        vm.startPrank(admin);
        vm.expectRevert("Identity required for this role");
        ac.confirmRoleGrant(role, alice, address(0), KYB_TOPIC);
        vm.stopPrank();

        // Role must NOT have been granted
        assertFalse(ac.hasRole(role, alice));
    }

    /// @dev H-3b: grantRoleWithIdentity must use the stored claim topic, not the caller-supplied
    ///      one. A malicious admin cannot pass a topic the target already satisfies to bypass
    ///      the actual requirement.
    function test_grantRoleWithIdentity_usesStoredClaimTopic() public {
        bytes32 role = ac.BRAND_ADMIN_ROLE();

        // Store KYB_TOPIC as the on-chain requirement
        vm.startPrank(admin);
        ac.setRoleClaimRequirement(role, KYB_TOPIC);
        vm.stopPrank();

        // Alice is registered and identity matches, but KYB_TOPIC has no valid claims
        _setupIdentityMocks(true, true, false);

        // Admin tries to pass SERVICE_TOPIC (a different topic) to bypass KYB verification.
        // The contract must use the stored KYB_TOPIC and revert.
        vm.startPrank(admin);
        vm.expectRevert(abi.encodeWithSelector(IGalileoAccessControl.ClaimNotValid.selector, alice, KYB_TOPIC));
        ac.grantRoleWithIdentity(role, alice, mockIdentity, SERVICE_TOPIC);
        vm.stopPrank();

        assertFalse(ac.hasRole(role, alice));
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    function _singletonArray(bytes32 val) internal pure returns (bytes32[] memory arr) {
        arr = new bytes32[](1);
        arr[0] = val;
    }

    function _assertContains(bytes32[] memory arr, bytes32 val) internal pure {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == val) return;
        }
        revert("expected value not found in array");
    }

    function _assertNotContains(bytes32[] memory arr, bytes32 val) internal pure {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == val) revert("unexpected value found in array");
        }
    }
}
