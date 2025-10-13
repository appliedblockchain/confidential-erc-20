// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFSharable} from "@appliedblockchain/ucef/contracts/UCEFSharable.sol";

contract UCEFOnlyOwnerSharable is UCEFSharable {

    constructor() UCEFSharable(msg.sender, 'UCEFOnlyOwnerSharable', 'uOOT') {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}