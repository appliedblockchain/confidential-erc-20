// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFSharable} from "@appliedblockchain/ucef/contracts/UCEFSharable.sol";

contract UCEFOnlyOwnerSharable is UCEFSharable {
    address private _minter;

    constructor() UCEFSharable(msg.sender, 'UCEFOnlyOwnerSharable', 'uOOT') {
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