// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./modules/UserRegistry.sol";
import "./modules/QuestionManager.sol";
import "./modules/RewardManager.sol";
import "./modules/ValidationManager.sol";
import "./multisig/MultiSig.sol";

contract Forecast is MultiSig {
    UserRegistry private userRegistry;
    QuestionManager private questionManager;
    RewardManager private rewardManager;
    ValidationManager private validationManager;

    constructor(address[] memory _admins, uint8 requiredValidations) MultiSig(_admins, requiredValidations) {
        userRegistry = new UserRegistry(this, _admins);
        questionManager = new QuestionManager(this, userRegistry);
        rewardManager = new RewardManager(this, questionManager, userRegistry);
        validationManager = new ValidationManager(this, questionManager);
    }

    function newAdmin(address _addr) public override onlyAdmin {
        require(userRegistry.isRegistered(_addr), "Trying to make an unregistered user admin");
        super.newAdmin(addr);
    }

    // UserRegistry functions
    function register() external {
        userRegistry.createAccount();
    }

    function setRegistrationPayment(uint256 _newPayment, uint256 _mtxId) external onlyAdmin {
        userRegistry.setRegistrationPayment(_newPayment, _mtxId);
    }

    function getRegistrationFee() external returns (uint256) {
        return userRegistry.registrationFee();
    }

    function getTotalUsers() external returns (uint256) {
        return userRegistry.totalUsers();
    }

    function getUser(address _addr) external returns (UserRegistry.User) {
        return userRegistry.users(_addr);
    }

    function userHasPredicted(address _addr, uint256 _quesId) external returns (bool) {
        return userRegistry.hasPredicted(_quesId, _addr);
    }

    function isRegistered(address _addr) external view returns (bool) {
        return userRegistry.isRegistered(_addr);
    }
}