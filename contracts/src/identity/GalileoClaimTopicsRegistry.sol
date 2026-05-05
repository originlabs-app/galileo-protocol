// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IGalileoClaimTopicsRegistry, GalileoClaimTopics} from "../interfaces/identity/IClaimTopicsRegistry.sol";

/**
 * @title GalileoClaimTopicsRegistry
 * @author Galileo Luxury Standard
 * @notice Registry of required claim topics for the Galileo luxury goods ecosystem
 * @dev Implements IGalileoClaimTopicsRegistry (which extends T-REX IClaimTopicsRegistry).
 *      Provides:
 *      - Base ERC-3643 claim topics list (up to 15 topics per T-REX spec)
 *      - Extended topic metadata: namespace, description, defaultExpiry, isCompliance
 *      - Compliance vs heritage topic classification
 *      - Topic deprecation with reason tracking
 *      - Namespace-based topic ID computation (keccak256)
 *      - Prefix-based topic filtering
 *
 *      Access control uses OpenZeppelin AccessControlEnumerable v4.x.
 *      Only accounts with REGISTRY_ADMIN_ROLE may add, update, or deprecate topics.
 *
 *      Specification: GSPEC-IDENTITY-004
 *
 * @custom:security-contact security@galileoprotocol.io
 */
contract GalileoClaimTopicsRegistry is IGalileoClaimTopicsRegistry, AccessControlEnumerable {
    // ============ Roles ============

    /// @notice Role required to add, update, and deprecate claim topics
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");

    // ============ Errors ============

    error EmptyNamespace();
    error TopicAlreadyRegistered(uint256 claimTopic);
    error TopicNotRegistered(uint256 claimTopic);
    error TopicAlreadyDeprecated(uint256 claimTopic);
    error TooManyTopics();
    error TopicNotFound(uint256 claimTopic);

    // ============ Constants ============

    /// @notice Maximum number of required claim topics (T-REX constraint)
    uint256 private constant MAX_CLAIM_TOPICS = 15;

    // ============ State ============

    /// @notice Ordered list of required claim topics (ERC-3643 base)
    uint256[] private _claimTopics;

    /// @notice Metadata for each registered topic, keyed by topic ID
    mapping(uint256 => TopicMetadata) private _topicMetadata;

    /// @notice Tracks which topics are registered
    mapping(uint256 => bool) private _registered;

    /// @notice Tracks which topics have been deprecated
    mapping(uint256 => bool) private _deprecated;

    // ============ Constructor ============

    /**
     * @notice Deploy and initialise the registry
     * @param admin Address that receives DEFAULT_ADMIN_ROLE and REGISTRY_ADMIN_ROLE
     */
    constructor(address admin) {
        require(admin != address(0), "GalileoClaimTopicsRegistry: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        // REGISTRY_ADMIN_ROLE is administered by DEFAULT_ADMIN_ROLE
        _setRoleAdmin(REGISTRY_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    // ============ IClaimTopicsRegistry (ERC-3643 base) ============

    /**
     * @notice Add a claim topic to the required topics list
     * @dev Adds the topic ID only — no metadata. Prefer `addClaimTopicWithMetadata`
     *      for new topics in the Galileo ecosystem.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Maximum 15 topics (T-REX constraint)
     * - Topic must not already be registered
     *
     * Emits {ClaimTopicAdded}
     *
     * @param _claimTopic The numeric topic ID to add
     */
    function addClaimTopic(uint256 _claimTopic) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        _requireNotRegistered(_claimTopic);
        if (_claimTopics.length >= MAX_CLAIM_TOPICS) revert TooManyTopics();

        _claimTopics.push(_claimTopic);
        _registered[_claimTopic] = true;

        emit ClaimTopicAdded(_claimTopic);
    }

    /**
     * @notice Remove a claim topic from the required topics list
     * @dev Uses swap-and-pop for O(n) removal. Metadata is preserved.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Topic must be registered
     *
     * Emits {ClaimTopicRemoved}
     *
     * @param _claimTopic The numeric topic ID to remove
     */
    function removeClaimTopic(uint256 _claimTopic) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        _requireRegistered(_claimTopic);

        uint256 length = _claimTopics.length;
        for (uint256 i = 0; i < length; i++) {
            if (_claimTopics[i] == _claimTopic) {
                _claimTopics[i] = _claimTopics[length - 1];
                _claimTopics.pop();
                _registered[_claimTopic] = false;
                emit ClaimTopicRemoved(_claimTopic);
                return;
            }
        }
        // Unreachable if _registered is consistent, but keeps compiler happy
        revert TopicNotFound(_claimTopic);
    }

    /**
     * @notice Get the list of required claim topics
     * @return Array of registered claim topic IDs
     */
    function getClaimTopics() external view override returns (uint256[] memory) {
        return _claimTopics;
    }

    // ============ IGalileoClaimTopicsRegistry extensions ============

    /**
     * @notice Add a claim topic with full metadata
     * @dev The topic ID is derived from keccak256 of the namespace string.
     *      This is the preferred method for adding topics in the Galileo ecosystem.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - _metadata.namespace must not be empty
     * - Topic must not already be registered
     * - Maximum 15 topics (T-REX constraint)
     *
     * Emits {ClaimTopicAdded} and {ClaimTopicRegistered}
     *
     * @param _claimTopic The numeric topic ID (should be keccak256 of namespace)
     * @param _metadata The topic metadata
     */
    function addClaimTopicWithMetadata(
        uint256 _claimTopic,
        TopicMetadata calldata _metadata
    ) external override onlyRole(REGISTRY_ADMIN_ROLE) {
        if (bytes(_metadata.namespace).length == 0) revert EmptyNamespace();
        _requireNotRegistered(_claimTopic);
        if (_claimTopics.length >= MAX_CLAIM_TOPICS) revert TooManyTopics();

        _claimTopics.push(_claimTopic);
        _registered[_claimTopic] = true;
        _topicMetadata[_claimTopic] = _metadata;

        emit ClaimTopicAdded(_claimTopic);
        emit ClaimTopicRegistered(_claimTopic, _metadata.namespace, _metadata);
    }

    /**
     * @notice Get the metadata for a registered claim topic
     * @param _claimTopic The numeric topic ID
     * @return The TopicMetadata for the specified topic
     */
    function getTopicMetadata(uint256 _claimTopic)
        external
        view
        override
        returns (TopicMetadata memory)
    {
        _requireRegistered(_claimTopic);
        return _topicMetadata[_claimTopic];
    }

    /**
     * @notice Compute the topic ID from a namespace string
     * @param _namespace The namespace string (e.g., "galileo.kyc.basic")
     * @return The uint256 topic ID (keccak256 of namespace bytes)
     */
    function getTopicIdByNamespace(string calldata _namespace)
        external
        pure
        override
        returns (uint256)
    {
        return uint256(keccak256(bytes(_namespace)));
    }

    /**
     * @notice Check if a topic is a compliance topic (requires renewal)
     * @param _claimTopic The numeric topic ID
     * @return True if the topic is registered as a compliance topic
     */
    function isComplianceTopic(uint256 _claimTopic) external view override returns (bool) {
        _requireRegistered(_claimTopic);
        return _topicMetadata[_claimTopic].isCompliance;
    }

    /**
     * @notice Get all topics filtered by compliance status
     * @param _isCompliance True to get compliance topics, false for heritage topics
     * @return Array of topic IDs matching the filter
     */
    function getTopicsByType(bool _isCompliance)
        external
        view
        override
        returns (uint256[] memory)
    {
        uint256 length = _claimTopics.length;
        uint256 count = 0;

        // First pass: count matching topics
        for (uint256 i = 0; i < length; i++) {
            if (_topicMetadata[_claimTopics[i]].isCompliance == _isCompliance) {
                count++;
            }
        }

        // Second pass: collect matching topics
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < length; i++) {
            uint256 topic = _claimTopics[i];
            if (_topicMetadata[topic].isCompliance == _isCompliance) {
                result[idx++] = topic;
            }
        }
        return result;
    }

    /**
     * @notice Deprecate a claim topic
     * @dev Deprecated topics remain resolvable but should not be used for new claims.
     *
     * Requirements:
     * - Caller must have REGISTRY_ADMIN_ROLE
     * - Topic must be registered
     * - Topic must not already be deprecated
     *
     * Emits {ClaimTopicDeprecated}
     *
     * @param _claimTopic The numeric topic ID to deprecate
     * @param _reason Human-readable reason for deprecation
     */
    function deprecateTopic(uint256 _claimTopic, string calldata _reason)
        external
        override
        onlyRole(REGISTRY_ADMIN_ROLE)
    {
        _requireRegistered(_claimTopic);
        if (_deprecated[_claimTopic]) revert TopicAlreadyDeprecated(_claimTopic);

        _deprecated[_claimTopic] = true;
        emit ClaimTopicDeprecated(_claimTopic, _reason);
    }

    /**
     * @notice Check if a topic has been deprecated
     * @param _claimTopic The numeric topic ID
     * @return True if the topic is deprecated
     */
    function isTopicDeprecated(uint256 _claimTopic) external view override returns (bool) {
        return _deprecated[_claimTopic];
    }

    /**
     * @notice Get all topics whose namespaces start with a given prefix
     * @dev Gas-intensive for large registries; prefer off-chain indexing in production.
     *
     * @param _prefix The namespace prefix to match (e.g., "galileo.kyc.")
     * @return Array of topic IDs whose namespace begins with _prefix
     */
    function getTopicsByPrefix(string calldata _prefix)
        external
        view
        override
        returns (uint256[] memory)
    {
        bytes memory prefix = bytes(_prefix);
        uint256 prefixLen = prefix.length;
        uint256 length = _claimTopics.length;

        uint256 count = 0;
        for (uint256 i = 0; i < length; i++) {
            if (_namespaceStartsWith(_topicMetadata[_claimTopics[i]].namespace, prefix, prefixLen)) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < length; i++) {
            uint256 topic = _claimTopics[i];
            if (_namespaceStartsWith(_topicMetadata[topic].namespace, prefix, prefixLen)) {
                result[idx++] = topic;
            }
        }
        return result;
    }

    // ============ Internal helpers ============

    function _requireRegistered(uint256 _claimTopic) internal view {
        if (!_registered[_claimTopic]) revert TopicNotRegistered(_claimTopic);
    }

    function _requireNotRegistered(uint256 _claimTopic) internal view {
        if (_registered[_claimTopic]) revert TopicAlreadyRegistered(_claimTopic);
    }

    /// @dev Returns true if `namespace` starts with `prefix` (compared as bytes)
    function _namespaceStartsWith(
        string memory namespace,
        bytes memory prefix,
        uint256 prefixLen
    ) internal pure returns (bool) {
        bytes memory ns = bytes(namespace);
        if (ns.length < prefixLen) return false;
        for (uint256 i = 0; i < prefixLen; i++) {
            if (ns[i] != prefix[i]) return false;
        }
        return true;
    }
}
