// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "../ERC20/ERC20.sol";
import {ERC20Permit} from "../ERC20/extensions/ERC20Permit.sol";

// An example implementation that allows an owner to view their own balance but not the balances of others,
// Regulator can view balances of accounts holding more than a threshold
contract ERC20OnlyOwnerAndRegulatorLargeBalancesToken is ERC20, ERC20Permit {
    address public regulator;
    uint256 private constant BALANCE_THRESHOLD = 10_000 Ether;

    constructor() ERC20("ERC20OnlyOwnerAndRegulatorLargeBalancesToken", "OOARLBT") ERC20Permit("ERC20OnlyOwnerAndRegulatorLargeBalancesToken") {
        regulator = msg.sender;
    }

    /**
     * @notice Override `balanceOf` to enforce privacy.
     * @dev Only the balance owner can view balance. Admin can view balances greater than a threshold
     */
    function balanceOf(address account) public view override returns (uint256) {
        if (msg.sender == regulator) {
            require(_balances[account] >= BALANCE_THRESHOLD, "Unauthorized access to balance");
            return _balances[account];
        }

        require(msg.sender == account, "Unauthorized access to balance");
        return _balances[account];
    }
}