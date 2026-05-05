// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {GalileoAccessControl} from "../../src/infrastructure/GalileoAccessControl.sol";
import {GalileoClaimTopicsRegistry} from "../../src/identity/GalileoClaimTopicsRegistry.sol";
import {GalileoTrustedIssuersRegistry} from "../../src/identity/GalileoTrustedIssuersRegistry.sol";
import {GalileoIdentityRegistryStorage} from "../../src/identity/GalileoIdentityRegistryStorage.sol";
import {GalileoIdentityRegistry} from "../../src/identity/GalileoIdentityRegistry.sol";
import {GalileoCompliance} from "../../src/compliance/GalileoCompliance.sol";
import {BrandAuthorizationModule} from "../../src/compliance/modules/BrandAuthorizationModule.sol";
import {CPOCertificationModule} from "../../src/compliance/modules/CPOCertificationModule.sol";
import {JurisdictionModule} from "../../src/compliance/modules/JurisdictionModule.sol";
import {SanctionsModule} from "../../src/compliance/modules/SanctionsModule.sol";
import {ServiceCenterModule} from "../../src/compliance/modules/ServiceCenterModule.sol";
import {GalileoToken} from "../../src/token/GalileoToken.sol";
import {IGalileoToken} from "../../src/interfaces/token/IGalileoToken.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IERC735} from "@onchain-id/solidity/contracts/interface/IERC735.sol";
import {GalileoClaimTopics} from "../../src/interfaces/identity/IClaimTopicsRegistry.sol";
import {IJurisdictionModule} from "../../src/interfaces/compliance/modules/IJurisdictionModule.sol";

/**
 * @title FullLifecycleTest
 * @notice Integration tests covering the complete Galileo Protocol product lifecycle:
 *         deploy → identity registration → primary sale → CPO certification →
 *         secondary sale → freeze/unfreeze → decommission
 *
 * @dev All ONCHAINID identity contracts are mocked via vm.mockCall to avoid
 *      deploying the full ONCHAINID suite. Infrastructure state (CTR, TIR,
 *      IdentityRegistryStorage, IdentityRegistry, Compliance, modules, Token) is real.
 */
