// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "../ERC20/ERC20.sol";
import {ERC20Permit} from "../ERC20/extensions/ERC20Permit.sol";

// An example implementation that allows an owner to view their own balance and share balance visibility with others
contract OnlyOwnerSharableToken is ERC20, ERC20Permit {
    // Mapping from balance owner to viewer address to boolean indicating access
    mapping(address => mapping(address => bool)) private _balanceViewers;

    constructor() ERC20("OnlyOwnerSharableToken", "OOST") ERC20Permit("OnlyOwnerSharableToken") {}

    /**
     * @notice Grants balance viewing access to a specified address
     * @dev Only the balance owner can grant access to their balance
     * @param viewer The address that will be granted viewing access
     */
    function grantBalanceAccess(address viewer) public {
        require(viewer != address(0), "Cannot grant access to zero address");
        _balanceViewers[msg.sender][viewer] = true;
    }

    /**
     * @notice Revokes balance viewing access from a specified address
     * @dev Only the balance owner can revoke access to their balance
     * @param viewer The address that will have viewing access revoked
     */
    function revokeBalanceAccess(address viewer) public {
        _balanceViewers[msg.sender][viewer] = false;
    }

    /**
     * @notice Override `balanceOf` to enforce privacy with sharing capability
     * @dev Only the balance owner or authorized viewers can view the balance
     */
    function balanceOf(address account) public view override returns (uint256) {
        require(
            msg.sender == account || _balanceViewers[account][msg.sender],
            "Unauthorized access to balance"
        );
        return _balances[account];
    }
}