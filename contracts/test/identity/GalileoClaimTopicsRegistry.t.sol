// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoClaimTopicsRegistry} from "../../src/identity/GalileoClaimTopicsRegistry.sol";
import {IGalileoClaimTopicsRegistry, GalileoClaimTopics} from "../../src/interfaces/identity/IClaimTopicsRegistry.sol";

/**
 * @title GalileoClaimTopicsRegistryTest
 * @notice Comprehensive tests for GalileoClaimTopicsRegistry
 *
 * Coverage:
 * - Deployment and initial state
 * - addClaimTopic (base ERC-3643)
 * - removeClaimTopic
 * - getClaimTopics
 * - addClaimTopicWithMetadata
 * - getTopicMetadata
 * - getTopicIdByNamespace
 * - isComplianceTopic
 * - getTopicsByType
 * - deprecateTopic / isTopicDeprecated
 * - getTopicsByPrefix
 * - Access control (all restricted functions)
 * - Edge cases and reverts
 */
contract GalileoClaimTopicsRegistryTest is Test {
    // Mirror base T-REX events
    event ClaimTopicAdded(uint256 indexed claimTopic);
    event ClaimTopicRemoved(uint256 indexed claimTopic);
    // Mirror Galileo extension events
    event ClaimTopicRegistered(
        uint256 indexed claimTopic,
        string namespace,
        IGalileoClaimTopicsRegistry.TopicMetadata metadata
    );
    event TopicMetadataUpdated(
        uint256 indexed claimTopic,
        IGalileoClaimTopicsRegistry.TopicMetadata metadata
    );
    event ClaimTopicDeprecated(uint256 indexed claimTopic, string reason);

    // ============ Fixtures ============

    GalileoClaimTopicsRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    // Predefined topics from GalileoClaimTopics library
    uint256 internal constant KYC_BASIC = GalileoClaimTopics.KYC_BASIC;
    uint256 internal constant KYC_ENHANCED = GalileoClaimTopics.KYC_ENHANCED;
    uint256 internal constant ORIGIN_CERTIFIED = GalileoClaimTopics.ORIGIN_CERTIFIED;
    uint256 internal constant AUTHENTICITY_VERIFIED = GalileoClaimTopics.AUTHENTICITY_VERIFIED;

    IGalileoClaimTopicsRegistry.TopicMetadata internal kycBasicMeta;
    IGalileoClaimTopicsRegistry.TopicMetadata internal originMeta;

    function setUp() public {
        registry = new GalileoClaimTopicsRegistry(admin);

        kycBasicMeta = IGalileoClaimTopicsRegistry.TopicMetadata({
            namespace: "galileo.kyc.basic",
            description: "Basic KYC verification",
            defaultExpiry: GalileoClaimTopics.COMPLIANCE_DEFAULT_EXPIRY,
            isCompliance: true
        });

        originMeta = IGalileoClaimTopicsRegistry.TopicMetadata({
            namespace: "galileo.heritage.origin_certified",
            description: "Origin certification",
            defaultExpiry: GalileoClaimTopics.PERMANENT_EXPIRY,
            isCompliance: false
        });
    }

    // ============ Deployment ============

    function test_deployment_adminRoles() public view {
        assertTrue(registry.hasRole(DEFAULT_ADMIN_ROLE, admin));
        assertTrue(registry.hasRole(REGISTRY_ADMIN_ROLE, admin));
    }

    function test_deployment_strangerHasNoRoles() public view {
        assertFalse(registry.hasRole(DEFAULT_ADMIN_ROLE, stranger));
        assertFalse(registry.hasRole(REGISTRY_ADMIN_ROLE, stranger));
    }

    function test_deployment_emptyTopics() public view {
        assertEq(registry.getClaimTopics().length, 0);
    }

    function test_deployment_zeroAdminReverts() public {
        vm.expectRevert("GalileoClaimTopicsRegistry: zero admin");
        new GalileoClaimTopicsRegistry(address(0));
    }

    // ============ addClaimTopic (ERC-3643 base) ============

    function test_addClaimTopic_happyPath() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit ClaimTopicAdded(KYC_BASIC);
        registry.addClaimTopic(KYC_BASIC);

        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], KYC_BASIC);
    }

    function test_addClaimTopic_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.addClaimTopic(KYC_BASIC);
    }

    function test_addClaimTopic_duplicateReverts() public {
        vm.startPrank(admin);
        registry.addClaimTopic(KYC_BASIC);
        vm.expectRevert(
            abi.encodeWithSelector(GalileoClaimTopicsRegistry.TopicAlreadyRegistered.selector, KYC_BASIC)
        );
        registry.addClaimTopic(KYC_BASIC);
        vm.stopPrank();
    }

    function test_addClaimTopic_maxTopicsReverts() public {
        vm.startPrank(admin);
        for (uint256 i = 1; i <= 15; i++) {
            registry.addClaimTopic(i);
        }
        vm.expectRevert(GalileoClaimTopicsRegistry.TooManyTopics.selector);
        registry.addClaimTopic(16);
        vm.stopPrank();
    }

    function test_addClaimTopic_multipleTopics() public {
        vm.startPrank(admin);
        registry.addClaimTopic(KYC_BASIC);
        registry.addClaimTopic(KYC_ENHANCED);
        registry.addClaimTopic(ORIGIN_CERTIFIED);
        vm.stopPrank();

        assertEq(registry.getClaimTopics().length, 3);
    }

    // ============ removeClaimTopic ============

    function test_removeClaimTopic_happyPath() public {
        vm.startPrank(admin);
        registry.addClaimTopic(KYC_BASIC);

        vm.expectEmit(true, false, false, false);
        emit ClaimTopicRemoved(KYC_BASIC);
        registry.removeClaimTopic(KYC_BASIC);
        vm.stopPrank();

        assertEq(registry.getClaimTopics().length, 0);
    }

    function test_removeClaimTopic_unauthorizedReverts() public {
        vm.prank(admin);
        registry.addClaimTopic(KYC_BASIC);

        vm.prank(stranger);
        vm.expectRevert();
        registry.removeClaimTopic(KYC_BASIC);
    }

    function test_removeClaimTopic_nonExistentReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(GalileoClaimTopicsRegistry.TopicNotRegistered.selector, KYC_BASIC)
        );
        registry.removeClaimTopic(KYC_BASIC);
    }

    function test_removeClaimTopic_preservesOthers() public {
        vm.startPrank(admin);
        registry.addClaimTopic(KYC_BASIC);
        registry.addClaimTopic(KYC_ENHANCED);
        registry.addClaimTopic(ORIGIN_CERTIFIED);
        registry.removeClaimTopic(KYC_ENHANCED);
        vm.stopPrank();

        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 2);
        // KYC_BASIC and ORIGIN_CERTIFIED remain (order may change due to swap-and-pop)
        bool hasKycBasic = false;
        bool hasOrigin = false;
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == KYC_BASIC) hasKycBasic = true;
            if (topics[i] == ORIGIN_CERTIFIED) hasOrigin = true;
        }
        assertTrue(hasKycBasic);
        assertTrue(hasOrigin);
    }

    function test_removeClaimTopic_canReAddAfterRemoval() public {
        vm.startPrank(admin);
        registry.addClaimTopic(KYC_BASIC);
        registry.removeClaimTopic(KYC_BASIC);
        registry.addClaimTopic(KYC_BASIC); // should not revert
        vm.stopPrank();

        assertEq(registry.getClaimTopics().length, 1);
    }

    // ============ addClaimTopicWithMetadata ============

    function test_addClaimTopicWithMetadata_happyPath() public {
        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit ClaimTopicAdded(KYC_BASIC);
        vm.expectEmit(true, true, false, true);
        emit ClaimTopicRegistered(KYC_BASIC, "galileo.kyc.basic", kycBasicMeta);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);

        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], KYC_BASIC);
    }

    function test_addClaimTopicWithMetadata_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
    }

    function test_addClaimTopicWithMetadata_emptyNamespaceReverts() public {
        IGalileoClaimTopicsRegistry.TopicMetadata memory badMeta = IGalileoClaimTopicsRegistry
            .TopicMetadata({
                namespace: "",
                description: "No namespace",
                defaultExpiry: 365 days,
                isCompliance: true
            });

        vm.prank(admin);
        vm.expectRevert(GalileoClaimTopicsRegistry.EmptyNamespace.selector);
        registry.addClaimTopicWithMetadata(KYC_BASIC, badMeta);
    }

    function test_addClaimTopicWithMetadata_duplicateReverts() public {
        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        vm.expectRevert(
            abi.encodeWithSelector(GalileoClaimTopicsRegistry.TopicAlreadyRegistered.selector, KYC_BASIC)
        );
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        vm.stopPrank();
    }

    function test_addClaimTopicWithMetadata_maxTopicsReverts() public {
        vm.startPrank(admin);
        for (uint256 i = 1; i <= 15; i++) {
            IGalileoClaimTopicsRegistry.TopicMetadata memory m = IGalileoClaimTopicsRegistry
                .TopicMetadata({
                    namespace: "ns",
                    description: "d",
                    defaultExpiry: 0,
                    isCompliance: false
                });
            registry.addClaimTopicWithMetadata(i, m);
        }
        vm.expectRevert(GalileoClaimTopicsRegistry.TooManyTopics.selector);
        registry.addClaimTopicWithMetadata(16, kycBasicMeta);
        vm.stopPrank();
    }

    // ============ getTopicMetadata ============

    function test_getTopicMetadata_returnsCorrectData() public {
        vm.prank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);

        IGalileoClaimTopicsRegistry.TopicMetadata memory meta = registry.getTopicMetadata(KYC_BASIC);
        assertEq(meta.namespace, kycBasicMeta.namespace);
        assertEq(meta.description, kycBasicMeta.description);
        assertEq(meta.defaultExpiry, kycBasicMeta.defaultExpiry);
        assertEq(meta.isCompliance, kycBasicMeta.isCompliance);
    }

    function test_getTopicMetadata_unregisteredReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(GalileoClaimTopicsRegistry.TopicNotRegistered.selector, KYC_BASIC)
        );
        registry.getTopicMetadata(KYC_BASIC);
    }

    function test_getTopicMetadata_addedWithoutMetadataReturnsEmpty() public {
        vm.prank(admin);
        registry.addClaimTopic(KYC_BASIC);

        IGalileoClaimTopicsRegistry.TopicMetadata memory meta = registry.getTopicMetadata(KYC_BASIC);
        assertEq(bytes(meta.namespace).length, 0);
        assertEq(meta.defaultExpiry, 0);
        assertFalse(meta.isCompliance);
    }

    // ============ getTopicIdByNamespace ============

    function test_getTopicIdByNamespace_matchesLibraryConstants() public view {
        uint256 computed = registry.getTopicIdByNamespace("galileo.kyc.basic");
        assertEq(computed, GalileoClaimTopics.KYC_BASIC);
    }

    function test_getTopicIdByNamespace_differentNamespacesDiffer() public view {
        uint256 a = registry.getTopicIdByNamespace("galileo.kyc.basic");
        uint256 b = registry.getTopicIdByNamespace("galileo.kyc.enhanced");
        assertTrue(a != b);
    }

    function test_getTopicIdByNamespace_deterministicPureFunction() public view {
        uint256 first = registry.getTopicIdByNamespace("galileo.kyc.basic");
        uint256 second = registry.getTopicIdByNamespace("galileo.kyc.basic");
        assertEq(first, second);
    }

    // ============ isComplianceTopic ============

    function test_isComplianceTopic_trueForComplianceTopic() public {
        vm.prank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        assertTrue(registry.isComplianceTopic(KYC_BASIC));
    }

    function test_isComplianceTopic_falseForHeritageTopic() public {
        vm.prank(admin);
        registry.addClaimTopicWithMetadata(ORIGIN_CERTIFIED, originMeta);
        assertFalse(registry.isComplianceTopic(ORIGIN_CERTIFIED));
    }

    function test_isComplianceTopic_unregisteredReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(GalileoClaimTopicsRegistry.TopicNotRegistered.selector, KYC_BASIC)
        );
        registry.isComplianceTopic(KYC_BASIC);
    }

    // ============ getTopicsByType ============

    function test_getTopicsByType_onlyCompliance() public {
        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        registry.addClaimTopicWithMetadata(ORIGIN_CERTIFIED, originMeta);
        vm.stopPrank();

        uint256[] memory compliance = registry.getTopicsByType(true);
        assertEq(compliance.length, 1);
        assertEq(compliance[0], KYC_BASIC);
    }

    function test_getTopicsByType_onlyHeritage() public {
        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        registry.addClaimTopicWithMetadata(ORIGIN_CERTIFIED, originMeta);
        vm.stopPrank();

        uint256[] memory heritage = registry.getTopicsByType(false);
        assertEq(heritage.length, 1);
        assertEq(heritage[0], ORIGIN_CERTIFIED);
    }

    function test_getTopicsByType_emptyResult() public view {
        uint256[] memory compliance = registry.getTopicsByType(true);
        assertEq(compliance.length, 0);
    }

    function test_getTopicsByType_topicAddedWithoutMetadata() public {
        // Topic added via addClaimTopic has isCompliance=false by default
        vm.prank(admin);
        registry.addClaimTopic(KYC_BASIC);

        uint256[] memory heritage = registry.getTopicsByType(false);
        assertEq(heritage.length, 1);
        assertEq(heritage[0], KYC_BASIC);
    }

    // ============ deprecateTopic ============

    function test_deprecateTopic_happyPath() public {
        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);

        vm.expectEmit(true, false, false, true);
        emit ClaimTopicDeprecated(KYC_BASIC, "Superseded by KYC v2");
        registry.deprecateTopic(KYC_BASIC, "Superseded by KYC v2");
        vm.stopPrank();

        assertTrue(registry.isTopicDeprecated(KYC_BASIC));
    }

    function test_deprecateTopic_unauthorizedReverts() public {
        vm.prank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);

        vm.prank(stranger);
        vm.expectRevert();
        registry.deprecateTopic(KYC_BASIC, "reason");
    }

    function test_deprecateTopic_unregisteredReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(GalileoClaimTopicsRegistry.TopicNotRegistered.selector, KYC_BASIC)
        );
        registry.deprecateTopic(KYC_BASIC, "reason");
    }

    function test_deprecateTopic_alreadyDeprecatedReverts() public {
        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        registry.deprecateTopic(KYC_BASIC, "first");
        vm.expectRevert(
            abi.encodeWithSelector(GalileoClaimTopicsRegistry.TopicAlreadyDeprecated.selector, KYC_BASIC)
        );
        registry.deprecateTopic(KYC_BASIC, "second");
        vm.stopPrank();
    }

    function test_isTopicDeprecated_falseForActiveTopics() public {
        vm.prank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        assertFalse(registry.isTopicDeprecated(KYC_BASIC));
    }

    function test_isTopicDeprecated_falseForUnregisteredTopics() public view {
        // Does not revert, simply returns false for unknown topics
        assertFalse(registry.isTopicDeprecated(KYC_BASIC));
    }

    function test_deprecateTopic_topicRemainsInList() public {
        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        registry.deprecateTopic(KYC_BASIC, "obsolete");
        vm.stopPrank();

        // Deprecated topics still appear in getClaimTopics
        uint256[] memory topics = registry.getClaimTopics();
        assertEq(topics.length, 1);
        assertEq(topics[0], KYC_BASIC);
    }

    // ============ getTopicsByPrefix ============

    function test_getTopicsByPrefix_matchesKycTopics() public {
        IGalileoClaimTopicsRegistry.TopicMetadata memory kycEnhancedMeta = IGalileoClaimTopicsRegistry
            .TopicMetadata({
                namespace: "galileo.kyc.enhanced",
                description: "Enhanced KYC",
                defaultExpiry: GalileoClaimTopics.COMPLIANCE_DEFAULT_EXPIRY,
                isCompliance: true
            });

        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        registry.addClaimTopicWithMetadata(KYC_ENHANCED, kycEnhancedMeta);
        registry.addClaimTopicWithMetadata(ORIGIN_CERTIFIED, originMeta);
        vm.stopPrank();

        uint256[] memory results = registry.getTopicsByPrefix("galileo.kyc.");
        assertEq(results.length, 2);
        bool hasBasic = false;
        bool hasEnhanced = false;
        for (uint256 i = 0; i < results.length; i++) {
            if (results[i] == KYC_BASIC) hasBasic = true;
            if (results[i] == KYC_ENHANCED) hasEnhanced = true;
        }
        assertTrue(hasBasic);
        assertTrue(hasEnhanced);
    }

    function test_getTopicsByPrefix_noMatches() public {
        vm.prank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);

        uint256[] memory results = registry.getTopicsByPrefix("notexist.");
        assertEq(results.length, 0);
    }

    function test_getTopicsByPrefix_emptyPrefix_matchesAll() public {
        vm.startPrank(admin);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);
        registry.addClaimTopicWithMetadata(ORIGIN_CERTIFIED, originMeta);
        vm.stopPrank();

        uint256[] memory results = registry.getTopicsByPrefix("");
        assertEq(results.length, 2);
    }

    function test_getTopicsByPrefix_topicsWithoutMetadataNotMatched() public {
        vm.startPrank(admin);
        // Added without metadata: namespace is ""
        registry.addClaimTopic(KYC_BASIC);
        vm.stopPrank();

        // Prefix "galileo" won't match empty namespace
        uint256[] memory results = registry.getTopicsByPrefix("galileo");
        assertEq(results.length, 0);
    }

    // ============ Access control — role management ============

    function test_accessControl_adminCanGrantRegistryAdminRole() public {
        vm.prank(admin);
        registry.grantRole(REGISTRY_ADMIN_ROLE, stranger);
        assertTrue(registry.hasRole(REGISTRY_ADMIN_ROLE, stranger));
    }

    function test_accessControl_strangerCannotGrantRole() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.grantRole(REGISTRY_ADMIN_ROLE, stranger);
    }

    function test_accessControl_grantedAdminCanAddTopics() public {
        vm.prank(admin);
        registry.grantRole(REGISTRY_ADMIN_ROLE, stranger);

        vm.prank(stranger);
        registry.addClaimTopicWithMetadata(KYC_BASIC, kycBasicMeta);

        assertEq(registry.getClaimTopics().length, 1);
    }

    function test_accessControl_revokedAdminCannotAddTopics() public {
        vm.startPrank(admin);
        registry.grantRole(REGISTRY_ADMIN_ROLE, stranger);
        registry.revokeRole(REGISTRY_ADMIN_ROLE, stranger);
        vm.stopPrank();

        vm.prank(stranger);
        vm.expectRevert();
        registry.addClaimTopic(KYC_BASIC);
    }
}
