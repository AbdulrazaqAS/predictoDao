// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./modules/UserRegistry.sol";
import "./modules/QuestionManager.sol";
import "./modules/RewardManager.sol";
import "./modules/ValidationManager.sol";
import "./modules/MultiSig.sol";

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
        super.newAdmin(_addr);
    }

    // UserRegistry functions
    function register() external {
        userRegistry.createAccount();
    }

    function setRegistrationPayment(uint256 _newPayment, uint256 _mtxId) external onlyAdmin {
        userRegistry.setRegistrationPayment(_newPayment, _mtxId);
    }

    function getRegistrationFee() external view returns (uint256) {
        return userRegistry.registrationFee();
    }

    function getTotalUsers() external view returns (uint256) {
        return userRegistry.totalUsers();
    }

    function getUser(address _addr) external view returns (bool, uint256) {
        return userRegistry.users(_addr);
    }

    function userHasPredicted(address _addr, uint256 _quesId) external view returns (bool) {
        return userRegistry.hasPredicted(_quesId, _addr);
    }

    function isRegistered(address _addr) external view returns (bool) {
        return userRegistry.isRegistered(_addr);
    }

    // QuestionManager functions
    function newQuestion(string memory _question, string[] memory _someAnswers, uint256 _duration) external onlyAdmin {
        questionManager.newQuestion( _question, _someAnswers, _duration);
    }

    function predict(uint256 _quesId, uint8 _answer_idx) external {
        questionManager.predict(_quesId, _answer_idx);
    }

    function addAnswer(uint256 _quesId, string memory _answer) external payable {
        questionManager.addAnswer(_quesId, _answer);
    }

    function updateValidAnswerToPending(uint256 _quesId, int8 _answerIdx, string memory _answer, string[] memory _references) external onlyAdmin {
        questionManager.updateValidAnswerToPending(_quesId, _answerIdx, _answer, _references);
    }

    function validatePendingAnswer(uint256 _quesId) external onlyAdmin {
        questionManager.validatePendingAnswer(_quesId);
    }

    function setNewAnswerFee(uint256 _newFee, uint256 _mtxId) external onlyAdmin {
        questionManager.setNewAnswerFee(_newFee, _mtxId);
    }

    function setMinStringBytes(uint8 _newLength, uint256 _mtxId) external onlyAdmin {
        questionManager.setMinStringBytes(_newLength, _mtxId);
    }

    function setMinDuration(uint256 _newValue, uint256 _mtxId) external onlyAdmin {
        questionManager.setMinDuration(_newValue, _mtxId);
    }

    function getQuestionResult(uint _quesId) external view returns(uint256[] memory) {
        return questionManager.getQuestionResult(_quesId);
    }

    function getAnswerVoters(uint256 _quesId, uint256 answer_idx) external view returns (address[] memory) {
        return questionManager.getAnswerVoters(_quesId, answer_idx);
    }

    function getQuestionAnswers(uint256 _quesId) external view returns (string[] memory){
        return questionManager.getQuestionAnswers(_quesId);
    }

    function getQuestionAnswersCount(uint256 _quesId) external view returns (uint256){
        return questionManager.getQuestionAnswersCount(_quesId);
    }

    function getQuestionValidAnswer(uint256 _quesId) external view returns (QuestionManager.ValidAnswer memory){
        return questionManager.getQuestionValidAnswer(_quesId);
    }

    function getValidAnswerReferences(uint256 _quesId) external view returns (string[] memory){
        return questionManager.getValidAnswerReferences(_quesId);
    }

    function getQuestion(uint256 _quesId) external view returns (string memory, uint256, uint256, bool, QuestionManager.ValidAnswer memory) {
        return questionManager.predictions(_quesId);
    }

    function getAddAnswerFee() external view returns (uint256) {
        return questionManager.addAnswerFee();
    }

    function getMinStringBytes() external view returns (uint8) {
        return questionManager.minStringBytes();
    }

    function getMinDuration() external view returns (uint256) {
        return questionManager.minDuration();
    }

    function getTotalPredictions() external view returns (uint256) {
        return questionManager.totalPredictions();
    }

    // ValidationManager functions
    function setAnswerToPendingValidation(uint256 _quesId, int8 _answerIdx, string memory _answer, string[] memory _references) external onlyAdmin {
        validationManager.setAnswerToPendingValidation(_quesId, _answerIdx, _answer, _references);
    }

    function validatePendingAnswer(uint256 _quesId, uint256 _mtxId) external onlyAdmin {
        validationManager.validatePendingAnswer(_quesId, _mtxId);
    }

    // RewardManager functions
    function setReward(uint256 _quesId, uint256 _amount) external onlyAdmin {
        rewardManager.setReward(_quesId, _amount);
    }

    function distributeReward(uint256 _quesId, uint256 _mtxId) external onlyAdmin {
        rewardManager.distributeReward(_quesId, _mtxId);
    }

    function getLockedAmount() external view returns (uint256) {
        return rewardManager.lockedAmount();
    }
}