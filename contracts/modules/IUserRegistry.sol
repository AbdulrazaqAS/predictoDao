// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IUserRegistry {
    struct User {
        bool isRegistered;
        uint256 balance;
    }

    function registrationFee() external view returns (uint256);
    function totalUsers() external view returns (uint256);

    function users(address _addr) external view returns (bool isRegistered, uint256 balance);
    function hasPredicted(uint256 _quesId, address _addr) external view returns (bool);

    function createAccount() external;

    function markHasPredicted(address _addr, uint256 _quesId) external;

    function increaseUserBalance(address _addr, uint256 _amount) external;

    function decreaseUserBalance(address _addr, uint256 _amount) external;

    function setRegistrationPayment(uint256 _newPayment, uint256 _mtxId) external;

    function isRegistered(address _addr) external view returns (bool);
}
