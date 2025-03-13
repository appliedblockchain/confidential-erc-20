// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ERC20Private.sol";

contract Token is ERC20Private, Pausable {
    // address private constant OWNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    constructor(string memory _name, string memory _symbol) ERC20Private(_name, _symbol) {}

    function mint(address account, uint256 amount) public {
        super._mint(account, amount);
    }

    // function _authorizeBalance(address account) public view override returns (bool) {
    //     if (account != OWNER) {
    //         revert ERC20PrivateUnauthorizedBalanceAccess(msg.sender, account);
    //     }
    //     return true;
    // }

    function _update(address from, address to, uint256 value) internal virtual override whenNotPaused {
        super._update(from, to, value);
    }
}