// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFOwned} from "@appliedblockchain/ucef/contracts/UCEFOwned.sol";

contract UCEFOnlyOwner is UCEFOwned {
    address private _minter;

    constructor() UCEFOwned("UCEFOnlyOwner", "uOOT") {
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
