// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title IModularCompliance (Re-exported from ERC-3643)
 * @author Galileo Protocol Contributors
 * @notice Re-exports the ERC-3643 IModularCompliance interface with comprehensive documentation
 * @dev This file serves as the canonical import point for the modular compliance interface
 *      within the Galileo ecosystem. It re-exports the upstream ERC-3643 interface while
 *      providing additional documentation specific to luxury goods compliance.
 *
 *      The modular compliance pattern enables:
 *      - **Dynamic Rule Configuration**: Add/remove compliance modules without redeploying tokens
 *      - **Composable Compliance**: Stack multiple compliance rules (jurisdiction, brand, etc.)
 *      - **Upgrade Flexibility**: Update individual rules without affecting others
 *      - **Multi-Brand Support**: Different tokens can share or customize module sets
 *
 *      Architecture:
 *      ```
 *      Token Contract
 *           |
 *           v
 *      ModularCompliance (aggregator)
 *           |
 *           +-- Module A (jurisdiction check)
 *           +-- Module B (balance limits)
 *           +-- Module C (brand authorization)
 *           +-- Module D (time locks)
 *      ```
 *
 *      Transfer Flow:
 *      1. Token calls compliance.canTransfer(from, to, amount)
 *      2. Compliance iterates through all bound modules
 *      3. Each module.moduleCheck() is called
 *      4. If ALL modules return true, transfer is allowed
 *      5. After transfer, compliance.transferred() notifies all modules
 *
 * Reference: ERC-3643 T-REX v4.1.3
 * @custom:security-contact security@galileoprotocol.io
 */

import {IModularCompliance} from "@erc3643org/erc-3643/contracts/compliance/IModularCompliance.sol";

/**
 * @dev Key functions inherited from IModularCompliance:
 *
 * Token Binding:
 * - bindToken(address _token) - Binds a token to this compliance contract
 * - unbindToken(address _token) - Unbinds a token from this compliance contract
 *
 * Module Management:
 * - addModule(address _module) - Adds a compliance module
 * - removeModule(address _module) - Removes a compliance module
 * - getModules() returns (address[] memory) - Returns list of bound modules
 *
 * Compliance Checks:
 * - canTransfer(address _from, address _to, uint256 _amount) returns (bool)
 *   Checks if transfer is compliant with ALL bound modules
 *
 * Lifecycle Notifications:
 * - transferred(address _from, address _to, uint256 _amount)
 *   Called by token after successful transfer
 * - created(address _to, uint256 _amount)
 *   Called by token after minting tokens
 * - destroyed(address _from, uint256 _amount)
 *   Called by token after burning tokens
 *
 * Events:
 * - ModuleAdded(address indexed _module)
 * - ModuleRemoved(address indexed _module)
 * - TokenBound(address indexed _token)
 * - TokenUnbound(address indexed _token)
 */
