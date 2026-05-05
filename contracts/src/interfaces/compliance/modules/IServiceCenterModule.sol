// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.17 <0.9.0;

import {IComplianceModule} from "../IComplianceModule.sol";

/**
 * @title IServiceCenterModule
 * @author Galileo Protocol Contributors
 * @notice Compliance module that authorizes Maintenance, Repair, and Overhaul (MRO) operations
 * @dev This module ensures that service operations on luxury goods are performed only by
 *      authorized service centers, protecting authenticity and maintaining warranty validity.
 *
 *      Use Cases:
 *      - **Warranty Repairs**: Only authorized centers can perform warranty work
 *      - **Restorations**: High-value restoration by certified craftspeople
 *      - **Authentication Services**: Verification by certified authenticators
 *      - **Part Replacements**: Ensure genuine parts from authorized sources
 *
 *      MRO Transfer Flow:
 *      1. Owner initiates service request
 *      2. Module validates service center authorization
 *      3. Token temporarily transfers to service center
 *      4. Service performed and recorded in provenance
 *      5. Token returns to owner with updated history
 *
 *      Integration with Identity:
 *      - Queries IGalileoIdentityRegistry for SERVICE_CENTER claims
 *      - Uses GalileoClaimTopics.SERVICE_CENTER (0x10830870...)
 *      - Validates service type authorization (repair, restoration, etc.)
 *
 *      Service Types:
 *      - REPAIR: Standard maintenance and repairs
 *      - RESTORATION: Full restoration of vintage/damaged items
 *      - AUTHENTICATION: Verification and certification
 *      - CUSTOMIZATION: Authorized modifications (engraving, etc.)
 *      - INSPECTION: Periodic inspections (watches, vehicles)
 *
 *      Claim Requirements:
 *      The SERVICE_CENTER claim must contain:
 *      - brandDID: The authorizing brand's DID
 *      - serviceTypes: Array of authorized service types
 *      - certifications: Technician certifications
 *      - validFrom/validUntil: Authorization validity period
 *
 * Reference: GalileoClaimTopics.SERVICE_CENTER
 * Specification: GSPEC-COMPLIANCE-005
 * @custom:security-contact security@galileoprotocol.io
 */
interface IServiceCenterModule is IComplianceModule {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS (as external functions for interface compatibility)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Service type: Standard maintenance and repairs
     * @dev Includes: cleaning, polishing, minor adjustments, battery replacement
     * @return bytes32 identifier for repair service type
     */
    function SERVICE_TYPE_REPAIR() external pure returns (bytes32);

    /**
     * @notice Service type: Full restoration
     * @dev Includes: major overhauls, refinishing, component replacement
     * @return bytes32 identifier for restoration service type
     */
    function SERVICE_TYPE_RESTORATION() external pure returns (bytes32);

    /**
     * @notice Service type: Authentication and certification
     * @dev Includes: authenticity verification, condition grading, certification issuance
     * @return bytes32 identifier for authentication service type
     */
    function SERVICE_TYPE_AUTHENTICATION() external pure returns (bytes32);

    /**
     * @notice Service type: Authorized customization
     * @dev Includes: engraving, bespoke modifications, personalization
     * @return bytes32 identifier for customization service type
     */
    function SERVICE_TYPE_CUSTOMIZATION() external pure returns (bytes32);

    /**
     * @notice Service type: Periodic inspection
     * @dev Includes: annual service checks, water resistance testing, movement timing
     * @return bytes32 identifier for inspection service type
     */
    function SERVICE_TYPE_INSPECTION() external pure returns (bytes32);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when service center is not authorized for any service
     * @param serviceCenter The service center address
     */
    error ServiceCenterNotAuthorized(address serviceCenter);

    /**
     * @notice Thrown when service center is not authorized for specific service type
     * @param serviceCenter The service center address
     * @param serviceType The service type that was not authorized
     */
    error ServiceCenterNotAuthorizedForType(address serviceCenter, bytes32 serviceType);

    /**
     * @notice Thrown when service center authorization has expired
     * @param serviceCenter The service center address
     * @param expiredAt The timestamp when authorization expired
     */
    error ServiceCenterAuthorizationExpired(address serviceCenter, uint256 expiredAt);

    /**
     * @notice Thrown when MRO transfer validation fails
     * @param from The owner address
     * @param serviceCenter The service center address
     * @param serviceType The requested service type
     * @param reason The failure reason
     */
    error MROTransferValidationFailed(
        address from,
        address serviceCenter,
        bytes32 serviceType,
        string reason
    );

    /**
     * @notice Thrown when service type is not recognized
     * @param serviceType The unrecognized service type
     */
    error UnknownServiceType(bytes32 serviceType);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when a service center authorization is checked
     * @param serviceCenter The service center address
     * @param serviceType The service type checked
     * @param authorized Whether the center was authorized
     */
    event ServiceCenterValidated(
        address indexed serviceCenter,
        bytes32 indexed serviceType,
        bool authorized
    );

    /**
     * @notice Emitted when an MRO transfer is validated and approved
     * @param from The token owner address
     * @param serviceCenter The authorized service center
     * @param serviceType The service type being performed
     * @param validatedAt The timestamp of validation
     */
    event MROTransferValidated(
        address indexed from,
        address indexed serviceCenter,
        bytes32 indexed serviceType,
        uint256 validatedAt
    );

