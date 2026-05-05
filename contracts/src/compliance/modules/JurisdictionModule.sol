// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {IJurisdictionModule, CountryGroups} from "../../interfaces/compliance/modules/IJurisdictionModule.sol";
import {IComplianceModule, ModuleTypes} from "../../interfaces/compliance/IComplianceModule.sol";
import {BaseComplianceModule} from "./BaseComplianceModule.sol";

interface IJurisdictionRegistryMin {
    function investorCountry(address _userAddress) external view returns (uint16);
}

/**
 * @title JurisdictionModule
 * @author Galileo Protocol Contributors
 * @notice Country-based transfer restriction compliance module
 * @dev Supports ALLOW (whitelist) and RESTRICT (blacklist) modes using ISO 3166-1
 *      numeric country codes retrieved from the identity registry. Also supports
 *      predefined country groups (OFAC_SANCTIONED, EU_MEMBERS, etc.).
 */
contract JurisdictionModule is IJurisdictionModule, BaseComplianceModule {

    error ZeroAddress();

    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    JurisdictionMode private _mode;
    address private _identityRegistryAddress;

    /// @dev Country list
    uint16[] private _countryList;
    mapping(uint16 => bool) private _countryListed;
    mapping(uint16 => uint256) private _countryIndex; // 1-based for existence check

    /// @dev Active country groups
    bytes32[] private _activeGroupList;
    mapping(bytes32 => bool) private _activeGroups;

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(address admin_, address identityRegistry_, JurisdictionMode mode_) {
        if (admin_ == address(0)) revert ZeroAddress();
        _transferOwnership(admin_);
        _identityRegistryAddress = identityRegistry_;
        _mode = mode_;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════

    function name() external pure override returns (string memory) {
        return "Jurisdiction Module";
    }

    function version() external pure override returns (string memory) {
        return "1.0.0";
    }

    function moduleType() external pure override returns (bytes4) {
        return ModuleTypes.JURISDICTION;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE COMPLIANCE CHECK
    // ═══════════════════════════════════════════════════════════════════

    function moduleCheck(
        address, // _from — not checked (recipient country is the restriction)
        address _to,
        uint256, // _value
        address  // _compliance
    ) external view override returns (bool) {
        // Burn: always allowed
        if (_to == address(0)) return true;
        if (_identityRegistryAddress == address(0)) return true; // no registry: pass-through

        uint16 country = _getCountry(_to);
        if (country == 0) {
            // Not registered → block in ALLOW mode (unknown country), pass in RESTRICT mode
            return _mode == JurisdictionMode.RESTRICT;
        }
        return _isCountryAllowed(country);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS — MODE AND STATUS
    // ═══════════════════════════════════════════════════════════════════

    function jurisdictionMode() external view override returns (JurisdictionMode) {
        return _mode;
    }

    function isCountryListed(uint16 _country) external view override returns (bool) {
        return _countryListed[_country];
    }

    function isCountryAllowed(uint16 _country) external view override returns (bool) {
        return _isCountryAllowed(_country);
    }

    function getCountryList() external view override returns (uint16[] memory) {
        return _countryList;
    }

    function countryCount() external view override returns (uint256) {
        return _countryList.length;
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS — COUNTRY GROUPS
    // ═══════════════════════════════════════════════════════════════════

    function isCountryGroupActive(bytes32 _groupId) external view override returns (bool) {
        return _activeGroups[_groupId];
    }

    function getActiveCountryGroups() external view override returns (bytes32[] memory) {
        return _activeGroupList;
    }

    function getCountryGroupMembers(bytes32 _groupId) external pure override returns (uint16[] memory) {
        return _getGroupMembers(_groupId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS — IDENTITY REGISTRY INTEGRATION
    // ═══════════════════════════════════════════════════════════════════

    function identityRegistry() external view override returns (address) {
        return _identityRegistryAddress;
    }

    function getCountryOfAddress(address _address) external view override returns (uint16) {
        return _getCountry(_address);
    }

    function isAddressAllowed(address _address) external view override returns (bool) {
        uint16 country = _getCountry(_address);
        if (country == 0) return _mode == JurisdictionMode.RESTRICT;
        return _isCountryAllowed(country);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS — MODE
    // ═══════════════════════════════════════════════════════════════════

    function setJurisdictionMode(JurisdictionMode _newMode) external override onlyOwner {
        JurisdictionMode old = _mode;
        _mode = _newMode;
        emit JurisdictionModeChanged(old, _newMode);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS — INDIVIDUAL COUNTRIES
    // ═══════════════════════════════════════════════════════════════════

    function addCountry(uint16 _country) external override onlyOwner {
        if (_country == 0 || _country > 999) revert InvalidCountryCode(_country);
        if (_countryListed[_country]) revert CountryAlreadyListed(_country);
        _countryList.push(_country);
        _countryListed[_country] = true;
        _countryIndex[_country] = _countryList.length; // 1-based
        emit CountryAdded(_country);
    }

    function removeCountry(uint16 _country) external override onlyOwner {
        if (!_countryListed[_country]) revert CountryNotListed(_country);
        _removeCountryFromList(_country);
        emit CountryRemoved(_country);
    }

    function addCountries(uint16[] calldata _countries) external override onlyOwner {
        uint256 added = 0;
        for (uint256 i = 0; i < _countries.length; i++) {
            uint16 c = _countries[i];
            if (c == 0 || c > 999) continue;
            if (_countryListed[c]) continue;
            _countryList.push(c);
            _countryListed[c] = true;
            _countryIndex[c] = _countryList.length;
            added++;
        }
        emit CountriesAdded(_countries, added);
    }

    function removeCountries(uint16[] calldata _countries) external override onlyOwner {
        uint256 removed = 0;
        for (uint256 i = 0; i < _countries.length; i++) {
            uint16 c = _countries[i];
            if (!_countryListed[c]) continue;
            _removeCountryFromList(c);
            removed++;
        }
        emit CountriesRemoved(_countries, removed);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS — COUNTRY GROUPS
    // ═══════════════════════════════════════════════════════════════════

    function addCountryGroup(bytes32 _groupId) external override onlyOwner {
        uint16[] memory members = _getGroupMembers(_groupId);
        if (members.length == 0) revert InvalidCountryGroup(_groupId);
        if (_activeGroups[_groupId]) revert CountryGroupAlreadyActive(_groupId);

        _activeGroupList.push(_groupId);
        _activeGroups[_groupId] = true;

        for (uint256 i = 0; i < members.length; i++) {
            uint16 c = members[i];
            if (!_countryListed[c]) {
                _countryList.push(c);
                _countryListed[c] = true;
                _countryIndex[c] = _countryList.length;
            }
        }
        emit CountryGroupAdded(_groupId);
    }

    function removeCountryGroup(bytes32 _groupId) external override onlyOwner {
        if (!_activeGroups[_groupId]) revert CountryGroupNotActive(_groupId);

        // Remove group from active list
        uint256 len = _activeGroupList.length;
        for (uint256 i = 0; i < len; i++) {
            if (_activeGroupList[i] == _groupId) {
                _activeGroupList[i] = _activeGroupList[len - 1];
                _activeGroupList.pop();
                break;
            }
        }
        _activeGroups[_groupId] = false;

        // Remove group countries (unless still needed by another active group)
        uint16[] memory members = _getGroupMembers(_groupId);
        for (uint256 i = 0; i < members.length; i++) {
            uint16 c = members[i];
            if (!_countryListed[c]) continue;
            // Check if still needed by another active group
            if (!_countryNeededByActiveGroup(c)) {
                _removeCountryFromList(c);
            }
        }
        emit CountryGroupRemoved(_groupId);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION FUNCTIONS — IDENTITY REGISTRY
    // ═══════════════════════════════════════════════════════════════════

    function setIdentityRegistry(address _registry) external override onlyOwner {
        address old = _identityRegistryAddress;
        _identityRegistryAddress = _registry;
        emit IdentityRegistryUpdated(old, _registry);
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function _isCountryAllowed(uint16 country) internal view returns (bool) {
        if (_mode == JurisdictionMode.ALLOW) {
            return _countryListed[country];
        } else {
            return !_countryListed[country];
        }
    }

    function _getCountry(address _address) internal view returns (uint16) {
        if (_identityRegistryAddress == address(0)) return 0;
        if (_identityRegistryAddress.code.length == 0) return 0;
        try IJurisdictionRegistryMin(_identityRegistryAddress).investorCountry(_address) returns (uint16 c) {
            return c;
        } catch {
            return 0;
        }
    }

    function _removeCountryFromList(uint16 _country) internal {
        uint256 idx = _countryIndex[_country];
        if (idx == 0) return; // not in list
        uint256 lastIdx = _countryList.length;
        if (idx < lastIdx) {
            uint16 last = _countryList[lastIdx - 1];
            _countryList[idx - 1] = last;
            _countryIndex[last] = idx;
        }
        _countryList.pop();
        _countryListed[_country] = false;
        _countryIndex[_country] = 0;
    }

    function _countryNeededByActiveGroup(uint16 country) internal view returns (bool) {
        uint256 len = _activeGroupList.length;
        for (uint256 i = 0; i < len; i++) {
            uint16[] memory members = _getGroupMembers(_activeGroupList[i]);
            for (uint256 j = 0; j < members.length; j++) {
                if (members[j] == country) return true;
            }
        }
        return false;
    }

    /// @dev Returns hardcoded country group members
    function _getGroupMembers(bytes32 groupId) internal pure returns (uint16[] memory members) {
        if (groupId == CountryGroups.OFAC_SANCTIONED) {
            members = new uint16[](4);
            members[0] = 408; // North Korea
            members[1] = 364; // Iran
            members[2] = 192; // Cuba
            members[3] = 760; // Syria
        } else if (groupId == CountryGroups.EU_SANCTIONED) {
            members = new uint16[](1);
            members[0] = 112; // Belarus (example)
        } else if (groupId == CountryGroups.FATF_GREYLIST) {
            members = new uint16[](3);
            members[0] = 586; // Pakistan
            members[1] = 760; // Syria
            members[2] = 887; // Yemen
        } else if (groupId == CountryGroups.FATF_BLACKLIST) {
            members = new uint16[](2);
            members[0] = 364; // Iran
            members[1] = 408; // North Korea
        } else if (groupId == CountryGroups.EU_MEMBERS) {
            // All 27 EU member states (ISO 3166-1 numeric codes)
            members = new uint16[](27);
            members[0]  = 40;  // Austria
            members[1]  = 56;  // Belgium
            members[2]  = 100; // Bulgaria
            members[3]  = 191; // Croatia
            members[4]  = 196; // Cyprus
            members[5]  = 203; // Czech Republic
            members[6]  = 208; // Denmark
            members[7]  = 233; // Estonia
            members[8]  = 246; // Finland
            members[9]  = 250; // France
            members[10] = 276; // Germany
            members[11] = 300; // Greece
            members[12] = 348; // Hungary
            members[13] = 372; // Ireland
            members[14] = 380; // Italy
            members[15] = 428; // Latvia
            members[16] = 440; // Lithuania
            members[17] = 442; // Luxembourg
            members[18] = 470; // Malta
            members[19] = 528; // Netherlands
            members[20] = 616; // Poland
            members[21] = 620; // Portugal
            members[22] = 642; // Romania
            members[23] = 703; // Slovakia
            members[24] = 705; // Slovenia
            members[25] = 724; // Spain
            members[26] = 752; // Sweden
        } else if (groupId == CountryGroups.GCC) {
            members = new uint16[](6);
            members[0] = 784; // UAE
            members[1] = 682; // Saudi Arabia
            members[2] = 634; // Qatar
            members[3] = 414; // Kuwait
            members[4] = 48;  // Bahrain
            members[5] = 512; // Oman
        } else {
            members = new uint16[](0);
        }
    }
}
