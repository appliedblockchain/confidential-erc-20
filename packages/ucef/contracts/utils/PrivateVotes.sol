// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC5805} from "@openzeppelin/contracts/interfaces/IERC5805.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Checkpoints} from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

/**
 * @title PrivateVotes
 * @dev This is a base abstract contract that tracks voting units with enhanced privacy controls.
 * It provides a system of vote delegation where events can be emitted privately to authorized viewers.
 *
 * Based on OpenZeppelin Contracts (last updated v5.2.0) (governance/utils/Votes.sol)
 * with modifications for private event functionality.
 *
 * This contract provides the same voting and delegation functionality as OpenZeppelin's Votes contract,
 * but enables customization of event emission through virtual functions. The base functionality includes:
 * - Vote delegation system where accounts can delegate voting power to representatives
 * - Historical tracking of voting power through checkpoints
 * - Protection against flash loans and double voting through on-chain history
 * - EIP-712 compatible signature-based delegation
 *
 * Key differences from OpenZeppelin's Votes:
 * - Uses Private Events by default for selective visibility of voting activities
 * - Virtual event emission functions (_emitDelegateChanged, _emitDelegateVotesChanged) for further customization
 * - Virtual viewer functions (_getDelegateChangedEventViewers, _getDelegateVotesChangedEventViewers) for access control
 * - Default privacy model: delegators and delegates can view relevant events
 * - Maintains full interface compatibility with existing governance protocols
 *
 * Security considerations:
 * - Event emission customization should preserve governance transparency requirements
 * - Private event implementations must ensure authorized viewers include relevant governance participants
 * - Delegation and voting power changes should remain auditable by appropriate parties
 * - The checkpoint system integrity must be maintained regardless of event privacy settings
 *
 * This contract is often combined with a token contract such that voting units correspond to token units.
 * The full history of delegate votes is tracked on-chain so that governance protocols can consider votes
 * as distributed at a particular block number to protect against flash loans and double voting.
 *
 * When using this module the derived contract must implement {_getVotingUnits} and can use
 * {_transferVotingUnits} to track changes in the distribution of voting units.
 */
