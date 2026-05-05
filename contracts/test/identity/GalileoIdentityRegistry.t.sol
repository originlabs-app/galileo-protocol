// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoIdentityRegistry} from "../../src/identity/GalileoIdentityRegistry.sol";
import {IGalileoIdentityRegistry} from "../../src/interfaces/identity/IIdentityRegistry.sol";
import {IClaimTopicsRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/IClaimTopicsRegistry.sol";
import {ITrustedIssuersRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/ITrustedIssuersRegistry.sol";
import {IIdentityRegistryStorage} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistryStorage.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import {IERC735} from "@onchain-id/solidity/contracts/interface/IERC735.sol";

/**
 * @title GalileoIdentityRegistryTest
 * @notice Comprehensive tests for GalileoIdentityRegistry
 *
 * Coverage:
 * - Deployment and initial state
 * - registerIdentity / deleteIdentity / updateIdentity / updateCountry / batchRegisterIdentity
 * - setIdentityRegistryStorage / setClaimTopicsRegistry / setTrustedIssuersRegistry
 * - contains / identity / investorCountry / identityStorage / issuersRegistry / topicsRegistry
 * - isVerified (no required topics, verified, missing claim)
 * - isVerifiedWithConsent (consent granted, consent denied, same-registry implicit)
 * - batchVerify / batchVerifyWithConsent
 * - isConsortiumMember / getConsortiumRegistries
 * - identityCount
 * - isClaimTopicSupported
 * - Access control
 * - Error cases
 *
 * Mock strategy:
 * - Storage, TIR, CTR, and identity contracts are mocked using vm.mockCall
 * - ClaimIssuer validation is mocked via vm.mockCall on isClaimValid
 */
contract GalileoIdentityRegistryTest is Test {
    // ============ Mirror events (Solidity 0.8.17 can't emit qualified interface events) ============

    event IdentityRegistered(address indexed investorAddress, IIdentity indexed identity);
    event IdentityRemoved(address indexed investorAddress, IIdentity indexed identity);
    event IdentityUpdated(IIdentity indexed oldIdentity, IIdentity indexed newIdentity);
    event CountryUpdated(address indexed investorAddress, uint16 indexed country);
    event ClaimTopicsRegistrySet(address indexed claimTopicsRegistry);
    event IdentityStorageSet(address indexed identityStorage);
    event TrustedIssuersRegistrySet(address indexed trustedIssuersRegistry);
    event ConsortiumMembershipChanged(
        address indexed registry,
        bool isMember,
        address tir,
        address ctr
    );

    // ============ Fixtures ============

    GalileoIdentityRegistry internal reg;

    address internal admin    = makeAddr("admin");
    address internal agent    = makeAddr("agent");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 internal constant AGENT_ROLE           = keccak256("AGENT_ROLE");
    bytes32 internal constant DEFAULT_ADMIN_ROLE   = 0x00;

    // Mock contract addresses — we use vm.mockCall to control their behaviour
    address internal tir     = makeAddr("tir");
    address internal ctr     = makeAddr("ctr");
    address internal storage_ = makeAddr("storage");

    // User addresses & mock identities
    address internal user1   = makeAddr("user1");
    address internal user2   = makeAddr("user2");
    address internal user3   = makeAddr("user3");
    IIdentity internal id1   = IIdentity(makeAddr("id1"));
    IIdentity internal id2   = IIdentity(makeAddr("id2"));
    IIdentity internal id3   = IIdentity(makeAddr("id3"));

    // Claim topics
    uint256 internal constant TOPIC_KYC = uint256(keccak256("galileo.kyc.basic"));
    uint256 internal constant TOPIC_AML = uint256(keccak256("galileo.aml.screening"));

    // Fake claim issuer
    address internal issuer1 = makeAddr("issuer1");

    // Brand registry (for consent tests)
    address internal brandA = makeAddr("brandA");

    function setUp() public {
        reg = new GalileoIdentityRegistry(admin, tir, ctr, storage_);

        // Grant AGENT_ROLE to agent
        vm.prank(admin);
        reg.grantRole(AGENT_ROLE, agent);
    }

    // ─────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────

    /// @dev Mock storage.storedIdentity(user) → id
    function _mockStoredIdentity(address user, IIdentity id) internal {
        vm.mockCall(
            storage_,
            abi.encodeWithSelector(IIdentityRegistryStorage.storedIdentity.selector, user),
            abi.encode(address(id))
        );
    }

    /// @dev Mock storage.storedInvestorCountry(user) → country
    function _mockStoredCountry(address user, uint16 country) internal {
        vm.mockCall(
            storage_,
            abi.encodeWithSelector(IIdentityRegistryStorage.storedInvestorCountry.selector, user),
            abi.encode(country)
        );
    }

    /// @dev Mock CTR.getClaimTopics() → topics
    function _mockCTRTopics(uint256[] memory topics) internal {
        vm.mockCall(
            ctr,
            abi.encodeWithSelector(IClaimTopicsRegistry.getClaimTopics.selector),
            abi.encode(topics)
        );
    }

    /// @dev Mock TIR.getTrustedIssuersForClaimTopic(topic) → issuers
    function _mockTIRIssuers(uint256 topic, IClaimIssuer[] memory issuers) internal {
        vm.mockCall(
            tir,
            abi.encodeWithSelector(ITrustedIssuersRegistry.getTrustedIssuersForClaimTopic.selector, topic),
            abi.encode(issuers)
        );
    }

    /// @dev Mock identity.getClaim(claimId) → (topic, 0, issuer, sig, data, "")
    function _mockGetClaim(
        address identityAddr,
        bytes32 claimId,
        uint256 topic,
        address issuerAddr,
        bytes memory sig,
        bytes memory data
    ) internal {
        vm.mockCall(
            identityAddr,
            abi.encodeWithSelector(IERC735.getClaim.selector, claimId),
            abi.encode(topic, uint256(0), issuerAddr, sig, data, "")
        );
    }

    /// @dev Mock IClaimIssuer.isClaimValid(...) → valid
    function _mockClaimValid(
        address issuerAddr,
        IIdentity id,
        uint256 topic,
        bytes memory sig,
        bytes memory data,
        bool valid
    ) internal {
        vm.mockCall(
            issuerAddr,
            abi.encodeWithSelector(IClaimIssuer.isClaimValid.selector, address(id), topic, sig, data),
            abi.encode(valid)
        );
    }

    /// @dev Mock identity.getClaimIdsByTopic(topic) → claimIds
    function _mockGetClaimIdsByTopic(address identityAddr, uint256 topic, bytes32[] memory ids) internal {
        bytes4 selector = bytes4(keccak256("getClaimIdsByTopic(uint256)"));
        vm.mockCall(
            identityAddr,
            abi.encodeWithSelector(selector, topic),
            abi.encode(ids)
        );
    }

    /// @dev Mock TIR.isIssuerSuspended(issuer) → suspended
    function _mockIssuerSuspended(address issuerAddr, bool suspended) internal {
        bytes4 selector = bytes4(keccak256("isIssuerSuspended(address)"));
        vm.mockCall(tir, abi.encodeWithSelector(selector, issuerAddr), abi.encode(suspended));
    }

    /// @dev Set up a valid consent claim on identityAddr for requestingBrand, issued by consentIssuer
    function _setupConsentClaim(
        address identityAddr,
        IIdentity id,
        address requestingBrand,
        address consentIssuer
    ) internal {
        uint256 consentTopic = uint256(keccak256(abi.encode("galileo.consent.brand", requestingBrand)));
        bytes32 consentClaimId = bytes32(uint256(1));
        bytes32[] memory consentIds = new bytes32[](1);
        consentIds[0] = consentClaimId;
        _mockGetClaimIdsByTopic(identityAddr, consentTopic, consentIds);

        bytes memory sig = abi.encodePacked("consent-sig");
        bytes memory data = abi.encodePacked("consent-data");
        _mockGetClaim(identityAddr, consentClaimId, consentTopic, consentIssuer, sig, data);

        vm.mockCall(
            tir,
            abi.encodeWithSelector(ITrustedIssuersRegistry.isTrustedIssuer.selector, consentIssuer),
            abi.encode(true)
        );
        _mockClaimValid(consentIssuer, id, consentTopic, sig, data, true);
    }

    /// @dev Set up a single verified user (user1/id1 with TOPIC_KYC from issuer1)
    function _setupVerifiedUser() internal {
        _mockStoredIdentity(user1, id1);
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        _mockCTRTopics(topics);

        IClaimIssuer[] memory issuers = new IClaimIssuer[](1);
        issuers[0] = IClaimIssuer(issuer1);
        _mockTIRIssuers(TOPIC_KYC, issuers);

        // H-4: issuer1 is active (not suspended)
        _mockIssuerSuspended(issuer1, false);

        bytes memory sig = abi.encodePacked("sig");
        bytes memory data = abi.encodePacked("data");
        bytes32 claimId = keccak256(abi.encode(issuer1, TOPIC_KYC));
        _mockGetClaim(address(id1), claimId, TOPIC_KYC, issuer1, sig, data);
        _mockClaimValid(issuer1, id1, TOPIC_KYC, sig, data, true);
    }

    // ─────────────────────────────────────────────────
    // Deployment
    // ─────────────────────────────────────────────────

    function test_deployment_roles() public view {
        assertTrue(reg.hasRole(DEFAULT_ADMIN_ROLE, admin));
        assertTrue(reg.hasRole(REGISTRY_ADMIN_ROLE, admin));
        assertFalse(reg.hasRole(AGENT_ROLE, admin));
    }

    function test_deployment_linkedContracts() public view {
        assertEq(address(reg.issuersRegistry()), tir);
        assertEq(address(reg.topicsRegistry()), ctr);
        assertEq(address(reg.identityStorage()), storage_);
    }

    function test_deployment_consortiumMember() public view {
        assertTrue(reg.isConsortiumMember());
    }

    function test_deployment_identityCountZero() public view {
        assertEq(reg.identityCount(), 0);
    }

    function test_deployment_zeroAdminReverts() public {
        vm.expectRevert(GalileoIdentityRegistry.ZeroAddress.selector);
        new GalileoIdentityRegistry(address(0), tir, ctr, storage_);
    }

    function test_deployment_zeroTIRReverts() public {
        vm.expectRevert(GalileoIdentityRegistry.ZeroAddress.selector);
        new GalileoIdentityRegistry(admin, address(0), ctr, storage_);
    }

    function test_deployment_zeroCTRReverts() public {
        vm.expectRevert(GalileoIdentityRegistry.ZeroAddress.selector);
        new GalileoIdentityRegistry(admin, tir, address(0), storage_);
    }

    function test_deployment_zeroStorageReverts() public {
        vm.expectRevert(GalileoIdentityRegistry.ZeroAddress.selector);
        new GalileoIdentityRegistry(admin, tir, ctr, address(0));
    }

    // ─────────────────────────────────────────────────
    // registerIdentity
    // ─────────────────────────────────────────────────

    function test_registerIdentity_happyPath() public {
        vm.mockCall(
            storage_,
            abi.encodeWithSelector(IIdentityRegistryStorage.addIdentityToStorage.selector, user1, address(id1), uint16(250)),
            abi.encode()
        );

        vm.expectEmit(true, true, false, false);
        emit IdentityRegistered(user1, id1);

        vm.prank(agent);
        reg.registerIdentity(user1, id1, 250);

        assertEq(reg.identityCount(), 1);
    }

    function test_registerIdentity_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        reg.registerIdentity(user1, id1, 250);
    }

    function test_registerIdentity_incrementsCount() public {
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.addIdentityToStorage.selector), abi.encode());
        vm.startPrank(agent);
        reg.registerIdentity(user1, id1, 250);
        reg.registerIdentity(user2, id2, 840);
        vm.stopPrank();
        assertEq(reg.identityCount(), 2);
    }

    // ─────────────────────────────────────────────────
    // deleteIdentity
    // ─────────────────────────────────────────────────

    function test_deleteIdentity_happyPath() public {
        _mockStoredIdentity(user1, id1);
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.removeIdentityFromStorage.selector, user1), abi.encode());

        // Set count to 1 first
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.addIdentityToStorage.selector), abi.encode());
        vm.prank(agent);
        reg.registerIdentity(user1, id1, 250);

        vm.expectEmit(true, true, false, false);
        emit IdentityRemoved(user1, id1);

        vm.prank(agent);
        reg.deleteIdentity(user1);

        assertEq(reg.identityCount(), 0);
    }

    function test_deleteIdentity_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        reg.deleteIdentity(user1);
    }

    // ─────────────────────────────────────────────────
    // updateIdentity
    // ─────────────────────────────────────────────────

    function test_updateIdentity_happyPath() public {
        _mockStoredIdentity(user1, id1);
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.modifyStoredIdentity.selector, user1, address(id2)), abi.encode());

        vm.expectEmit(true, true, false, false);
        emit IdentityUpdated(id1, id2);

        vm.prank(agent);
        reg.updateIdentity(user1, id2);
    }

    function test_updateIdentity_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        reg.updateIdentity(user1, id2);
    }

    // ─────────────────────────────────────────────────
    // updateCountry
    // ─────────────────────────────────────────────────

    function test_updateCountry_happyPath() public {
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.modifyStoredInvestorCountry.selector, user1, uint16(840)), abi.encode());

        vm.expectEmit(true, true, false, false);
        emit CountryUpdated(user1, 840);

        vm.prank(agent);
        reg.updateCountry(user1, 840);
    }

    function test_updateCountry_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        reg.updateCountry(user1, 840);
    }

    // ─────────────────────────────────────────────────
    // batchRegisterIdentity
    // ─────────────────────────────────────────────────

    function test_batchRegisterIdentity_happyPath() public {
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.addIdentityToStorage.selector), abi.encode());

        address[] memory users = new address[](2);
        users[0] = user1; users[1] = user2;
        IIdentity[] memory ids = new IIdentity[](2);
        ids[0] = id1; ids[1] = id2;
        uint16[] memory countries = new uint16[](2);
        countries[0] = 250; countries[1] = 840;

        vm.prank(agent);
        reg.batchRegisterIdentity(users, ids, countries);

        assertEq(reg.identityCount(), 2);
    }

    function test_batchRegisterIdentity_unauthorizedReverts() public {
        address[] memory users = new address[](1);
        IIdentity[] memory ids = new IIdentity[](1);
        uint16[] memory countries = new uint16[](1);

        vm.prank(stranger);
        vm.expectRevert();
        reg.batchRegisterIdentity(users, ids, countries);
    }

    // ─────────────────────────────────────────────────
    // Admin: set linked contracts
    // ─────────────────────────────────────────────────

    function test_setIdentityRegistryStorage_happyPath() public {
        address newStorage = makeAddr("newStorage");

        vm.expectEmit(true, false, false, false);
        emit IdentityStorageSet(newStorage);

        vm.prank(admin);
        reg.setIdentityRegistryStorage(newStorage);

        assertEq(address(reg.identityStorage()), newStorage);
    }

    function test_setIdentityRegistryStorage_zeroReverts() public {
        vm.prank(admin);
        vm.expectRevert(GalileoIdentityRegistry.ZeroAddress.selector);
        reg.setIdentityRegistryStorage(address(0));
    }

    function test_setIdentityRegistryStorage_unauthorizedReverts() public {
        vm.prank(stranger);
        vm.expectRevert();
        reg.setIdentityRegistryStorage(makeAddr("x"));
    }

    function test_setClaimTopicsRegistry_happyPath() public {
        address newCtr = makeAddr("newCtr");

        vm.expectEmit(true, false, false, false);
        emit ClaimTopicsRegistrySet(newCtr);

        vm.prank(admin);
        reg.setClaimTopicsRegistry(newCtr);

        assertEq(address(reg.topicsRegistry()), newCtr);
    }

    function test_setClaimTopicsRegistry_zeroReverts() public {
        vm.prank(admin);
        vm.expectRevert(GalileoIdentityRegistry.ZeroAddress.selector);
        reg.setClaimTopicsRegistry(address(0));
    }

    function test_setTrustedIssuersRegistry_happyPath() public {
        address newTIR = makeAddr("newTIR");

        vm.expectEmit(true, false, false, false);
        emit TrustedIssuersRegistrySet(newTIR);

        vm.prank(admin);
        reg.setTrustedIssuersRegistry(newTIR);

        assertEq(address(reg.issuersRegistry()), newTIR);
    }

    function test_setTrustedIssuersRegistry_zeroReverts() public {
        vm.prank(admin);
        vm.expectRevert(GalileoIdentityRegistry.ZeroAddress.selector);
        reg.setTrustedIssuersRegistry(address(0));
    }

    // ─────────────────────────────────────────────────
    // contains
    // ─────────────────────────────────────────────────

    function test_contains_trueWhenRegistered() public {
        _mockStoredIdentity(user1, id1);
        assertTrue(reg.contains(user1));
    }

    function test_contains_falseWhenNotRegistered() public {
        _mockStoredIdentity(user1, IIdentity(address(0)));
        assertFalse(reg.contains(user1));
    }

    // ─────────────────────────────────────────────────
    // investorCountry
    // ─────────────────────────────────────────────────

    function test_investorCountry_returnsStoredValue() public {
        _mockStoredCountry(user1, 840);
        assertEq(reg.investorCountry(user1), 840);
    }

    // ─────────────────────────────────────────────────
    // isVerified
    // ─────────────────────────────────────────────────

    function test_isVerified_falseWhenNotRegistered() public {
        _mockStoredIdentity(user1, IIdentity(address(0)));
        assertFalse(reg.isVerified(user1));
    }

    function test_isVerified_trueWhenNoRequiredTopics() public {
        _mockStoredIdentity(user1, id1);
        uint256[] memory emptyTopics = new uint256[](0);
        _mockCTRTopics(emptyTopics);
        assertTrue(reg.isVerified(user1));
    }

    function test_isVerified_trueWhenValidClaim() public {
        _setupVerifiedUser();
        assertTrue(reg.isVerified(user1));
    }

    function test_isVerified_falseWhenNoTrustedIssuers() public {
        _mockStoredIdentity(user1, id1);
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        _mockCTRTopics(topics);

        IClaimIssuer[] memory emptyIssuers = new IClaimIssuer[](0);
        _mockTIRIssuers(TOPIC_KYC, emptyIssuers);

        assertFalse(reg.isVerified(user1));
    }

    function test_isVerified_falseWhenClaimInvalid() public {
        _mockStoredIdentity(user1, id1);
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        _mockCTRTopics(topics);

        IClaimIssuer[] memory issuers = new IClaimIssuer[](1);
        issuers[0] = IClaimIssuer(issuer1);
        _mockTIRIssuers(TOPIC_KYC, issuers);
        _mockIssuerSuspended(issuer1, false);

        bytes memory sig = abi.encodePacked("sig");
        bytes memory data = abi.encodePacked("data");
        bytes32 claimId = keccak256(abi.encode(issuer1, TOPIC_KYC));
        _mockGetClaim(address(id1), claimId, TOPIC_KYC, issuer1, sig, data);
        _mockClaimValid(issuer1, id1, TOPIC_KYC, sig, data, false);

        assertFalse(reg.isVerified(user1));
    }

    function test_isVerified_falseWhenClaimTopicMismatch() public {
        _mockStoredIdentity(user1, id1);
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        _mockCTRTopics(topics);

        IClaimIssuer[] memory issuers = new IClaimIssuer[](1);
        issuers[0] = IClaimIssuer(issuer1);
        _mockTIRIssuers(TOPIC_KYC, issuers);
        _mockIssuerSuspended(issuer1, false);

        bytes32 claimId = keccak256(abi.encode(issuer1, TOPIC_KYC));
        // getClaim returns wrong topic
        _mockGetClaim(address(id1), claimId, TOPIC_AML, issuer1, "", "");

        assertFalse(reg.isVerified(user1));
    }

    function test_isVerified_falseWhenMissingOneTopic() public {
        _mockStoredIdentity(user1, id1);

        // Two required topics
        uint256[] memory topics = new uint256[](2);
        topics[0] = TOPIC_KYC;
        topics[1] = TOPIC_AML;
        _mockCTRTopics(topics);

        // KYC: valid
        IClaimIssuer[] memory kycIssuers = new IClaimIssuer[](1);
        kycIssuers[0] = IClaimIssuer(issuer1);
        _mockTIRIssuers(TOPIC_KYC, kycIssuers);
        _mockIssuerSuspended(issuer1, false);
        bytes memory sig = abi.encodePacked("sig");
        bytes memory data = abi.encodePacked("data");
        bytes32 kycId = keccak256(abi.encode(issuer1, TOPIC_KYC));
        _mockGetClaim(address(id1), kycId, TOPIC_KYC, issuer1, sig, data);
        _mockClaimValid(issuer1, id1, TOPIC_KYC, sig, data, true);

        // AML: no trusted issuers
        IClaimIssuer[] memory emptyIssuers = new IClaimIssuer[](0);
        _mockTIRIssuers(TOPIC_AML, emptyIssuers);

        assertFalse(reg.isVerified(user1));
    }

    // ─────────────────────────────────────────────────
    // isVerifiedWithConsent
    // ─────────────────────────────────────────────────

    function test_isVerifiedWithConsent_sameRegistryImplicit() public {
        // When requestingBrand == address(reg), consent is implicit
        _setupVerifiedUser();
        assertTrue(reg.isVerifiedWithConsent(user1, TOPIC_KYC, address(reg)));
    }

    function test_isVerifiedWithConsent_withConsentClaim() public {
        _setupVerifiedUser();

        // M-3 fix: consent claim must come from a trusted issuer with a valid signature
        _setupConsentClaim(address(id1), id1, brandA, issuer1);

        assertTrue(reg.isVerifiedWithConsent(user1, TOPIC_KYC, brandA));
    }

    function test_isVerifiedWithConsent_noConsentReturnsFalse() public {
        _setupVerifiedUser();

        // Mock no consent claim
        uint256 consentTopic = uint256(keccak256(abi.encode("galileo.consent.brand", brandA)));
        bytes32[] memory emptyIds = new bytes32[](0);
        _mockGetClaimIdsByTopic(address(id1), consentTopic, emptyIds);

        assertFalse(reg.isVerifiedWithConsent(user1, TOPIC_KYC, brandA));
    }

    function test_isVerifiedWithConsent_falseWhenClaimInvalid() public {
        // Even with consent, if the claim itself is invalid → false
        _mockStoredIdentity(user1, id1);
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        _mockCTRTopics(topics);

        IClaimIssuer[] memory issuers = new IClaimIssuer[](1);
        issuers[0] = IClaimIssuer(issuer1);
        _mockTIRIssuers(TOPIC_KYC, issuers);
        _mockIssuerSuspended(issuer1, false);

        bytes memory sig = abi.encodePacked("sig");
        bytes memory data = abi.encodePacked("data");
        bytes32 claimId = keccak256(abi.encode(issuer1, TOPIC_KYC));
        _mockGetClaim(address(id1), claimId, TOPIC_KYC, issuer1, sig, data);
        _mockClaimValid(issuer1, id1, TOPIC_KYC, sig, data, false);

        assertFalse(reg.isVerifiedWithConsent(user1, TOPIC_KYC, brandA));
    }

    function test_isVerifiedWithConsent_falseWhenNotRegistered() public {
        _mockStoredIdentity(user1, IIdentity(address(0)));
        assertFalse(reg.isVerifiedWithConsent(user1, TOPIC_KYC, brandA));
    }

    // ─────────────────────────────────────────────────
    // batchVerify
    // ─────────────────────────────────────────────────

    function test_batchVerify_emptyTopicsReverts() public {
        uint256[] memory empty = new uint256[](0);
        vm.expectRevert(IGalileoIdentityRegistry.EmptyClaimTopicsArray.selector);
        reg.batchVerify(user1, empty);
    }

    function test_batchVerify_singleTopicTrue() public {
        _setupVerifiedUser();
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        bool[] memory results = reg.batchVerify(user1, topics);
        assertEq(results.length, 1);
        assertTrue(results[0]);
    }

    function test_batchVerify_singleTopicFalseWhenUnregistered() public {
        _mockStoredIdentity(user1, IIdentity(address(0)));
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        bool[] memory results = reg.batchVerify(user1, topics);
        assertFalse(results[0]);
    }

    function test_batchVerify_mixedResults() public {
        _mockStoredIdentity(user1, id1);

        // KYC: valid
        IClaimIssuer[] memory kycIssuers = new IClaimIssuer[](1);
        kycIssuers[0] = IClaimIssuer(issuer1);
        _mockTIRIssuers(TOPIC_KYC, kycIssuers);
        _mockIssuerSuspended(issuer1, false);
        bytes memory sig = abi.encodePacked("sig");
        bytes memory data = abi.encodePacked("data");
        bytes32 kycId = keccak256(abi.encode(issuer1, TOPIC_KYC));
        _mockGetClaim(address(id1), kycId, TOPIC_KYC, issuer1, sig, data);
        _mockClaimValid(issuer1, id1, TOPIC_KYC, sig, data, true);

        // AML: no issuers
        IClaimIssuer[] memory emptyIssuers = new IClaimIssuer[](0);
        _mockTIRIssuers(TOPIC_AML, emptyIssuers);

        uint256[] memory topics = new uint256[](2);
        topics[0] = TOPIC_KYC;
        topics[1] = TOPIC_AML;
        bool[] memory results = reg.batchVerify(user1, topics);

        assertEq(results.length, 2);
        assertTrue(results[0]);   // KYC verified
        assertFalse(results[1]);  // AML not verified
    }

    // ─────────────────────────────────────────────────
    // batchVerifyWithConsent
    // ─────────────────────────────────────────────────

    function test_batchVerifyWithConsent_emptyTopicsReverts() public {
        uint256[] memory empty = new uint256[](0);
        vm.expectRevert(IGalileoIdentityRegistry.EmptyClaimTopicsArray.selector);
        reg.batchVerifyWithConsent(user1, empty, brandA);
    }

    function test_batchVerifyWithConsent_allFalseWhenNoConsent() public {
        _setupVerifiedUser();

        uint256 consentTopic = uint256(keccak256(abi.encode("galileo.consent.brand", brandA)));
        bytes32[] memory emptyIds = new bytes32[](0);
        _mockGetClaimIdsByTopic(address(id1), consentTopic, emptyIds);

        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        bool[] memory results = reg.batchVerifyWithConsent(user1, topics, brandA);
        assertFalse(results[0]);
    }

    function test_batchVerifyWithConsent_trueWhenConsentAndValidClaim() public {
        _setupVerifiedUser();

        // M-3 fix: consent claim must come from a trusted issuer with a valid signature
        _setupConsentClaim(address(id1), id1, brandA, issuer1);

        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        bool[] memory results = reg.batchVerifyWithConsent(user1, topics, brandA);
        assertTrue(results[0]);
    }

    function test_batchVerifyWithConsent_sameRegistryImplicitConsent() public {
        _setupVerifiedUser();

        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        // No consent mock needed — address(reg) has implicit consent
        bool[] memory results = reg.batchVerifyWithConsent(user1, topics, address(reg));
        assertTrue(results[0]);
    }

    // ─────────────────────────────────────────────────
    // isConsortiumMember / getConsortiumRegistries
    // ─────────────────────────────────────────────────

    function test_isConsortiumMember_trueOnDeployment() public view {
        assertTrue(reg.isConsortiumMember());
    }

    function test_getConsortiumRegistries_returnsLinkedContracts() public view {
        (address tirAddr, address ctrAddr) = reg.getConsortiumRegistries();
        assertEq(tirAddr, tir);
        assertEq(ctrAddr, ctr);
    }

    function test_getConsortiumRegistries_updatesAfterSet() public {
        address newTIR = makeAddr("newTIR2");
        vm.prank(admin);
        reg.setTrustedIssuersRegistry(newTIR);

        (address tirAddr,) = reg.getConsortiumRegistries();
        assertEq(tirAddr, newTIR);
    }

    // ─────────────────────────────────────────────────
    // identityCount
    // ─────────────────────────────────────────────────

    function test_identityCount_incrementOnRegister() public {
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.addIdentityToStorage.selector), abi.encode());
        vm.prank(agent);
        reg.registerIdentity(user1, id1, 250);
        assertEq(reg.identityCount(), 1);
    }

    function test_identityCount_decrementOnDelete() public {
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.addIdentityToStorage.selector), abi.encode());
        vm.prank(agent);
        reg.registerIdentity(user1, id1, 250);

        _mockStoredIdentity(user1, id1);
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.removeIdentityFromStorage.selector), abi.encode());
        vm.prank(agent);
        reg.deleteIdentity(user1);

        assertEq(reg.identityCount(), 0);
    }

    // ─────────────────────────────────────────────────
    // isClaimTopicSupported
    // ─────────────────────────────────────────────────

    function test_isClaimTopicSupported_truWhenInCTR() public {
        uint256[] memory topics = new uint256[](2);
        topics[0] = TOPIC_KYC;
        topics[1] = TOPIC_AML;
        _mockCTRTopics(topics);

        assertTrue(reg.isClaimTopicSupported(TOPIC_KYC));
        assertTrue(reg.isClaimTopicSupported(TOPIC_AML));
    }

    function test_isClaimTopicSupported_falseWhenNotInCTR() public {
        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        _mockCTRTopics(topics);

        assertFalse(reg.isClaimTopicSupported(TOPIC_AML));
    }

    function test_isClaimTopicSupported_falseWhenCTREmpty() public {
        uint256[] memory empty = new uint256[](0);
        _mockCTRTopics(empty);
        assertFalse(reg.isClaimTopicSupported(TOPIC_KYC));
    }

    // ─────────────────────────────────────────────────
    // Access control
    // ─────────────────────────────────────────────────

    function test_accessControl_adminCanGrantAgent() public {
        vm.prank(admin);
        reg.grantRole(AGENT_ROLE, stranger);
        assertTrue(reg.hasRole(AGENT_ROLE, stranger));
    }

    function test_accessControl_agentCanRegister() public {
        vm.mockCall(storage_, abi.encodeWithSelector(IIdentityRegistryStorage.addIdentityToStorage.selector), abi.encode());
        vm.prank(agent);
        reg.registerIdentity(user1, id1, 250);
        assertEq(reg.identityCount(), 1);
    }

    function test_accessControl_revokedAgentCannotRegister() public {
        vm.prank(admin);
        reg.revokeRole(AGENT_ROLE, agent);

        vm.prank(agent);
        vm.expectRevert();
        reg.registerIdentity(user1, id1, 250);
    }

    function test_accessControl_strangerCannotSetStorage() public {
        vm.prank(stranger);
        vm.expectRevert();
        reg.setIdentityRegistryStorage(makeAddr("x"));
    }

    // ─────────────────────────────────────────────────
    // H-4: Suspended issuers skipped in claim verification
    // ─────────────────────────────────────────────────

    function test_verifySingleTopic_skipsSuspendedIssuer() public {
        _mockStoredIdentity(user1, id1);

        IClaimIssuer[] memory issuers = new IClaimIssuer[](1);
        issuers[0] = IClaimIssuer(issuer1);
        _mockTIRIssuers(TOPIC_KYC, issuers);

        // issuer1 is suspended — the fix should skip it entirely
        _mockIssuerSuspended(issuer1, true);

        // A valid underlying claim exists, but the issuer is suspended
        bytes memory sig = abi.encodePacked("sig");
        bytes memory data = abi.encodePacked("data");
        bytes32 claimId = keccak256(abi.encode(issuer1, TOPIC_KYC));
        _mockGetClaim(address(id1), claimId, TOPIC_KYC, issuer1, sig, data);
        _mockClaimValid(issuer1, id1, TOPIC_KYC, sig, data, true);

        uint256[] memory topics = new uint256[](1);
        topics[0] = TOPIC_KYC;
        bool[] memory results = reg.batchVerify(user1, topics);
        assertFalse(results[0], "Suspended issuer must not validate claims");
    }

    // ─────────────────────────────────────────────────
    // M-3: Consent bypass — self-issued consent rejected
    // ─────────────────────────────────────────────────

    function test_hasConsent_validatesIssuer() public {
        _setupVerifiedUser();

        address selfIssuingUser = makeAddr("selfIssuingUser"); // not in TIR
        uint256 consentTopic = uint256(keccak256(abi.encode("galileo.consent.brand", brandA)));
        bytes32 consentClaimId = bytes32(uint256(99));
        bytes32[] memory consentIds = new bytes32[](1);
        consentIds[0] = consentClaimId;
        _mockGetClaimIdsByTopic(address(id1), consentTopic, consentIds);

        bytes memory sig = abi.encodePacked("self-sig");
        bytes memory data = abi.encodePacked("self-data");
        _mockGetClaim(address(id1), consentClaimId, consentTopic, selfIssuingUser, sig, data);

        // Self-issuer is NOT registered in TIR
        vm.mockCall(
            tir,
            abi.encodeWithSelector(ITrustedIssuersRegistry.isTrustedIssuer.selector, selfIssuingUser),
            abi.encode(false)
        );

        assertFalse(
            reg.isVerifiedWithConsent(user1, TOPIC_KYC, brandA),
            "Self-issued consent claim must be rejected"
        );
    }
}
