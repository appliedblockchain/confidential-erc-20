// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";

/**
 * @dev Interface for the UCEFPausable extension, which allows token transfers
 * to be paused and unpaused.
 */
interface IUCEFPausable is IUCEF {
    function paused() external view returns (bool);
} 