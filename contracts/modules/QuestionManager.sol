// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";

contract QuestionManager is AccessManaged {
    struct Question {
        string question;
        string[] answers;
        uint256 deadline;
        uint256 reward;
        bool rewardDistributed;
        mapping(uint256 => address[]) predictions;  // ans_idx => users that go for it
        ValidAnswer validAnswer;
        string imageUrl;
    }

    struct ValidAnswer {
        int8 ansId;  // id of answer from ques answers
        ValidAnswerStatus status;
        string answer;
    }

    enum ValidAnswerStatus {
        ONGOING,
        PENDING,
        VALIDATED
    }

    uint8 public minStringBytes = 4;
    uint256 public minDuration = 6 hours;
    uint256 public totalPredictions;
    // TODO: Add int for answered/expired questions

    mapping(uint256 => Question) public questions;
    mapping(uint256 => mapping(address => bool)) public hasPredicted;

    event MinStringBytesChanged(uint256 oldLength, uint256 newLength);
    event MinDurationChanged(uint256 oldValue, uint256 newValue);
    event NewPrediction(uint256 quesId, address indexed admin);
    event NewAnswerAdded(uint256 indexed quesId, uint256 ansId);
    event PredictionAnswerVoted(uint256 indexed quesId, address indexed user, uint256 answerIdx);
    event PendingValidAnswer(uint256 quesId);
    event PendingAnswerValidated(uint256 quesId);

    error InvalidAnswerIndex(uint8 idx);
    error InvalidQuestionId(uint256 id);

    // TODO: Have min answers per question (max of int8)
    // TODO: Shorten revert strings
    constructor (address manager) AccessManaged(manager){}

    // TODO: others can pay to add
    // TODO: Prevent same question multiple times
    // To QUESTION_MANAGER
    function newQuestion(string memory _question, string[] memory _someAnswers, uint256 _duration, string memory imageUrl) external restricted {
        require(_duration >= minDuration, "Duration must be greater than minDuration");
        uint256 questionBytes = bytes(_question).length;
        require(questionBytes >= minStringBytes && questionBytes <= 32, "Invalid question length");
        require(bytes(imageUrl).length > 0, "Invalid image url"); 
        uint256 answerBytes;
        for(uint256 i;i<_someAnswers.length;i++){
            answerBytes = bytes(_someAnswers[i]).length;
            require(answerBytes >= minStringBytes  && answerBytes <= 32, "Invalid answer length");
        }

        Question storage ques = questions[totalPredictions];
        ques.question = _question;
        ques.answers = _someAnswers;
        ques.deadline = block.timestamp + _duration;
        ques.validAnswer.status = ValidAnswerStatus.ONGOING;

        totalPredictions++;
        emit NewPrediction(totalPredictions, msg.sender);
    }

    // To PREDICTER
    function predict(uint256 _quesId, uint8 _ansIdx) external restricted {
        require(!hasPredicted[_quesId][msg.sender], "Already predicted for this Question");
        
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        if (!isValidAnswerIndex(_quesId, _ansIdx)) revert InvalidAnswerIndex(_ansIdx);
        
        Question storage ques = questions[_quesId];
        require(block.timestamp < ques.deadline, "Question timeout.");

        hasPredicted[_quesId][msg.sender] = true;
        ques.predictions[_ansIdx].push(msg.sender);

        emit PredictionAnswerVoted(_quesId, msg.sender, _ansIdx);
    }

    // TODO: Let others pay to add a new answer
    // To QUESTION_MANAGER
    function addAnswer(uint256 _quesId, string memory _answer) external restricted {
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        require(bytes(_answer).length >= minStringBytes && bytes(_answer).length <=32, "Invalid answer length");
        
        Question storage ques = questions[_quesId];
        require(ques.validAnswer.status == ValidAnswerStatus.ONGOING, "Prediction not ongoing");
        require(ques.deadline >= block.number, "Prediction has ended");
        
        uint256 ansId = ques.answers.length;
        ques.answers.push(_answer);

        emit NewAnswerAdded(_quesId, ansId);
    }

    // To FUNDS_MANAGER
    function setReward(uint256 _quesId, uint256 _amount) external restricted {
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        require(_amount > 0, "Amount must be > 0");

        Question storage ques = questions[_quesId];
        require(!ques.rewardDistributed, "Can't update reward when it is distributedd");

        questions[_quesId].reward = _amount;
    }

    // To QUESTION_MANAGER
    function updateValidAnswerToPending(uint256 _quesId, int8 _answerIdx, string memory _answer) external restricted {
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        if (_answerIdx != -1 && !isValidAnswerIndex(_quesId, uint8(_answerIdx))) revert InvalidAnswerIndex(uint8(_answerIdx));

        require(block.timestamp > questions[_quesId].deadline, "Prediction still ongoing");
        // TODO: if _answerIdx >= 0, validate whether _answer is in Question's answers list.

        ValidAnswer storage validAnswer = questions[_quesId].validAnswer;
        validAnswer.ansId = _answerIdx;
        validAnswer.answer = _answer;
        validAnswer.status = ValidAnswerStatus.PENDING;

        emit PendingValidAnswer(_quesId);
    }

    // AnswerValidator
    function validatePendingAnswer(uint256 _quesId) external restricted {
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        ValidAnswer storage validAnswer = questions[_quesId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.PENDING, "Answer not in Validation queue");
        
        validAnswer.status = ValidAnswerStatus.VALIDATED;

        emit PendingAnswerValidated(_quesId);
    }

    // To QUESTION_MANAGER
    function setMinStringBytes(uint8 _newLength) external restricted {
        require(_newLength > 0, "Length must be greater than zero");

        uint256 oldLength = minStringBytes;
        minStringBytes = _newLength;

        emit MinStringBytesChanged(oldLength, _newLength);
    }

    // To QUESTION_MANAGER
    function setMinDuration(uint256 _newValue) external restricted {
        require(_newValue >= 60, "Duration must be greater than or equal to 60 secs");
        
        uint256 oldValue = minDuration;
        minDuration = _newValue;

        emit MinDurationChanged(oldValue, _newValue);
    }

    function getQuestionResult(uint256 _quesId) external view returns(uint256[] memory) {
        require(isValidQuestionId(_quesId), "Invalid Question ID");
        uint256 answers = questions[_quesId].answers.length;
        uint256[] memory results = new uint256[](answers);

        for (uint i=0;i<answers;i++){
            results[i] = questions[_quesId].predictions[i].length;
        }

        return results;
    }

    function getAnswerVoters(uint256 _quesId, uint8 _ansIdx) public view returns (address[] memory) {
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        if (!isValidAnswerIndex(_quesId, _ansIdx)) revert InvalidAnswerIndex(_ansIdx);
        
        return questions[_quesId].predictions[_ansIdx];
    }

    function getQuestionAnswers(uint256 _quesId) external view returns (string[] memory){
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        return questions[_quesId].answers;
    }

    function getQuestionAnswersCount(uint256 _quesId) external view returns (uint256){
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        return questions[_quesId].answers.length;
    }

    function getQuestionValidAnswer(uint256 _quesId) external view returns (ValidAnswer memory){
        if (!isValidQuestionId(_quesId)) revert InvalidQuestionId(_quesId);
        ValidAnswer memory validAnswer = questions[_quesId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.VALIDATED, "No answer is validated yet");
        return validAnswer;
    }

    function isValidQuestionId(uint256 _quesId) internal view returns (bool){
        if (_quesId >= totalPredictions || _quesId < 0) return false;
        return true;
    }

    function isValidAnswerIndex(uint256 _quesId, uint8 _answerIdx) internal view returns(bool) {
        if (_answerIdx < 0 || _answerIdx >= questions[_quesId].answers.length) return false;
        return true;
    }
}