// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../token/UCEF.sol";
import "../extensions/UCEFPermit.sol";

contract UCEFOnlyOwner is UCEF, UCEFPermit {
    constructor() UCEF('UCEFOnlyOwner', 'uOOT') UCEFPermit('UCEFOnlyOwner') {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}