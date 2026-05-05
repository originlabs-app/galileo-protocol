// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {GalileoAccessControl} from "../src/infrastructure/GalileoAccessControl.sol";
import {GalileoClaimTopicsRegistry} from "../src/identity/GalileoClaimTopicsRegistry.sol";
import {GalileoTrustedIssuersRegistry} from "../src/identity/GalileoTrustedIssuersRegistry.sol";
import {GalileoIdentityRegistryStorage} from "../src/identity/GalileoIdentityRegistryStorage.sol";
import {GalileoIdentityRegistry} from "../src/identity/GalileoIdentityRegistry.sol";
import {GalileoCompliance} from "../src/compliance/GalileoCompliance.sol";
import {BrandAuthorizationModule} from "../src/compliance/modules/BrandAuthorizationModule.sol";
import {CPOCertificationModule} from "../src/compliance/modules/CPOCertificationModule.sol";
import {JurisdictionModule} from "../src/compliance/modules/JurisdictionModule.sol";
import {SanctionsModule} from "../src/compliance/modules/SanctionsModule.sol";
import {ServiceCenterModule} from "../src/compliance/modules/ServiceCenterModule.sol";
import {GalileoToken} from "../src/token/GalileoToken.sol";
import {GalileoClaimTopics} from "../src/interfaces/identity/IClaimTopicsRegistry.sol";
import {IJurisdictionModule} from "../src/interfaces/compliance/modules/IJurisdictionModule.sol";

/**
 * @title Deploy
 * @notice Foundry deployment script for the full Galileo Protocol stack
 * @dev Deploys all infrastructure, identity, compliance, and token contracts.
 *      Wires everything together and logs all deployed addresses.
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
 *
 * Post-deployment steps (not automated — require external coordination):
 *   1. Register a trusted claim issuer via tir.addTrustedIssuer(issuer, claimTopics)
 *   2. Register buyer/owner identities via reg.registerIdentity(wallet, identity, country)
 *   3. Grant AGENT_ROLE to operational wallets on the token
 *   4. Unpause the token via token.unpause() once distribution is ready
 */
