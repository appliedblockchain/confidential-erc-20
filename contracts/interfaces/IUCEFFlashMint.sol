// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";
import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import {IERC3156FlashLender} from "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";

/**
 * @dev Interface for the UCEFFlashMint extension, implementing ERC-3156 Flash loans.
 */
interface IUCEFFlashMint is IUCEF, IERC3156FlashLender {
    error ERC3156UnsupportedToken(address token);
    error ERC3156ExceededMaxLoan(uint256 maxLoan);
    error ERC3156InvalidReceiver(address receiver);

    function maxFlashLoan(address token) external view returns (uint256);
    function flashFee(address token, uint256 value) external view returns (uint256);
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 value,
        bytes calldata data
    ) external returns (bool);
} 