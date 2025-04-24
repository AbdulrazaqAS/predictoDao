// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IUserManager {
    struct User {
        bool isRegistered;
        uint256 balance;
    }

    function registrationFee() external view returns (uint256);
    function totalUsers() external view returns (uint256);

    function users(address _addr) external view returns (bool isRegistered, uint256 balance);

    function createAccount() external;

    function increaseUserBalance(address _addr, uint256 _amount) external;

    function decreaseUserBalance(address _addr, uint256 _amount) external;

    function withdraw() external;

    function setRegistrationFee(uint256 _newPayment) external;

    function setMinWithdraw(uint256 _newPayment) external;

    function isRegistered(address _addr) external view returns (bool);
}