contract Deploy is Script {

    // ─── Deployed addresses (set by _deployInfrastructure / _deployToken) ───

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

    string constant BRAND_DID = "did:galileo:brand:example";

    // ─── Entry point ─────────────────────────────────────────────────────────

    /**
     * @notice Post-deployment checklist
     * @dev Before going live, ensure ALL of the following are completed:
     *   [ ] Set sanctions oracle:  sanctionsModule.setSanctionsOracle(<CHAINALYSIS_ORACLE_ADDRESS>)
     *   [ ] Add trusted issuer:    tir.addTrustedIssuer(<issuer>, [KYC_BASIC, AUTHENTICATOR])
     *   [ ] Register identities:   reg.registerIdentity(<wallet>, <identity>, <country>)
     *   [ ] Grant AGENT_ROLE on token to operational wallets (beyond the deployer admin)
     *   [ ] Unpause token:         token.unpause()
     */
    function run() external {
        // In this script the deployer is the admin for all contracts.
        address admin = msg.sender;
        vm.startBroadcast(admin);

        _deployInfrastructure(admin);
        _deployModules(admin);
        _wireInfrastructure();
        _configureModules();
        _deployToken(admin);

        vm.stopBroadcast();

        _logAddresses();
    }

    // ─── Step 1: Infrastructure ───────────────────────────────────────────────

    function _deployInfrastructure(address admin) internal {
        accessCtrl = new GalileoAccessControl(admin);
        ctr        = new GalileoClaimTopicsRegistry(admin);
        tir        = new GalileoTrustedIssuersRegistry(admin);
        idStorage  = new GalileoIdentityRegistryStorage(admin);
        reg        = new GalileoIdentityRegistry(
            admin, address(tir), address(ctr), address(idStorage)
        );
        // Grant AGENT_ROLE to deployer for initial identity onboarding
        reg.grantRole(reg.AGENT_ROLE(), admin);
        // Compliance owner is `admin`. Ownership is transferred to the token
        // address just before token deployment (see _deployToken).
        compliance = new GalileoCompliance(admin, address(reg));
    }

    // ─── Step 2: Compliance modules ──────────────────────────────────────────

    function _deployModules(address admin) internal {
        brandModule     = new BrandAuthorizationModule(admin, BRAND_DID, address(reg), 0);
        cpoModule       = new CPOCertificationModule(admin, address(reg), 0);
        jurisdModule    = new JurisdictionModule(
            admin, address(reg), IJurisdictionModule.JurisdictionMode.RESTRICT
        );
        sanctionsModule = new SanctionsModule(admin, address(0));
        scModule        = new ServiceCenterModule(admin, address(reg), BRAND_DID, 0);
    }

    // ─── Step 3: Wire identity layer ─────────────────────────────────────────

    // NOTE: All calls below are admin-gated. They succeed because this function
    //       runs inside vm.startBroadcast(admin), so every called contract sees
    //       msg.sender == admin — the owner of idStorage and ctr.
    function _wireInfrastructure() internal {
        idStorage.bindIdentityRegistry(address(reg));
        ctr.addClaimTopic(GalileoClaimTopics.KYC_BASIC);

        // NOTE: Register a trusted claim issuer after deployment:
        //   uint256[] memory topics = new uint256[](2);
        //   topics[0] = GalileoClaimTopics.KYC_BASIC;
        //   topics[1] = GalileoClaimTopics.AUTHENTICATOR;
        //   tir.addTrustedIssuer(IClaimIssuer(<issuerAddr>), topics);
    }

    // ─── Step 4: Configure modules ───────────────────────────────────────────

    // NOTE: All calls below are admin-gated. They succeed because this function
    //       runs inside vm.startBroadcast(admin), so every called contract sees
    //       msg.sender == admin — the owner of all modules.
    function _configureModules() internal {
        // Allow all transfers — tighten for production use
        brandModule.setRequireRetailerForPrimarySale(false);
        brandModule.setAllowPeerToPeer(true);
        // TODO: CRITICAL — Set sanctions oracle address before mainnet deployment
        // sanctionsModule.setSanctionsOracle(CHAINALYSIS_ORACLE_ADDRESS);

        // Enable strict mode — oracle failures will block transfers (fail-closed)
        sanctionsModule.setStrictMode(true);

        compliance.addModule(address(brandModule));
        compliance.addModule(address(cpoModule));
        compliance.addModule(address(jurisdModule));
        compliance.addModule(address(sanctionsModule));
        compliance.addModule(address(scModule));
    }

    // ─── Step 5 & 6: Predict token address, transfer compliance, deploy token ─

    function _deployToken(address admin) internal {
        // !! CRITICAL ORDERING CONSTRAINT !!
        // No additional transactions may be inserted between
        // compliance.transferOwnership() and new GalileoToken() below.
        // If the require fires mid-broadcast, compliance is owned by an
        // undeployed address and is unrecoverable without redeploying compliance.
        //
        // EOA nonces increment on every transaction (CALL or CREATE).
        // transferOwnership() consumes nonce N → nonce becomes N+1.
        // new GalileoToken() will use nonce N+1.
        address predicted = vm.computeCreateAddress(admin, vm.getNonce(admin) + 1);
        compliance.transferOwnership(predicted);
        // !! Do NOT add any transactions between here and `new GalileoToken` !!

        // NOTE: initial token owner is `admin` here — a stand-in for the brand wallet.
        // In production, replace the final `admin` arg with the brand's custody wallet.
        GalileoToken.ProductConfig memory cfg = GalileoToken.ProductConfig({
            tokenName:       "Galileo Luxury Product",
            tokenSymbol:     "GLP-001",
            productDID:      "did:galileo:01:00000000000000:21:00001",
            productCategory: "LUXURY",
            brandDID:        BRAND_DID,
            productURI:      "ipfs://product-metadata.json",
            gtin:            "00000000000000",
            serialNumber:    "00001"
        });
        token = new GalileoToken(admin, address(reg), address(compliance), cfg, admin);

        require(
            address(token) == predicted,
            "Deploy: token address mismatch - check nonce accounting"
        );

        // Grant AGENT_ROLE to admin for initial operational control
        token.grantRole(keccak256("AGENT_ROLE"), admin);
    }

    // ─── Logging ─────────────────────────────────────────────────────────────

    function _logAddresses() internal view {
        console.log("=== Galileo Protocol Deployment ===");
        console.log("GalileoAccessControl:           ", address(accessCtrl));
        console.log("GalileoClaimTopicsRegistry:     ", address(ctr));
        console.log("GalileoTrustedIssuersRegistry:  ", address(tir));
        console.log("GalileoIdentityRegistryStorage: ", address(idStorage));
        console.log("GalileoIdentityRegistry:        ", address(reg));
        console.log("GalileoCompliance:              ", address(compliance));
        console.log("BrandAuthorizationModule:       ", address(brandModule));
        console.log("CPOCertificationModule:         ", address(cpoModule));
        console.log("JurisdictionModule:             ", address(jurisdModule));
        console.log("SanctionsModule:                ", address(sanctionsModule));
        console.log("ServiceCenterModule:            ", address(scModule));
        console.log("GalileoToken:                   ", address(token));
        console.log("===================================");
        console.log("Compliance bound to token:      ", compliance.getTokenBound() == address(token) ? "YES" : "NO");
        console.log("Token paused at deploy:         ", token.paused() ? "YES" : "NO");
        console.log("===================================");
        console.log("Next steps:");
        console.log("  1. tir.addTrustedIssuer(<issuer>, [KYC_BASIC, AUTHENTICATOR])");
        console.log("  2. reg.registerIdentity(<wallet>, <identity>, <country>)");
        console.log("  3. token.unpause()  (once identities are registered)");
    }
}
