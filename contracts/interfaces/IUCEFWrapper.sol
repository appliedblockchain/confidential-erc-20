// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";

/**
 * @dev Interface for the UCEFWrapper extension, which supports wrapping of underlying tokens.
 */
interface IUCEFWrapper is IUCEF {
    error ERC20InvalidUnderlying(address token);

    function decimals() external view returns (uint8);
    function underlying() external view returns (IUCEF);
    function depositFor(address account, uint256 value) external returns (bool);
    function withdrawTo(address account, uint256 value) external returns (bool);
} 