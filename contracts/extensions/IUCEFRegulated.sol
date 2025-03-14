// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";

/**
 * @title IUCEFRegulated
 * @dev Interface for the UCEFRegulated contract, defining the regulated authorization model
 * for UCEF token balance viewing.
 */
interface IUCEFRegulated is IUCEF {
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
     * @dev Returns the address of the current regulator
     * @return The regulator address
     */
    function regulator() external view returns (address);

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
    function updateRegulator(address newRegulator) external;
} 