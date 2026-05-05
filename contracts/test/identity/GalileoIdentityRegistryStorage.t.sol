// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoIdentityRegistryStorage} from "../../src/identity/GalileoIdentityRegistryStorage.sol";
import {IGalileoIdentityRegistryStorage} from "../../src/interfaces/identity/IIdentityRegistryStorage.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";

/**
 * @title GalileoIdentityRegistryStorageTest
 * @notice Comprehensive tests for GalileoIdentityRegistryStorage
 *
 * Coverage:
 * - Deployment and initial state
 * - bindIdentityRegistry (ERC-3643 base)
 * - unbindIdentityRegistry (ERC-3643 base)
 * - addIdentityToStorage / modifyStoredIdentity / modifyStoredInvestorCountry / removeIdentityFromStorage
 * - bindBrandRegistry with DID tracking
 * - isRegistryBound / getBoundRegistries / boundRegistryCount / boundRegistryAt
 * - getRegistryBrandDID / getRegistryBindingTime
 * - unbindBrandRegistry with DID confirmation
 * - updateBrandDID
 * - canBindNewRegistry
 * - Access control
 * - Error cases
 */
contract GalileoIdentityRegistryStorageTest is Test {
    // ============ Mirror events ============

    event IdentityStored(address indexed investorAddress, IIdentity indexed identity);
    event IdentityUnstored(address indexed investorAddress, IIdentity indexed identity);
    event IdentityModified(IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryModified(address indexed investorAddress, uint16 indexed country);
    event IdentityRegistryBound(address indexed identityRegistry);
    event IdentityRegistryUnbound(address indexed identityRegistry);
    event BrandRegistryBound(
        address indexed identityRegistry,
        string brandDID,
        address indexed boundBy,
        uint256 timestamp
    );
    event BrandRegistryUnbound(
        address indexed identityRegistry,
        string brandDID,
        address indexed unboundBy,
        uint256 timestamp
    );
    event BrandDIDUpdated(
        address indexed identityRegistry,
        string oldBrandDID,
        string newBrandDID,
        address indexed updatedBy
    );

    // ============ Fixtures ============

    GalileoIdentityRegistryStorage internal store;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 internal constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    // Mock registry addresses (no need for full implementations in unit tests)
    address internal registry1 = makeAddr("registry1");
    address internal registry2 = makeAddr("registry2");
    address internal registry3 = makeAddr("registry3");

    // Mock identity contract addresses
    IIdentity internal identity1;
    IIdentity internal identity2;

    // Mock user addresses
    address internal user1 = makeAddr("user1");
    address internal user2 = makeAddr("user2");

    string internal constant DID1 = "did:galileo:brand:hermes";
    string internal constant DID2 = "did:galileo:brand:chanel";
    string internal constant DID3 = "did:galileo:brand:rolex";

    function setUp() public {
        store = new GalileoIdentityRegistryStorage(admin);

        identity1 = IIdentity(makeAddr("identity1"));
        identity2 = IIdentity(makeAddr("identity2"));
    }

    // ============ Deployment ============

    function test_deployment_adminRoles() public view {
        assertTrue(store.hasRole(DEFAULT_ADMIN_ROLE, admin));
        assertTrue(store.hasRole(REGISTRY_ADMIN_ROLE, admin));
    }

    function test_deployment_strangerHasNoRoles() public view {
        assertFalse(store.hasRole(DEFAULT_ADMIN_ROLE, stranger));
        assertFalse(store.hasRole(REGISTRY_ADMIN_ROLE, stranger));
    }

    function test_deployment_emptyRegistries() public view {
        assertEq(store.linkedIdentityRegistries().length, 0);
        assertEq(store.boundRegistryCount(), 0);
    }

    function test_deployment_canBindNewRegistry() public view {
        assertTrue(store.canBindNewRegistry());
    }

    function test_deployment_zeroAdminReverts() public {
        vm.expectRevert(GalileoIdentityRegistryStorage.ZeroAddress.selector);
        new GalileoIdentityRegistryStorage(address(0));
    }

    // ============ bindIdentityRegistry (ERC-3643 base) ============

    function test_bindIdentityRegistry_happyPath() public {
        vm.expectEmit(true, false, false, false);
        emit IdentityRegistryBound(registry1);

        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        assertTrue(store.isRegistryBound(registry1));
        assertEq(store.linkedIdentityRegistries().length, 1);
        assertEq(store.linkedIdentityRegistries()[0], registry1);
        assertTrue(store.hasRole(AGENT_ROLE, registry1));
    }

    function test_bindIdentityRegistry_tracksTimestamp() public {
        vm.warp(1000);
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        assertEq(store.getRegistryBindingTime(registry1), 1000);
    }

    function test_bindIdentityRegistry_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        store.bindIdentityRegistry(registry1);
    }

    function test_bindIdentityRegistry_zeroAddressReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.InvalidRegistryAddress.selector,
                address(0)
            )
        );
        store.bindIdentityRegistry(address(0));
    }

    function test_bindIdentityRegistry_duplicateReverts() public {
        vm.startPrank(admin);
        store.bindIdentityRegistry(registry1);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.RegistryAlreadyBound.selector,
                registry1
            )
        );
        store.bindIdentityRegistry(registry1);
        vm.stopPrank();
    }

    // ============ unbindIdentityRegistry (ERC-3643 base) ============

    function test_unbindIdentityRegistry_happyPath() public {
        vm.startPrank(admin);
        store.bindIdentityRegistry(registry1);

        vm.expectEmit(true, false, false, false);
        emit IdentityRegistryUnbound(registry1);
        store.unbindIdentityRegistry(registry1);
        vm.stopPrank();

        assertFalse(store.isRegistryBound(registry1));
        assertEq(store.linkedIdentityRegistries().length, 0);
        assertFalse(store.hasRole(AGENT_ROLE, registry1));
        assertEq(store.getRegistryBindingTime(registry1), 0);
    }

    function test_unbindIdentityRegistry_unauthorizedReverts() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.prank(stranger);
        vm.expectRevert();
        store.unbindIdentityRegistry(registry1);
    }

    function test_unbindIdentityRegistry_notBoundReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.RegistryNotBound.selector,
                registry1
            )
        );
        store.unbindIdentityRegistry(registry1);
    }

    function test_unbindIdentityRegistry_preservesOthers() public {
        vm.startPrank(admin);
        store.bindIdentityRegistry(registry1);
        store.bindIdentityRegistry(registry2);
        store.unbindIdentityRegistry(registry1);
        vm.stopPrank();

        assertTrue(store.isRegistryBound(registry2));
        assertFalse(store.isRegistryBound(registry1));
        assertEq(store.linkedIdentityRegistries().length, 1);
        assertEq(store.linkedIdentityRegistries()[0], registry2);
    }

    // ============ Identity data management (agent-gated) ============

    function test_addIdentityToStorage_happyPath() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.expectEmit(true, true, false, false);
        emit IdentityStored(user1, identity1);

        vm.prank(registry1);
        store.addIdentityToStorage(user1, identity1, 250);

        assertEq(address(store.storedIdentity(user1)), address(identity1));
        assertEq(store.storedInvestorCountry(user1), 250);
    }

    function test_addIdentityToStorage_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        store.addIdentityToStorage(user1, identity1, 250);
    }

    function test_addIdentityToStorage_zeroAddressReverts() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.startPrank(registry1);
        vm.expectRevert(GalileoIdentityRegistryStorage.ZeroAddress.selector);
        store.addIdentityToStorage(address(0), identity1, 250);

        vm.expectRevert(GalileoIdentityRegistryStorage.ZeroAddress.selector);
        store.addIdentityToStorage(user1, IIdentity(address(0)), 250);
        vm.stopPrank();
    }

    function test_addIdentityToStorage_duplicateReverts() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.startPrank(registry1);
        store.addIdentityToStorage(user1, identity1, 250);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.IdentityAlreadyStored.selector,
                user1
            )
        );
        store.addIdentityToStorage(user1, identity1, 250);
        vm.stopPrank();
    }

    function test_modifyStoredIdentity_happyPath() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.startPrank(registry1);
        store.addIdentityToStorage(user1, identity1, 250);

        vm.expectEmit(true, true, false, false);
        emit IdentityModified(identity1, identity2);
        store.modifyStoredIdentity(user1, identity2);
        vm.stopPrank();

        assertEq(address(store.storedIdentity(user1)), address(identity2));
    }

    function test_modifyStoredIdentity_notStoredReverts() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.prank(registry1);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.IdentityNotStored.selector,
                user1
            )
        );
        store.modifyStoredIdentity(user1, identity1);
    }

    function test_modifyStoredInvestorCountry_happyPath() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.startPrank(registry1);
        store.addIdentityToStorage(user1, identity1, 250);

        vm.expectEmit(true, true, false, false);
        emit CountryModified(user1, 840);
        store.modifyStoredInvestorCountry(user1, 840);
        vm.stopPrank();

        assertEq(store.storedInvestorCountry(user1), 840);
    }

    function test_modifyStoredInvestorCountry_notStoredReverts() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.prank(registry1);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.IdentityNotStored.selector,
                user1
            )
        );
        store.modifyStoredInvestorCountry(user1, 250);
    }

    function test_removeIdentityFromStorage_happyPath() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.startPrank(registry1);
        store.addIdentityToStorage(user1, identity1, 250);

        vm.expectEmit(true, true, false, false);
        emit IdentityUnstored(user1, identity1);
        store.removeIdentityFromStorage(user1);
        vm.stopPrank();

        assertEq(address(store.storedIdentity(user1)), address(0));
        assertEq(store.storedInvestorCountry(user1), 0);
    }

    function test_removeIdentityFromStorage_notStoredReverts() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);

        vm.prank(registry1);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.IdentityNotStored.selector,
                user1
            )
        );
        store.removeIdentityFromStorage(user1);
    }

    function test_agentRole_multipleRegistriesCanWrite() public {
        vm.startPrank(admin);
        store.bindIdentityRegistry(registry1);
        store.bindIdentityRegistry(registry2);
        vm.stopPrank();

        vm.prank(registry1);
        store.addIdentityToStorage(user1, identity1, 250);

        vm.prank(registry2);
        store.addIdentityToStorage(user2, identity2, 840);

        assertEq(address(store.storedIdentity(user1)), address(identity1));
        assertEq(address(store.storedIdentity(user2)), address(identity2));
    }

    function test_agentRole_revokedAfterUnbind() public {
        vm.startPrank(admin);
        store.bindIdentityRegistry(registry1);
        store.unbindIdentityRegistry(registry1);
        vm.stopPrank();

        vm.prank(registry1);
        vm.expectRevert();
        store.addIdentityToStorage(user1, identity1, 250);
    }

    // ============ bindBrandRegistry ============

    function test_bindBrandRegistry_happyPath() public {
        vm.warp(2000);
        vm.expectEmit(true, false, false, true);
        emit IdentityRegistryBound(registry1);
        vm.expectEmit(true, false, true, true);
        emit BrandRegistryBound(registry1, DID1, admin, 2000);

        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);

        assertTrue(store.isRegistryBound(registry1));
        assertEq(store.getRegistryBrandDID(registry1), DID1);
        assertEq(store.getRegistryBindingTime(registry1), 2000);
        assertTrue(store.hasRole(AGENT_ROLE, registry1));
        assertEq(store.boundRegistryCount(), 1);
    }

    function test_bindBrandRegistry_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        store.bindBrandRegistry(registry1, DID1);
    }

    function test_bindBrandRegistry_zeroAddressReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.InvalidRegistryAddress.selector,
                address(0)
            )
        );
        store.bindBrandRegistry(address(0), DID1);
    }

    function test_bindBrandRegistry_alreadyBoundReverts() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.RegistryAlreadyBound.selector,
                registry1
            )
        );
        store.bindBrandRegistry(registry1, DID2);
        vm.stopPrank();
    }

    function test_bindBrandRegistry_emptyDIDReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.InvalidBrandDID.selector,
                ""
            )
        );
        store.bindBrandRegistry(registry1, "");
    }

    function test_bindBrandRegistry_multipleRegistries() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        store.bindBrandRegistry(registry3, DID3);
        vm.stopPrank();

        assertEq(store.boundRegistryCount(), 3);
        assertEq(store.getRegistryBrandDID(registry1), DID1);
        assertEq(store.getRegistryBrandDID(registry2), DID2);
        assertEq(store.getRegistryBrandDID(registry3), DID3);
    }

    // ============ isRegistryBound ============

    function test_isRegistryBound_trueAfterBind() public {
        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);
        assertTrue(store.isRegistryBound(registry1));
    }

    function test_isRegistryBound_falseForUnboundRegistry() public view {
        assertFalse(store.isRegistryBound(registry1));
    }

    function test_isRegistryBound_falseAfterUnbind() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.unbindBrandRegistry(registry1, DID1);
        vm.stopPrank();
        assertFalse(store.isRegistryBound(registry1));
    }

    // ============ getBoundRegistries ============

    function test_getBoundRegistries_returnsBoundAddresses() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        vm.stopPrank();

        address[] memory registries = store.getBoundRegistries();
        assertEq(registries.length, 2);
    }

    function test_getBoundRegistries_matchesLinkedIdentityRegistries() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        vm.stopPrank();

        address[] memory bound = store.getBoundRegistries();
        address[] memory linked = store.linkedIdentityRegistries();
        assertEq(bound.length, linked.length);
        assertEq(bound[0], linked[0]);
        assertEq(bound[1], linked[1]);
    }

    // ============ boundRegistryCount / boundRegistryAt ============

    function test_boundRegistryCount_incrementsOnBind() public {
        assertEq(store.boundRegistryCount(), 0);

        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);
        assertEq(store.boundRegistryCount(), 1);

        vm.prank(admin);
        store.bindBrandRegistry(registry2, DID2);
        assertEq(store.boundRegistryCount(), 2);
    }

    function test_boundRegistryCount_decrementsOnUnbind() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        store.unbindBrandRegistry(registry1, DID1);
        vm.stopPrank();

        assertEq(store.boundRegistryCount(), 1);
    }

    function test_boundRegistryAt_returnsCorrectAddress() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        vm.stopPrank();

        assertEq(store.boundRegistryAt(0), registry1);
        assertEq(store.boundRegistryAt(1), registry2);
    }

    function test_boundRegistryAt_outOfBoundsReverts() public {
        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);

        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.IndexOutOfBounds.selector,
                1,
                1
            )
        );
        store.boundRegistryAt(1);
    }

    function test_boundRegistryAt_emptyReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.IndexOutOfBounds.selector,
                0,
                0
            )
        );
        store.boundRegistryAt(0);
    }

    // ============ getRegistryBrandDID ============

    function test_getRegistryBrandDID_returnsStoredDID() public {
        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);
        assertEq(store.getRegistryBrandDID(registry1), DID1);
    }

    function test_getRegistryBrandDID_emptyForUnbound() public view {
        assertEq(store.getRegistryBrandDID(registry1), "");
    }

    function test_getRegistryBrandDID_emptyForBaseBound() public {
        vm.prank(admin);
        store.bindIdentityRegistry(registry1);
        assertEq(store.getRegistryBrandDID(registry1), "");
    }

    // ============ getRegistryBindingTime ============

    function test_getRegistryBindingTime_returnsBoundTimestamp() public {
        vm.warp(5000);
        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);
        assertEq(store.getRegistryBindingTime(registry1), 5000);
    }

    function test_getRegistryBindingTime_zeroForUnbound() public view {
        assertEq(store.getRegistryBindingTime(registry1), 0);
    }

    function test_getRegistryBindingTime_clearedOnUnbind() public {
        vm.warp(5000);
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.unbindBrandRegistry(registry1, DID1);
        vm.stopPrank();
        assertEq(store.getRegistryBindingTime(registry1), 0);
    }

    // ============ unbindBrandRegistry ============

    function test_unbindBrandRegistry_happyPath() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);

        vm.expectEmit(true, false, false, false);
        emit IdentityRegistryUnbound(registry1);
        vm.expectEmit(true, false, true, true);
        emit BrandRegistryUnbound(registry1, DID1, admin, block.timestamp);
        store.unbindBrandRegistry(registry1, DID1);
        vm.stopPrank();

        assertFalse(store.isRegistryBound(registry1));
        assertEq(store.getRegistryBrandDID(registry1), "");
        assertEq(store.boundRegistryCount(), 0);
        assertFalse(store.hasRole(AGENT_ROLE, registry1));
    }

    function test_unbindBrandRegistry_unauthorizedReverts() public {
        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);

        vm.prank(stranger);
        vm.expectRevert();
        store.unbindBrandRegistry(registry1, DID1);
    }

    function test_unbindBrandRegistry_notBoundReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.RegistryNotBound.selector,
                registry1
            )
        );
        store.unbindBrandRegistry(registry1, DID1);
    }

    function test_unbindBrandRegistry_wrongDIDReverts() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.DIDMismatch.selector,
                registry1
            )
        );
        store.unbindBrandRegistry(registry1, DID2);
        vm.stopPrank();
    }

    function test_unbindBrandRegistry_preservesOthers() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        store.unbindBrandRegistry(registry1, DID1);
        vm.stopPrank();

        assertTrue(store.isRegistryBound(registry2));
        assertEq(store.getRegistryBrandDID(registry2), DID2);
        assertFalse(store.isRegistryBound(registry1));
    }

    function test_unbindBrandRegistry_canRebindWithNewDID() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.unbindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry1, DID2);
        vm.stopPrank();

        assertTrue(store.isRegistryBound(registry1));
        assertEq(store.getRegistryBrandDID(registry1), DID2);
    }

    // ============ updateBrandDID ============

    function test_updateBrandDID_happyPath() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);

        vm.expectEmit(true, false, true, true);
        emit BrandDIDUpdated(registry1, DID1, DID2, admin);
        store.updateBrandDID(registry1, DID2);
        vm.stopPrank();

        assertEq(store.getRegistryBrandDID(registry1), DID2);
    }

    function test_updateBrandDID_unauthorizedReverts() public {
        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);

        vm.prank(stranger);
        vm.expectRevert();
        store.updateBrandDID(registry1, DID2);
    }

    function test_updateBrandDID_notBoundReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.RegistryNotBound.selector,
                registry1
            )
        );
        store.updateBrandDID(registry1, DID2);
    }

    function test_updateBrandDID_emptyDIDReverts() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoIdentityRegistryStorage.InvalidBrandDID.selector,
                ""
            )
        );
        store.updateBrandDID(registry1, "");
        vm.stopPrank();
    }

    function test_updateBrandDID_persistsNewDIDForUnbind() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.updateBrandDID(registry1, DID2);
        // unbindBrandRegistry must now use new DID
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoIdentityRegistryStorage.DIDMismatch.selector,
                registry1
            )
        );
        store.unbindBrandRegistry(registry1, DID1);

        // Correct DID works
        store.unbindBrandRegistry(registry1, DID2);
        vm.stopPrank();

        assertFalse(store.isRegistryBound(registry1));
    }

    // ============ canBindNewRegistry ============

    function test_canBindNewRegistry_trueWhenEmpty() public view {
        assertTrue(store.canBindNewRegistry());
    }

    function test_canBindNewRegistry_trueWhenFewBound() public {
        vm.prank(admin);
        store.bindBrandRegistry(registry1, DID1);
        assertTrue(store.canBindNewRegistry());
    }

    // ============ Access control ============

    function test_accessControl_adminCanGrantRole() public {
        vm.prank(admin);
        store.grantRole(REGISTRY_ADMIN_ROLE, stranger);
        assertTrue(store.hasRole(REGISTRY_ADMIN_ROLE, stranger));
    }

    function test_accessControl_grantedAdminCanBind() public {
        vm.prank(admin);
        store.grantRole(REGISTRY_ADMIN_ROLE, stranger);

        vm.prank(stranger);
        store.bindBrandRegistry(registry1, DID1);
        assertTrue(store.isRegistryBound(registry1));
    }

    function test_accessControl_revokedCannotBind() public {
        vm.startPrank(admin);
        store.grantRole(REGISTRY_ADMIN_ROLE, stranger);
        store.revokeRole(REGISTRY_ADMIN_ROLE, stranger);
        vm.stopPrank();

        vm.prank(stranger);
        vm.expectRevert();
        store.bindBrandRegistry(registry1, DID1);
    }

    function test_accessControl_directAgentRoleGrantAllowsWrite() public {
        vm.prank(admin);
        store.grantRole(AGENT_ROLE, registry1);

        vm.prank(registry1);
        store.addIdentityToStorage(user1, identity1, 250);
        assertEq(address(store.storedIdentity(user1)), address(identity1));
    }

    // ============ Mixed base + brand binding ============

    function test_mixedBinding_baseAndBrandCanCoexist() public {
        vm.startPrank(admin);
        store.bindIdentityRegistry(registry1);     // base bind, no DID
        store.bindBrandRegistry(registry2, DID2);  // brand bind, with DID
        vm.stopPrank();

        assertTrue(store.isRegistryBound(registry1));
        assertTrue(store.isRegistryBound(registry2));
        assertEq(store.boundRegistryCount(), 2);
        assertEq(store.getRegistryBrandDID(registry1), "");  // no DID for base bind
        assertEq(store.getRegistryBrandDID(registry2), DID2);
    }

    // ============ Pagination edge cases ============

    function test_pagination_threeRegistries() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        store.bindBrandRegistry(registry3, DID3);
        vm.stopPrank();

        assertEq(store.boundRegistryCount(), 3);
        assertEq(store.boundRegistryAt(0), registry1);
        assertEq(store.boundRegistryAt(1), registry2);
        assertEq(store.boundRegistryAt(2), registry3);
    }

    function test_pagination_afterUnbindMiddle() public {
        vm.startPrank(admin);
        store.bindBrandRegistry(registry1, DID1);
        store.bindBrandRegistry(registry2, DID2);
        store.bindBrandRegistry(registry3, DID3);
        store.unbindBrandRegistry(registry2, DID2);
        vm.stopPrank();

        // After removing registry2, registry3 should be swapped to index 1
        assertEq(store.boundRegistryCount(), 2);
        assertTrue(store.isRegistryBound(registry1));
        assertFalse(store.isRegistryBound(registry2));
        assertTrue(store.isRegistryBound(registry3));
    }
}
