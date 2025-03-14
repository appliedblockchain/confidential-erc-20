// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {UCEF} from "../token/UCEF.sol";

/**
 * @title UCEFSharable
 * @dev Extension for UCEF token that implements a sharable authorization model with optional supervisor oversight.
 * This model allows account owners to grant balance viewing permissions to specific addresses,
 * while maintaining an optional supervisor role for auditing purposes.
 *
 * Features:
 * - Account owners can grant and revoke balance viewing permissions
 * - Multiple viewers can be authorized per account
 * - Optional supervisor with universal balance viewing privileges
 * - Supervisor can be permanently disabled by setting to zero address
 * - Clear permission management through events
 *
 * Security considerations:
 * - Only account owners can manage their viewing permissions
 * - Viewers can only see balances of accounts that have explicitly granted them permission
 * - When enabled, the supervisor has visibility into all account balances
 * - Only the current supervisor can update the supervisor address
 * - Setting supervisor to zero address permanently disables supervision
 * - Once supervision is disabled, it cannot be re-enabled
 * - Permission changes are tracked through events for auditability
 */
abstract contract UCEFSharable is UCEF {
    // Mapping from account address to viewer address to permission status
    mapping(address account => mapping(address viewer => bool)) private _authorizedViewers;
    
    // Supervisor address for auditing purposes (zero address means supervision is permanently disabled)
    address private _supervisor;

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
     * @dev Constructor that sets the initial supervisor address
     * @param initialSupervisor The address to be set as the first supervisor (can be zero address to start unregulated)
     */
    constructor(address initialSupervisor) {
        _updateSupervisor(initialSupervisor);
    }

    /**
     * @dev Modifier to restrict function access to the current supervisor
     * Requirements:
     * - The caller must be the current supervisor
     */
    modifier onlySupervisor() {
        if (msg.sender != _supervisor) {
            revert UCEFSharableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    /**
     * @dev Returns the address of the current supervisor
     * @return The supervisor address (zero address means supervision is permanently disabled)
     */
    function supervisor() public view virtual returns (address) {
        return _supervisor;
    }

    /**
     * @dev Allows the current supervisor to update the supervisor address or permanently disable supervision
     * @param newSupervisor Address to set as the new supervisor (setting to zero address permanently disables supervision)
     *
     * Requirements:
     * - The caller must be the current supervisor
     * - Supervision must be currently enabled
     * - If supervision was previously disabled (supervisor is zero address), it cannot be re-enabled
     *
     * Note:
     * - Setting the supervisor to zero address permanently disables supervision
     *
     * Emits a {SupervisorUpdated} event
     */
    function updateSupervisor(address newSupervisor) public virtual onlySupervisor {
        _updateSupervisor(newSupervisor);
    }

    /**
     * @dev Internal function to update the supervisor address
     * @param newSupervisor Address to set as the new supervisor (zero address permanently disables supervision)
     *
     * Emits a {SupervisorUpdated} event
     */
    function _updateSupervisor(address newSupervisor) internal virtual {
        address oldSupervisor = _supervisor;
        _supervisor = newSupervisor;
        emit SupervisorUpdated(oldSupervisor, newSupervisor);
    }

    /**
     * @dev Grants balance viewing permission to a specific address
     * @param viewer The address to grant viewing permission to
     *
     * Requirements:
     * - Only the account owner can grant viewing permissions
     *
     * Emits a {ViewerPermissionUpdated} event
     */
    function grantViewer(address viewer) public virtual {
        _updateViewerPermission(msg.sender, viewer, true);
    }

    /**
     * @dev Revokes balance viewing permission from a specific address
     * @param viewer The address to revoke viewing permission from
     *
     * Requirements:
     * - Only the account owner can revoke viewing permissions
     *
     * Emits a {ViewerPermissionUpdated} event
     */
    function revokeViewer(address viewer) public virtual {
        _updateViewerPermission(msg.sender, viewer, false);
    }

    /**
     * @dev Checks if an address has viewing permission for a specific account
     * @param account The account whose permissions to check
     * @param viewer The address to check viewing permissions for
     * @return bool True if the viewer has permission, false otherwise
     */
    function hasViewPermission(address account, address viewer) public view virtual returns (bool) {
        return _authorizedViewers[account][viewer];
    }

    /**
     * @dev Internal function to update viewer permissions
     * @param account The account whose permissions are being updated
     * @param viewer The viewer whose permissions are being updated
     * @param status The new permission status
     *
     * Emits a {ViewerPermissionUpdated} event
     */
    function _updateViewerPermission(
        address account,
        address viewer,
        bool status
    ) internal virtual {
        _authorizedViewers[account][viewer] = status;
        emit ViewerPermissionUpdated(account, viewer, status);
    }

    /**
     * @dev Implementation of the balance authorization check
     * @param account The account address to check authorization for
     * @return bool True if authorized, reverts otherwise
     *
     * Requirements:
     * - The caller must be either:
     *   1. The account owner
     *   2. An authorized viewer for the account
     *   3. The current supervisor (if supervision is enabled)
     *
     * Note:
     * - This implementation reverts for unauthorized access rather than returning false
     */
    function _authorizeBalance(address account) internal view virtual override returns (bool) {
        if (msg.sender != account && 
            !_authorizedViewers[account][msg.sender] && 
            (_supervisor == address(0) || msg.sender != _supervisor)) {
            revert UCEFSharableUnauthorizedViewer(msg.sender);
        }
        return true;
    }
} 