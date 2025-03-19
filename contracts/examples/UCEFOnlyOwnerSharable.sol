// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../extensions/UCEFSharable.sol";

contract UCEFOnlyOwnerSharable is UCEFSharable {

    constructor() UCEF('UCEFOnlyOwnerSharable', 'uOOT') UCEFSharable(msg.sender) {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}