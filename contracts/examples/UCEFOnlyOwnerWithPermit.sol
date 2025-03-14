// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../token/UCEF.sol";
import "../extensions/UCEFOwned.sol";
import "../extensions/UCEFPermit.sol";

contract UCEFOnlyOwnerWithPermit is UCEFOwned, UCEFPermit {
    constructor() UCEF("UCEFOnlyOwner", "uOOT") UCEFPermit("UCEFOnlyOwner") {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    /**
     * @dev Extension requires overriding _authorizeBalance base function. Calling super._authorizeBalance to reuse base function logic.
     */
    function _authorizeBalance(address account) internal view override (UCEF, UCEFOwned) returns (bool) {
        return super._authorizeBalance(account);
    }
}