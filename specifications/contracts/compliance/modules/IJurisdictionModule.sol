// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "../IComplianceModule.sol";

/**
 * @title IJurisdictionModule
 * @author Galileo Protocol Contributors
 * @notice Compliance module for country-based transfer restrictions
 * @dev This module implements geographic restrictions for token transfers based on
 *      ISO 3166-1 numeric country codes stored in the Identity Registry.
 *
 *      **Two Operational Modes:**
 *
 *      1. **Allow Mode (Whitelist):**
 *         Only addresses registered in listed countries can receive transfers.
 *         Use case: Territory-limited product launches, regional exclusives.
 *
 *      2. **Restrict Mode (Blacklist):**
 *         Addresses registered in listed countries cannot receive transfers.
 *         Use case: Export control compliance, sanctions enforcement.
 *
 *      **Country Code Source:**
 *      Country codes are retrieved from the bound Identity Registry via
 *      `investorCountry(address)`. Each registered identity has an associated
 *      ISO 3166-1 numeric code (uint16).
 *
 *      **Country Groups:**
 *      For convenience, predefined country groups can be added/removed atomically.
 *      Groups include OFAC_SANCTIONED, EU_SANCTIONED, FATF_GREYLIST, etc.
 *      Group membership is managed by the consortium TSC.
 *
 *      **Integration Example:**
 *      ```solidity
 *      // Configure for sanctions compliance
 *      jurisdictionModule.setJurisdictionMode(JurisdictionMode.RESTRICT);
 *      jurisdictionModule.addCountryGroup(CountryGroups.OFAC_SANCTIONED);
 *      jurisdictionModule.addCountryGroup(CountryGroups.EU_SANCTIONED);
 *      ```
 *
 * Reference: ERC-3643 CountryAllowModule / CountryRestrictModule patterns
 * Specification: GSPEC-JURISDICTION-001
 * @custom:security-contact security@galileoprotocol.io
 */
interface IJurisdictionModule is IComplianceModule {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Jurisdiction restriction mode
     * @dev Determines how the country list is interpreted:
     *      - ALLOW: Countries in list CAN receive transfers (whitelist)
     *      - RESTRICT: Countries in list CANNOT receive transfers (blacklist)
     */
    enum JurisdictionMode {
        ALLOW,      // Whitelist: only listed countries allowed
        RESTRICT    // Blacklist: listed countries blocked
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Thrown when country code is invalid
     * @dev Valid ISO 3166-1 numeric codes are 1-999
     * @param country The invalid country code
     */
    error InvalidCountryCode(uint16 country);

    /**
     * @notice Thrown when attempting to add a country already in the list
     * @param country The country code that already exists
     */
    error CountryAlreadyListed(uint16 country);

    /**
     * @notice Thrown when attempting to remove a country not in the list
     * @param country The country code that was not found
     */
    error CountryNotListed(uint16 country);

    /**
     * @notice Thrown when receiver's country is not allowed for transfer
     * @dev In ALLOW mode: country not in list. In RESTRICT mode: country in list.
     * @param country The blocked country code
     */
    error CountryNotAllowed(uint16 country);

    /**
     * @notice Thrown when identity registry returns no country for an address
     * @param account The address with no country code
     */
    error CountryNotFound(address account);

    /**
     * @notice Thrown when country group is not recognized
     * @param groupId The unrecognized group identifier
     */
    error InvalidCountryGroup(bytes32 groupId);

    /**
     * @notice Thrown when country group is already active
     * @param groupId The group that is already active
     */
    error CountryGroupAlreadyActive(bytes32 groupId);

    /**
     * @notice Thrown when country group is not active
     * @param groupId The group that is not active
     */
    error CountryGroupNotActive(bytes32 groupId);

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Emitted when jurisdiction mode changes
     * @param oldMode Previous restriction mode
     * @param newMode New restriction mode
     */
    event JurisdictionModeChanged(JurisdictionMode oldMode, JurisdictionMode newMode);

    /**
     * @notice Emitted when a country is added to the list
     * @param country ISO 3166-1 numeric country code
     */
    event CountryAdded(uint16 indexed country);

    /**
     * @notice Emitted when a country is removed from the list
     * @param country ISO 3166-1 numeric country code
     */
    event CountryRemoved(uint16 indexed country);