    /**
     * @notice Emitted when the service center claim topic is updated
     * @param oldTopic The previous claim topic
     * @param newTopic The new claim topic
     * @param updatedBy The address that made the update
     */
    event ServiceCenterClaimTopicUpdated(
        uint256 indexed oldTopic,
        uint256 indexed newTopic,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when service type requirements are updated
     * @param serviceType The service type that was updated
     * @param required Whether this service type now requires authorization
     * @param updatedBy The address that made the update
     */
    event ServiceTypeRequirementUpdated(
        bytes32 indexed serviceType,
        bool required,
        address indexed updatedBy
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHORIZATION VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if an address is an authorized service center (any service type)
     * @dev Queries identity registry for SERVICE_CENTER claim and verifies:
     *      1. Claim exists and is not expired
     *      2. Claim was issued by a trusted issuer
     *      3. Claim authorizes this brand (if brand-specific)
     *
     * @param _address The address to check for service center authorization
     * @return True if address holds valid service center claim
     */
    function isAuthorizedServiceCenter(address _address) external view returns (bool);

    /**
     * @notice Check if an address is authorized for a specific service type
     * @dev Performs more granular check to verify the service center is
     *      authorized to perform a specific type of service.
     *
     *      Service type checking requires parsing the claim data to verify
     *      the service type is included in authorized services.
     *
     * @param _address The address to check
     * @param _serviceType The service type (use SERVICE_TYPE_* constants)
     * @return True if address is authorized for the specified service type
     */
    function isAuthorizedForServiceType(
        address _address,
        bytes32 _serviceType
    ) external view returns (bool);

    /**
     * @notice Get detailed authorization information for a service center
     * @dev Provides full authorization details for display and verification
     *
     * @param _address The service center address
     * @return authorized Whether the address is an authorized service center
     * @return expiresAt When the authorization expires (0 if not authorized)
     * @return authorizedServices Array of authorized service types
     * @return certifications Array of technician/facility certifications
     */
    function getServiceCenterDetails(address _address) external view returns (
        bool authorized,
        uint256 expiresAt,
        bytes32[] memory authorizedServices,
        string[] memory certifications
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // MRO TRANSFER VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validate a Maintenance, Repair, or Overhaul transfer
     * @dev Comprehensive check for MRO transfers that validates:
     *      1. Service center is authorized
     *      2. Service center is authorized for the specific service type
     *      3. Authorization is not expired
     *      4. Transfer direction is valid (owner -> service center)
     *
     *      This function is typically called before allowing a token transfer
     *      to a service center address.
     *
     * @param _from The token owner initiating the service request
     * @param _serviceCenter The service center that will receive the token
     * @param _serviceType The type of service being requested
     * @return True if the MRO transfer is authorized
     */
    function validateMROTransfer(
        address _from,
        address _serviceCenter,
        bytes32 _serviceType
    ) external view returns (bool);

    /**
     * @notice Validate MRO transfer with detailed result
     * @dev Provides failure reason for debugging and UX
     *
     * @param _from The token owner
     * @param _serviceCenter The service center
     * @param _serviceType The service type
     * @return valid Whether the MRO transfer is authorized
     * @return reason Human-readable reason if not valid
     * @return expiresAt When service center authorization expires
     */
    function validateMROTransferWithReason(
        address _from,
        address _serviceCenter,
        bytes32 _serviceType
    ) external view returns (bool valid, string memory reason, uint256 expiresAt);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the claim topic used for service center verification
     * @dev Defaults to GalileoClaimTopics.SERVICE_CENTER
     * @return The claim topic ID (uint256)
     */
    function serviceCenterClaimTopic() external view returns (uint256);

    /**
     * @notice Set the claim topic used for service center verification
     * @dev Access Control: Restricted to module admin/owner
     * @param _claimTopic The new claim topic to use
     */
    function setServiceCenterClaimTopic(uint256 _claimTopic) external;

    /**
     * @notice Check if a specific service type requires authorization
     * @dev Some service types may be configured as optional authorization
     * @param _serviceType The service type to check
     * @return True if authorization is required for this service type
     */
    function isServiceTypeRequired(bytes32 _serviceType) external view returns (bool);

    /**
     * @notice Set whether a service type requires authorization
     * @dev Access Control: Restricted to module admin/owner
     * @param _serviceType The service type to configure
     * @param _required Whether authorization is required
     */
    function setServiceTypeRequired(bytes32 _serviceType, bool _required) external;

    /**
     * @notice Get all service types that require authorization
     * @return Array of service type identifiers that require authorization
     */
    function getRequiredServiceTypes() external view returns (bytes32[] memory);

    /**
     * @notice Get the identity registry used for claim verification
     * @return Address of the IGalileoIdentityRegistry
     */
    function identityRegistry() external view returns (address);

    /**
     * @notice Get the brand DID this module is configured for (if brand-specific)
     * @dev Returns empty string if module is not brand-specific
     * @return The brand DID string
     */
    function brandDID() external view returns (string memory);
}
