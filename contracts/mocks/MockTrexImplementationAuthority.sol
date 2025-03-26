// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importing TokenProxy here to force it to be included in the artifacts. Used for testing.
import "@tokenysolutions/t-rex/contracts/proxy/TokenProxy.sol";

contract MockTrexImplementationAuthority {
    address _tokenImplementation;
    
    constructor(address tokenImplementation) {
      _tokenImplementation = tokenImplementation;
    }

    function getTokenImplementation() external view returns (address) {
        return _tokenImplementation;
    }

    function updateTokenImplementation(address newTokenImplementation) external {
      _tokenImplementation = newTokenImplementation;
    }
} 