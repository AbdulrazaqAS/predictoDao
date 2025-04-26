// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract UserManager {
    uint256 public totalUsers;
    mapping(address => bool) public isRegistered;

    event NewUser(address addr);

    // TODO: pay or own tokens to create
    function createAccount() external {
        require(!isRegistered[msg.sender], "User already registered");

        isRegistered[msg.sender] = true;
        totalUsers++;

        emit NewUser(msg.sender);
    }
}