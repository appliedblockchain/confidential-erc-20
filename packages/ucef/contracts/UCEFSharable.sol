// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {UCEF} from "./UCEF.sol";

/**
 * @title UCEFSharable
 * @dev Extension for UCEF token that implements a sharable authorization model with optional supervisor oversight.
 * This model allows account owners to grant balance viewing permissions to specific addresses,
 * while maintaining an optional supervisor role for auditing purposes.
 *
 * Features:
 * - Account owners can grant and revoke balance viewing permissions
 * - Multiple viewers can be authorized per account
 * - Optional supervisor with universal balance and event viewing privileges
 * - Supervisor can be permanently disabled by setting to zero address
 * - Events for selective visibility of permission changes
 *
 * Event Behavior:
 * - Transfer events: Visible to sender, receiver, and supervisor (if enabled)
 * - Approval events: Visible to owner, spender, and supervisor (if enabled)
 * - ViewerPermissionUpdated events: Visible to account, viewer, and supervisor (if enabled)
 * - SupervisorUpdated events: Visible only to old and new supervisor
 *
 * Security considerations:
 * - Only account owners can manage their viewing permissions
 * - Viewers can only see balances of accounts that have explicitly granted them permission
 * - When enabled, the supervisor has visibility into all account balances and events
 * - Only the current supervisor can update the supervisor address
 * - Setting supervisor to zero address permanently disables supervision
 * - Once supervision is disabled, it cannot be re-enabled
 * - Permission changes are tracked through events for auditability while maintaining privacy
 */
