// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @dev Interface for ERC4626 Tokenized Vault Standard.
 */
interface IERC4626 is IUCEF, IERC20Metadata {
    error ERC4626ExceededMaxDeposit(address receiver, uint256 assets, uint256 max);
    error ERC4626ExceededMaxMint(address receiver, uint256 shares, uint256 max);
    error ERC4626ExceededMaxWithdraw(address owner, uint256 assets, uint256 max);
    error ERC4626ExceededMaxRedeem(address owner, uint256 shares, uint256 max);

    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    /**
     * @dev Returns the address of the underlying token used for the Vault.
     */
    function asset() external view returns (address);

    /**
     * @dev Returns the total amount of the underlying asset managed by the Vault.
     */
    function totalAssets() external view returns (uint256);

    /**
     * @dev Returns the amount of shares that would be exchanged for the given amount of assets.
     */
    function convertToShares(uint256 assets) external view returns (uint256);

    /**
     * @dev Returns the amount of assets that would be exchanged for the given amount of shares.
     */
    function convertToAssets(uint256 shares) external view returns (uint256);

    /**
     * @dev Returns the maximum amount of the underlying asset that can be deposited.
     */
    function maxDeposit(address receiver) external view returns (uint256);

    /**
     * @dev Returns the maximum amount of the Vault shares that can be minted.
     */
    function maxMint(address receiver) external view returns (uint256);

    /**
     * @dev Returns the maximum amount of the underlying asset that can be withdrawn.
     */
    function maxWithdraw(address owner) external view returns (uint256);

    /**
     * @dev Returns the maximum amount of Vault shares that can be redeemed.
     */
    function maxRedeem(address owner) external view returns (uint256);

    /**
     * @dev Allows users to simulate the effects of their deposit at the current block.
     */
    function previewDeposit(uint256 assets) external view returns (uint256);

    /**
     * @dev Allows users to simulate the effects of their mint at the current block.
     */
    function previewMint(uint256 shares) external view returns (uint256);

    /**
     * @dev Allows users to simulate the effects of their withdrawal at the current block.
     */
    function previewWithdraw(uint256 assets) external view returns (uint256);

    /**
     * @dev Allows users to simulate the effects of their redemption at the current block.
     */
    function previewRedeem(uint256 shares) external view returns (uint256);

    /**
     * @dev Deposits assets of underlying tokens into the Vault.
     */
    function deposit(uint256 assets, address receiver) external returns (uint256);

    /**
     * @dev Mints exactly shares Vault shares to receiver by depositing assets of underlying tokens.
     */
    function mint(uint256 shares, address receiver) external returns (uint256);

    /**
     * @dev Withdraws the given amount of underlying tokens from owner.
     */
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256);

    /**
     * @dev Redeems the given amount of Vault shares from owner.
     */
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);
} 