// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UserManager is AccessManaged {
    struct User {
        bool isRegistered;
        uint256 balance;
    }

    uint256 public registrationFee = 0.005 ether;
    uint256 public minWithdraw = 0.003 ether;
    uint256 public totalUsers;
    address public token;

    mapping(address => User) public users;

    event NewUser(address addr);
    event RegistrationFeeChanged(uint256 oldFee, uint256 newFee);
    event MinWithdrawChanged(uint256 oldFee, uint256 newFee);
    
    constructor (address manager, address _token) AccessManaged(manager) {
        token = _token;
    }

    function createAccount() external {
        // TODO: Send to FUNDS MANAGER contract
        bool sent = IERC20(token).transferFrom(msg.sender, address(this), registrationFee);
        require(sent, "Can't transfer required tokens to contract from user");

        User storage user = users[msg.sender];
        require(!user.isRegistered, "User already registered");

        user.isRegistered = true;
        totalUsers++;

        emit NewUser(msg.sender);
    }

    // To FUNDS_MANAGER, QUESTION_MANAGER
    function increaseUserBalance(address _addr, uint256 _amount) external restricted {
        users[_addr].balance += _amount;
    }

    // To FUNDS_MANAGER
    function decreaseUserBalance(address _addr, uint256 _amount) external restricted {
        User storage user = users[_addr];
        require(user.balance > _amount, "Insufficient balance");
        user.balance -= _amount;
    }

    // PREDICTER
    function withdraw() external restricted {
        User storage user = users[msg.sender];
        require(user.balance > minWithdraw, "Insufficient withdraw amount");

        user.balance = 0;
        IERC20(token).transfer(msg.sender, user.balance);

    }

    // To FUNDS_MANAGER
    function setRegistrationFee(uint256 _newPayment) external restricted{
        require(_newPayment >= 0, "Amount must be positive");

        uint256 oldPayment = registrationFee;
        registrationFee = _newPayment;

        emit RegistrationFeeChanged(oldPayment, _newPayment);
    }

    // To FUNDS_MANAGER
    function setMinWithdraw(uint256 _newPayment) external restricted{
        require(_newPayment >= 0, "Amount must be positive");

        uint256 oldPayment = registrationFee;
        minWithdraw = _newPayment;

        emit MinWithdrawChanged(oldPayment, _newPayment);
    }

    function isRegistered(address _addr) external view returns (bool) {
        return users[_addr].isRegistered;
    }
}