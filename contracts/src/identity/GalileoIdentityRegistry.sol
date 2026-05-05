// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import {IClaimTopicsRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/IClaimTopicsRegistry.sol";
import {ITrustedIssuersRegistry} from "@erc3643org/erc-3643/contracts/registry/interface/ITrustedIssuersRegistry.sol";
import {IIdentityRegistryStorage} from "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistryStorage.sol";
import {IGalileoIdentityRegistry} from "../interfaces/identity/IIdentityRegistry.sol";
import {IGalileoTrustedIssuersRegistry} from "../interfaces/identity/ITrustedIssuersRegistry.sol";

/**
 * @title GalileoIdentityRegistry
 * @author Galileo Luxury Standard
 * @notice Identity registry for a brand in the Galileo consortium
 * @dev Implements IGalileoIdentityRegistry (which extends T-REX IIdentityRegistry).
 *      Provides:
 *      - T-REX ERC-3643 base: registerIdentity, deleteIdentity, updateIdentity,
 *        updateCountry, batchRegisterIdentity, isVerified, contains
 *      - Cross-brand consent verification (GDPR Article 6 compliant)
 *      - Batch claim topic verification
 *      - Consortium membership tracking (TIR + CTR binding)
 *      - Identity count for analytics
 *      - Claim topic support check via bound CTR
 *
 *      **Consent model:**
 *      Consent is modelled as a claim on the user's OnchainID. To grant Brand A
 *      access to their data, the user (or a consent manager) adds a claim to
 *      their identity with topic = keccak256(abi.encode("galileo.consent.brand",
 *      brandRegistryAddress)). The existence of such a claim (any issuer) is
 *      interpreted as consent granted.
 *
 *      Access control uses OpenZeppelin AccessControlEnumerable v4.x.
 *      Roles:
 *        DEFAULT_ADMIN_ROLE   — role management
 *        REGISTRY_ADMIN_ROLE  — update linked registries
 *        AGENT_ROLE           — register/delete/update identities
 *
 *      Specification: GSPEC-IDENTITY-006
 *
 * @custom:security-contact security@galileoprotocol.io
 */
