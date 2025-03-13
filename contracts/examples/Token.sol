// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../token/UCEF.sol";

contract Token is UCEF {
    // address private constant OWNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    constructor(string memory _name, string memory _symbol) UCEF(_name, _symbol) {}

    function mint(address account, uint256 amount) public {
        super._mint(account, amount);
    }

    // function _authorizeBalance(address account) public view override returns (bool) {
    //     if (account != OWNER) {
    //         revert UCEFUnauthorizedBalanceAccess(msg.sender, account);
    //     }
    //     return true;
    // }
}