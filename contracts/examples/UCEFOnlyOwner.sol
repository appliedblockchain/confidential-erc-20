// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFOwned} from "@appliedblockchain/ucef/contracts/UCEFOwned.sol";

contract UCEFOnlyOwner is UCEFOwned {
    constructor() UCEFOwned("UCEFOnlyOwner", "uOOT") {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
