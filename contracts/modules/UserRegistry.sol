// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MultiSig.sol";

contract UserRegistry {
    struct User {
        bool isRegistered;
        uint256 balance;
    }

    uint256 public registrationFee = 0.005 ether;
    uint256 public totalUsers;

    mapping(address => User) public users;
    mapping(uint256 => mapping(address => bool)) public hasPredicted;
    
    MultiSig private multisig;

    event NewUser(address addr);
    event RegistrationPaymentChanged(uint256 oldPayment, uint256 newPayment, uint256 mtxId);  // mtxId: mtx used for this

    constructor (MultiSig _multiSig, address[] memory _admins) {
        multisig = _multiSig;

        for (uint8 i=0; i<_admins.length; i++){
            User storage user = users[msg.sender];
            require(!user.isRegistered, "User already registered");  // to handle duplicate addr in _admins
            user.isRegistered = true;

            emit NewUser(msg.sender);
        }

        totalUsers += _admins.length;
    }

    function createAccount() external payable {
        User storage user = users[msg.sender];

        require(!user.isRegistered, "User already registered");
        require(msg.value == registrationFee, "Invalid registration payment");

        user.isRegistered = true;
        totalUsers++;

        emit NewUser(msg.sender);
    }

    function markHasPredicted(address _addr, uint256 _quesId) external {
        require(!hasPredicted[_quesId][_addr], "Already predicted for this prediction");
        hasPredicted[_quesId][_addr] = true;
    }

    function increaseUserBalance(address _addr, uint256 _amount) external {
        users[_addr].balance += _amount;
    }

    function decreaseUserBalance(address _addr, uint256 _amount) external {
        User storage user = users[_addr];
        require(user.balance > _amount, "Insufficient balance");
        user.balance -= _amount;
    }

    function setRegistrationPayment(uint256 _newPayment, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        (, bool confirmed, , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        require(confirmed, "No enough confirmations to execute this function.");
        require(_newPayment >= 0, "Amount must be positive");

        multisig.markExecuted(_mtxId);
        uint256 oldPayment = registrationFee;
        registrationFee = _newPayment;

        emit RegistrationPaymentChanged(oldPayment, _newPayment, _mtxId);
    }

    function isRegistered(address _addr) external view returns (bool) {
        return users[_addr].isRegistered;
    }
}