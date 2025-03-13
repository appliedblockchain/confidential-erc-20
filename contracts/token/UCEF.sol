// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract UCEF is ERC20 {
    mapping(address account => uint256) private _balances;
    uint256 private _totalSupply;

    error UCEFUnauthorizedBalanceAccess(address sender, address account);

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function balanceOf(address account) public view override virtual returns (uint256) {
        bool authorized = _authorizeBalance(account);

        return authorized ? _balances[account] : 0;
    }

    function _authorizeBalance(address account) public view virtual returns (bool) {
        if (msg.sender != account) {
            revert UCEFUnauthorizedBalanceAccess(msg.sender, account);
        }
        return true;
    }

    function totalSupply() public view override virtual returns (uint256) {
        return _totalSupply;
    }

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

        emit Transfer(address(0), address(0), value);
    }
} 