    /**
     * @notice Emitted when multiple countries are added in batch
     * @param countries Array of ISO 3166-1 country codes
     * @param count Number of countries added
     */
    event CountriesAdded(uint16[] countries, uint256 count);

    /**
     * @notice Emitted when multiple countries are removed in batch
     * @param countries Array of ISO 3166-1 country codes
     * @param count Number of countries removed
     */
    event CountriesRemoved(uint16[] countries, uint256 count);

    /**
     * @notice Emitted when a country group is activated
     * @param groupId The group identifier (keccak256 hash of group name)
     */
    event CountryGroupAdded(bytes32 indexed groupId);

    /**
     * @notice Emitted when a country group is deactivated
     * @param groupId The group identifier
     */
    event CountryGroupRemoved(bytes32 indexed groupId);

    /**
     * @notice Emitted when transfer is blocked due to jurisdiction
     * @param from The sender address
     * @param to The receiver address
     * @param country The receiver's country code that caused the block
     */
    event TransferBlockedJurisdiction(
        address indexed from,
        address indexed to,
        uint16 indexed country
    );

    /**
     * @notice Emitted when identity registry is updated
     * @param oldRegistry Previous identity registry address
     * @param newRegistry New identity registry address
     */
    event IdentityRegistryUpdated(address oldRegistry, address newRegistry);

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - MODE AND STATUS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the current jurisdiction mode
     * @dev ALLOW = whitelist (only listed countries allowed)
     *      RESTRICT = blacklist (listed countries blocked)
     * @return The active mode (ALLOW or RESTRICT)
     */
    function jurisdictionMode() external view returns (JurisdictionMode);

    /**
     * @notice Check if a country is in the country list
     * @dev Returns true if the country code exists in the list,
     *      regardless of whether mode is ALLOW or RESTRICT.
     * @param _country ISO 3166-1 numeric country code
     * @return True if country is in the list
     */
    function isCountryListed(uint16 _country) external view returns (bool);

    /**
     * @notice Check if a transfer to a country is allowed
     * @dev Evaluates based on current mode:
     *      - ALLOW mode: returns true if country IS in list
     *      - RESTRICT mode: returns true if country is NOT in list
     * @param _country ISO 3166-1 numeric country code
     * @return True if transfer to this country is allowed
     */
    function isCountryAllowed(uint16 _country) external view returns (bool);

    /**
     * @notice Get all countries in the list
     * @dev Returns the complete list of country codes currently configured.
     *      Interpretation depends on jurisdiction mode.
     * @return Array of ISO 3166-1 country codes
     */
    function getCountryList() external view returns (uint16[] memory);

    /**
     * @notice Get the number of countries in the list
     * @return Number of countries configured
     */
    function countryCount() external view returns (uint256);

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - COUNTRY GROUPS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if a country group is currently active
     * @dev Active groups have their countries included in the country list.
     * @param _groupId The group identifier (from CountryGroups library)
     * @return True if the group is active
     */
    function isCountryGroupActive(bytes32 _groupId) external view returns (bool);

    /**
     * @notice Get all active country groups
     * @return Array of active group identifiers
     */
    function getActiveCountryGroups() external view returns (bytes32[] memory);

    /**
     * @notice Get countries in a specific group
     * @dev Returns the current member countries of the group.
     *      Group membership may change over time (e.g., sanctions updates).
     * @param _groupId The group identifier
     * @return Array of country codes in the group
     */
    function getCountryGroupMembers(bytes32 _groupId) external view returns (uint16[] memory);

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - IDENTITY REGISTRY INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get the configured identity registry
     * @dev The identity registry provides country codes for addresses
     *      via the investorCountry(address) function.
     * @return Address of the identity registry contract
     */
    function identityRegistry() external view returns (address);

    /**
     * @notice Get country code for an address from identity registry
     * @dev Queries the identity registry for the address's country code.
     *      Returns 0 if address is not registered.
     * @param _address The address to lookup
     * @return Country code (0 if not found)
     */
    function getCountryOfAddress(address _address) external view returns (uint16);

