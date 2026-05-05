// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {JurisdictionModule} from "../../../src/compliance/modules/JurisdictionModule.sol";
import {IJurisdictionModule, CountryGroups} from "../../../src/interfaces/compliance/modules/IJurisdictionModule.sol";
import {ModuleTypes} from "../../../src/interfaces/compliance/IComplianceModule.sol";

contract JurisdictionModuleTest is Test {
    // ─── Events ───────────────────────────────────────────────────────
    event JurisdictionModeChanged(IJurisdictionModule.JurisdictionMode oldMode, IJurisdictionModule.JurisdictionMode newMode);
    event CountryAdded(uint16 indexed country);
    event CountryRemoved(uint16 indexed country);
    event CountriesAdded(uint16[] countries, uint256 count);
    event CountriesRemoved(uint16[] countries, uint256 count);
    event CountryGroupAdded(bytes32 indexed groupId);
    event CountryGroupRemoved(bytes32 indexed groupId);
    event IdentityRegistryUpdated(address oldRegistry, address newRegistry);

    // ─── Fixtures ─────────────────────────────────────────────────────
    JurisdictionModule internal module;

    address internal admin      = makeAddr("admin");
    address internal stranger   = makeAddr("stranger");
    address internal registry   = makeAddr("registry");
    address internal compliance = makeAddr("compliance");
    address internal alice      = makeAddr("alice");
    address internal bob        = makeAddr("bob");

    // ISO 3166-1 numeric codes
    uint16 internal constant FRANCE      = 250;
    uint16 internal constant GERMANY     = 276;
    uint16 internal constant NORTH_KOREA = 408;
    uint16 internal constant US          = 840;

    bytes4 internal investorCountrySel = bytes4(keccak256("investorCountry(address)"));

    function setUp() public {
        // Start in RESTRICT mode (blacklist)
        module = new JurisdictionModule(admin, registry, IJurisdictionModule.JurisdictionMode.RESTRICT);
        vm.prank(compliance);
        module.bindCompliance(compliance);
    }

    // ─── Helpers ──────────────────────────────────────────────────────
    function _mockCountry(address addr, uint16 country) internal {
        vm.mockCall(registry, abi.encodeWithSelector(investorCountrySel, addr), abi.encode(country));
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════════

    function test_deploy_setsOwner() public view {
        assertEq(module.owner(), admin);
    }

    function test_deploy_setsIdentityRegistry() public view {
        assertEq(module.identityRegistry(), registry);
    }

    function test_deploy_setsMode() public view {
        assertEq(uint8(module.jurisdictionMode()), uint8(IJurisdictionModule.JurisdictionMode.RESTRICT));
    }

    function test_deploy_moduleType() public view {
        assertEq(module.moduleType(), ModuleTypes.JURISDICTION);
    }

    function test_deploy_moduleName() public view {
        assertEq(module.name(), "Jurisdiction Module");
    }

    function test_deploy_revertsOnZeroAdmin() public {
        vm.expectRevert();
        new JurisdictionModule(address(0), registry, IJurisdictionModule.JurisdictionMode.RESTRICT);
    }

    // ═══════════════════════════════════════════════════════════════════
    // JURISDICTION MODE
    // ═══════════════════════════════════════════════════════════════════

    function test_setJurisdictionMode_success() public {
        vm.expectEmit(false, false, false, true);
        emit JurisdictionModeChanged(
            IJurisdictionModule.JurisdictionMode.RESTRICT,
            IJurisdictionModule.JurisdictionMode.ALLOW
        );
        vm.prank(admin);
        module.setJurisdictionMode(IJurisdictionModule.JurisdictionMode.ALLOW);
        assertEq(uint8(module.jurisdictionMode()), uint8(IJurisdictionModule.JurisdictionMode.ALLOW));
    }

    function test_setJurisdictionMode_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.setJurisdictionMode(IJurisdictionModule.JurisdictionMode.ALLOW);
    }

    // ═══════════════════════════════════════════════════════════════════
    // INDIVIDUAL COUNTRIES
    // ═══════════════════════════════════════════════════════════════════

    function test_addCountry_success() public {
        vm.expectEmit(true, false, false, false);
        emit CountryAdded(NORTH_KOREA);
        vm.prank(admin);
        module.addCountry(NORTH_KOREA);
        assertTrue(module.isCountryListed(NORTH_KOREA));
        assertEq(module.countryCount(), 1);
    }

    function test_addCountry_revertsOnZero() public {
        vm.prank(admin);
        vm.expectRevert();
        module.addCountry(0);
    }

    function test_addCountry_revertsOnOver999() public {
        vm.prank(admin);
        vm.expectRevert();
        module.addCountry(1000);
    }

    function test_addCountry_revertsIfDuplicate() public {
        vm.prank(admin);
        module.addCountry(FRANCE);
        vm.prank(admin);
        vm.expectRevert();
        module.addCountry(FRANCE);
    }

    function test_addCountry_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.addCountry(FRANCE);
    }

    function test_removeCountry_success() public {
        vm.prank(admin);
        module.addCountry(FRANCE);
        vm.expectEmit(true, false, false, false);
        emit CountryRemoved(FRANCE);
        vm.prank(admin);
        module.removeCountry(FRANCE);
        assertFalse(module.isCountryListed(FRANCE));
        assertEq(module.countryCount(), 0);
    }

    function test_removeCountry_revertsIfNotListed() public {
        vm.prank(admin);
        vm.expectRevert();
        module.removeCountry(FRANCE);
    }

    function test_addCountries_batch() public {
        uint16[] memory countries = new uint16[](2);
        countries[0] = FRANCE;
        countries[1] = GERMANY;
        vm.prank(admin);
        module.addCountries(countries);
        assertTrue(module.isCountryListed(FRANCE));
        assertTrue(module.isCountryListed(GERMANY));
        assertEq(module.countryCount(), 2);
    }

    function test_addCountries_skipsExisting() public {
        vm.prank(admin);
        module.addCountry(FRANCE);
        uint16[] memory countries = new uint16[](2);
        countries[0] = FRANCE; // already exists
        countries[1] = GERMANY;
        vm.prank(admin);
        module.addCountries(countries);
        assertEq(module.countryCount(), 2); // not 3
    }

    function test_removeCountries_batch() public {
        vm.prank(admin);
        module.addCountry(FRANCE);
        vm.prank(admin);
        module.addCountry(GERMANY);
        uint16[] memory countries = new uint16[](2);
        countries[0] = FRANCE;
        countries[1] = GERMANY;
        vm.prank(admin);
        module.removeCountries(countries);
        assertEq(module.countryCount(), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CHECK — RESTRICT MODE
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleCheck_restrictMode_unlistedCountryPasses() public {
        _mockCountry(bob, FRANCE);
        // FRANCE not listed in restrict mode → allowed
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_restrictMode_listedCountryBlocked() public {
        vm.prank(admin);
        module.addCountry(NORTH_KOREA);
        _mockCountry(bob, NORTH_KOREA);
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_restrictMode_noRegistry_passes() public {
        vm.prank(admin);
        module.setIdentityRegistry(address(0));
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertTrue(ok);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODULE CHECK — ALLOW MODE
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleCheck_allowMode_listedCountryPasses() public {
        vm.prank(admin);
        module.setJurisdictionMode(IJurisdictionModule.JurisdictionMode.ALLOW);
        vm.prank(admin);
        module.addCountry(FRANCE);
        _mockCountry(bob, FRANCE);
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertTrue(ok);
    }

    function test_moduleCheck_allowMode_unlistedCountryBlocked() public {
        vm.prank(admin);
        module.setJurisdictionMode(IJurisdictionModule.JurisdictionMode.ALLOW);
        vm.prank(admin);
        module.addCountry(FRANCE);
        _mockCountry(bob, US); // US not in list
        bool ok = module.moduleCheck(alice, bob, 1, compliance);
        assertFalse(ok);
    }

    function test_moduleCheck_burn_alwaysPasses() public {
        bool ok = module.moduleCheck(alice, address(0), 1, compliance);
        assertTrue(ok);
    }

    // ═══════════════════════════════════════════════════════════════════
    // COUNTRY GROUPS
    // ═══════════════════════════════════════════════════════════════════

    function test_addCountryGroup_OFAC() public {
        vm.expectEmit(true, false, false, false);
        emit CountryGroupAdded(CountryGroups.OFAC_SANCTIONED);
        vm.prank(admin);
        module.addCountryGroup(CountryGroups.OFAC_SANCTIONED);
        assertTrue(module.isCountryGroupActive(CountryGroups.OFAC_SANCTIONED));
        // OFAC has 4 countries: 408, 364, 192, 760
        assertEq(module.countryCount(), 4);
        assertTrue(module.isCountryListed(NORTH_KOREA));
    }

    function test_addCountryGroup_revertsIfInvalidGroup() public {
        vm.prank(admin);
        vm.expectRevert();
        module.addCountryGroup(keccak256("UNKNOWN_GROUP"));
    }

    function test_addCountryGroup_revertsIfAlreadyActive() public {
        vm.prank(admin);
        module.addCountryGroup(CountryGroups.OFAC_SANCTIONED);
        vm.prank(admin);
        vm.expectRevert();
        module.addCountryGroup(CountryGroups.OFAC_SANCTIONED);
    }

    function test_removeCountryGroup_success() public {
        vm.prank(admin);
        module.addCountryGroup(CountryGroups.OFAC_SANCTIONED);
        vm.expectEmit(true, false, false, false);
        emit CountryGroupRemoved(CountryGroups.OFAC_SANCTIONED);
        vm.prank(admin);
        module.removeCountryGroup(CountryGroups.OFAC_SANCTIONED);
        assertFalse(module.isCountryGroupActive(CountryGroups.OFAC_SANCTIONED));
    }

    function test_removeCountryGroup_revertsIfNotActive() public {
        vm.prank(admin);
        vm.expectRevert();
        module.removeCountryGroup(CountryGroups.OFAC_SANCTIONED);
    }

    function test_getActiveCountryGroups() public {
        vm.prank(admin);
        module.addCountryGroup(CountryGroups.OFAC_SANCTIONED);
        vm.prank(admin);
        module.addCountryGroup(CountryGroups.EU_SANCTIONED);
        bytes32[] memory groups = module.getActiveCountryGroups();
        assertEq(groups.length, 2);
    }

    // ═══════════════════════════════════════════════════════════════════
    // IDENTITY REGISTRY
    // ═══════════════════════════════════════════════════════════════════

    function test_setIdentityRegistry_success() public {
        address newReg = makeAddr("newReg");
        vm.expectEmit(false, false, false, true);
        emit IdentityRegistryUpdated(registry, newReg);
        vm.prank(admin);
        module.setIdentityRegistry(newReg);
        assertEq(module.identityRegistry(), newReg);
    }

    function test_getCountryOfAddress() public {
        _mockCountry(alice, FRANCE);
        assertEq(module.getCountryOfAddress(alice), FRANCE);
    }

    function test_isAddressAllowed_restrictMode_notListed() public {
        _mockCountry(alice, FRANCE);
        assertTrue(module.isAddressAllowed(alice)); // FRANCE not listed in RESTRICT mode → allowed
    }

    function test_isAddressAllowed_restrictMode_listed() public {
        vm.prank(admin);
        module.addCountry(NORTH_KOREA);
        _mockCountry(alice, NORTH_KOREA);
        assertFalse(module.isAddressAllowed(alice));
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE HOOKS
    // ═══════════════════════════════════════════════════════════════════

    function test_moduleTransferAction_onlyBoundCompliance() public {
        vm.prank(compliance);
        module.moduleTransferAction(alice, bob, 1, compliance);
    }

    function test_moduleTransferAction_revertsIfNotBound() public {
        vm.prank(stranger);
        vm.expectRevert();
        module.moduleTransferAction(alice, bob, 1, compliance);
    }
}
