// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IUCEF} from "../token/IUCEF.sol";

/**
 * @title IUCEFSharable
 * @dev Interface for the UCEFSharable contract, defining the sharable authorization model
 * for UCEF token balance viewing with optional supervisor oversight.
 */
interface IUCEFSharable is IUCEF {
    /**
     * @dev Error thrown when an unauthorized account attempts to view a balance
     * @param account The address that attempted the viewing
     */
    error UCEFSharableUnauthorizedViewer(address account);

    /**
     * @dev Error thrown when an unauthorized account attempts to perform a supervised operation
     * @param account The address that attempted the operation
     */
    error UCEFSharableUnauthorizedAccount(address account);

    /**
     * @dev Error thrown when attempting to re-enable supervision after it has been disabled
     */
    error UCEFSharableSupervisionPermanentlyDisabled();

    /**
     * @dev Emitted when viewing permissions are granted or revoked
     * @param account The account whose balance viewing permissions were modified
     * @param viewer The address that was granted or revoked viewing permission
     * @param status The new permission status (true for granted, false for revoked)
     */
    event ViewerPermissionUpdated(
        address indexed account,
        address indexed viewer,
        bool status
    );

    /**
     * @dev Emitted when the supervisor address is updated
     * @param previousSupervisor Address of the previous supervisor
     * @param newSupervisor Address of the new supervisor (zero address means supervision permanently disabled)
     */
    event SupervisorUpdated(address indexed previousSupervisor, address indexed newSupervisor);

    /**
     * @dev Returns the address of the current supervisor
     * @return The supervisor address (zero address means supervision is permanently disabled)
     */
    function supervisor() external view returns (address);

    /**
     * @dev Allows the current supervisor to update the supervisor address or permanently disable supervision
     * @param newSupervisor Address to set as the new supervisor (setting to zero address permanently disables supervision)
     *
     * Requirements:
     * - The caller must be the current supervisor
     * - Supervision must be currently enabled
     * - If supervision was previously disabled (supervisor is zero address), it cannot be re-enabled
     *
     * Emits a {SupervisorUpdated} event
     */
    function updateSupervisor(address newSupervisor) external;

    /**
     * @dev Grants balance viewing permission to a specific address
     * @param viewer The address to grant viewing permission to
     *
     * Requirements:
     * - Only the account owner can grant viewing permissions
     *
     * Emits a {ViewerPermissionUpdated} event
     */
    function grantViewer(address viewer) external;

    /**
     * @dev Revokes balance viewing permission from a specific address
     * @param viewer The address to revoke viewing permission from
     *
     * Requirements:
     * - Only the account owner can revoke viewing permissions
     *
     * Emits a {ViewerPermissionUpdated} event
     */
    function revokeViewer(address viewer) external;

    /**
     * @dev Checks if an address has viewing permission for a specific account
     * @param account The account whose permissions to check
     * @param viewer The address to check viewing permissions for
     * @return bool True if the viewer has permission, false otherwise
     */
    function hasViewPermission(address account, address viewer) external view returns (bool);
} 