// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/extensions/ERC20Permit.sol)

pragma solidity ^0.8.20;

import {UCEF} from "../token/UCEF.sol";

/**
 * @title UCEFOwned
 * @dev Extension for UCEF token that implements a simple owner-based authorization model.
 * In this model, only the account owner can view their own balance.
 *
 * This implementation provides the strictest privacy model where each user can only
 * see their own balance and no one else's.
 *
 * Security considerations:
 * - Each account can only be accessed by its owner
 * - Unauthorized access attempts will revert with UCEFUnauthorizedBalanceAccess
 * - No administrative override is possible
 */
abstract contract UCEFOwned is UCEF {

    /**
     * @dev Modifier to restrict function access to the account owner
     * @param account The account address being accessed
     *
     * Requirements:
     * - The caller must be the account owner
     */
    modifier onlyAccountOwner(address account) {
        if (msg.sender != account) {
            revert UCEFUnauthorizedBalanceAccess(msg.sender, account);
        }
        _;
    }

    /**
     * @dev Implementation of the balance authorization check
     * @param account The account address to check authorization for
     * @return bool Always reverts for non-owners
     *
     * Requirements:
     * - The caller must be the account owner
     *
     * Note:
     * - This implementation always reverts for unauthorized access rather than returning false
     * - This provides explicit feedback rather than silent failure
     */
    function _authorizeBalance(address account) internal view virtual override returns (bool) {
        if (msg.sender != account) {
            revert UCEFUnauthorizedBalanceAccess(msg.sender, account);
        }
        return true;
    }
}
