// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "../ERC20/ERC20.sol";
import {ERC20Permit} from "../ERC20/extensions/ERC20Permit.sol";

// An example implementation that allows an owner to view their own balance but not the balances of others, but has a regulator that can view all balances
contract ERC20OnlyOwnerAndRegulatorLargeBalancesToken is ERC20, ERC20Permit {
    address public regulator;
    constructor() ERC20("ERC20OnlyOwnerAndRegulatorLargeBalancesToken", "OOARLBT") ERC20Permit("ERC20OnlyOwnerAndRegulatorLargeBalancesToken") {
        regulator = msg.sender;
    }

    /**
     * @notice Override `balanceOf` to enforce privacy.
     * @dev Only the balance owner or the admin can view the balance.
     */
    function balanceOf(address account) public view override returns (uint256) {
        require(msg.sender == account || regulator, "Unauthorized access to balance");
        return _balances[account];
    }
}