    /**
     * @notice Check if an address is allowed based on their country
     * @dev Convenience function that combines country lookup and check.
     *      Equivalent to: isCountryAllowed(getCountryOfAddress(_address))
     * @param _address The address to check
     * @return True if address's country is allowed for transfers
     */
    function isAddressAllowed(address _address) external view returns (bool);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS - MODE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the jurisdiction mode
     * @dev Changing mode affects how the country list is interpreted:
     *      - ALLOW: Only listed countries can receive transfers
     *      - RESTRICT: Listed countries cannot receive transfers
     *
     *      WARNING: Changing mode inverts the meaning of the country list.
     *      Ensure the list is appropriate for the new mode before changing.
     *
     *      Emits: JurisdictionModeChanged
     *
     * @param _mode The mode to set (ALLOW or RESTRICT)
     */
    function setJurisdictionMode(JurisdictionMode _mode) external;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS - INDIVIDUAL COUNTRIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Add a country to the list
     * @dev In ALLOW mode: enables transfers to this country
     *      In RESTRICT mode: blocks transfers to this country
     *
     *      Emits: CountryAdded
     *
     * @param _country ISO 3166-1 numeric country code (1-999)
     *
     * @custom:throws InvalidCountryCode If _country is 0 or > 999
     * @custom:throws CountryAlreadyListed If country already in list
     */
    function addCountry(uint16 _country) external;

    /**
     * @notice Remove a country from the list
     * @dev In ALLOW mode: blocks transfers to this country
     *      In RESTRICT mode: enables transfers to this country
     *
     *      Emits: CountryRemoved
     *
     * @param _country ISO 3166-1 numeric country code
     *
     * @custom:throws CountryNotListed If country not in list
     */
    function removeCountry(uint16 _country) external;

    /**
     * @notice Batch add countries to the list
     * @dev Gas-efficient way to add multiple countries.
     *      Skips countries already in list (no revert).
     *
     *      Emits: CountriesAdded with actual count added
     *
     * @param _countries Array of ISO 3166-1 country codes
     */
    function addCountries(uint16[] calldata _countries) external;

    /**
     * @notice Batch remove countries from the list
     * @dev Gas-efficient way to remove multiple countries.
     *      Skips countries not in list (no revert).
     *
     *      Emits: CountriesRemoved with actual count removed
     *
     * @param _countries Array of ISO 3166-1 country codes
     */
    function removeCountries(uint16[] calldata _countries) external;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS - COUNTRY GROUPS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Activate a predefined country group
     * @dev Adds all countries in the group to the list.
     *      Group definitions are maintained by the consortium.
     *
     *      Standard groups (see CountryGroups library):
     *      - OFAC_SANCTIONED: Countries under US comprehensive sanctions
     *      - EU_SANCTIONED: Countries under EU sanctions
     *      - FATF_GREYLIST: FATF grey list countries
     *      - OECD_MEMBERS: OECD member countries
     *      - EU_MEMBERS: European Union member states
     *      - APAC_DEVELOPED: Developed APAC markets
     *
     *      Emits: CountryGroupAdded
     *
     * @param _groupId The group identifier (e.g., CountryGroups.OFAC_SANCTIONED)
     *
     * @custom:throws InvalidCountryGroup If group is not recognized
     * @custom:throws CountryGroupAlreadyActive If group is already active
     */
    function addCountryGroup(bytes32 _groupId) external;

