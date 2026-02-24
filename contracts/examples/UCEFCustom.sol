// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEF} from "@appliedblockchain/ucef/contracts/UCEF.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract UCEFCustom is UCEF, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public regulator;
    uint256 private constant BALANCE_THRESHOLD = 10_000 ether;

    constructor() UCEF("UCEFCustom", "uOCT") {
        regulator = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function _authorizeMint(address to, uint256 amount) internal view override {
        if (!hasRole(MINTER_ROLE, msg.sender)) {
            revert UCEFUnauthorizedMint(msg.sender, to, amount);
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
