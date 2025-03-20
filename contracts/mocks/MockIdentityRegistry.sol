// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockIdentityRegistry {
    mapping(address => bool) private _verified;
    address private _token;

    function isVerified(address _userAddress) external view returns (bool) {
        return _verified[_userAddress];
    }

    function setVerified(address _userAddress, bool _status) external {
        _verified[_userAddress] = _status;
    }

    function setToken(address _tokenAddress) external {
        _token = _tokenAddress;
    }

    function bindToken(address _tokenAddress) external {
        _token = _tokenAddress;
    }

    function unbindToken(address _tokenAddress) external {
        if (_token == _tokenAddress) {
            _token = address(0);
        }
    }

    function isIdentityRegistered(address _userAddress) external view returns (bool) {
        return _verified[_userAddress];
    }

    function registerIdentity(address _userAddress, uint256 _country, bool _isVerified) external {
        _verified[_userAddress] = _isVerified;
    }

    function updateIdentity(address _userAddress, uint256 _country) external {
        // No-op for mock
    }

    function deleteIdentity(address _userAddress) external {
        _verified[_userAddress] = false;
    }
} 