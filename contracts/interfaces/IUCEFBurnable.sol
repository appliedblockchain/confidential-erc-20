// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";

/**
 * @dev Interface of the UCEFBurnable extension, which allows token holders to destroy their tokens
 * and tokens they have an allowance for, in a way that can be recognized off-chain.
 */
interface IUCEFBurnable is IUCEF {
    /**
     * @dev Destroys a `value` amount of tokens from the caller.
     */
    function burn(uint256 value) external;

    /**
     * @dev Destroys a `value` amount of tokens from `account`, deducting from
     * the caller's allowance.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `value`.
     */
    function burnFrom(address account, uint256 value) external;
} 