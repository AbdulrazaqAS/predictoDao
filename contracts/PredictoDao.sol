// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./modules/IUserRegistry.sol";
import "./modules/IQuestionManager.sol";
import "./modules/IRewardManager.sol";
import "./modules/IValidationManager.sol";
import "./modules/MultiSig.sol";


contract PredictoDao is MultiSig {
    IUserRegistry private userRegistry;
    IQuestionManager private questionManager;
    IRewardManager private rewardManager;
    IValidationManager private validationManager;

    address public token;

    event TokenChanged(address addr, uint256 mtxId);

    constructor(
        address[] memory _admins,
        uint8 requiredValidations,
        address _userRegistry,
        address _questionManager,
        address _rewardManager,
        address _validationManager
    ) MultiSig(_admins, requiredValidations) {
        userRegistry = IUserRegistry(_userRegistry);
        questionManager = IQuestionManager(_questionManager);
        rewardManager = IRewardManager(_rewardManager);
        validationManager = IValidationManager(_validationManager);
    }

    function changeToken(address _addr, uint256 _mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[_mtxId];
        require(mtx.txType == MultisigTxType.TokenChange, "Multisig transaction type not compatible with this function.");
        require(_addr != address(0), "Token address can't be address zero");

        markExecuted(_mtxId);
        token = _addr;

        emit TokenChanged(_addr, _mtxId);
    }

    function newAdmin(address _addr, uint256 _mtxId) public override onlyAdmin {
        require(userRegistry.isRegistered(_addr), "Trying to make an unregistered user admin");
        super.newAdmin(_addr, _mtxId);
    }

    // TODO: MAke multisig
    function setUserRegistry(address _addr) external onlyAdmin {
        userRegistry = IUserRegistry(_addr);
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
    function newQuestion(string memory _question, string[] memory _someAnswers, uint256 _duration, string memory _imageUrl) external onlyAdmin {
        questionManager.newQuestion( _question, _someAnswers, _duration, _imageUrl);
    }

    function predict(uint256 _quesId, uint8 _answer_idx) external {
        questionManager.predict(_quesId, _answer_idx);
    }

    function addAnswer(uint256 _quesId, string memory _answer) external {
        questionManager.addAnswer(_quesId, _answer);
    }

    function updateValidAnswerToPending(uint256 _quesId, int8 _answerIdx, string memory _answer) external onlyAdmin {
        questionManager.updateValidAnswerToPending(_quesId, _answerIdx, _answer);
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

    function getQuestionValidAnswer(uint256 _quesId) external view returns (IQuestionManager.ValidAnswer memory){
        return questionManager.getQuestionValidAnswer(_quesId);
    }

    function getQuestion(uint256 _quesId) external view returns (string memory, uint256, uint256, bool, IQuestionManager.ValidAnswer memory, string memory) {
        return questionManager.questions(_quesId);
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
    function setAnswerToPendingValidation(uint256 _quesId, int8 _answerIdx, string memory _answer) external onlyAdmin {
        validationManager.setAnswerToPendingValidation(_quesId, _answerIdx, _answer);
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