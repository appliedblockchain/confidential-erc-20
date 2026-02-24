// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFRegulated} from "@appliedblockchain/ucef/contracts/UCEFRegulated.sol";

contract UCEFOnlyOwnerAndRegulator is UCEFRegulated {
    address private _minter;

    constructor() UCEFRegulated(msg.sender, 'UCEFOnlyOwnerAndRegulator', 'uOOT') {
        _minter = msg.sender;
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function _authorizeMint(address, uint256) internal view override {
        if (msg.sender != _minter) {
            revert UCEFUnauthorizedMint(msg.sender);
        }
    }
}