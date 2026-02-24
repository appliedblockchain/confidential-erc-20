// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEF} from "@appliedblockchain/ucef/contracts/UCEF.sol";

contract UCEFCustom is UCEF {
    address public regulator;
    address private _minter;
    uint256 private constant BALANCE_THRESHOLD = 10_000 ether;

    constructor() UCEF("UCEFCustom", "uOCT") {
        regulator = msg.sender;
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

    /**
     * @notice Override `_authorizeBalance` to enforce privacy
     * @dev Return `true` to reveal balance, or `false` to return 0
     */
    function _authorizeBalance(address account) internal view override returns (bool) {
        if (msg.sender == regulator) {
            uint256 balance = _balanceOf(account);
            require( balance >= BALANCE_THRESHOLD, "Unauthorized access to balance");
            return true;
        }

        require(msg.sender == account, "Unauthorized access to balance");
        return true;
    }
}
