// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFRegulated} from "@appliedblockchain/ucef/contracts/UCEFRegulated.sol";

contract UCEFOnlyOwnerAndRegulator is UCEFRegulated {

    constructor() UCEFRegulated(msg.sender, 'UCEFOnlyOwnerAndRegulator', 'uOOT') {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}