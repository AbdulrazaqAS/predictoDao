// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MultiSig.sol";
import "./UserRegistry.sol";

contract QuestionManager {
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

    uint256 public addAnswerFee = 0.005 ether;
    uint8 public minStringBytes = 4;
    uint256 public minDuration = 6 hours;
    uint256 public totalPredictions;
    // TODO: Add int for answered/expired questions
    address token;

    mapping(uint256 => Question) public questions;

    MultiSig private multisig;
    UserRegistry private userRegistry;

    event MinStringBytesChanged(uint256 oldLength, uint256 newLength, uint256 mtxId);
    event MinDurationChanged(uint256 oldValue, uint256 newValue, uint256 mtxId);
    event AddAnswerFeeChanged(uint256 oldFee, uint256 newFee, uint256 mtxId);
    event NewPrediction(uint256 quesId, address indexed admin);
    event NewAnswerAdded(uint256 indexed quesId, uint256 ansId);
    event PredictionAnswerVoted(uint256 indexed quesId, address indexed user, uint256 answerIdx);

    constructor (MultiSig _multisig, UserRegistry _userRegistry, address _token) {
        multisig = _multisig;
        userRegistry = _userRegistry;
        token = _token;
    }

    // TODO: onlyAdmin or if caller sends eth which will be used for prize and fee
    // TODO: Prevent same question multiple times
    function newQuestion(string memory _question, string[] memory _someAnswers, uint256 _duration, string memory imageUrl) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
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

        emit NewPrediction(totalPredictions, msg.sender);
        totalPredictions++;
    }

    function predict(uint256 _quesId, uint8 answer_idx) external {
        require(userRegistry.isRegistered(msg.sender), "User not registered");
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        require(isValidAnswerIndex(_quesId, answer_idx), "Invalid answer index");
        require(!multisig.isAdmin(msg.sender), "An admin can't make a prediction.");
        
        Question storage ques = questions[_quesId];
        require(block.timestamp < ques.deadline, "Question timeout.");

        userRegistry.markHasPredicted(msg.sender, _quesId);
        ques.predictions[answer_idx].push(msg.sender);

        emit PredictionAnswerVoted(_quesId, msg.sender, answer_idx);
    }

    function addAnswer(uint256 _quesId, string memory _answer) external {
        require(userRegistry.isRegistered(msg.sender), "User not registered");
        // require(multisig.isAdmin(msg.sender) || msg.value == addAnswerFee, "Payment must be same as newAnswerFee");
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        require(bytes(_answer).length >= minStringBytes && bytes(_answer).length <=32, "Invalid answer length");
        require(!userRegistry.hasPredicted(_quesId, msg.sender), "Already predicted for this Question");
        
        if (!multisig.isAdmin(msg.sender)){
            bool sent = IERC20(token).transferFrom(msg.sender, address(this), addAnswerFee);
            require(sent, "Can't transfer tokens to contract from caller");
        }
        
        Question storage ques = questions[_quesId];
        require(ques.validAnswer.status == ValidAnswerStatus.ONGOING, "Prediction not ongoing");
        require(ques.deadline >= block.number, "Prediction has ended");
        
        uint256 ansId = ques.answers.length;
        ques.answers.push(_answer);

        emit NewAnswerAdded(_quesId, ansId);
    }

    function updateReward(uint256 _quesId, uint256 _amount) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        require(_amount > 0, "Amount must be > 0");
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        questions[_quesId].reward = _amount;
    }

    function updateValidAnswerToPending(uint256 _quesId, int8 _answerIdx, string memory _answer) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        require(block.timestamp > questions[_quesId].deadline, "Prediction still ongoing");
        require(_answerIdx == -1 || isValidAnswerIndex(_quesId, uint8(_answerIdx)), "Invalid answer index");
        // TODO: if _answerIdx >= 0, validate whether _answer is in Question's answers list.

        ValidAnswer storage validAnswer = questions[_quesId].validAnswer;
        validAnswer.ansId = _answerIdx;
        validAnswer.answer = _answer;
        validAnswer.status = ValidAnswerStatus.PENDING;
    }

    function validatePendingAnswer(uint256 _quesId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        ValidAnswer storage validAnswer = questions[_quesId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.PENDING, "Answer not in Validation queue");
        
        validAnswer.status = ValidAnswerStatus.VALIDATED;
    }

    function markRewardDistributed(uint256 _quesId) external {
        require(multisig.isAdmin(msg.sender), "Not an admin");

        Question storage ques = questions[_quesId];
        require(!ques.rewardDistributed, "Reward has already been distributed");
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        ques.rewardDistributed = true;
    }

    function setNewAnswerFee(uint256 _newFee, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, , , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.AddAnswerFeeChange, "Multisig transaction type not compatible with this function.");
        // require(confirmed, "No enough confirmations to execute this function.");
        require(_newFee >= 0, "Amount must be positive");

        multisig.markExecuted(_mtxId);
        uint256 oldFee = addAnswerFee;
        addAnswerFee = _newFee;

        emit AddAnswerFeeChanged(oldFee, _newFee, _mtxId);
    }

    function setMinStringBytes(uint8 _newLength, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, , , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        // require(confirmed, "No enough confirmations to execute this function.");
        require(_newLength > 0, "Length must be greater than zero");

        multisig.markExecuted(_mtxId);
        uint256 oldLength = minStringBytes;
        minStringBytes = _newLength;

        emit MinStringBytesChanged(oldLength, _newLength, _mtxId);
    }

    function setMinDuration(uint256 _newValue, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, , , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        // require(confirmed, "No enough confirmations to execute this function.");
        require(_newValue >= 60, "Duration must be greater than or equal to 60 secs");
        
        multisig.markExecuted(_mtxId);
        uint256 oldValue = minDuration;
        minDuration = _newValue;

        emit MinDurationChanged(oldValue, _newValue, _mtxId);
    }

    function getQuestionResult(uint256 _quesId) external view returns(uint256[] memory) {
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        uint256 answers = questions[_quesId].answers.length;
        uint256[] memory results = new uint256[](answers);

        for (uint i=0;i<answers;i++){
            results[i] = questions[_quesId].predictions[i].length;
        }

        return results;
    }

    function getAnswerVoters(uint256 _quesId, uint256 answer_idx) external view returns (address[] memory) {
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        require(isValidAnswerIndex(_quesId, answer_idx), "Invalid answer index");
        
        return questions[_quesId].predictions[answer_idx];
    }

    function getQuestionAnswers(uint256 _quesId) external view returns (string[] memory){
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        return questions[_quesId].answers;
    }

    function getQuestionAnswersCount(uint256 _quesId) external view returns (uint256){
        require(_quesId < totalPredictions && _quesId >= 0, "Invalid Question ID");
        return questions[_quesId].answers.length;
    }

    function getQuestionValidAnswer(uint256 _quesId) external view returns (ValidAnswer memory){
        require(isValidPredictionId(_quesId), "Invalid Question ID");
        ValidAnswer memory validAnswer = questions[_quesId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.VALIDATED, "No answer is validated yet");
        return validAnswer;
    }

    function isValidPredictionId(uint256 _quesId) internal view returns (bool){
        if (_quesId >= totalPredictions || _quesId < 0) return false;
        return true;
    }

    function isValidAnswerIndex(uint256 _quesId, uint256 _answerIdx) internal view returns(bool) {
        if (_answerIdx < 0 || _answerIdx >= questions[_quesId].answers.length) return false;
        return true;
    }
}