// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/extensions/ERC20Permit.sol)

pragma solidity ^0.8.20;

import {UCEF} from "../token/UCEF.sol";

/**
 * @title UCEFRegulated
 * @dev Extension for UCEF token that implements a regulated authorization model.
 * This model allows both account owners and a designated regulator to view balances.
 *
 * This implementation is suitable for scenarios where regulatory oversight is required
 * while still maintaining privacy from the general public.
 *
 * Features:
 * - Designated regulator with balance viewing privileges
 * - Updatable regulator address
 * - Account owners can still view their own balances
 *
 * Security considerations:
 * - The regulator has visibility into all account balances
 * - Only the current regulator can update the regulator address
 * - Zero address checks prevent locking of regulatory functions
 */
abstract contract UCEFRegulated is UCEF {
    address private _regulator;

    /**
     * @dev Error thrown when an unauthorized account attempts to perform a regulated operation
     * @param account The address that attempted the operation
     */
    error UCEFRegulatedUnauthorizedAccount(address account);

    /**
     * @dev Error thrown when attempting to set an invalid regulator address
     * @param owner The invalid address that was provided
     */
    error UCEFRegulatedInvalidRegulator(address owner);

    /**
     * @dev Emitted when the regulator address is updated
     * @param previousRegulator Address of the previous regulator
     * @param newRegulator Address of the new regulator
     */
    event RegulatorUpdated(address indexed previousRegulator, address indexed newRegulator);

    /**
     * @dev Constructor that sets the initial regulator address
     * @param initalRegulator The address to be set as the first regulator
     *
     * Requirements:
     * - `initalRegulator` cannot be the zero address
     */
    constructor(address initalRegulator) {
        if (initalRegulator == address(0)) {
            revert UCEFRegulatedInvalidRegulator(address(0));
        }

        _updateRegulator(initalRegulator);
    }

    /**
     * @dev Modifier to restrict function access to the current regulator
     *
     * Requirements:
     * - The caller must be the current regulator
     */
    modifier onlyRegulator() {
        if (msg.sender != _regulator) {
            revert UCEFRegulatedUnauthorizedAccount(msg.sender);
        }
        _;
    }

    /**
     * @dev Returns the address of the current regulator
     * @return The regulator address
     */
    function regulator() public view virtual returns (address) {
        return _regulator;
    }

    /**
     * @dev Allows the current regulator to update the regulator address
     * @param newRegulator Address to set as the new regulator
     *
     * Requirements:
     * - The caller must be the current regulator
     * - `newRegulator` cannot be the zero address
     *
     * Emits a {RegulatorUpdated} event
     */
    function updateRegulator(address newRegulator) public virtual onlyRegulator {
        if (newRegulator == address(0)) {
            revert UCEFRegulatedInvalidRegulator(address(0));
        }

        _updateRegulator(newRegulator);
    }

    /**
     * @dev Internal function to update the regulator address
     * @param newRegulator Address to set as the new regulator
     *
     * Emits a {RegulatorUpdated} event
     */
    function _updateRegulator(address newRegulator) internal virtual {
        address oldRegulator = _regulator;
        _regulator = newRegulator;
        emit RegulatorUpdated(oldRegulator, newRegulator);
    }

    /**
     * @dev Implementation of the balance authorization check
     * @param account The account address to check authorization for
     * @return bool True if authorized, reverts otherwise
     *
     * Requirements:
     * - The caller must be either the account owner or the current regulator
     *
     * Note:
     * - This implementation reverts for unauthorized access rather than returning false
     * - Both account owners and the regulator can view balances
     */
    function _authorizeBalance(address account) internal view virtual override returns (bool) {
        require(msg.sender == account || msg.sender == _regulator, "Unauthorized access to balance");
        return true;
    }
}
