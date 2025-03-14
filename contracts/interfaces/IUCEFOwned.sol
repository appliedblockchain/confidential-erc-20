// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";

/**
 * @title IUCEFOwned
 * @dev Interface for the UCEFOwned contract, defining the owner-based authorization model
 * for UCEF token balance viewing. In this model, only the account owner can view their own balance.
 *
 * This interface represents the strictest privacy model where each user can only
 * see their own balance and no one else's.
 *
 * Security considerations:
 * - Each account can only be accessed by its owner
 * - Unauthorized access attempts will revert with UCEFUnauthorizedBalanceAccess
 * - No administrative override is possible
 */
interface IUCEFOwned is IUCEF {
    // No additional functions or errors needed - the base IUCEF interface
    // already includes the UCEFUnauthorizedBalanceAccess error
} 