    /**
     * @notice Deactivate a country group
     * @dev Removes all countries in the group from the list.
     *      Individual country additions are not affected.
     *
     *      Emits: CountryGroupRemoved
     *
     * @param _groupId The group identifier
     *
     * @custom:throws CountryGroupNotActive If group is not active
     */
    function removeCountryGroup(bytes32 _groupId) external;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS - IDENTITY REGISTRY
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the identity registry for country lookups
     * @dev The identity registry must implement investorCountry(address).
     *      Typically an IGalileoIdentityRegistry contract.
     *
     *      Emits: IdentityRegistryUpdated
     *
     * @param _identityRegistry Address of the identity registry contract
     */
    function setIdentityRegistry(address _identityRegistry) external;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTRY GROUP CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title CountryGroups
 * @author Galileo Protocol Contributors
 * @notice Library of predefined country group identifiers
 * @dev Country groups provide convenient management of sets of countries.
 *      Groups are identified by keccak256 hash of their name.
 *
 *      Group membership is maintained by the consortium TSC and may be
 *      updated to reflect changes in sanctions regimes, political unions, etc.
 *
 *      Usage:
 *      ```solidity
 *      jurisdictionModule.addCountryGroup(CountryGroups.OFAC_SANCTIONED);
 *      ```
 */
library CountryGroups {
    // ═══════════════════════════════════════════════════════════════════════════
    // SANCTIONS GROUPS (Managed by TSC, updated on regulatory changes)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Countries under comprehensive OFAC sanctions
     * @dev Current members (as of specification date):
     *      - 408 (North Korea)
     *      - 364 (Iran)
     *      - 192 (Cuba)
     *      - 760 (Syria)
     *
     *      Updated based on US Treasury OFAC announcements.
     */
    bytes32 public constant OFAC_SANCTIONED = keccak256("OFAC_SANCTIONED");

    /**
     * @notice Countries under EU comprehensive sanctions
     * @dev Includes countries with EU-wide restrictive measures.
     *      Updated based on European Commission announcements.
     */
    bytes32 public constant EU_SANCTIONED = keccak256("EU_SANCTIONED");

    /**
     * @notice FATF grey list countries
     * @dev Countries under increased monitoring by the Financial Action Task Force.
     *      Transfers to these countries may require enhanced due diligence.
     *      List updated after each FATF plenary (February, June, October).
     */
    bytes32 public constant FATF_GREYLIST = keccak256("FATF_GREYLIST");

    /**
     * @notice FATF black list countries
     * @dev High-risk jurisdictions subject to call for action by FATF.
     *      Strictest AML/CFT requirements apply.
     */
    bytes32 public constant FATF_BLACKLIST = keccak256("FATF_BLACKLIST");

    // ═══════════════════════════════════════════════════════════════════════════
    // REGIONAL GROUPS (Generally static, updated on political changes)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice OECD member countries
     * @dev 38 member countries of the Organisation for Economic Co-operation
     *      and Development. Typically used for ALLOW mode configurations.
     */
    bytes32 public constant OECD_MEMBERS = keccak256("OECD_MEMBERS");

    /**
     * @notice European Union member states
     * @dev 27 EU member states (post-Brexit).
     *      Single market - typically no intra-EU restrictions.
     */
    bytes32 public constant EU_MEMBERS = keccak256("EU_MEMBERS");

    /**
     * @notice European Economic Area countries
     * @dev EU members plus Norway, Iceland, Liechtenstein.
     */
    bytes32 public constant EEA_MEMBERS = keccak256("EEA_MEMBERS");

    /**
     * @notice Developed APAC markets
     * @dev Major developed markets in Asia-Pacific:
     *      - 392 (Japan)
     *      - 410 (South Korea)
     *      - 702 (Singapore)
     *      - 344 (Hong Kong)
     *      - 158 (Taiwan)
     *      - 036 (Australia)
     *      - 554 (New Zealand)
     */
    bytes32 public constant APAC_DEVELOPED = keccak256("APAC_DEVELOPED");

    /**
     * @notice Gulf Cooperation Council countries
     * @dev GCC member states:
     *      - 784 (UAE)
     *      - 682 (Saudi Arabia)
     *      - 634 (Qatar)
     *      - 414 (Kuwait)
     *      - 048 (Bahrain)
     *      - 512 (Oman)
     */
    bytes32 public constant GCC = keccak256("GCC");

    // ═══════════════════════════════════════════════════════════════════════════
    // MARKET TIER GROUPS (For commercial territory management)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Tier 1 luxury markets
     * @dev Primary luxury goods markets by revenue:
     *      US, China, Japan, UK, France, Germany, Italy, Switzerland, UAE
     */
    bytes32 public constant LUXURY_TIER1 = keccak256("LUXURY_TIER1");

    /**
     * @notice Tier 2 luxury markets
     * @dev Secondary luxury markets with significant but smaller revenue
     */
    bytes32 public constant LUXURY_TIER2 = keccak256("LUXURY_TIER2");

    /**
     * @notice Emerging luxury markets
     * @dev Growing luxury markets with expansion potential
     */
    bytes32 public constant LUXURY_EMERGING = keccak256("LUXURY_EMERGING");
}