contract GalileoIdentityRegistry is IGalileoIdentityRegistry, AccessControlEnumerable {
    // ============ Roles ============

    /// @notice Role required to update linked TIR, CTR, or storage contracts
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    /// @notice Role required to register, delete, or update identities
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    // ============ Errors ============

    error ZeroAddress();

    // ============ State ============

    /// @dev The Claim Topics Registry used for isVerified checks
    IClaimTopicsRegistry private _claimTopicsRegistry;

    /// @dev The Trusted Issuers Registry used for isVerified checks
    ITrustedIssuersRegistry private _trustedIssuersRegistry;

    /// @dev The Identity Registry Storage holding user identity data
    IIdentityRegistryStorage private _identityStorage;

    /// @dev Count of currently registered identities
    uint256 private _identityCount;

    // ============ Constructor ============

    /**
     * @notice Deploy and initialise the identity registry
     * @param admin Address granted DEFAULT_ADMIN_ROLE and REGISTRY_ADMIN_ROLE
     * @param tir Address of the Trusted Issuers Registry
     * @param ctr Address of the Claim Topics Registry
     * @param storageContract Address of the Identity Registry Storage
     */
    constructor(address admin, address tir, address ctr, address storageContract) {
        if (admin == address(0) || tir == address(0) || ctr == address(0) || storageContract == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(AGENT_ROLE, REGISTRY_ADMIN_ROLE);

        _trustedIssuersRegistry = ITrustedIssuersRegistry(tir);
        _claimTopicsRegistry = IClaimTopicsRegistry(ctr);
        _identityStorage = IIdentityRegistryStorage(storageContract);

        emit TrustedIssuersRegistrySet(tir);
        emit ClaimTopicsRegistrySet(ctr);
        emit IdentityStorageSet(storageContract);
    }

    // ============ IIdentityRegistry — write functions (agent-gated) ============

    /**
     * @notice Register a user identity in the registry
     * @dev Delegates storage to the bound IIdentityRegistryStorage.
     *      Increments the identity count.
     *
     * Requirements:
     * - Caller must have AGENT_ROLE
     *
     * Emits {IdentityRegistered}
     *
     * @param _userAddress The investor wallet address
     * @param _identity The investor's OnchainID contract
     * @param _country ISO 3166-1 numeric country code
     */
    function registerIdentity(
        address _userAddress,
        IIdentity _identity,
        uint16 _country
    ) public override onlyRole(AGENT_ROLE) {
        _identityStorage.addIdentityToStorage(_userAddress, _identity, _country);
        unchecked { _identityCount++; }
        emit IdentityRegistered(_userAddress, _identity);
    }

    /**
     * @notice Remove a user identity from the registry
     * @dev Decrements the identity count.
     *
     * Requirements:
     * - Caller must have AGENT_ROLE
     *
     * Emits {IdentityRemoved}
     *
     * @param _userAddress The investor wallet address to remove
     */
    function deleteIdentity(address _userAddress) external override onlyRole(AGENT_ROLE) {
        IIdentity oldIdentity = _identityStorage.storedIdentity(_userAddress);
        _identityStorage.removeIdentityFromStorage(_userAddress);
        unchecked { _identityCount--; }
        emit IdentityRemoved(_userAddress, oldIdentity);
    }

    /**
     * @notice Update the OnchainID contract for a registered user
     * @dev Emits both IdentityUpdated (base) event.
     *
     * Requirements:
     * - Caller must have AGENT_ROLE
     *
     * Emits {IdentityUpdated}
     *
     * @param _userAddress The investor wallet address
     * @param _identity The new OnchainID contract
     */
    function updateIdentity(address _userAddress, IIdentity _identity) external override onlyRole(AGENT_ROLE) {
        IIdentity oldIdentity = _identityStorage.storedIdentity(_userAddress);
        _identityStorage.modifyStoredIdentity(_userAddress, _identity);
        emit IdentityUpdated(oldIdentity, _identity);
    }

    /**
     * @notice Update the country code for a registered user
     * @dev Requirements: Caller must have AGENT_ROLE. Emits {CountryUpdated}.
     * @param _userAddress The investor wallet address
     * @param _country New ISO 3166-1 numeric country code
     */
    function updateCountry(address _userAddress, uint16 _country) external override onlyRole(AGENT_ROLE) {
        _identityStorage.modifyStoredInvestorCountry(_userAddress, _country);
        emit CountryUpdated(_userAddress, _country);
    }

    /**
     * @notice Register multiple identities in a single transaction
     * @dev Each registration emits {IdentityRegistered}. Requires AGENT_ROLE.
     *      CAUTION: may exceed block gas limit for large batches.
     * @param _userAddresses Array of investor wallet addresses
     * @param _identities Array of corresponding OnchainID contracts
     * @param _countries Array of corresponding country codes
     */
    function batchRegisterIdentity(
        address[] calldata _userAddresses,
        IIdentity[] calldata _identities,
        uint16[] calldata _countries
    ) external override onlyRole(AGENT_ROLE) {
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            registerIdentity(_userAddresses[i], _identities[i], _countries[i]);
        }
    }

    // ============ IIdentityRegistry — admin functions ============

    /**
     * @notice Replace the linked Identity Registry Storage
     * @dev Requirements: Caller must have REGISTRY_ADMIN_ROLE. Emits {IdentityStorageSet}.
     * @param _identityRegistryStorage New storage contract address
     */
    function setIdentityRegistryStorage(
        address _identityRegistryStorage
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (_identityRegistryStorage == address(0)) revert ZeroAddress();
        _identityStorage = IIdentityRegistryStorage(_identityRegistryStorage);
        emit IdentityStorageSet(_identityRegistryStorage);
    }

    /**
     * @notice Replace the linked Claim Topics Registry
     * @dev Requirements: Caller must have REGISTRY_ADMIN_ROLE. Emits {ClaimTopicsRegistrySet}.
     * @param _claimTopicsReg New CTR contract address
     */
    function setClaimTopicsRegistry(
        address _claimTopicsReg
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (_claimTopicsReg == address(0)) revert ZeroAddress();
        _claimTopicsRegistry = IClaimTopicsRegistry(_claimTopicsReg);
        emit ClaimTopicsRegistrySet(_claimTopicsReg);
        emit ConsortiumMembershipChanged(
            address(this),
            _claimTopicsReg != address(0) && address(_trustedIssuersRegistry) != address(0),
            address(_trustedIssuersRegistry),
            _claimTopicsReg
        );
    }

    /**
     * @notice Replace the linked Trusted Issuers Registry
     * @dev Requirements: Caller must have REGISTRY_ADMIN_ROLE. Emits {TrustedIssuersRegistrySet}.
     * @param _trustedIssuersReg New TIR contract address
     */
    function setTrustedIssuersRegistry(
        address _trustedIssuersReg
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (_trustedIssuersReg == address(0)) revert ZeroAddress();
        _trustedIssuersRegistry = ITrustedIssuersRegistry(_trustedIssuersReg);
        emit TrustedIssuersRegistrySet(_trustedIssuersReg);
        emit ConsortiumMembershipChanged(
            address(this),
            _trustedIssuersReg != address(0) && address(_claimTopicsRegistry) != address(0),
            _trustedIssuersReg,
            address(_claimTopicsRegistry)
        );
    }

    // ============ IIdentityRegistry — view functions ============

    /**
     * @notice Check if a user wallet is registered in this registry
     * @param _userAddress The wallet to check
     * @return True if registered
     */
    function contains(address _userAddress) external view override returns (bool) {
        return address(_identityStorage.storedIdentity(_userAddress)) != address(0);
    }

    /**
     * @notice Check if a user is fully verified for all required claim topics
     * @dev Implements T-REX ERC-3643 verification logic:
     *      1. User must be registered (has an identity contract)
     *      2. If CTR has no required topics → true
     *      3. For each required topic, user must have a valid claim from a trusted issuer
     *
     * @param _userAddress The wallet address of the user
     * @return True if the user satisfies all required claim topics
     */
    function isVerified(address _userAddress) external view override returns (bool) {
        return _isVerified(_userAddress);
    }

    /**
     * @notice Get the OnchainID contract for a registered user
     * @param _userAddress The investor wallet address
     * @return The IIdentity contract, or address(0) if not registered
     */
    function identity(address _userAddress) public view override returns (IIdentity) {
        return _identityStorage.storedIdentity(_userAddress);
    }

    /**
     * @notice Get the country code for a registered user
     * @param _userAddress The investor wallet address
     * @return ISO 3166-1 numeric country code, or 0 if not registered
     */
    function investorCountry(address _userAddress) external view override returns (uint16) {
        return _identityStorage.storedInvestorCountry(_userAddress);
    }

    /**
     * @notice Get the linked Identity Registry Storage
     * @return The IIdentityRegistryStorage contract
     */
    function identityStorage() external view override returns (IIdentityRegistryStorage) {
        return _identityStorage;
    }

    /**
     * @notice Get the linked Trusted Issuers Registry
     * @return The ITrustedIssuersRegistry contract
     */
    function issuersRegistry() external view override returns (ITrustedIssuersRegistry) {
        return _trustedIssuersRegistry;
    }

    /**
     * @notice Get the linked Claim Topics Registry
     * @return The IClaimTopicsRegistry contract
     */
    function topicsRegistry() external view override returns (IClaimTopicsRegistry) {
        return _claimTopicsRegistry;
    }

    // ============ IGalileoIdentityRegistry extensions ============

    /**
     * @notice Verify user identity with cross-brand consent check
     * @dev Returns true iff:
     *      1. The user has a valid claim for _claimTopic (from a trusted issuer), AND
     *      2. The user's identity has a consent claim granting access to _requestingBrand
     *
     *      Consent is modelled as a claim with topic =
     *      keccak256(abi.encode("galileo.consent.brand", _requestingBrand)).
     *      If the user's identity has any claim with that topic, consent is granted.
     *      If _requestingBrand == address(this), consent is implicitly granted.
     *
     * @param _userAddress The wallet address of the user
     * @param _claimTopic The claim topic to verify
     * @param _requestingBrand The brand registry address requesting verification
     * @return True if verified with consent
     */
    function isVerifiedWithConsent(
        address _userAddress,
        uint256 _claimTopic,
        address _requestingBrand
    ) external view override returns (bool) {
        if (!_verifySingleTopic(_userAddress, _claimTopic)) return false;
        return _requestingBrand == address(this) || _hasConsent(_userAddress, _requestingBrand);
    }

    /**
     * @notice Batch verification for multiple claim topics
     * @dev Each entry in the result corresponds to the claim topic at the same index.
     *      Does not revert for individual topic failures.
     *
     * Requirements:
     * - _claimTopics must not be empty
     *
     * @param _userAddress The wallet address of the user
     * @param _claimTopics Array of claim topics to verify
     * @return results Parallel bool array of verification results
     */
    function batchVerify(
        address _userAddress,
        uint256[] calldata _claimTopics
    ) external view override returns (bool[] memory results) {
        if (_claimTopics.length == 0) revert EmptyClaimTopicsArray();
        results = new bool[](_claimTopics.length);
        for (uint256 i = 0; i < _claimTopics.length; i++) {
            results[i] = _verifySingleTopic(_userAddress, _claimTopics[i]);
        }
    }

    /**
     * @notice Check if this registry is a Galileo consortium member
     * @dev A registry is a member when both a TIR and CTR are set (non-zero).
     * @return True if both TIR and CTR are configured
     */
    function isConsortiumMember() external view override returns (bool) {
        return address(_trustedIssuersRegistry) != address(0)
            && address(_claimTopicsRegistry) != address(0);
    }

    /**
     * @notice Get the consortium registries bound to this registry
     * @return tir Address of the Trusted Issuers Registry (or zero if not member)
     * @return ctr Address of the Claim Topics Registry (or zero if not member)
     */
    function getConsortiumRegistries() external view override returns (address tir, address ctr) {
        return (address(_trustedIssuersRegistry), address(_claimTopicsRegistry));
    }

    /**
     * @notice Batch verification with consent for multiple claim topics
     * @dev Each topic is verified AND consent for _requestingBrand is checked.
     *      Consent is evaluated once (per-brand, not per-topic).
     *
     * Requirements:
     * - _claimTopics must not be empty
     *
     * @param _userAddress The wallet address of the user
     * @param _claimTopics Array of claim topics to verify
     * @param _requestingBrand The brand registry address requesting verification
     * @return results Parallel bool array: true only if topic verified AND consent granted
     */
    function batchVerifyWithConsent(
        address _userAddress,
        uint256[] calldata _claimTopics,
        address _requestingBrand
    ) external view override returns (bool[] memory results) {
        if (_claimTopics.length == 0) revert EmptyClaimTopicsArray();
        results = new bool[](_claimTopics.length);
        bool consented = _requestingBrand == address(this) || _hasConsent(_userAddress, _requestingBrand);
        if (!consented) return results; // all false — no consent
        for (uint256 i = 0; i < _claimTopics.length; i++) {
            results[i] = _verifySingleTopic(_userAddress, _claimTopics[i]);
        }
    }

    /**
     * @notice Get the total number of currently registered identities
     * @return The identity count
     */
    function identityCount() external view override returns (uint256) {
        return _identityCount;
    }

    /**
     * @notice Check if a claim topic is in the CTR's required topics list
     * @dev Iterates the CTR's `getClaimTopics()` array.
     * @param _claimTopic The claim topic to check
     * @return True if the topic is found in the Claim Topics Registry
     */
    function isClaimTopicSupported(uint256 _claimTopic) external view override returns (bool) {
        uint256[] memory topics = _claimTopicsRegistry.getClaimTopics();
        for (uint256 i = 0; i < topics.length; i++) {
            if (topics[i] == _claimTopic) return true;
        }
        return false;
    }

    // ============ Internal helpers ============

    /**
     * @dev Full T-REX isVerified logic across all required claim topics.
     */
    function _isVerified(address _userAddress) internal view returns (bool) {
        if (address(identity(_userAddress)) == address(0)) return false;

        uint256[] memory requiredTopics = _claimTopicsRegistry.getClaimTopics();
        if (requiredTopics.length == 0) return true;

        for (uint256 t = 0; t < requiredTopics.length; t++) {
            if (!_verifySingleTopic(_userAddress, requiredTopics[t])) return false;
        }
        return true;
    }

    /**
     * @dev Verify a single claim topic for a user.
     *      Returns true if the user's identity has at least one valid claim
     *      from a trusted issuer for the given topic.
     *
     *      Algorithm:
     *      1. Get all trusted issuers for the topic from TIR
     *      2. For each issuer, compute the canonical ERC-735 claim ID
     *      3. Fetch the claim; skip if topic doesn't match (claim absent or wrong topic)
     *      4. Validate the claim via IClaimIssuer.isClaimValid
     */
    function _verifySingleTopic(address _userAddress, uint256 _claimTopic) internal view returns (bool) {
        IIdentity userIdentity = identity(_userAddress);
        if (address(userIdentity) == address(0)) return false;

        IClaimIssuer[] memory trustedIssuers =
            _trustedIssuersRegistry.getTrustedIssuersForClaimTopic(_claimTopic);
        if (trustedIssuers.length == 0) return false;

        for (uint256 i = 0; i < trustedIssuers.length; i++) {
            // H-4: Skip suspended issuers — a suspended issuer must not validate claims
            if (IGalileoTrustedIssuersRegistry(address(_trustedIssuersRegistry)).isIssuerSuspended(address(trustedIssuers[i]))) {
                continue;
            }

            // ERC-735 canonical claim ID: keccak256(abi.encode(issuerAddress, topic))
            bytes32 claimId = keccak256(abi.encode(address(trustedIssuers[i]), _claimTopic));

            uint256 foundTopic;
            address issuer;
            bytes memory sig;
            bytes memory data;

            try userIdentity.getClaim(claimId) returns (
                uint256 t, uint256, address i_, bytes memory s, bytes memory d, string memory
            ) {
                foundTopic = t;
                issuer = i_;
                sig = s;
                data = d;
            } catch {
                continue; // claim absent or identity reverted — skip
            }

            if (foundTopic != _claimTopic) continue;

            try IClaimIssuer(issuer).isClaimValid(userIdentity, _claimTopic, sig, data)
                returns (bool valid)
            {
                if (valid) return true;
            } catch {
                // issuer reverted — treat as invalid, try next
            }
        }
        return false;
    }

    /**
     * @dev Check if the user has granted consent to _requestingBrand.
     *      Consent is represented as a claim on the user's identity with topic =
     *      keccak256(abi.encode("galileo.consent.brand", _requestingBrand)).
     *      M-3 fix: the issuer of the consent claim must be in the trusted registry and
     *      the claim signature must be valid — self-issued claims are rejected.
     */
    function _hasConsent(address _userAddress, address _requestingBrand) internal view returns (bool) {
        IIdentity userIdentity = identity(_userAddress);
        if (address(userIdentity) == address(0)) return false;
        uint256 consentTopic = uint256(keccak256(abi.encode("galileo.consent.brand", _requestingBrand)));

        bytes32[] memory claimIds;
        try userIdentity.getClaimIdsByTopic(consentTopic) returns (bytes32[] memory ids) {
            claimIds = ids;
        } catch {
            return false;
        }

        for (uint256 i = 0; i < claimIds.length; i++) {
            uint256 foundTopic;
            address issuer;
            bytes memory sig;
            bytes memory data;

            try userIdentity.getClaim(claimIds[i]) returns (
                uint256 t, uint256, address i_, bytes memory s, bytes memory d, string memory
            ) {
                foundTopic = t;
                issuer = i_;
                sig = s;
                data = d;
            } catch {
                continue;
            }

            if (foundTopic != consentTopic) continue;

            // M-3: Confirm the issuer is registered in the trusted issuers registry
            if (!_trustedIssuersRegistry.isTrustedIssuer(issuer)) continue;

            // Validate the claim signature via the issuer contract
            try IClaimIssuer(issuer).isClaimValid(userIdentity, consentTopic, sig, data) returns (bool valid) {
                if (valid) return true;
            } catch {
                // issuer reverted — treat as invalid
            }
        }
        return false;
    }
}
