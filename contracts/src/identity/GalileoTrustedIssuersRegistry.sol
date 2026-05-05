// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";
import {IGalileoTrustedIssuersRegistry} from "../interfaces/identity/ITrustedIssuersRegistry.sol";

/**
 * @title GalileoTrustedIssuersRegistry
 * @author Galileo Luxury Standard
 * @notice Registry of trusted claim issuers for the Galileo luxury goods ecosystem
 * @dev Implements IGalileoTrustedIssuersRegistry (which extends ERC-3643 ITrustedIssuersRegistry).
 *      Provides:
 *      - Base ERC-3643 trusted issuer management (up to 50 issuers, 15 topics each)
 *      - IssuerCategory classification (KYC_PROVIDER, BRAND_ISSUER, AUTH_LAB, REGULATORY_BODY)
 *      - Certification tracking with optional expiry
 *      - Issuer suspension (time-limited or indefinite) without full removal
 *      - Granular topic-level revocation without removing the issuer entirely
 *      - Category-based issuer filtering
 *
 *      Access control uses OpenZeppelin AccessControlEnumerable v4.x.
 *      Only accounts with REGISTRY_ADMIN_ROLE may write to the registry.
 *
 *      Specification: GSPEC-IDENTITY-003
 *
 * @custom:security-contact security@galileoprotocol.io
 */
