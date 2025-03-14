// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../token/UCEF.sol";
import "../extensions/UCEFOwned.sol";
import "../extensions/UCEFPermit.sol";

contract UCEFOnlyOwner is UCEFOwned {
    constructor() UCEF("UCEFOnlyOwner", "uOOT") {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
