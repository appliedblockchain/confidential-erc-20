// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../token/UCEF.sol";
import "../extensions/UCEFPermit.sol";
import "../extensions/UCEFRegulated.sol";

contract UCEFOnlyOwnerAndRegulator is UCEFRegulated {

    constructor() UCEF('UCEFOnlyOwnerAndRegulator', 'uOOT') UCEFRegulated(msg.sender) {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}