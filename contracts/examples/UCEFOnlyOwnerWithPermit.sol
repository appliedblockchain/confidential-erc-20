// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFOwned, UCEF} from "@appliedblockchain/ucef/contracts/UCEFOwned.sol";
import {UCEFPermit} from "@appliedblockchain/ucef/contracts/extensions/UCEFPermit.sol";

contract UCEFOnlyOwnerWithPermit is UCEFOwned, UCEFPermit {
    address private _minter;

    constructor() UCEFOwned("UCEFOnlyOwner", "uOOT") UCEFPermit("UCEFOnlyOwner") {
        _minter = msg.sender;
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function _authorizeBalance(address account) internal view override (UCEF, UCEFOwned) returns (bool) {
        return super._authorizeBalance(account);
    }

    function _authorizeMint(address, uint256) internal view override {
        if (msg.sender != _minter) {
            revert UCEFUnauthorizedMint(msg.sender);
        }
    }
}