// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUCEFAuthorizer {
    function _authorizeBalance(address account) external view returns (bool);
}

/**
 * @title UCEF (User Confidential ERC20 Funds)
 * @dev Implementation of a confidential ERC20 token where balance visibility is restricted.
 * This contract extends the standard ERC20 implementation with additional privacy features
 * that control who can view token balances.
 *
 * Key features:
 * - Balance visibility control through authorization mechanism
 * - Standard ERC20 functionality
 * - Protected balance access
 *
 * Extension system:
 * The contract provides two official extensions:
 * 1. UCEFOwned - Implements strict privacy where only account owners can view their balances
 * 2. UCEFRegulated - Adds a regulator role that can view all balances alongside account owners
 *
 * Custom extensions can be created by:
 * 1. Inheriting from this contract
 * 2. Implementing the _authorizeBalance function with custom logic
 * 3. Choosing between silent failure (return false) or explicit revert for unauthorized access
 *
 * Security considerations:
 * - Balance authorization must be properly implemented in derived contracts
 * - The contract maintains actual balances internally while exposing only authorized views
 * - Extensions should carefully consider their privacy model and access control
 */
abstract contract UCEF is ERC20 {
    mapping(address account => uint256) private _balances;
    uint256 private _totalSupply;

    /**
     * @dev Thrown when an unauthorized address attempts to view a balance
     * @param sender The address attempting to view the balance
     * @param account The address whose balance was attempted to be viewed
     */
    error UCEFUnauthorizedBalanceAccess(address sender, address account);

    /**
     * @dev Constructor that sets the name and symbol of the token
     * @param name The name of the token
     * @param symbol The symbol of the token
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /**
     * @dev Internal function to determine if an address is authorized to view a balance
     * Must be implemented by derived contracts to define authorization logic
     * @param account The address to check authorization for
     * @return bool True if authorized, false otherwise
     *
     * @notice Implementation behavior:
     * - Return true to allow balance visibility (will return actual balance)
     * - Return false to deny balance visibility (will return 0)
     * - Revert with UCEFUnauthorizedBalanceAccess or custom error if explicit error handling is required
     *
     * @custom:security Implementing contracts should carefully consider their authorization logic
     * as it directly impacts the privacy of user balances
     */
    function _authorizeBalance(address account) internal view virtual returns (bool) {}

    /**
     * @dev Returns the balance of the specified account if authorized
     * @param account The address to query the balance of
     * @return uint256 The balance if authorized, 0 if unauthorized
     */
    function balanceOf(address account) public view override virtual returns (uint256) {
        bool authorized = _authorizeBalance(account);
        return authorized ? _balanceOf(account): 0;
    }

    /**
     * @dev Returns the total supply of the token
     * @return uint256 The total token supply
     */
    function totalSupply() public view override virtual returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Internal function to get the actual balance of an account
     * @param account The address to query the balance of
     * @return uint256 The actual balance of the account
     */
    function _balanceOf(address account) internal view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Internal function to update balances during transfers
     * Handles minting, burning, and transfers between addresses
     * @param from The sending address (address(0) for minting)
     * @param to The receiving address (address(0) for burning)
     * @param value The amount of tokens to transfer
     */
    function _update(address from, address to, uint256 value) internal override virtual {
        if (from == address(0)) {
            // Overflow check required: The rest of the code assumes that totalSupply never overflows
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                // Overflow not possible: value <= fromBalance <= totalSupply.
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
                _totalSupply -= value;
            }
        } else {
            unchecked {
                // Overflow not possible: balance + value is at most totalSupply, which we know fits into a uint256.
                _balances[to] += value;
            }
        }

        emit Transfer(address(0), address(0), 0);
    }
} 