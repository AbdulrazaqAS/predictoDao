// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IUserManager {
    function totalUsers() external view returns (uint256);

    function createAccount() external;

    function isRegistered(address _addr) external view returns (bool);
}
