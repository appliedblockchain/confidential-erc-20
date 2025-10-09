// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title AnonymousPausable
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account with enhanced privacy.
 *
 * Based on OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)
 * with modifications for anonymous pause functionality.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 *
 * Key differences from OpenZeppelin's Pausable:
 * - Pause events emit with address(0) to preserve anonymity of the pause controller
 * - Maintains transparency about pause state changes while protecting operator privacy
 * - Virtual event emission functions (_emitPaused, _emitUnpaused) for maximum customization flexibility
 * - Enables custom event logic without requiring full function overrides or losing state management
 */
abstract contract AnonymousPausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered. Account is anonymized for privacy.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted. Account is anonymized for privacy.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        _emitPaused();
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        _emitUnpaused();
    }

    /**
     * @dev Emits the Paused event. Can be overridden to customize event emission.
     * Default implementation emits with address(0) for anonymity.
     */
    function _emitPaused() internal virtual {
        emit Paused(address(0));
    }

    /**
     * @dev Emits the Unpaused event. Can be overridden to customize event emission.
     * Default implementation emits with address(0) for anonymity.
     */
    function _emitUnpaused() internal virtual {
        emit Unpaused(address(0));
    }
}
