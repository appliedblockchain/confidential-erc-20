// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @dev Interface for ERC1363 that allows token holders to execute code after transfers and approvals.
 */
interface IERC1363 is IUCEF, IERC165 {
    error ERC1363TransferFailed(address receiver, uint256 value);
    error ERC1363TransferFromFailed(address sender, address receiver, uint256 value);
    error ERC1363ApproveFailed(address spender, uint256 value);

    /**
     * @dev Transfer tokens and then execute a callback on the receiver.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Transfer tokens and then execute a callback on the receiver with data.
     */
    function transferAndCall(address to, uint256 value, bytes memory data) external returns (bool);

    /**
     * @dev Transfer tokens from another address and then execute a callback on the receiver.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Transfer tokens from another address and then execute a callback on the receiver with data.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes memory data) external returns (bool);

    /**
     * @dev Approve spending of tokens and then execute a callback on the spender.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Approve spending of tokens and then execute a callback on the spender with data.
     */
    function approveAndCall(address spender, uint256 value, bytes memory data) external returns (bool);
} 