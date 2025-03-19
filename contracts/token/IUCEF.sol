// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IUCEF
 * @dev Interface for the UCEF (User Confidential ERC20 Funds) contract
 */
interface IUCEF is IERC20 {
    /**
     * @dev Returns the amount of tokens owned by `account`.
     * Only returns balance if the caller is authorized.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Returns the total amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     * 
     * Access Control:
     * - Only the token owner or the approved spender can view the allowance
     * - Any other address attempting to view the allowance will trigger UCEFUnauthorizedBalanceAccess
     * 
     * Requirements:
     * - msg.sender must be either the owner or the spender of the allowance
     * 
     * @param owner The address that owns the tokens
     * @param spender The address that can spend the tokens
     * @return uint256 The number of tokens the spender is allowed to spend
     * @custom:error UCEFUnauthorizedBalanceAccess Thrown when an unauthorized address attempts to view the allowance
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Emitted when an unauthorized balance access is attempted
     */
    error UCEFUnauthorizedBalanceAccess(address sender, address account);
} 