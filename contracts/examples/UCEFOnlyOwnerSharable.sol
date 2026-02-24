// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFSharable} from "@appliedblockchain/ucef/contracts/UCEFSharable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract UCEFOnlyOwnerSharable is UCEFSharable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() UCEFSharable(msg.sender, 'UCEFOnlyOwnerSharable', 'uOOT') {
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
}