contract GalileoTrustedIssuersRegistry is IGalileoTrustedIssuersRegistry, AccessControlEnumerable {
    // ============ Roles ============

    /// @notice Role required to manage issuers
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    // ============ Errors ============

    error ZeroAddress();
    error IssuerAlreadyRegistered(address issuer);
    error IssuerNotRegistered(address issuer);
    error EmptyClaimTopics();
    error TooManyClaimTopics();
    error TooManyIssuers();
    error IssuerAlreadySuspended(address issuer);
    error IssuerNotSuspended(address issuer);
    error IssuerNotRegisteredForTopic(address issuer, uint256 claimTopic);
    error CertificationExpired(uint256 validUntil);
    error SuspensionInPast(uint256 until);

    // ============ Constants ============

    uint256 private constant MAX_ISSUERS = 50;
    uint256 private constant MAX_TOPICS_PER_ISSUER = 15;

    // ============ State — T-REX base storage ============

    /// @dev Ordered list of all registered trusted issuers
    IClaimIssuer[] private _trustedIssuers;

    /// @dev Topics each issuer is trusted for (non-empty = registered)
    mapping(address => uint256[]) private _issuerClaimTopics;

    /// @dev Reverse map: topic => list of issuers trusted for it
    mapping(uint256 => IClaimIssuer[]) private _topicToIssuers;

    // ============ State — Galileo extensions ============

    /// @dev Whether an issuer address is currently registered
    mapping(address => bool) private _registered;

    /// @dev Category for each issuer
    mapping(address => IssuerCategory) private _issuerCategory;

    /// @dev Certification details for each issuer
    mapping(address => Certification) private _issuerCertification;

    /// @dev Suspension flag
    mapping(address => bool) private _suspended;

    /// @dev Suspension expiry timestamp (0 = indefinite)
    mapping(address => uint256) private _suspendedUntil;

    /// @dev Category enum value => list of issuer addresses
    mapping(uint256 => address[]) private _categoryIssuers;

    // ============ Constructor ============

    /**
     * @notice Deploy and initialise the registry
     * @param admin Address granted DEFAULT_ADMIN_ROLE and REGISTRY_ADMIN_ROLE
     */
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    // ============ ITrustedIssuersRegistry (ERC-3643 base) ============

    /**
     * @notice Register a trusted issuer with the default KYC_PROVIDER category
     * @dev Emits the extended 4-param TrustedIssuerAdded event with empty certification.
     *      Prefer `addTrustedIssuerWithCategory` for new issuers.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - _trustedIssuer must not be zero address
     * - Issuer must not already be registered
     * - At least one claim topic must be provided
     * - No more than 15 claim topics per issuer
     * - No more than 50 total issuers
     *
     * Emits {TrustedIssuerAdded}
     *
     * @param _trustedIssuer The IClaimIssuer contract to register
     * @param _claimTopics Topics this issuer is trusted to emit
     */
    function addTrustedIssuer(
        IClaimIssuer _trustedIssuer,
        uint256[] calldata _claimTopics
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        _validateNewIssuer(address(_trustedIssuer), _claimTopics);

        _registerIssuer(_trustedIssuer, _claimTopics, IssuerCategory.KYC_PROVIDER);
        emit TrustedIssuerAdded(
            _trustedIssuer,
            _claimTopics,
            IssuerCategory.KYC_PROVIDER,
            _issuerCertification[address(_trustedIssuer)]
        );
    }

    /**
     * @notice Remove a trusted issuer entirely from the registry
     * @dev Clears all topics, category, and certification data. Suspension state cleared too.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Issuer must be registered
     *
     * Emits {TrustedIssuerRemoved}
     *
     * @param _trustedIssuer The issuer to remove
     */
    function removeTrustedIssuer(
        IClaimIssuer _trustedIssuer
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        address issuer = address(_trustedIssuer);
        if (!_registered[issuer]) revert IssuerNotRegistered(issuer);

        // Remove from _trustedIssuers array
        uint256 len = _trustedIssuers.length;
        for (uint256 i = 0; i < len; i++) {
            if (_trustedIssuers[i] == _trustedIssuer) {
                _trustedIssuers[i] = _trustedIssuers[len - 1];
                _trustedIssuers.pop();
                break;
            }
        }

        // Remove from reverse topic maps
        _removeIssuerFromTopicMaps(issuer);

        // Remove from category list
        _removeFromCategory(issuer, _issuerCategory[issuer]);

        // Clear all extension state
        delete _issuerClaimTopics[issuer];
        delete _issuerCategory[issuer];
        delete _issuerCertification[issuer];
        delete _suspended[issuer];
        delete _suspendedUntil[issuer];
        _registered[issuer] = false;

        emit TrustedIssuerRemoved(_trustedIssuer);
    }

    /**
     * @notice Update the set of claim topics for a registered issuer
     * @dev Replaces the existing topic list entirely.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Issuer must be registered
     * - At least one topic must be provided
     * - No more than 15 topics
     *
     * Emits {ClaimTopicsUpdated}
     *
     * @param _trustedIssuer The issuer to update
     * @param _claimTopics New set of topics
     */
    function updateIssuerClaimTopics(
        IClaimIssuer _trustedIssuer,
        uint256[] calldata _claimTopics
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        address issuer = address(_trustedIssuer);
        if (!_registered[issuer]) revert IssuerNotRegistered(issuer);
        if (_claimTopics.length == 0) revert EmptyClaimTopics();
        if (_claimTopics.length > MAX_TOPICS_PER_ISSUER) revert TooManyClaimTopics();

        // Clear old topic reverse-maps
        _removeIssuerFromTopicMaps(issuer);

        // Set new topics
        _issuerClaimTopics[issuer] = _claimTopics;
        for (uint256 i = 0; i < _claimTopics.length; i++) {
            _topicToIssuers[_claimTopics[i]].push(_trustedIssuer);
        }

        emit ClaimTopicsUpdated(_trustedIssuer, _claimTopics);
    }

    /**
     * @notice Get the full list of registered trusted issuers
     * @return Array of IClaimIssuer addresses
     */
    function getTrustedIssuers() external view override returns (IClaimIssuer[] memory) {
        return _trustedIssuers;
    }

    /**
     * @notice Get issuers trusted for a specific claim topic
     * @param claimTopic The topic to query
     * @return Array of IClaimIssuer addresses trusted for the topic
     */
    function getTrustedIssuersForClaimTopic(
        uint256 claimTopic
    ) external view override returns (IClaimIssuer[] memory) {
        return _topicToIssuers[claimTopic];
    }

    /**
     * @notice Check if an address is a registered trusted issuer
     * @dev Returns true regardless of suspension status
     * @param _issuer The address to check
     * @return True if the issuer is registered
     */
    function isTrustedIssuer(address _issuer) external view override returns (bool) {
        return _registered[_issuer];
    }

    /**
     * @notice Get the claim topics a trusted issuer is registered for
     * @param _trustedIssuer The issuer to query
     * @return Array of claim topic IDs
     */
    function getTrustedIssuerClaimTopics(
        IClaimIssuer _trustedIssuer
    ) external view override returns (uint256[] memory) {
        address issuer = address(_trustedIssuer);
        if (!_registered[issuer]) revert IssuerNotRegistered(issuer);
        return _issuerClaimTopics[issuer];
    }

    /**
     * @notice Check if an issuer is registered for a specific claim topic
     * @param _issuer The issuer address
     * @param _claimTopic The claim topic to check
     * @return True if the issuer has the topic (ignores suspension)
     */
    function hasClaimTopic(
        address _issuer,
        uint256 _claimTopic
    ) external view override returns (bool) {
        uint256[] memory topics = _issuerClaimTopics[_issuer];
        uint256 len = topics.length;
        for (uint256 i = 0; i < len; i++) {
            if (topics[i] == _claimTopic) return true;
        }
        return false;
    }

    // ============ IGalileoTrustedIssuersRegistry extensions ============

    /**
     * @notice Add a trusted issuer with category and certification details
     * @dev Preferred method for adding issuers in the Galileo ecosystem.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Issuer must not already be registered
     * - At least one claim topic must be specified
     * - _certification.validUntil must be 0 (permanent) or a future timestamp
     *
     * Emits {TrustedIssuerAdded}
     *
     * @param _issuer The IClaimIssuer contract to register
     * @param _claimTopics Topics this issuer is trusted to emit
     * @param _category Category classification
     * @param _certification Certification details
     */
    function addTrustedIssuerWithCategory(
        IClaimIssuer _issuer,
        uint256[] calldata _claimTopics,
        IssuerCategory _category,
        Certification calldata _certification
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        _validateNewIssuer(address(_issuer), _claimTopics);
        if (
            _certification.validUntil != 0 &&
            _certification.validUntil <= block.timestamp
        ) revert CertificationExpired(_certification.validUntil);

        _registerIssuer(_issuer, _claimTopics, _category);
        _issuerCertification[address(_issuer)] = _certification;

        emit TrustedIssuerAdded(_issuer, _claimTopics, _category, _certification);
    }

    /**
     * @notice Get the category of a registered issuer
     * @param _issuer The issuer address
     * @return The IssuerCategory of the issuer
     */
    function getIssuerCategory(address _issuer) external view override returns (IssuerCategory) {
        if (!_registered[_issuer]) revert IssuerNotRegistered(_issuer);
        return _issuerCategory[_issuer];
    }

    /**
     * @notice Get the certification details of a registered issuer
     * @param _issuer The issuer address
     * @return The Certification struct
     */
    function getIssuerCertification(
        address _issuer
    ) external view override returns (Certification memory) {
        if (!_registered[_issuer]) revert IssuerNotRegistered(_issuer);
        return _issuerCertification[_issuer];
    }

    /**
     * @notice Update the certification of an existing issuer
     * @dev Does not change topics or category.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Issuer must be registered
     * - _certification.validUntil must be 0 or a future timestamp
     *
     * Emits {IssuerCertificationUpdated}
     *
     * @param _issuer The issuer address
     * @param _certification New certification details
     */
    function updateIssuerCertification(
        address _issuer,
        Certification calldata _certification
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!_registered[_issuer]) revert IssuerNotRegistered(_issuer);
        if (
            _certification.validUntil != 0 &&
            _certification.validUntil <= block.timestamp
        ) revert CertificationExpired(_certification.validUntil);

        _issuerCertification[_issuer] = _certification;
        emit IssuerCertificationUpdated(_issuer, _certification);
    }

    /**
     * @notice Get all issuers in a specific category
     * @param _category The category to filter by
     * @return Array of issuer addresses in the category
     */
    function getIssuersByCategory(
        IssuerCategory _category
    ) external view override returns (address[] memory) {
        return _categoryIssuers[uint256(_category)];
    }

    /**
     * @notice Revoke an issuer's trust for a specific claim topic
     * @dev Removes the issuer from that topic only. The issuer remains registered
     *      for other topics. Uses swap-and-pop for efficient removal.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Issuer must be registered for the specified topic
     *
     * Emits {IssuerTopicRevoked}
     *
     * @param _issuer The issuer address
     * @param _claimTopic The topic to revoke
     * @param _reason Human-readable reason
     */
    function revokeIssuerForTopic(
        address _issuer,
        uint256 _claimTopic,
        string calldata _reason
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!_registered[_issuer]) revert IssuerNotRegistered(_issuer);

        // Remove from _issuerClaimTopics
        bool found = _removeTopicFromIssuer(_issuer, _claimTopic);
        if (!found) revert IssuerNotRegisteredForTopic(_issuer, _claimTopic);

        // Remove issuer from _topicToIssuers
        _removeIssuerFromTopic(_issuer, _claimTopic);

        emit IssuerTopicRevoked(_issuer, _claimTopic, _reason);
    }

    /**
     * @notice Temporarily suspend a trusted issuer
     * @dev Suspended issuers remain registered but `isIssuerSuspended` returns true.
     *      If `_until == 0`, the suspension is indefinite.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Issuer must be registered
     * - Issuer must not already be suspended
     * - If _until > 0, must be a future timestamp
     *
     * Emits {IssuerSuspended}
     *
     * @param _issuer The issuer to suspend
     * @param _reason Human-readable reason
     * @param _until Expiry timestamp (0 = indefinite)
     */
    function suspendIssuer(
        address _issuer,
        string calldata _reason,
        uint256 _until
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!_registered[_issuer]) revert IssuerNotRegistered(_issuer);
        if (_isCurrentlySuspended(_issuer)) revert IssuerAlreadySuspended(_issuer);
        if (_until != 0 && _until <= block.timestamp) revert SuspensionInPast(_until);

        _suspended[_issuer] = true;
        _suspendedUntil[_issuer] = _until;

        emit IssuerSuspended(_issuer, _reason, _until);
    }

    /**
     * @notice Reactivate a suspended issuer
     * @dev Clears both the suspension flag and expiry.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Issuer must be currently suspended (active suspension)
     *
     * Emits {IssuerReactivated}
     *
     * @param _issuer The issuer to reactivate
     */
    function reactivateIssuer(
        address _issuer
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!_registered[_issuer]) revert IssuerNotRegistered(_issuer);
        if (!_isCurrentlySuspended(_issuer)) revert IssuerNotSuspended(_issuer);

        _suspended[_issuer] = false;
        _suspendedUntil[_issuer] = 0;

        emit IssuerReactivated(_issuer);
    }

    /**
     * @notice Check if an issuer is currently suspended
     * @dev Returns true only if the suspension is active (not expired).
     *      An issuer with `_until > 0` that has passed is no longer suspended.
     *
     * @param _issuer The address to check
     * @return True if the issuer is currently suspended
     */
    function isIssuerSuspended(address _issuer) external view override returns (bool) {
        return _isCurrentlySuspended(_issuer);
    }

    /**
     * @notice Check if an issuer's certification is currently valid
     * @dev Returns false if not registered.
     *      Returns true for permanent certifications (validUntil == 0).
     *      Returns true if validUntil > block.timestamp.
     *
     * @param _issuer The address to check
     * @return True if the issuer has a valid certification
     */
    function isCertificationValid(address _issuer) external view override returns (bool) {
        if (!_registered[_issuer]) return false;
        uint256 validUntil = _issuerCertification[_issuer].validUntil;
        if (validUntil == 0) return true;
        return block.timestamp < validUntil;
    }

    // ============ Internal helpers ============

    function _validateNewIssuer(address issuer, uint256[] calldata claimTopics) internal view {
        if (issuer == address(0)) revert ZeroAddress();
        if (_registered[issuer]) revert IssuerAlreadyRegistered(issuer);
        if (claimTopics.length == 0) revert EmptyClaimTopics();
        if (claimTopics.length > MAX_TOPICS_PER_ISSUER) revert TooManyClaimTopics();
        if (_trustedIssuers.length >= MAX_ISSUERS) revert TooManyIssuers();
    }

    function _registerIssuer(
        IClaimIssuer issuer,
        uint256[] calldata claimTopics,
        IssuerCategory category
    ) internal {
        address addr = address(issuer);
        _trustedIssuers.push(issuer);
        _issuerClaimTopics[addr] = claimTopics;
        for (uint256 i = 0; i < claimTopics.length; i++) {
            _topicToIssuers[claimTopics[i]].push(issuer);
        }
        _registered[addr] = true;
        _issuerCategory[addr] = category;
        _categoryIssuers[uint256(category)].push(addr);
    }

    function _removeIssuerFromTopicMaps(address issuer) internal {
        uint256[] memory topics = _issuerClaimTopics[issuer];
        for (uint256 t = 0; t < topics.length; t++) {
            _removeIssuerFromTopic(issuer, topics[t]);
        }
    }

    function _removeIssuerFromTopic(address issuer, uint256 claimTopic) internal {
        IClaimIssuer[] storage issuers = _topicToIssuers[claimTopic];
        uint256 len = issuers.length;
        for (uint256 i = 0; i < len; i++) {
            if (address(issuers[i]) == issuer) {
                issuers[i] = issuers[len - 1];
                issuers.pop();
                break;
            }
        }
    }

    function _removeTopicFromIssuer(
        address issuer,
        uint256 claimTopic
    ) internal returns (bool found) {
        uint256[] storage topics = _issuerClaimTopics[issuer];
        uint256 len = topics.length;
        for (uint256 i = 0; i < len; i++) {
            if (topics[i] == claimTopic) {
                topics[i] = topics[len - 1];
                topics.pop();
                return true;
            }
        }
        return false;
    }

    function _removeFromCategory(address issuer, IssuerCategory category) internal {
        address[] storage list = _categoryIssuers[uint256(category)];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; i++) {
            if (list[i] == issuer) {
                list[i] = list[len - 1];
                list.pop();
                break;
            }
        }
    }

    function _isCurrentlySuspended(address issuer) internal view returns (bool) {
        if (!_suspended[issuer]) return false;
        uint256 until = _suspendedUntil[issuer];
        if (until == 0) return true;              // indefinite
        return block.timestamp < until;            // time-limited
    }
}
