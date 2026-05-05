// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoTrustedIssuersRegistry} from "../../src/identity/GalileoTrustedIssuersRegistry.sol";
import {IGalileoTrustedIssuersRegistry} from "../../src/interfaces/identity/ITrustedIssuersRegistry.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";

/**
 * @title GalileoTrustedIssuersRegistryTest
 * @notice Comprehensive tests for GalileoTrustedIssuersRegistry
 *
 * Coverage:
 * - Deployment and initial state
 * - addTrustedIssuer (ERC-3643 base)
 * - removeTrustedIssuer
 * - updateIssuerClaimTopics
 * - getTrustedIssuers / getTrustedIssuersForClaimTopic / isTrustedIssuer
 * - getTrustedIssuerClaimTopics / hasClaimTopic
 * - addTrustedIssuerWithCategory
 * - getIssuerCategory / getIssuerCertification / updateIssuerCertification
 * - getIssuersByCategory
 * - revokeIssuerForTopic
 * - suspendIssuer / reactivateIssuer / isIssuerSuspended
 * - isCertificationValid
 * - Access control
 * - Edge cases and reverts
 */
contract GalileoTrustedIssuersRegistryTest is Test {
    // ============ Mirror events (Solidity 0.8.17 can't emit qualified interface events) ============
    event TrustedIssuerAdded(
        IClaimIssuer indexed issuer,
        uint256[] claimTopics,
        IGalileoTrustedIssuersRegistry.IssuerCategory category,
        IGalileoTrustedIssuersRegistry.Certification certification
    );
    event TrustedIssuerRemoved(IClaimIssuer indexed trustedIssuer);
    event ClaimTopicsUpdated(IClaimIssuer indexed trustedIssuer, uint256[] claimTopics);
    event IssuerCategoryUpdated(
        address indexed issuer,
        IGalileoTrustedIssuersRegistry.IssuerCategory previousCategory,
        IGalileoTrustedIssuersRegistry.IssuerCategory newCategory
    );
    event IssuerCertificationUpdated(
        address indexed issuer,
        IGalileoTrustedIssuersRegistry.Certification certification
    );
    event IssuerTopicRevoked(address indexed issuer, uint256 indexed claimTopic, string reason);
    event IssuerSuspended(address indexed issuer, string reason, uint256 until);
    event IssuerReactivated(address indexed issuer);

    // ============ Fixtures ============

    GalileoTrustedIssuersRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    // Use mock addresses as IClaimIssuer (no need for full implementation in unit tests)
    IClaimIssuer internal issuer1;
    IClaimIssuer internal issuer2;
    IClaimIssuer internal issuer3;

    uint256 internal constant TOPIC_KYC = 1001;
    uint256 internal constant TOPIC_AML = 1002;
    uint256 internal constant TOPIC_HERITAGE = 2001;

    IGalileoTrustedIssuersRegistry.Certification internal validCert;
    IGalileoTrustedIssuersRegistry.Certification internal emptyCert;

    function setUp() public {
        registry = new GalileoTrustedIssuersRegistry(admin);

        issuer1 = IClaimIssuer(makeAddr("issuer1"));
        issuer2 = IClaimIssuer(makeAddr("issuer2"));
        issuer3 = IClaimIssuer(makeAddr("issuer3"));

        validCert = IGalileoTrustedIssuersRegistry.Certification({
            standard: "ISO27001",
            certReference: "ISO27001-2024-001",
            validUntil: block.timestamp + 365 days,
            verificationURI: "https://cert.example.com/verify/001"
        });

        emptyCert = IGalileoTrustedIssuersRegistry.Certification({
            standard: "",
            certReference: "",
            validUntil: 0,
            verificationURI: ""
        });
    }

    // ============ Helper ============

    function _topics1() internal pure returns (uint256[] memory) {
        uint256[] memory t = new uint256[](1);
        t[0] = TOPIC_KYC;
        return t;
    }

    function _topics2() internal pure returns (uint256[] memory) {
        uint256[] memory t = new uint256[](2);
        t[0] = TOPIC_KYC;
        t[1] = TOPIC_AML;
        return t;
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

    function test_deployment_emptyIssuers() public view {
        assertEq(registry.getTrustedIssuers().length, 0);
    }

    function test_deployment_zeroAdminReverts() public {
        vm.expectRevert(GalileoTrustedIssuersRegistry.ZeroAddress.selector);
        new GalileoTrustedIssuersRegistry(address(0));
    }

    // ============ addTrustedIssuer (ERC-3643 base) ============

    function test_addTrustedIssuer_happyPath() public {
        uint256[] memory topics = _topics1();
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, topics);

        IClaimIssuer[] memory issuers = registry.getTrustedIssuers();
        assertEq(issuers.length, 1);
        assertEq(address(issuers[0]), address(issuer1));
        assertTrue(registry.isTrustedIssuer(address(issuer1)));
    }

    function test_addTrustedIssuer_setsDefaultKycProviderCategory() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        assertEq(
            uint256(registry.getIssuerCategory(address(issuer1))),
            uint256(IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER)
        );
    }

    function test_addTrustedIssuer_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.addTrustedIssuer(issuer1, _topics1());
    }

    function test_addTrustedIssuer_zeroAddressReverts() public {
        vm.prank(admin);
        vm.expectRevert(GalileoTrustedIssuersRegistry.ZeroAddress.selector);
        registry.addTrustedIssuer(IClaimIssuer(address(0)), _topics1());
    }

    function test_addTrustedIssuer_duplicateReverts() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerAlreadyRegistered.selector,
                address(issuer1)
            )
        );
        registry.addTrustedIssuer(issuer1, _topics1());
        vm.stopPrank();
    }

    function test_addTrustedIssuer_emptyTopicsReverts() public {
        uint256[] memory empty = new uint256[](0);
        vm.prank(admin);
        vm.expectRevert(GalileoTrustedIssuersRegistry.EmptyClaimTopics.selector);
        registry.addTrustedIssuer(issuer1, empty);
    }

    function test_addTrustedIssuer_tooManyTopicsReverts() public {
        uint256[] memory topics = new uint256[](16);
        for (uint256 i = 0; i < 16; i++) topics[i] = i + 1;
        vm.prank(admin);
        vm.expectRevert(GalileoTrustedIssuersRegistry.TooManyClaimTopics.selector);
        registry.addTrustedIssuer(issuer1, topics);
    }

    function test_addTrustedIssuer_tooManyIssuersReverts() public {
        vm.startPrank(admin);
        for (uint256 i = 0; i < 50; i++) {
            address addr = address(uint160(0x1000 + i));
            uint256[] memory t = new uint256[](1);
            t[0] = i + 1;
            registry.addTrustedIssuer(IClaimIssuer(addr), t);
        }
        vm.expectRevert(GalileoTrustedIssuersRegistry.TooManyIssuers.selector);
        registry.addTrustedIssuer(issuer1, _topics1());
        vm.stopPrank();
    }

    function test_addTrustedIssuer_updatesTopicReverseMap() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics2());

        IClaimIssuer[] memory forKyc = registry.getTrustedIssuersForClaimTopic(TOPIC_KYC);
        IClaimIssuer[] memory forAml = registry.getTrustedIssuersForClaimTopic(TOPIC_AML);
        assertEq(forKyc.length, 1);
        assertEq(forAml.length, 1);
        assertEq(address(forKyc[0]), address(issuer1));
        assertEq(address(forAml[0]), address(issuer1));
    }

    // ============ removeTrustedIssuer ============

    function test_removeTrustedIssuer_happyPath() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        registry.removeTrustedIssuer(issuer1);
        vm.stopPrank();

        assertFalse(registry.isTrustedIssuer(address(issuer1)));
        assertEq(registry.getTrustedIssuers().length, 0);
    }

    function test_removeTrustedIssuer_clearsTopicMap() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics2());
        registry.removeTrustedIssuer(issuer1);
        vm.stopPrank();

        assertEq(registry.getTrustedIssuersForClaimTopic(TOPIC_KYC).length, 0);
        assertEq(registry.getTrustedIssuersForClaimTopic(TOPIC_AML).length, 0);
    }

    function test_removeTrustedIssuer_clearsCategoryList() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        registry.removeTrustedIssuer(issuer1);
        vm.stopPrank();

        address[] memory cat = registry.getIssuersByCategory(
            IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER
        );
        assertEq(cat.length, 0);
    }

    function test_removeTrustedIssuer_unauthorizedReverts() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        vm.prank(stranger);
        vm.expectRevert();
        registry.removeTrustedIssuer(issuer1);
    }

    function test_removeTrustedIssuer_notRegisteredReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegistered.selector,
                address(issuer1)
            )
        );
        registry.removeTrustedIssuer(issuer1);
    }

    function test_removeTrustedIssuer_preservesOthers() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        registry.addTrustedIssuer(issuer2, _topics1());
        registry.removeTrustedIssuer(issuer1);
        vm.stopPrank();

        assertTrue(registry.isTrustedIssuer(address(issuer2)));
        assertFalse(registry.isTrustedIssuer(address(issuer1)));
        assertEq(registry.getTrustedIssuers().length, 1);
    }

    // ============ updateIssuerClaimTopics ============

    function test_updateIssuerClaimTopics_happyPath() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        uint256[] memory newTopics = new uint256[](1);
        newTopics[0] = TOPIC_AML;
        registry.updateIssuerClaimTopics(issuer1, newTopics);
        vm.stopPrank();

        assertTrue(registry.hasClaimTopic(address(issuer1), TOPIC_AML));
        assertFalse(registry.hasClaimTopic(address(issuer1), TOPIC_KYC));
    }

    function test_updateIssuerClaimTopics_updatesReverseMap() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1()); // KYC only
        uint256[] memory newTopics = new uint256[](1);
        newTopics[0] = TOPIC_AML;
        registry.updateIssuerClaimTopics(issuer1, newTopics);
        vm.stopPrank();

        assertEq(registry.getTrustedIssuersForClaimTopic(TOPIC_KYC).length, 0);
        assertEq(registry.getTrustedIssuersForClaimTopic(TOPIC_AML).length, 1);
    }

    function test_updateIssuerClaimTopics_emptyTopicsReverts() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        uint256[] memory empty = new uint256[](0);
        vm.expectRevert(GalileoTrustedIssuersRegistry.EmptyClaimTopics.selector);
        registry.updateIssuerClaimTopics(issuer1, empty);
        vm.stopPrank();
    }

    function test_updateIssuerClaimTopics_notRegisteredReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegistered.selector,
                address(issuer1)
            )
        );
        registry.updateIssuerClaimTopics(issuer1, _topics1());
    }

    // ============ hasClaimTopic ============

    function test_hasClaimTopic_trueForRegisteredTopic() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics2());
        assertTrue(registry.hasClaimTopic(address(issuer1), TOPIC_KYC));
        assertTrue(registry.hasClaimTopic(address(issuer1), TOPIC_AML));
    }

    function test_hasClaimTopic_falseForUnregisteredTopic() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        assertFalse(registry.hasClaimTopic(address(issuer1), TOPIC_AML));
    }

    function test_hasClaimTopic_falseForUnknownIssuer() public view {
        assertFalse(registry.hasClaimTopic(address(issuer1), TOPIC_KYC));
    }

    // ============ addTrustedIssuerWithCategory ============

    function test_addTrustedIssuerWithCategory_happyPath() public {
        vm.prank(admin);
        registry.addTrustedIssuerWithCategory(
            issuer1,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.AUTH_LAB,
            validCert
        );

        assertTrue(registry.isTrustedIssuer(address(issuer1)));
        assertEq(
            uint256(registry.getIssuerCategory(address(issuer1))),
            uint256(IGalileoTrustedIssuersRegistry.IssuerCategory.AUTH_LAB)
        );
    }

    function test_addTrustedIssuerWithCategory_storesCertification() public {
        vm.prank(admin);
        registry.addTrustedIssuerWithCategory(
            issuer1,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.BRAND_ISSUER,
            validCert
        );

        IGalileoTrustedIssuersRegistry.Certification memory cert =
            registry.getIssuerCertification(address(issuer1));
        assertEq(cert.standard, validCert.standard);
        assertEq(cert.certReference, validCert.certReference);
        assertEq(cert.validUntil, validCert.validUntil);
        assertEq(cert.verificationURI, validCert.verificationURI);
    }

    function test_addTrustedIssuerWithCategory_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.addTrustedIssuerWithCategory(
            issuer1,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER,
            validCert
        );
    }

    function test_addTrustedIssuerWithCategory_expiredCertReverts() public {
        vm.warp(1000); // ensure block.timestamp > 1 so block.timestamp - 1 != 0
        uint256 expired = block.timestamp - 1;
        IGalileoTrustedIssuersRegistry.Certification memory expiredCert =
            IGalileoTrustedIssuersRegistry.Certification({
                standard: "ISO",
                certReference: "001",
                validUntil: expired,
                verificationURI: ""
            });

        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.CertificationExpired.selector,
                expired
            )
        );
        registry.addTrustedIssuerWithCategory(
            issuer1,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER,
            expiredCert
        );
    }

    function test_addTrustedIssuerWithCategory_permanentCertAccepted() public {
        IGalileoTrustedIssuersRegistry.Certification memory permanentCert =
            IGalileoTrustedIssuersRegistry.Certification({
                standard: "ISO",
                certReference: "001",
                validUntil: 0,
                verificationURI: ""
            });

        vm.prank(admin);
        // Should not revert
        registry.addTrustedIssuerWithCategory(
            issuer1,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.REGULATORY_BODY,
            permanentCert
        );
        assertTrue(registry.isCertificationValid(address(issuer1)));
    }

    function test_addTrustedIssuerWithCategory_addsToCategory() public {
        vm.startPrank(admin);
        registry.addTrustedIssuerWithCategory(
            issuer1,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.AUTH_LAB,
            emptyCert
        );
        registry.addTrustedIssuerWithCategory(
            issuer2,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.AUTH_LAB,
            emptyCert
        );
        registry.addTrustedIssuerWithCategory(
            issuer3,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.BRAND_ISSUER,
            emptyCert
        );
        vm.stopPrank();

        address[] memory authLabs = registry.getIssuersByCategory(
            IGalileoTrustedIssuersRegistry.IssuerCategory.AUTH_LAB
        );
        assertEq(authLabs.length, 2);

        address[] memory brandIssuers = registry.getIssuersByCategory(
            IGalileoTrustedIssuersRegistry.IssuerCategory.BRAND_ISSUER
        );
        assertEq(brandIssuers.length, 1);
        assertEq(brandIssuers[0], address(issuer3));
    }

    // ============ getIssuerCategory / getIssuerCertification ============

    function test_getIssuerCategory_unregisteredReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegistered.selector,
                address(issuer1)
            )
        );
        registry.getIssuerCategory(address(issuer1));
    }

    function test_getIssuerCertification_unregisteredReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegistered.selector,
                address(issuer1)
            )
        );
        registry.getIssuerCertification(address(issuer1));
    }

    // ============ updateIssuerCertification ============

    function test_updateIssuerCertification_happyPath() public {
        vm.startPrank(admin);
        registry.addTrustedIssuerWithCategory(
            issuer1,
            _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER,
            emptyCert
        );

        IGalileoTrustedIssuersRegistry.Certification memory newCert =
            IGalileoTrustedIssuersRegistry.Certification({
                standard: "SOC2",
                certReference: "SOC2-2025-042",
                validUntil: block.timestamp + 730 days,
                verificationURI: "https://soc2.example.com"
            });

        registry.updateIssuerCertification(address(issuer1), newCert);
        vm.stopPrank();

        IGalileoTrustedIssuersRegistry.Certification memory stored =
            registry.getIssuerCertification(address(issuer1));
        assertEq(stored.standard, "SOC2");
        assertEq(stored.certReference, "SOC2-2025-042");
    }

    function test_updateIssuerCertification_expiredReverts() public {
        vm.warp(1000); // ensure block.timestamp > 1 so block.timestamp - 1 != 0
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        uint256 expired = block.timestamp - 1;
        IGalileoTrustedIssuersRegistry.Certification memory expiredCert =
            IGalileoTrustedIssuersRegistry.Certification({
                standard: "X",
                certReference: "001",
                validUntil: expired,
                verificationURI: ""
            });
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.CertificationExpired.selector,
                expired
            )
        );
        registry.updateIssuerCertification(address(issuer1), expiredCert);
        vm.stopPrank();
    }

    function test_updateIssuerCertification_notRegisteredReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegistered.selector,
                address(issuer1)
            )
        );
        registry.updateIssuerCertification(address(issuer1), emptyCert);
    }

    function test_updateIssuerCertification_unauthorizedReverts() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        vm.prank(stranger);
        vm.expectRevert();
        registry.updateIssuerCertification(address(issuer1), emptyCert);
    }

    // ============ isCertificationValid ============

    function test_isCertificationValid_permanentIsValid() public {
        vm.prank(admin);
        registry.addTrustedIssuerWithCategory(
            issuer1, _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER,
            emptyCert  // validUntil = 0 = permanent
        );
        assertTrue(registry.isCertificationValid(address(issuer1)));
    }

    function test_isCertificationValid_futureIsValid() public {
        vm.prank(admin);
        registry.addTrustedIssuerWithCategory(
            issuer1, _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER,
            validCert
        );
        assertTrue(registry.isCertificationValid(address(issuer1)));
    }

    function test_isCertificationValid_expiredIsFalse() public {
        vm.prank(admin);
        registry.addTrustedIssuerWithCategory(
            issuer1, _topics1(),
            IGalileoTrustedIssuersRegistry.IssuerCategory.KYC_PROVIDER,
            validCert
        );

        // Warp past validUntil
        vm.warp(validCert.validUntil + 1);
        assertFalse(registry.isCertificationValid(address(issuer1)));
    }

    function test_isCertificationValid_unregisteredIsFalse() public view {
        assertFalse(registry.isCertificationValid(address(issuer1)));
    }

    // ============ revokeIssuerForTopic ============

    function test_revokeIssuerForTopic_happyPath() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics2());

        vm.expectEmit(true, true, false, true);
        emit IssuerTopicRevoked(address(issuer1), TOPIC_KYC, "license expired");
        registry.revokeIssuerForTopic(address(issuer1), TOPIC_KYC, "license expired");
        vm.stopPrank();

        assertFalse(registry.hasClaimTopic(address(issuer1), TOPIC_KYC));
        assertTrue(registry.hasClaimTopic(address(issuer1), TOPIC_AML));
    }

    function test_revokeIssuerForTopic_removesFromReverseMap() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics2());
        registry.addTrustedIssuer(issuer2, _topics1());
        registry.revokeIssuerForTopic(address(issuer1), TOPIC_KYC, "reason");
        vm.stopPrank();

        // issuer2 still has KYC
        IClaimIssuer[] memory issuersForKyc = registry.getTrustedIssuersForClaimTopic(TOPIC_KYC);
        assertEq(issuersForKyc.length, 1);
        assertEq(address(issuersForKyc[0]), address(issuer2));
    }

    function test_revokeIssuerForTopic_unauthorizedReverts() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        vm.prank(stranger);
        vm.expectRevert();
        registry.revokeIssuerForTopic(address(issuer1), TOPIC_KYC, "reason");
    }

    function test_revokeIssuerForTopic_notRegisteredReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegistered.selector,
                address(issuer1)
            )
        );
        registry.revokeIssuerForTopic(address(issuer1), TOPIC_KYC, "reason");
    }

    function test_revokeIssuerForTopic_topicNotHeldReverts() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1()); // KYC only
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegisteredForTopic.selector,
                address(issuer1),
                TOPIC_AML
            )
        );
        registry.revokeIssuerForTopic(address(issuer1), TOPIC_AML, "reason");
        vm.stopPrank();
    }

    function test_revokeIssuerForTopic_issuerRemainsRegistered() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics2());
        registry.revokeIssuerForTopic(address(issuer1), TOPIC_KYC, "reason");
        vm.stopPrank();

        // Issuer is still registered (just lost one topic)
        assertTrue(registry.isTrustedIssuer(address(issuer1)));
    }

    // ============ suspendIssuer / reactivateIssuer ============

    function test_suspendIssuer_happyPath_indefinite() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        vm.expectEmit(true, false, false, true);
        emit IssuerSuspended(address(issuer1), "investigation", 0);
        registry.suspendIssuer(address(issuer1), "investigation", 0);
        vm.stopPrank();

        assertTrue(registry.isIssuerSuspended(address(issuer1)));
    }

    function test_suspendIssuer_happyPath_timeLimited() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        uint256 expiry = block.timestamp + 7 days;
        registry.suspendIssuer(address(issuer1), "pending renewal", expiry);
        vm.stopPrank();

        assertTrue(registry.isIssuerSuspended(address(issuer1)));

        // After expiry
        vm.warp(expiry + 1);
        assertFalse(registry.isIssuerSuspended(address(issuer1)));
    }

    function test_suspendIssuer_unauthorizedReverts() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        vm.prank(stranger);
        vm.expectRevert();
        registry.suspendIssuer(address(issuer1), "reason", 0);
    }

    function test_suspendIssuer_notRegisteredReverts() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotRegistered.selector,
                address(issuer1)
            )
        );
        registry.suspendIssuer(address(issuer1), "reason", 0);
    }

    function test_suspendIssuer_alreadySuspendedReverts() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        registry.suspendIssuer(address(issuer1), "first", 0);
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerAlreadySuspended.selector,
                address(issuer1)
            )
        );
        registry.suspendIssuer(address(issuer1), "second", 0);
        vm.stopPrank();
    }

    function test_suspendIssuer_pastExpiryReverts() public {
        vm.warp(1000); // ensure block.timestamp > 1 so block.timestamp - 1 != 0
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        uint256 past = block.timestamp - 1;
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.SuspensionInPast.selector,
                past
            )
        );
        registry.suspendIssuer(address(issuer1), "reason", past);
        vm.stopPrank();
    }

    function test_reactivateIssuer_happyPath() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        registry.suspendIssuer(address(issuer1), "reason", 0);

        vm.expectEmit(true, false, false, false);
        emit IssuerReactivated(address(issuer1));
        registry.reactivateIssuer(address(issuer1));
        vm.stopPrank();

        assertFalse(registry.isIssuerSuspended(address(issuer1)));
    }

    function test_reactivateIssuer_unauthorizedReverts() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        registry.suspendIssuer(address(issuer1), "reason", 0);
        vm.stopPrank();

        vm.prank(stranger);
        vm.expectRevert();
        registry.reactivateIssuer(address(issuer1));
    }

    function test_reactivateIssuer_notSuspendedReverts() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        vm.expectRevert(
            abi.encodeWithSelector(
                GalileoTrustedIssuersRegistry.IssuerNotSuspended.selector,
                address(issuer1)
            )
        );
        registry.reactivateIssuer(address(issuer1));
        vm.stopPrank();
    }

    function test_reactivateIssuer_canSuspendAgainAfterReactivation() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        registry.suspendIssuer(address(issuer1), "first", 0);
        registry.reactivateIssuer(address(issuer1));
        // Should not revert
        registry.suspendIssuer(address(issuer1), "second", 0);
        vm.stopPrank();

        assertTrue(registry.isIssuerSuspended(address(issuer1)));
    }

    function test_isIssuerSuspended_falseForActiveIssuer() public {
        vm.prank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());
        assertFalse(registry.isIssuerSuspended(address(issuer1)));
    }

    function test_isIssuerSuspended_falseForUnregisteredIssuer() public view {
        assertFalse(registry.isIssuerSuspended(address(issuer1)));
    }

    function test_suspendIssuer_canResuspendAfterTimeLimitedExpiry() public {
        vm.startPrank(admin);
        registry.addTrustedIssuer(issuer1, _topics1());

        // Suspend with a time-limited expiry
        uint256 expiry = block.timestamp + 7 days;
        registry.suspendIssuer(address(issuer1), "first", expiry);
        assertTrue(registry.isIssuerSuspended(address(issuer1)));

        // Warp past expiry — suspension naturally expires
        vm.warp(expiry + 1);
        assertFalse(registry.isIssuerSuspended(address(issuer1)));

        // Should be able to suspend again without revert
        registry.suspendIssuer(address(issuer1), "second", 0);
        assertTrue(registry.isIssuerSuspended(address(issuer1)));
        vm.stopPrank();
    }

    // ============ Access control ============

    function test_accessControl_adminCanGrantRole() public {
        vm.prank(admin);
        registry.grantRole(REGISTRY_ADMIN_ROLE, stranger);
        assertTrue(registry.hasRole(REGISTRY_ADMIN_ROLE, stranger));
    }

    function test_accessControl_grantedAdminCanAddIssuers() public {
        vm.prank(admin);
        registry.grantRole(REGISTRY_ADMIN_ROLE, stranger);

        vm.prank(stranger);
        registry.addTrustedIssuer(issuer1, _topics1());
        assertTrue(registry.isTrustedIssuer(address(issuer1)));
    }

    function test_accessControl_revokedCannotAdd() public {
        vm.startPrank(admin);
        registry.grantRole(REGISTRY_ADMIN_ROLE, stranger);
        registry.revokeRole(REGISTRY_ADMIN_ROLE, stranger);
        vm.stopPrank();

        vm.prank(stranger);
        vm.expectRevert();
        registry.addTrustedIssuer(issuer1, _topics1());
    }

    // ============ getIssuersByCategory — empty categories ============

    function test_getIssuersByCategory_emptyWhenNoneAdded() public view {
        for (uint256 i = 0; i < 4; i++) {
            assertEq(
                registry.getIssuersByCategory(
                    IGalileoTrustedIssuersRegistry.IssuerCategory(i)
                ).length,
                0
            );
        }
    }
}