contract UCEFSharable is UCEF {
    // Event type constants for Private Events
    bytes32 public constant EVENT_TYPE_VIEWER_PERMISSION_UPDATED = keccak256("ViewerPermissionUpdated(address,address,bool)");
    bytes32 public constant EVENT_TYPE_SUPERVISOR_UPDATED = keccak256("SupervisorUpdated(address,address)");

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
    constructor(address initialSupervisor, string memory name, string memory symbol) UCEF(name, symbol) {
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
     * Emits a SupervisorUpdated event visible only to old and new supervisor
     */
    function _updateSupervisor(address newSupervisor) internal virtual {
        address oldSupervisor = _supervisor;
        _supervisor = newSupervisor;

        _emitSupervisorUpdatedEvent(oldSupervisor, newSupervisor);
    }

    /**
     * @dev Grants balance viewing permission to a specific address
     * @param viewer The address to grant viewing permission to
     *
     * Requirements:
     * - Only the account owner can grant viewing permissions
     *
     * Emits a ViewerPermissionUpdated event
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
     * Emits a ViewerPermissionUpdated event
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
     * Emits a ViewerPermissionUpdated event
     */
    function _updateViewerPermission(
        address account,
        address viewer,
        bool status
    ) internal virtual {
        _authorizedViewers[account][viewer] = status;
        _emitViewerPermissionUpdatedEvent(account, viewer, status);
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

    /**
     * @dev Override to implement supervisor-inclusive event visibility for transfers
     * Supervisor can view all transfers for oversight alongside the involved parties
     * @param from The sending address
     * @param to The receiving address
     * @return allowedViewers Array containing sender, receiver, and supervisor (if enabled)
     */
    function _getTransferEventViewers(
        address from,
        address to
    ) internal view virtual override returns (address[] memory allowedViewers) {
        // Count unique non-zero addresses including supervisor (if enabled)
        uint256 viewerCount = 0;
        if (_supervisor != address(0)) viewerCount++; // Include supervisor if enabled
        if (from != address(0) && from != _supervisor) viewerCount++;
        if (to != address(0) && to != from && to != _supervisor) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list
        if (_supervisor != address(0)) {
            allowedViewers[index++] = _supervisor;
        }
        if (from != address(0) && from != _supervisor) {
            allowedViewers[index++] = from;
        }
        if (to != address(0) && to != from && to != _supervisor) {
            allowedViewers[index] = to;
        }
    }

    /**
     * @dev Override to implement supervisor-inclusive event visibility for approvals
     * Supervisor can view all approvals for oversight alongside owner and spender
     * @param owner The address that owns the tokens
     * @param spender The address that can spend the tokens
     * @return allowedViewers Array containing owner, spender, and supervisor (if enabled)
     */
    function _getApprovalEventViewers(
        address owner,
        address spender
    ) internal view virtual override returns (address[] memory allowedViewers) {
        // Count unique addresses including supervisor (if enabled)
        uint256 viewerCount = 0;
        if (_supervisor != address(0)) viewerCount++; // Include supervisor if enabled
        if (owner != _supervisor) viewerCount++;
        if (spender != owner && spender != _supervisor) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list
        if (_supervisor != address(0)) {
            allowedViewers[index++] = _supervisor;
        }
        if (owner != _supervisor) {
            allowedViewers[index++] = owner;
        }
        if (spender != owner && spender != _supervisor) {
            allowedViewers[index] = spender;
        }
    }

    /**
     * @dev Internal function to emit ViewerPermissionUpdated events
     * Can be overridden by derived contracts to implement custom emission logic
     * Default implementation: visible to account, viewer, and supervisor (if enabled)
     * @param account The account whose permissions were updated
     * @param viewer The viewer whose permissions were updated
     * @param status The new permission status
     */
    function _emitViewerPermissionUpdatedEvent(address account, address viewer, bool status) internal virtual {
        address[] memory allowedViewers = _getViewerPermissionUpdatedEventViewers(account, viewer);
        bytes memory payload = abi.encode(account, viewer, status);

        emit PrivateEvent(allowedViewers, EVENT_TYPE_VIEWER_PERMISSION_UPDATED, payload);
    }

    /**
     * @dev Internal function to determine who can view ViewerPermissionUpdated events
     * @param account The account whose permissions were updated
     * @param viewer The viewer whose permissions were updated
     * @return allowedViewers Array containing account, viewer, and supervisor (if enabled)
     */
    function _getViewerPermissionUpdatedEventViewers(
        address account,
        address viewer
    ) internal view virtual returns (address[] memory allowedViewers) {
        // Count unique addresses including supervisor (if enabled)
        uint256 viewerCount = 0;
        if (_supervisor != address(0)) viewerCount++; // Include supervisor if enabled
        if (account != _supervisor) viewerCount++;
        if (viewer != account && viewer != _supervisor) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list
        if (_supervisor != address(0)) {
            allowedViewers[index++] = _supervisor;
        }
        if (account != _supervisor) {
            allowedViewers[index++] = account;
        }
        if (viewer != account && viewer != _supervisor) {
            allowedViewers[index] = viewer;
        }
    }

    /**
     * @dev Internal function to emit SupervisorUpdated events
     * Can be overridden by derived contracts to implement custom emission logic
     * Default implementation: only old and new supervisor can view supervisor changes
     * @param previousSupervisor The address of the previous supervisor
     * @param newSupervisor The address of the new supervisor
     */
    function _emitSupervisorUpdatedEvent(address previousSupervisor, address newSupervisor) internal virtual {
        address[] memory allowedViewers = _getSupervisorUpdatedEventViewers(previousSupervisor, newSupervisor);
        bytes memory payload = abi.encode(previousSupervisor, newSupervisor);

        emit PrivateEvent(allowedViewers, EVENT_TYPE_SUPERVISOR_UPDATED, payload);
    }

    /**
     * @dev Internal function to determine who can view SupervisorUpdated events
     * Default implementation: only old and new supervisor should see supervisor changes
     * @param previousSupervisor The address of the previous supervisor
     * @param newSupervisor The address of the new supervisor
     * @return allowedViewers Array containing only old and new supervisor
     */
    function _getSupervisorUpdatedEventViewers(
        address previousSupervisor,
        address newSupervisor
    ) internal view virtual returns (address[] memory allowedViewers) {
        // Count unique non-zero addresses
        uint256 viewerCount = 0;
        if (previousSupervisor != address(0)) viewerCount++;
        if (newSupervisor != address(0) && newSupervisor != previousSupervisor) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list
        if (previousSupervisor != address(0)) {
            allowedViewers[index++] = previousSupervisor;
        }
        if (newSupervisor != address(0) && newSupervisor != previousSupervisor) {
            allowedViewers[index] = newSupervisor;
        }
    }
} 