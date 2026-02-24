// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UCEFOwned, UCEF} from "@appliedblockchain/ucef/contracts/UCEFOwned.sol";
import {UCEFPermit} from "@appliedblockchain/ucef/contracts/extensions/UCEFPermit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract UCEFOnlyOwnerWithPermit is UCEFOwned, UCEFPermit, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() UCEFOwned("UCEFOnlyOwner", "uOOT") UCEFPermit("UCEFOnlyOwner") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    /**
     * @dev Extension requires overriding _authorizeBalance base function. Calling super._authorizeBalance to reuse base function logic.
     */
    function _authorizeBalance(address account) internal view override (UCEF, UCEFOwned) returns (bool) {
        return super._authorizeBalance(account);
    }

    function _authorizeMint(address, uint256) internal view override {
        if (!hasRole(MINTER_ROLE, msg.sender)) {
            revert UCEFUnauthorizedMint(msg.sender);
        }
    }
}
