// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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
    mapping(address account => mapping(address spender => uint256)) private _allowances;

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
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        if (msg.sender != owner && msg.sender != spender) {
            revert UCEFUnauthorizedBalanceAccess(msg.sender, owner);
        }
        return _allowance(owner, spender);
    }

    /**
     * @dev Internal helper function to access the allowance mapping directly.
     * This function provides raw access to the allowance value without any access control checks.
     * It should only be used by internal functions that have already performed necessary validations.
     *
     * @param owner The address that owns the tokens and has granted the allowance
     * @param spender The address that has been granted spending privileges
     * @return uint256 The raw allowance value from the mapping
     *
     * Note: This function is separated from the public allowance() function to maintain
     * a clear separation between access-controlled and internal raw data access
     */
    function _allowance(address owner, address spender) internal view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev Sets `value` as the allowance of `spender` over the `owner` s tokens.
     * 
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Requirements:
     * - `owner` cannot be the zero address
     * - `spender` cannot be the zero address
     *
     * @param owner The address that owns the tokens
     * @param spender The address that can spend the tokens
     * @param value The amount of tokens to allow
     * @param emitEvent Whether to emit the Approval event
     */
    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal override virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(address(0), address(0), 0);
        }
    }

    /**
     * @dev Updates the allowance of a spender for a given owner when tokens are spent via transferFrom.
     * This internal function is used to reduce the spender's allowance by the specified value.
     * 
     * Special cases:
     * - If the current allowance is the maximum uint256 value, it represents an infinite allowance
     *   and will not be reduced (acts as an infinite approval)
     * - If the requested value exceeds the current allowance, the transaction will revert
     * 
     * Requirements:
     * - `value` must not exceed the current allowance
     * - Current allowance must be finite (less than max uint256) for it to be reduced
     *
     * @param owner The address that owns the tokens and has granted the allowance
     * @param spender The address that is spending the tokens
     * @param value The amount of tokens being spent
     *
     * Note: This function calls _approve internally with emitEvent=false to avoid
     * unnecessary event emissions during transfers
     */
    function _spendAllowance(address owner, address spender, uint256 value) internal override virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance < type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(address(0), 0, 0);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
} 