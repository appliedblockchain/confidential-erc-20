// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockCompliance {
    bool private _canTransfer;
    bool private _canMint;
    address private _token;

    function canTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external view returns (bool) {
        return _canTransfer;
    }

    function canMint(
        address _to,
        uint256 _amount
    ) external view returns (bool) {
        return _canMint;
    }

    function transferred(
        address _from,
        address _to,
        uint256 _amount
    ) external {}

    function created(
        address _to,
        uint256 _amount
    ) external {}

    function destroyed(address _userAddress, uint256 _amount) external {}

    function setCanTransfer(bool _status) external {
        _canTransfer = _status;
    }

    function setCanMint(bool _status) external {
        _canMint = _status;
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
} 