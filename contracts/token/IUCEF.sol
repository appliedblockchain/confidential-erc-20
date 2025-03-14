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
     * @dev Emitted when an unauthorized balance access is attempted
     */
    error UCEFUnauthorizedBalanceAccess(address sender, address account);
} 