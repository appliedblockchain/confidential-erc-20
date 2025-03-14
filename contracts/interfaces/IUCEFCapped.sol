// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";

/**
 * @dev Interface for the UCEFCapped extension that adds a cap to the supply of tokens.
 */
interface IUCEFCapped is IUCEF {
    error ERC20ExceededCap(uint256 increasedSupply, uint256 cap);
    error ERC20InvalidCap(uint256 cap);

    /**
     * @dev Returns the cap on the token's total supply.
     */
    function cap() external view returns (uint256);
} 