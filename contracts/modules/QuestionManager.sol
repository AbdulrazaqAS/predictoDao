// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MultiSig.sol";
import "./UserRegistry.sol";

contract QuestionManager {
    struct Prediction {
        string question;
        string[] answers;
        uint256 deadline;
        uint256 reward;
        bool rewardDistributed;
        mapping(uint256 => address[]) predictions;  // ans_idx => users that go for it
        ValidAnswer validAnswer;
    }

    struct ValidAnswer {
        int8 ansId;  // id of answer from pred answers
        ValidAnswerStatus status;
        string answer;
        string[] references;
    }

    enum ValidAnswerStatus {
        ONGOING,
        PENDING,
        VALIDATED
    }

    uint256 public addAnswerFee = 0.005 ether;
    uint8 public minStringBytes = 4;
    uint256 public minDuration = 6 hours;
    uint256 public totalPredictions;
    // TODO: Add int for answered/expired questions

    mapping(uint256 => Prediction) public predictions;

    MultiSig private multisig;
    UserRegistry private userRegistry;

    event MinStringBytesChanged(uint256 oldLength, uint256 newLength, uint256 mtxId);
    event MinDurationChanged(uint256 oldValue, uint256 newValue, uint256 mtxId);
    event AddAnswerFeeChanged(uint256 oldFee, uint256 newFee, uint256 mtxId);
    event NewPrediction(uint256 predId, address indexed admin);
    event NewAnswerAdded(uint256 indexed predId, uint256 ansId);
    event PredictionAnswerVoted(uint256 indexed predId, address indexed user, uint256 answerIdx);

    constructor (MultiSig _multisig, UserRegistry _userRegistry) {
        multisig = _multisig;
        userRegistry = _userRegistry;
    }

    // TODO: onlyAdmin or if caller sends eth which will be used for prize and fee
    // TODO: Prevent same question multiple times
    function newQuestion(string memory _question, string[] memory _someAnswers, uint256 _duration) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        require(_duration >= minDuration, "Duration must be greater than minDuration");
        uint256 questionBytes = bytes(_question).length;
        require(questionBytes >= minStringBytes && questionBytes <= 32, "Invalid question length");
        uint256 answerBytes;
        for(uint256 i;i<_someAnswers.length;i++){
            answerBytes = bytes(_someAnswers[i]).length;
            require(answerBytes >= minStringBytes  && answerBytes <= 32, "Invalid answer length");
        }

        Prediction storage pred = predictions[totalPredictions];
        pred.question = _question;
        pred.answers = _someAnswers;
        pred.deadline = block.timestamp + _duration;
        pred.validAnswer.status = ValidAnswerStatus.ONGOING;

        emit NewPrediction(totalPredictions, msg.sender);
        totalPredictions++;
    }

    function predict(uint256 pred_id, uint8 answer_idx) external {
        require(userRegistry.isRegistered(msg.sender), "User not registered");
        require(isValidPredictionId(pred_id), "Invalid prediction ID");
        require(isValidAnswerIndex(pred_id, answer_idx), "Invalid answer index");
        require(!multisig.isAdmin(msg.sender), "An admin can't make a prediction.");
        // require(!userRegistry.hasPredicted(pred_id, msg.sender), "Already predicted for this prediction");
        
        Prediction storage pred = predictions[pred_id];
        require(block.timestamp < pred.deadline, "Prediction timeout.");

        userRegistry.markHasPredicted(msg.sender, pred_id);
        pred.predictions[answer_idx].push(msg.sender);

        emit PredictionAnswerVoted(pred_id, msg.sender, answer_idx);
    }

    function addAnswer(uint256 pred_id, string memory _answer) external payable {
        require(userRegistry.isRegistered(msg.sender), "User not registered");
        require(multisig.isAdmin(msg.sender) || msg.value == addAnswerFee, "Payment must be same as newAnswerFee");
        require(isValidPredictionId(pred_id), "Invalid prediction ID");
        require(bytes(_answer).length >= minStringBytes && bytes(_answer).length <=32, "Invalid answer length");
        require(!userRegistry.hasPredicted(pred_id, msg.sender), "Already predicted for this prediction");
        
        Prediction storage pred = predictions[pred_id];
        require(pred.validAnswer.status == ValidAnswerStatus.ONGOING, "Prediction not ongoing");
        require(pred.deadline >= block.number, "Prediction has ended");
        
        uint256 ansId = pred.answers.length;
        pred.answers.push(_answer);

        emit NewAnswerAdded(pred_id, ansId);
    }

    function setReward(uint256 _quesId, uint256 _amount) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        require(_amount > 0, "Amount must be > 0");
        require(isValidPredictionId(_quesId), "Invalid Prediction ID");
        predictions[_quesId].reward = _amount;
    }

    function updateValidAnswerToPending(uint256 _quesId, int8 _answerIdx, string memory _answer, string[] memory _references) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        require(isValidPredictionId(_quesId), "Invalid prediction ID");
        require(block.timestamp > predictions[_quesId].deadline, "Prediction still ongoing");
        require(_answerIdx == -1 || isValidAnswerIndex(_quesId, uint8(_answerIdx)), "Invalid answer index");
        // TODO: if _answerIdx >= 0, validate whether _answer is in prediction's answers list.

        ValidAnswer storage validAnswer = predictions[_quesId].validAnswer;
        validAnswer.ansId = _answerIdx;
        validAnswer.answer = _answer;
        validAnswer.status = ValidAnswerStatus.PENDING;
        validAnswer.references = _references;
    }

    function validatePendingAnswer(uint256 _quesId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        ValidAnswer storage validAnswer = predictions[_quesId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.PENDING, "Answer not in Validation queue");
        
        validAnswer.status = ValidAnswerStatus.VALIDATED;
    }

    function markRewardDistributed(uint256 _quesId) external {
        require(multisig.isAdmin(msg.sender), "Not an admin");

        Prediction storage pred = predictions[_quesId];
        require(!pred.rewardDistributed, "Reward has already been distributed");
        require(isValidPredictionId(_quesId), "Invalid Prediction ID");
        pred.rewardDistributed = true;
    }

    function setNewAnswerFee(uint256 _newFee, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, bool confirmed, , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.AddAnswerFeeChange, "Multisig transaction type not compatible with this function.");
        require(confirmed, "No enough confirmations to execute this function.");
        require(_newFee >= 0, "Amount must be positive");

        multisig.markExecuted(_mtxId);
        uint256 oldFee = addAnswerFee;
        addAnswerFee = _newFee;

        emit AddAnswerFeeChanged(oldFee, _newFee, _mtxId);
    }

    function setMinStringBytes(uint8 _newLength, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, bool confirmed, , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        require(confirmed, "No enough confirmations to execute this function.");
        require(_newLength > 0, "Length must be greater than zero");

        multisig.markExecuted(_mtxId);
        uint256 oldLength = minStringBytes;
        minStringBytes = _newLength;

        emit MinStringBytesChanged(oldLength, _newLength, _mtxId);
    }

    function setMinDuration(uint256 _newValue, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, bool confirmed, , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        require(confirmed, "No enough confirmations to execute this function.");
        require(_newValue >= 60, "Duration must be greater than or equal to 60 secs");
        
        multisig.markExecuted(_mtxId);
        uint256 oldValue = minDuration;
        minDuration = _newValue;

        emit MinDurationChanged(oldValue, _newValue, _mtxId);
    }

    function getQuestionResult(uint256 _quesId) external view returns(uint256[] memory) {
        require(isValidPredictionId(_quesId), "Invalid Prediction ID");
        uint256 answers = predictions[_quesId].answers.length;
        uint256[] memory results = new uint256[](answers);

        for (uint i=0;i<answers;i++){
            results[i] = predictions[_quesId].predictions[i].length;
        }

        return results;
    }

    function getAnswerVoters(uint256 _quesId, uint256 answer_idx) external view returns (address[] memory) {
        require(isValidPredictionId(_quesId), "Invalid Prediction ID");
        require(isValidAnswerIndex(_quesId, answer_idx), "Invalid answer index");
        
        return predictions[_quesId].predictions[answer_idx];
    }

    function getQuestionAnswers(uint256 _quesId) external view returns (string[] memory){
        require(isValidPredictionId(_quesId), "Invalid Prediction ID");
        return predictions[_quesId].answers;
    }

    function getQuestionAnswersCount(uint256 pred_id) external view returns (uint256){
        require(pred_id < totalPredictions && pred_id >= 0, "Invalid Prediction ID");
        return predictions[pred_id].answers.length;
    }

    function getQuestionValidAnswer(uint256 _quesId) external view returns (ValidAnswer memory){
        require(isValidPredictionId(_quesId), "Invalid prediction ID");
        ValidAnswer memory validAnswer = predictions[_quesId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.VALIDATED, "No answer is validated yet");
        return validAnswer;
    }

    function getValidAnswerReferences(uint256 _predId) external view returns (string[] memory){
        require(isValidPredictionId(_predId), "Invalid prediction Id");
        ValidAnswer memory validAnswer = predictions[_predId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.VALIDATED, "No answer is validated yet");
        return validAnswer.references;
    }

    function isValidPredictionId(uint256 _predId) internal view returns (bool){
        if (_predId >= totalPredictions || _predId < 0) return false;
        return true;
    }

    function isValidAnswerIndex(uint256 _predId, uint256 _answerIdx) internal view returns(bool) {
        if (_answerIdx < 0 || _answerIdx >= predictions[_predId].answers.length) return false;
        return true;
    }
}