abstract contract PrivateVotes is Context, EIP712, Nonces, IERC5805 {
    using Checkpoints for Checkpoints.Trace208;

    // Event type constants for Private Events
    /**
    * @notice DelegateChanged event parameter mapping:
    *   - address param0: delegator     - Account that changed its delegation
    *   - address param1: fromDelegate  - Previous delegate (address(0) if first delegation)
    *   - address param2: toDelegate    - New delegate (address(0) if removing delegation)
    * @custom:signature DelegateChanged(address delegator, address fromDelegate, address toDelegate)
    */
    bytes32 public constant EVENT_TYPE_DELEGATE_CHANGED = keccak256("DelegateChanged(address,address,address)");
    
    /**
    * @notice DelegateVotesChanged event parameter mapping:
    *   - address param0: delegate      - Delegate whose vote weight changed
    *   - uint256 param1: previousVotes - Previous vote weight
    *   - uint256 param2: newVotes      - New vote weight
    * @custom:signature DelegateVotesChanged(address delegate, uint256 previousVotes, uint256 newVotes)
    */
    bytes32 public constant EVENT_TYPE_DELEGATE_VOTES_CHANGED = keccak256("DelegateVotesChanged(address,uint256,uint256)");

    bytes32 private constant DELEGATION_TYPEHASH =
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    mapping(address account => address) private _delegatee;

    mapping(address delegatee => Checkpoints.Trace208) private _delegateCheckpoints;

    Checkpoints.Trace208 private _totalCheckpoints;

    /**
     * @dev Private Event for selective visibility of voting-related events
     * @param allowedViewers List of addresses authorized to view the event
     * @param eventType The keccak256 hash of the original event signature
     * @param payload The ABI-encoded event arguments
     */
    event PrivateEvent(
        address[] allowedViewers,
        bytes32 indexed eventType,
        bytes payload
    );

    /**
     * @dev The clock was incorrectly modified.
     */
    error ERC6372InconsistentClock();

    /**
     * @dev Lookup to future votes is not available.
     */
    error ERC5805FutureLookup(uint256 timepoint, uint48 clock);

    /**
     * @dev Clock used for flagging checkpoints. Can be overridden to implement timestamp based
     * checkpoints (and voting), in which case {CLOCK_MODE} should be overridden as well to match.
     */
    function clock() public view virtual returns (uint48) {
        return Time.blockNumber();
    }

    /**
     * @dev Machine-readable description of the clock as specified in ERC-6372.
     */
    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public view virtual returns (string memory) {
        // Check that the clock was not modified
        if (clock() != Time.blockNumber()) {
            revert ERC6372InconsistentClock();
        }
        return "mode=blocknumber&from=default";
    }

    /**
     * @dev Validate that a timepoint is in the past, and return it as a uint48.
     */
    function _validateTimepoint(uint256 timepoint) internal view returns (uint48) {
        uint48 currentTimepoint = clock();
        if (timepoint >= currentTimepoint) revert ERC5805FutureLookup(timepoint, currentTimepoint);
        return SafeCast.toUint48(timepoint);
    }

    /**
     * @dev Returns the current amount of votes that `account` has.
     */
    function getVotes(address account) public view virtual returns (uint256) {
        return _delegateCheckpoints[account].latest();
    }

    /**
     * @dev Returns the amount of votes that `account` had at a specific moment in the past. If the `clock()` is
     * configured to use block numbers, this will return the value at the end of the corresponding block.
     *
     * Requirements:
     *
     * - `timepoint` must be in the past. If operating using block numbers, the block must be already mined.
     */
    function getPastVotes(address account, uint256 timepoint) public view virtual returns (uint256) {
        return _delegateCheckpoints[account].upperLookupRecent(_validateTimepoint(timepoint));
    }

    /**
     * @dev Returns the total supply of votes available at a specific moment in the past. If the `clock()` is
     * configured to use block numbers, this will return the value at the end of the corresponding block.
     *
     * NOTE: This value is the sum of all available votes, which is not necessarily the sum of all delegated votes.
     * Votes that have not been delegated are still part of total supply, even though they would not participate in a
     * vote.
     *
     * Requirements:
     *
     * - `timepoint` must be in the past. If operating using block numbers, the block must be already mined.
     */
    function getPastTotalSupply(uint256 timepoint) public view virtual returns (uint256) {
        return _totalCheckpoints.upperLookupRecent(_validateTimepoint(timepoint));
    }

    /**
     * @dev Returns the current total supply of votes.
     */
    function _getTotalSupply() internal view virtual returns (uint256) {
        return _totalCheckpoints.latest();
    }

    /**
     * @dev Returns the delegate that `account` has chosen.
     */
    function delegates(address account) public view virtual returns (address) {
        return _delegatee[account];
    }

    /**
     * @dev Delegates votes from the sender to `delegatee`.
     */
    function delegate(address delegatee) public virtual {
        address account = _msgSender();
        _delegate(account, delegatee);
    }

    /**
     * @dev Delegates votes from signer to `delegatee`.
     */
    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        if (block.timestamp > expiry) {
            revert VotesExpiredSignature(expiry);
        }
        address signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry))),
            v,
            r,
            s
        );
        _useCheckedNonce(signer, nonce);
        _delegate(signer, delegatee);
    }

    /**
     * @dev Delegate all of `account`'s voting units to `delegatee`.
     *
     * Emits events {IVotes-DelegateChanged} and {IVotes-DelegateVotesChanged}.
     */
    function _delegate(address account, address delegatee) internal virtual {
        address oldDelegate = delegates(account);
        _delegatee[account] = delegatee;

        _emitDelegateChanged(account, oldDelegate, delegatee);
        _moveDelegateVotes(oldDelegate, delegatee, _getVotingUnits(account));
    }

    /**
     * @dev Transfers, mints, or burns voting units. To register a mint, `from` should be zero. To register a burn, `to`
     * should be zero. Total supply of voting units will be adjusted with mints and burns.
     */
    function _transferVotingUnits(address from, address to, uint256 amount) internal virtual {
        if (from == address(0)) {
            _push(_totalCheckpoints, _add, SafeCast.toUint208(amount));
        }
        if (to == address(0)) {
            _push(_totalCheckpoints, _subtract, SafeCast.toUint208(amount));
        }
        _moveDelegateVotes(delegates(from), delegates(to), amount);
    }

    /**
     * @dev Moves delegated votes from one delegate to another.
     */
    function _moveDelegateVotes(address from, address to, uint256 amount) internal virtual {
        if (from != to && amount > 0) {
            if (from != address(0)) {
                (uint256 oldValue, uint256 newValue) = _push(
                    _delegateCheckpoints[from],
                    _subtract,
                    SafeCast.toUint208(amount)
                );
                _emitDelegateVotesChanged(from, oldValue, newValue);
            }
            if (to != address(0)) {
                (uint256 oldValue, uint256 newValue) = _push(
                    _delegateCheckpoints[to],
                    _add,
                    SafeCast.toUint208(amount)
                );
                _emitDelegateVotesChanged(to, oldValue, newValue);
            }
        }
    }

    /**
     * @dev Get number of checkpoints for `account`.
     */
    function _numCheckpoints(address account) internal view virtual returns (uint32) {
        return SafeCast.toUint32(_delegateCheckpoints[account].length());
    }

    /**
     * @dev Get the `pos`-th checkpoint for `account`.
     */
    function _checkpoints(
        address account,
        uint32 pos
    ) internal view virtual returns (Checkpoints.Checkpoint208 memory) {
        return _delegateCheckpoints[account].at(pos);
    }

    function _push(
        Checkpoints.Trace208 storage store,
        function(uint208, uint208) view returns (uint208) op,
        uint208 delta
    ) private returns (uint208 oldValue, uint208 newValue) {
        return store.push(clock(), op(store.latest(), delta));
    }

    function _add(uint208 a, uint208 b) private pure returns (uint208) {
        return a + b;
    }

    function _subtract(uint208 a, uint208 b) private pure returns (uint208) {
        return a - b;
    }

    /**
     * @dev Must return the voting units held by an account.
     */
    function _getVotingUnits(address) internal view virtual returns (uint256);

    /**
     * @dev Internal function to emit DelegateChanged events
     * Can be overridden by derived contracts to implement custom emission logic
     * Default implementation emits private events with selective visibility
     * @param delegator The account that changed its delegation
     * @param fromDelegate The previous delegate (address(0) if this is the first delegation)
     * @param toDelegate The new delegate (address(0) if delegation is being removed)
     */
    function _emitDelegateChanged(address delegator, address fromDelegate, address toDelegate) internal virtual {
        address[] memory allowedViewers = _getDelegateChangedEventViewers(delegator, fromDelegate, toDelegate);
        bytes memory payload = abi.encode(delegator, fromDelegate, toDelegate);

        emit PrivateEvent(allowedViewers, EVENT_TYPE_DELEGATE_CHANGED, payload);
    }

    /**
     * @dev Internal function to determine who can view DelegateChanged events
     * Can be overridden by derived contracts to implement custom viewer logic
     * Default implementation: delegator, old delegate, and new delegate can view
     * @param delegator The account that changed its delegation
     * @param fromDelegate The previous delegate
     * @param toDelegate The new delegate
     * @return allowedViewers Array of addresses authorized to view this delegation change
     */
    function _getDelegateChangedEventViewers(
        address delegator,
        address fromDelegate,
        address toDelegate
    ) internal view virtual returns (address[] memory allowedViewers) {
        // Count unique non-zero addresses
        uint256 viewerCount = 0;
        if (delegator != address(0)) viewerCount++;
        if (fromDelegate != address(0) && fromDelegate != delegator) viewerCount++;
        if (toDelegate != address(0) && toDelegate != delegator && toDelegate != fromDelegate) viewerCount++;

        allowedViewers = new address[](viewerCount);
        uint256 index = 0;

        // Populate viewer list with unique addresses
        if (delegator != address(0)) {
            allowedViewers[index++] = delegator;
        }
        if (fromDelegate != address(0) && fromDelegate != delegator) {
            allowedViewers[index++] = fromDelegate;
        }
        if (toDelegate != address(0) && toDelegate != delegator && toDelegate != fromDelegate) {
            allowedViewers[index] = toDelegate;
        }
    }

    /**
     * @dev Internal function to emit DelegateVotesChanged events
     * Can be overridden by derived contracts to implement custom emission logic
     * Default implementation emits private events with selective visibility
     * @param delegateAddress The delegate whose vote weight changed
     * @param previousVotes The previous vote weight
     * @param newVotes The new vote weight
     */
    function _emitDelegateVotesChanged(address delegateAddress, uint256 previousVotes, uint256 newVotes) internal virtual {
        address[] memory allowedViewers = _getDelegateVotesChangedEventViewers(delegateAddress, previousVotes, newVotes);
        bytes memory payload = abi.encode(delegateAddress, previousVotes, newVotes);

        emit PrivateEvent(allowedViewers, EVENT_TYPE_DELEGATE_VOTES_CHANGED, payload);
    }

    /**
     * @dev Internal function to determine who can view DelegateVotesChanged events
     * Can be overridden by derived contracts to implement custom viewer logic
     * Default implementation: only the delegate whose vote weight changed can view
     * @param delegateAddress The delegate whose vote weight changed
     * @param previousVotes The previous vote weight (available for derived contracts)
     * @param newVotes The new vote weight (available for derived contracts)
     * @return allowedViewers Array of addresses authorized to view this vote weight change
     */
    function _getDelegateVotesChangedEventViewers(
        address delegateAddress,
        uint256 previousVotes,
        uint256 newVotes
    ) internal view virtual returns (address[] memory allowedViewers) {
        previousVotes; // Available for derived contracts
        newVotes; // Available for derived contracts

        // Only the delegate can view their vote weight changes by default
        if (delegateAddress != address(0)) {
            allowedViewers = new address[](1);
            allowedViewers[0] = delegateAddress;
        } else {
            allowedViewers = new address[](0);
        }
    }
}
