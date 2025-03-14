// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../extensions/UCEFOwned.sol";
contract UCEFOnlyOwner is UCEFOwned {
    constructor() UCEF("UCEFOnlyOwner", "uOOT") {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
