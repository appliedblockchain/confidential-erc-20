// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/extensions/ERC20Permit.sol)

pragma solidity ^0.8.20;

import {UCEF} from "./UCEF.sol";

/**
 * @title UCEFRegulated
 * @dev Extension for UCEF token that implements a regulated authorization model.
 * This model allows both account owners and a designated regulator to view balances and events.
 *
 * This implementation is suitable for scenarios where regulatory oversight is required
 * while still maintaining privacy from the general public.
 *
 * Features:
 * - Designated regulator with balance and event viewing privileges
 * - Updatable regulator address
 * - Account owners can still view their own balances and related events
 *
 * Event Behavior:
 * - Transfer events: Visible to sender, receiver, and regulator
 * - Approval events: Visible to owner, spender, and regulator
 * - RegulatorUpdated events: Visible only to old and new regulator
 * - Regulator has oversight of all token activities for compliance
 *
 * Security considerations:
 * - The regulator has visibility into all account balances and events
 * - Only the current regulator can update the regulator address
 * - Zero address checks prevent locking of regulatory functions
 */
abstract contract UCEFRegulated is UCEF {
    // Event type constant for Private Events
    /**
    * @notice RegulatorUpdated event parameter mapping:
    *   - address param0: previousRegulator - Address of the previous regulator
    *   - address param1: newRegulator      - Address of the new regulator
    * @custom:signature RegulatorUpdated(address previousRegulator, address newRegulator)
    */
    bytes32 public constant EVENT_TYPE_REGULATOR_UPDATED = keccak256("RegulatorUpdated(address,address)");

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
     * @param initialRegulator The address to be set as the first regulator
     *
     * Requirements:
     * - `initialRegulator` cannot be the zero address
     */
    constructor(address initialRegulator, string memory name, string memory symbol) UCEF(name, symbol) {
        if (initialRegulator == address(0)) {
            revert UCEFRegulatedInvalidRegulator(address(0));
        }

        _updateRegulator(initialRegulator);
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
     * Emits a RegulatorUpdated event visible only to old and new regulator
     */
    function _updateRegulator(address newRegulator) internal virtual {
        address oldRegulator = _regulator;
        _regulator = newRegulator;
        _emitRegulatorUpdatedEvent(oldRegulator, newRegulator);
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
        if (msg.sender != account && msg.sender != _regulator) {
            revert UCEFUnauthorizedBalanceAccess(msg.sender, account);
        }
        return true;
    }

    /**
     * @dev Override to implement regulated event visibility for transfers
     * Regulator can view all transfers for oversight alongside the involved parties
     * @param from The sending address
     * @param to The receiving address
     * @return allowedViewers Array containing sender, receiver, and regulator
     */
    function _getTransferEventViewers(
        address from,
        address to,
        uint256 /* value */
    ) internal view virtual override returns (address[] memory allowedViewers) {
        // Count unique non-zero addresses including regulator
        uint256 viewerCount = 1; // Always include regulator
        if (from != address(0) && from != _regulator) viewerCount++;
        if (to != address(0) && to != from && to != _regulator) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list
        allowedViewers[index++] = _regulator; // Always include regulator
        if (from != address(0) && from != _regulator) {
            allowedViewers[index++] = from;
        }
        if (to != address(0) && to != from && to != _regulator) {
            allowedViewers[index] = to;
        }
    }

    /**
     * @dev Override to implement regulated event visibility for approvals
     * Regulator can view all approvals for oversight alongside owner and spender
     * @param owner The address that owns the tokens
     * @param spender The address that can spend the tokens
     * @return allowedViewers Array containing owner, spender, and regulator
     */
    function _getApprovalEventViewers(
        address owner,
        address spender,
        uint256 /* value */
    ) internal view virtual override returns (address[] memory allowedViewers) {
        // Count unique addresses including regulator
        uint256 viewerCount = 1; // Always include regulator
        if (owner != _regulator) viewerCount++;
        if (spender != owner && spender != _regulator) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list
        allowedViewers[index++] = _regulator; // Always include regulator
        if (owner != _regulator) {
            allowedViewers[index++] = owner;
        }
        if (spender != owner && spender != _regulator) {
            allowedViewers[index] = spender;
        }
    }

    /**
     * @dev Internal function to emit RegulatorUpdated events
     * Can be overridden by derived contracts to implement custom emission logic
     * Default implementation: only old and new regulator can view regulator changes
     * @param previousRegulator The address of the previous regulator
     * @param newRegulator The address of the new regulator
     */
    function _emitRegulatorUpdatedEvent(address previousRegulator, address newRegulator) internal virtual {
        address[] memory allowedViewers = _getRegulatorUpdatedEventViewers(previousRegulator, newRegulator);
        bytes memory payload = abi.encode(previousRegulator, newRegulator);

        emit PrivateEvent(allowedViewers, EVENT_TYPE_REGULATOR_UPDATED, payload);
    }

    /**
     * @dev Internal function to determine who can view RegulatorUpdated events
     * Only old and new regulator should see regulator changes for maximum privacy
     * @param previousRegulator The address of the previous regulator
     * @param newRegulator The address of the new regulator
     * @return allowedViewers Array containing only old and new regulator
     */
    function _getRegulatorUpdatedEventViewers(
        address previousRegulator,
        address newRegulator
    ) internal view virtual returns (address[] memory allowedViewers) {
        // Count unique non-zero addresses
        uint256 viewerCount = 0;
        if (previousRegulator != address(0)) viewerCount++;
        if (newRegulator != address(0) && newRegulator != previousRegulator) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list
        if (previousRegulator != address(0)) {
            allowedViewers[index++] = previousRegulator;
        }
        if (newRegulator != address(0) && newRegulator != previousRegulator) {
            allowedViewers[index] = newRegulator;
        }
    }
}