contract FullLifecycleTest is Test {

    // ═══════════════════════════════════════════════════════════════════
    // DEPLOYED CONTRACTS
    // ═══════════════════════════════════════════════════════════════════

    GalileoAccessControl        accessCtrl;
    GalileoClaimTopicsRegistry  ctr;
    GalileoTrustedIssuersRegistry tir;
    GalileoIdentityRegistryStorage idStorage;
    GalileoIdentityRegistry     reg;
    GalileoCompliance           compliance;
    BrandAuthorizationModule    brandModule;
    CPOCertificationModule      cpoModule;
    JurisdictionModule          jurisdModule;
    SanctionsModule             sanctionsModule;
    ServiceCenterModule         scModule;
    GalileoToken                token;

    // ═══════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════

    bytes32 constant AGENT_ROLE          = keccak256("AGENT_ROLE");
    bytes32 constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    // ═══════════════════════════════════════════════════════════════════
    // ACTORS
    // ═══════════════════════════════════════════════════════════════════

    address admin             = makeAddr("admin");
    address agent             = makeAddr("agent");
    address brandWallet       = makeAddr("brandWallet");
    address buyer1            = makeAddr("buyer1");
    address buyer2            = makeAddr("buyer2");
    address certifier         = makeAddr("certifier");
    address scCertifier       = makeAddr("scCertifier"); // holds SERVICE_CENTER claim
    address trustedIssuerAddr = makeAddr("trustedIssuer");

    // ═══════════════════════════════════════════════════════════════════
    // MOCK ONCHAINID IDENTITY ADDRESSES
    // ═══════════════════════════════════════════════════════════════════

    address mockBrandId     = makeAddr("mockBrandId");
    address mockBuyer1Id    = makeAddr("mockBuyer1Id");
    address mockBuyer2Id    = makeAddr("mockBuyer2Id");
    address mockCertifierId   = makeAddr("mockCertifierId");
    address mockSCCertifierId = makeAddr("mockSCCertifierId");

    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS (cached to avoid post-prank function calls)
    // ═══════════════════════════════════════════════════════════════════

    string  constant BRAND_DID              = "did:galileo:brand:rolex";
    bytes32 constant REASON_SALE             = keccak256("SALE");
    bytes32 constant REASON_SERVICE_TRANSFER = keccak256("SERVICE_TRANSFER");
    bytes32 constant REASON_INVALID          = keccak256("UNKNOWN_REASON_XYZ");

    uint256 constant TOPIC_KYC          = GalileoClaimTopics.KYC_BASIC;
    uint256 constant TOPIC_AUTHENTICATOR = GalileoClaimTopics.AUTHENTICATOR;
    uint256 constant TOPIC_SERVICE_CENTER = GalileoClaimTopics.SERVICE_CENTER;

    // ═══════════════════════════════════════════════════════════════════
    // SETUP
    // ═══════════════════════════════════════════════════════════════════

    function setUp() public {
        vm.warp(1_000_000);

        // --- Infrastructure ---
        accessCtrl = new GalileoAccessControl(admin);
        ctr        = new GalileoClaimTopicsRegistry(admin);
        tir        = new GalileoTrustedIssuersRegistry(admin);
        idStorage  = new GalileoIdentityRegistryStorage(admin);
        reg        = new GalileoIdentityRegistry(
            admin, address(tir), address(ctr), address(idStorage)
        );

        // --- Compliance (test contract is owner so it can addModule) ---
        compliance = new GalileoCompliance(address(this), address(reg));

        // --- Modules (test contract is owner) ---
        brandModule     = new BrandAuthorizationModule(
            address(this), BRAND_DID, address(reg), 0
        );
        cpoModule       = new CPOCertificationModule(address(this), address(reg), 0);
        jurisdModule    = new JurisdictionModule(
            address(this), address(reg), IJurisdictionModule.JurisdictionMode.RESTRICT
        );
        sanctionsModule = new SanctionsModule(address(this), address(0));
        scModule        = new ServiceCenterModule(address(this), address(reg), BRAND_DID, 0);

        // --- Configure modules ---
        // Allow all transfers: primary sales don't require retailer, P2P transfers allowed
        brandModule.setRequireRetailerForPrimarySale(false);
        brandModule.setAllowPeerToPeer(true);
        // Non-strict sanctions: oracle unavailable → pass
        sanctionsModule.setStrictMode(false);

        // --- Wire modules into compliance ---
        compliance.addModule(address(brandModule));
        compliance.addModule(address(cpoModule));
        compliance.addModule(address(jurisdModule));
        compliance.addModule(address(sanctionsModule));
        compliance.addModule(address(scModule));

        // --- Bind identity registry storage to registry ---
        vm.prank(admin);
        idStorage.bindIdentityRegistry(address(reg));

        // --- Grant AGENT_ROLE to agent on registry ---
        vm.prank(admin);
        reg.grantRole(AGENT_ROLE, agent);

        // --- Register KYC_BASIC claim topic ---
        vm.prank(admin);
        ctr.addClaimTopic(TOPIC_KYC);

        // --- Register trusted issuer for KYC_BASIC, then extend to include AUTHENTICATOR ---
        {
            uint256[] memory kycTopics = new uint256[](1);
            kycTopics[0] = TOPIC_KYC;
            vm.prank(admin);
            tir.addTrustedIssuer(IClaimIssuer(trustedIssuerAddr), kycTopics);

            uint256[] memory allTopics = new uint256[](3);
            allTopics[0] = TOPIC_KYC;
            allTopics[1] = TOPIC_AUTHENTICATOR;
            allTopics[2] = TOPIC_SERVICE_CENTER;
            vm.prank(admin);
            tir.updateIssuerClaimTopics(IClaimIssuer(trustedIssuerAddr), allTopics);
        }

        // --- Register identities (agent is needed for registerIdentity) ---
        _registerIdentity(brandWallet,  mockBrandId,      250); // France
        _registerIdentity(buyer1,       mockBuyer1Id,    840); // USA
        _registerIdentity(buyer2,       mockBuyer2Id,    250); // France
        _registerIdentity(certifier,    mockCertifierId, 840); // USA
        _registerIdentity(scCertifier,  mockSCCertifierId, 840); // USA

        // --- Mock KYC_BASIC claims for all wallets (required by isVerified) ---
        _mockValidClaim(mockBrandId,      TOPIC_KYC);
        _mockValidClaim(mockBuyer1Id,     TOPIC_KYC);
        _mockValidClaim(mockBuyer2Id,     TOPIC_KYC);
        _mockValidClaim(mockCertifierId,  TOPIC_KYC);
        _mockValidClaim(mockSCCertifierId, TOPIC_KYC);

        // --- Mock certifier-role claims (required by certifyCPO) ---
        // certifier holds AUTHENTICATOR (traditional CPO certifier)
        _mockValidClaim(mockCertifierId, TOPIC_AUTHENTICATOR);
        // scCertifier holds SERVICE_CENTER only (alternative certification path)
        _mockValidClaim(mockSCCertifierId, TOPIC_SERVICE_CENTER);

        // --- Mock missing claims to prevent ABI decode errors in batchVerify ---
        // Solidity 0.8.17: an EOA call that SUCCEEDS with empty data causes ABI decode
        // failure that propagates past the inner try/catch in _verifySingleTopic.
        // vm.mockCallRevert makes the call REVERT so the inner catch handles it correctly.
        _mockMissingClaim(mockCertifierId,   TOPIC_SERVICE_CENTER); // certifier lacks SC
        _mockMissingClaim(mockSCCertifierId, TOPIC_AUTHENTICATOR);  // scCertifier lacks AUTH

        // --- Predict token address and transfer compliance ownership ---
        // Contract nonces only increment on CREATE (not on CALL).
        // transferOwnership is a CALL so it does NOT change the nonce.
        // The next CREATE (new GalileoToken) uses the current nonce.
        address predictedToken = vm.computeCreateAddress(
            address(this), vm.getNonce(address(this))
        );
        compliance.transferOwnership(predictedToken);

        // --- Deploy token (minted to brandWallet at construction) ---
        GalileoToken.ProductConfig memory config = GalileoToken.ProductConfig({
            tokenName:       "Rolex Submariner Date",
            tokenSymbol:     "RLX-SUB-SN001",
            productDID:      "did:galileo:01:07610200843478:21:SN001",
            productCategory: "WATCH",
            brandDID:        BRAND_DID,
            productURI:      "ipfs://QmTest/product.json",
            gtin:            "07610200843478",
            serialNumber:    "SN001"
        });
        token = new GalileoToken(
            admin, address(reg), address(compliance), config, brandWallet
        );

        assertEq(address(token), predictedToken, "setUp: token address prediction failed");

        // --- Grant AGENT_ROLE to agent on token ---
        vm.prank(admin);
        token.grantRole(AGENT_ROLE, agent);
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function _registerIdentity(address wallet, address mockId, uint16 country) internal {
        vm.prank(agent);
        reg.registerIdentity(wallet, IIdentity(mockId), country);
    }

    /// @dev Mocks a valid claim for a given identity address and topic.
    ///      Uses trustedIssuerAddr as the claim issuer (consistent with TIR setup).
    ///      If additional trusted issuers are registered in TIR, call _mockMissingClaim
    ///      for each absent topic per issuer to prevent ABI decode propagation errors.
    function _mockValidClaim(address identityAddr, uint256 topic) internal {
        bytes memory sig  = abi.encodePacked("galileo:sig:", topic);
        bytes memory data = abi.encodePacked("galileo:data:", topic);
        bytes32 claimId   = keccak256(abi.encode(trustedIssuerAddr, topic));

        // Mock: identity.getClaim(claimId) → (topic, 0, trustedIssuerAddr, sig, data, "")
        vm.mockCall(
            identityAddr,
            abi.encodeWithSelector(IERC735.getClaim.selector, claimId),
            abi.encode(topic, uint256(0), trustedIssuerAddr, sig, data, "")
        );

        // Mock: trustedIssuer.isClaimValid(identity, topic, sig, data) → true
        vm.mockCall(
            trustedIssuerAddr,
            abi.encodeWithSelector(
                IClaimIssuer.isClaimValid.selector,
                IIdentity(identityAddr), topic, sig, data
            ),
            abi.encode(true)
        );
    }

    /// @dev Mocks a missing claim so getClaim reverts (caught by inner catch in
    ///      _verifySingleTopic). Without this, a successful EOA call returning empty data
    ///      causes an ABI decode failure that propagates PAST the catch block (Solidity 0.8.17).
    ///
    ///      NOTE: Only mocks the claimId for `trustedIssuerAddr`. If additional trusted
    ///      issuers are registered in TIR, their corresponding claimIds must also be
    ///      mocked as reverts to prevent ABI decode propagation for absent claims.
    function _mockMissingClaim(address identityAddr, uint256 topic) internal {
        bytes32 claimId = keccak256(abi.encode(trustedIssuerAddr, topic));
        vm.mockCallRevert(
            identityAddr,
            abi.encodeWithSelector(IERC735.getClaim.selector, claimId),
            ""
        );
    }

    function _unpauseToken() internal {
        vm.prank(agent);
        token.unpause();
    }

    function _primarySale() internal {
        _unpauseToken();
        vm.prank(brandWallet);
        token.transferWithReason(buyer1, 1, REASON_SALE, "Primary sale");
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_Deployment_AllContractsDeployed() public view {
        assertTrue(address(accessCtrl)      != address(0), "AccessControl not deployed");
        assertTrue(address(ctr)             != address(0), "CTR not deployed");
        assertTrue(address(tir)             != address(0), "TIR not deployed");
        assertTrue(address(idStorage)       != address(0), "IdentityStorage not deployed");
        assertTrue(address(reg)             != address(0), "IdentityRegistry not deployed");
        assertTrue(address(compliance)      != address(0), "Compliance not deployed");
        assertTrue(address(brandModule)     != address(0), "BrandModule not deployed");
        assertTrue(address(cpoModule)       != address(0), "CPOModule not deployed");
        assertTrue(address(jurisdModule)    != address(0), "JurisdModule not deployed");
        assertTrue(address(sanctionsModule) != address(0), "SanctionsModule not deployed");
        assertTrue(address(scModule)        != address(0), "ServiceCenterModule not deployed");
        assertTrue(address(token)           != address(0), "Token not deployed");
    }

    function test_Deployment_TokenMetadata() public view {
        assertEq(token.name(),            "Rolex Submariner Date");
        assertEq(token.symbol(),          "RLX-SUB-SN001");
        assertEq(token.productDID(),      "did:galileo:01:07610200843478:21:SN001");
        assertEq(token.productCategory(), "WATCH");
        assertEq(token.brandDID(),        BRAND_DID);
        assertEq(token.gtin(),            "07610200843478");
        assertEq(token.serialNumber(),    "SN001");
        assertEq(token.decimals(),        0);
        assertEq(token.version(),         "4.1.3");
    }

    function test_Deployment_SingleSupplyMintedToBrand() public view {
        assertEq(token.totalSupply(),           1,  "Total supply should be 1");
        assertEq(token.balanceOf(brandWallet),  1,  "brandWallet should hold 1 token");
        assertEq(token.balanceOf(buyer1),       0,  "buyer1 should hold 0 tokens");
    }

    function test_Deployment_TokenStartsPaused() public view {
        assertTrue(token.paused(), "Token should start paused");
    }

    function test_Deployment_ComplianceBoundToToken() public view {
        assertEq(address(token.compliance()), address(compliance));
        assertEq(compliance.getTokenBound(),  address(token));
    }

    function test_Deployment_FiveModulesInstalled() public view {
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 5, "Expected 5 compliance modules");
    }

    function test_Deployment_IdentityRegistryLinked() public view {
        assertEq(address(token.identityRegistry()), address(reg));
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — IDENTITY REGISTRY
    // ═══════════════════════════════════════════════════════════════════

    function test_IdentityRegistry_AllWalletsRegistered() public view {
        assertTrue(reg.contains(brandWallet),  "brandWallet not in registry");
        assertTrue(reg.contains(buyer1),       "buyer1 not in registry");
        assertTrue(reg.contains(buyer2),       "buyer2 not in registry");
        assertTrue(reg.contains(certifier),    "certifier not in registry");
        assertTrue(reg.contains(scCertifier),  "scCertifier not in registry");
    }

    function test_IdentityRegistry_BuyersAreVerified() public view {
        assertTrue(reg.isVerified(buyer1), "buyer1 should be verified");
        assertTrue(reg.isVerified(buyer2), "buyer2 should be verified");
    }

    function test_IdentityRegistry_CertifierBatchVerify_Authenticator() public view {
        uint256[] memory topics = new uint256[](2);
        topics[0] = TOPIC_AUTHENTICATOR;
        topics[1] = TOPIC_SERVICE_CENTER;
        bool[] memory results = reg.batchVerify(certifier, topics);
        assertTrue(results[0],  "certifier should have AUTHENTICATOR claim");
        assertFalse(results[1], "certifier should not have SERVICE_CENTER claim");
    }

    function test_IdentityRegistry_BuyerCountries() public view {
        assertEq(reg.investorCountry(buyer1), 840, "buyer1 country should be 840 (USA)");
        assertEq(reg.investorCountry(buyer2), 250, "buyer2 country should be 250 (France)");
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — PRIMARY SALE
    // ═══════════════════════════════════════════════════════════════════

    function test_PrimarySale_RevertsWhenPaused() public {
        vm.prank(brandWallet);
        vm.expectRevert("Pausable: paused");
        token.transferWithReason(buyer1, 1, REASON_SALE, "Brand to buyer");
    }

    function test_PrimarySale_BrandToBuyer1() public {
        _unpauseToken();

        vm.prank(brandWallet);
        bool success = token.transferWithReason(buyer1, 1, REASON_SALE, "Primary sale");

        assertTrue(success);
        assertEq(token.balanceOf(buyer1),    1, "buyer1 should hold 1 token");
        assertEq(token.balanceOf(brandWallet), 0, "brandWallet should hold 0 tokens");
        assertEq(token.totalSupply(),        1, "Total supply must remain 1");
    }

    function test_PrimarySale_TransferEventEmitted() public {
        _unpauseToken();

        vm.expectEmit(true, true, false, true, address(token));
        emit Transfer(brandWallet, buyer1, 1);

        vm.prank(brandWallet);
        token.transferWithReason(buyer1, 1, REASON_SALE, "Primary sale");
    }

    function test_PrimarySale_AllModulesPass() public view {
        // canTransfer checks all 5 modules; from=address(0) is the mint path
        assertTrue(compliance.canTransfer(address(0), buyer1, 1));
        // canTransfer also checks regular transfer from brand to buyer
        assertTrue(compliance.canTransfer(brandWallet, buyer1, 1));
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — CPO CERTIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function test_CPO_NotCertifiedInitially() public view {
        assertFalse(token.isCPOCertified(), "Token should not be CPO certified at deploy");
    }

    function test_CPO_CertifyToken() public {
        string memory certURI = "ipfs://QmCertification/cpo.json";

        vm.prank(certifier);
        token.certifyCPO(certURI);

        assertTrue(token.isCPOCertified(),             "Token should be CPO certified");
        assertEq(token.cpoCertifier(),    certifier,   "Certifier address mismatch");
        assertEq(token.cpoCertificationDate(), 1_000_000, "Certification timestamp mismatch");
        assertEq(token.cpoCertificationURI(),  certURI, "Certification URI mismatch");
    }

    function test_CPO_CertifyReverts_NotAuthorizedCaller() public {
        vm.prank(buyer1);
        vm.expectRevert(
            abi.encodeWithSelector(IGalileoToken.NotAuthorizedCertifier.selector, buyer1)
        );
        token.certifyCPO("ipfs://fake.json");
    }

    function test_CPO_CertifyReverts_AlreadyCertified() public {
        vm.prank(certifier);
        token.certifyCPO("ipfs://first.json");

        vm.prank(certifier);
        vm.expectRevert(
            abi.encodeWithSelector(
                IGalileoToken.AlreadyCPOCertified.selector,
                address(token), certifier
            )
        );
        token.certifyCPO("ipfs://second.json");
    }

    function test_CPO_AgentCanRevoke() public {
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert.json");
        assertTrue(token.isCPOCertified());

        vm.prank(agent);
        token.revokeCPO("Counterfeit suspected");

        assertFalse(token.isCPOCertified(), "CPO certification should be revoked");
    }

    function test_CPO_CertifierCanRevokeOwn() public {
        vm.prank(certifier);
        token.certifyCPO("ipfs://cert.json");

        vm.prank(certifier);
        token.revokeCPO("Self-revoked");

        assertFalse(token.isCPOCertified());
    }

    function test_CPO_CertifyViaSCClaim() public {
        // scCertifier holds SERVICE_CENTER claim (not AUTHENTICATOR)
        string memory certURI = "ipfs://sc-cert.json";
        vm.prank(scCertifier);
        token.certifyCPO(certURI);

        assertTrue(token.isCPOCertified(),                "Token should be CPO certified via SC claim");
        assertEq(token.cpoCertifier(),    scCertifier,    "Certifier should be scCertifier");
        assertEq(token.cpoCertificationDate(), 1_000_000, "Certification timestamp mismatch");
        assertEq(token.cpoCertificationURI(),  certURI,   "Certification URI mismatch");
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — SECONDARY SALE
    // ═══════════════════════════════════════════════════════════════════

    function test_SecondarySale_Buyer1ToBuyer2() public {
        _primarySale();

        vm.prank(buyer1);
        bool success = token.transferWithReason(buyer2, 1, REASON_SALE, "Secondary sale");

        assertTrue(success);
        assertEq(token.balanceOf(buyer2), 1, "buyer2 should hold 1 token");
        assertEq(token.balanceOf(buyer1), 0, "buyer1 should hold 0 tokens");
    }

    function test_SecondarySale_ServiceTransferReason() public {
        _primarySale();

        vm.prank(buyer1);
        bool success = token.transferWithReason(
            buyer2, 1, REASON_SERVICE_TRANSFER, "Send for repair"
        );
        assertTrue(success);
    }

    function test_SecondarySale_RevertsInvalidReasonCode() public {
        _primarySale();

        vm.prank(buyer1);
        vm.expectRevert(
            abi.encodeWithSelector(IGalileoToken.InvalidReasonCode.selector, REASON_INVALID)
        );
        token.transferWithReason(buyer2, 1, REASON_INVALID, "Invalid reason");
    }

    function test_SecondarySale_RevertsIfTokenDecommissioned() public {
        _primarySale();

        // Decommission burns buyer1's token and sets the decommissioned flag
        vm.prank(agent);
        token.decommission(buyer1, "Lost item");

        // Any subsequent transfer should revert with "Token decommissioned"
        // (checked before balance check in transferWithReason)
        vm.prank(buyer1);
        vm.expectRevert("Token decommissioned");
        token.transferWithReason(buyer2, 1, REASON_SALE, "Should revert");
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — FREEZE / UNFREEZE
    // ═══════════════════════════════════════════════════════════════════

    function test_Freeze_IsFrozenView() public {
        assertFalse(token.isFrozen(buyer1), "buyer1 should not be frozen initially");

        vm.prank(agent);
        token.setAddressFrozen(buyer1, true);

        assertTrue(token.isFrozen(buyer1), "buyer1 should be frozen");
    }

    function test_Freeze_BlocksOutboundTransfer() public {
        _primarySale();

        vm.prank(agent);
        token.setAddressFrozen(buyer1, true);

        vm.prank(buyer1);
        vm.expectRevert("wallet is frozen");
        token.transferWithReason(buyer2, 1, REASON_SALE, "Should revert - sender frozen");
    }

    function test_Freeze_BlocksInboundTransfer() public {
        _unpauseToken();

        vm.prank(agent);
        token.setAddressFrozen(buyer1, true);

        vm.prank(brandWallet);
        vm.expectRevert("wallet is frozen");
        token.transferWithReason(buyer1, 1, REASON_SALE, "Should revert - recipient frozen");
    }

    function test_Freeze_UnfreezeRestoresTransfer() public {
        _primarySale();

        vm.prank(agent);
        token.setAddressFrozen(buyer1, true);

        vm.prank(agent);
        token.setAddressFrozen(buyer1, false);

        vm.prank(buyer1);
        bool success = token.transferWithReason(buyer2, 1, REASON_SALE, "After unfreeze");

        assertTrue(success);
        assertEq(token.balanceOf(buyer2), 1);
    }

    function test_Freeze_PartialFreezeBlocksExcess() public {
        _primarySale();

        // Freeze the single token (full balance)
        vm.prank(agent);
        token.freezePartialTokens(buyer1, 1);

        assertEq(token.getFrozenTokens(buyer1), 1);

        vm.prank(buyer1);
        vm.expectRevert("Insufficient Balance");
        token.transferWithReason(buyer2, 1, REASON_SALE, "Should revert - all tokens frozen");
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════════

    function test_AccessControl_OnlyAgentCanUnpause() public {
        vm.prank(buyer1);
        vm.expectRevert();
        token.unpause();
    }

    function test_AccessControl_OnlyAgentCanFreeze() public {
        vm.prank(buyer1);
        vm.expectRevert();
        token.setAddressFrozen(buyer2, true);
    }

    function test_AccessControl_OnlyAgentCanDecommission() public {
        vm.prank(buyer1);
        vm.expectRevert();
        token.decommission(brandWallet, "Unauthorized attempt");
    }

    function test_AccessControl_AgentCanPauseAfterUnpause() public {
        _unpauseToken();
        assertFalse(token.paused());

        vm.prank(agent);
        token.pause();
        assertTrue(token.paused());
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — DECOMMISSION
    // ═══════════════════════════════════════════════════════════════════

    function test_Decommission_BurnsTokenAndSetsFlag() public {
        assertEq(token.balanceOf(brandWallet), 1);

        vm.prank(agent);
        token.decommission(brandWallet, "End of life: physical item destroyed");

        assertEq(token.balanceOf(brandWallet), 0,            "Token should be burned");
        assertEq(token.totalSupply(),          0,            "Total supply should be 0");
        assertTrue(token.isDecommissioned(),                 "Token should be marked decommissioned");
        assertEq(token.decommissionReason(), "End of life: physical item destroyed");
    }

    function test_Decommission_RevertsIfAlreadyDecommissioned() public {
        vm.prank(agent);
        token.decommission(brandWallet, "First decommission");

        vm.prank(agent);
        vm.expectRevert("Already decommissioned");
        token.decommission(brandWallet, "Second decommission");
    }

    function test_Decommission_FullLifecycle() public {
        // 1. Primary sale
        _primarySale();
        assertEq(token.balanceOf(buyer1), 1);

        // 2. CPO certification
        vm.prank(certifier);
        token.certifyCPO("ipfs://cpo.json");
        assertTrue(token.isCPOCertified());

        // 3. Secondary sale
        vm.prank(buyer1);
        token.transferWithReason(buyer2, 1, REASON_SALE, "Resale");
        assertEq(token.balanceOf(buyer2), 1);

        // 4. Decommission
        vm.prank(agent);
        token.decommission(buyer2, "Item reported stolen - decommissioned");

        assertEq(token.balanceOf(buyer2), 0);
        assertTrue(token.isDecommissioned());
        assertEq(token.decommissionReason(), "Item reported stolen - decommissioned");
    }

    // ═══════════════════════════════════════════════════════════════════
    // TESTS — COMPLIANCE INTEGRATION
    // ═══════════════════════════════════════════════════════════════════

    function test_ComplianceIntegration_AllModulesAllowTransfer() public view {
        // RESTRICT mode + no blocked countries → all pass
        assertTrue(compliance.canTransfer(brandWallet, buyer1, 1));
        assertTrue(compliance.canTransfer(buyer1, buyer2, 1));
    }

    function test_ComplianceIntegration_CPOModuleDefaultsToNotRequired() public view {
        // CPO module in NOT_REQUIRED mode → never blocks
        assertTrue(compliance.canTransfer(address(0), buyer2, 1));
    }

    function test_ComplianceIntegration_FiveModulesBoundToCompliance() public view {
        address[] memory modules = compliance.getModules();
        assertEq(modules.length, 5);

        // Verify each expected module address is in the list
        bool foundBrand   = false;
        bool foundCPO     = false;
        bool foundJurisd  = false;
        bool foundSanct   = false;
        bool foundSC      = false;
        for (uint256 i = 0; i < 5; i++) {
            if (modules[i] == address(brandModule))     foundBrand  = true;
            if (modules[i] == address(cpoModule))       foundCPO    = true;
            if (modules[i] == address(jurisdModule))    foundJurisd = true;
            if (modules[i] == address(sanctionsModule)) foundSanct  = true;
            if (modules[i] == address(scModule))        foundSC     = true;
        }
        assertTrue(foundBrand,   "BrandAuthorizationModule missing");
        assertTrue(foundCPO,     "CPOCertificationModule missing");
        assertTrue(foundJurisd,  "JurisdictionModule missing");
        assertTrue(foundSanct,   "SanctionsModule missing");
        assertTrue(foundSC,      "ServiceCenterModule missing");
    }

    // ═══════════════════════════════════════════════════════════════════
    // Mirror event (Solidity 0.8.17 requires local declaration for vm.expectEmit)
    // ═══════════════════════════════════════════════════════════════════

    event Transfer(address indexed from, address indexed to, uint256 value);
}
