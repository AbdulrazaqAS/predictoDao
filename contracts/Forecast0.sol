// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

contract Forecast {
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
        int256 ansId;  // id of answer from pred answers
        ValidAnswerStatus status;
        string answer;
        string[] references;
    }

    struct User {
        bool isRegistered;
        bool isAdmin;
    }

    struct MultisigTx {
        uint256 id;
        bool confirmed;
        bool executed;
        MultisigTxType txType;
        uint256 confirmations;
        // TODO: Add purpose
        // TODO: Add created time, then don't execute it after some max time
    }

    enum ValidAnswerStatus {
        ONGOING,
        PENDING,
        VALIDATED
    }

    enum MultisigTxType {
        ValidateAnswer,
        RegistrationPaymentChange,
        AddAnswerFeeChange,
        MinStringBytesChange,
        MinDurationChange,
        RequiredValidationsChange,
        DistributeReward
    }
    
    uint256 public registrationPayment = 0.005 ether;
    uint256 public addAnswerFee = 0.005 ether;  // to avoid spamming
    uint256 public lockedAmount;  // amount assigned for distribution
    //uint256 public minReward = 0.05 ether;
    uint256 public totalUsers;
    uint256 public totalPredictions;
    uint256 public totalMultisigTxs;
    uint256 public minStringBytes = 4;
    uint256 public minDuration = 6 hours;
    uint256 public requiredValidations = 1;

    address public owner;
    address[] public admins;
    mapping(address => User) public users;
    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => mapping(address => bool)) public hasPredicted;
    mapping(uint256 => MultisigTx) public multisigTxs;
    mapping(uint256 => mapping(address => bool)) public multisigConfirmations;

    modifier onlyAdmin(){
        require(users[msg.sender].isAdmin, "Only admin can call this function");
        _;
    }

    modifier onlyRegistered(){
        require(users[msg.sender].isRegistered, "User not registered yet.");
        _;
    }
    
    // Id meaning predId not answerIndex
    event NewAdmin(address addr);
    event NewUser(address addr);
    event NewPrediction(uint256 predId, address indexed admin);
    event NewAnswerAdded(uint256 indexed predId, uint256 ansId);
    event PredictionAnswerVoted(uint256 indexed predId, address indexed user, uint256 answerIdx);
    event ValidAnswerPending(uint256 predId, uint256 mtxId);  // mtxId: use it to confirm the mtx
    event PendingAnswerValidated(uint256 predId, uint256 mtxId);  // mtxId: mtx used for this
    event RegistrationPaymentChanged(uint256 oldPayment, uint256 newPayment, uint256 mtxId);  // mtxId: mtx used for this
    event MinStringBytesChanged(uint256 oldLength, uint256 newLength, uint256 mtxId);
    event RequiredValidationsChanged(uint256 oldVaue, uint256 newValue, uint256 mtxId);
    event MinDurationChanged(uint256 oldValue, uint256 newValue, uint256 mtxId);
    event AddAnswerFeeChanged(uint256 oldFee, uint256 newFee, uint256 mtxId);
    event MultisigTxAdded(MultisigTxType indexed txType, uint256 mtxId);
    event MultisigTxConfirmation(MultisigTxType indexed txType, address indexed admin, uint256 mtxId);
    event RewardDistributed(uint256 predId, uint256 mtxId);

    // TODO: require at least requiredValidations admin on deployment. Change requiredValidations from 1.
    constructor() {
        owner = msg.sender;

        users[owner].isAdmin = true;
        users[owner].isRegistered = true;
        admins.push(msg.sender);
        totalUsers++;

        emit NewUser(owner);
        emit NewAdmin(owner);
    }

    function createAccount() external payable {
        User storage user = users[msg.sender];

        require(!user.isRegistered, "User already registered");
        require(msg.value >= registrationPayment, "Insufficient registration payment");

        user.isRegistered = true;
        totalUsers++;

        emit NewUser(msg.sender);
    }

    function newAdmin(address addr) external onlyAdmin {
        require(users[addr].isRegistered, "Trying to make an unregistered user admin");
        users[addr].isAdmin = true;
        admins.push(msg.sender);

        emit NewAdmin(addr);
    }

    // TODO: onlyAdmin or if caller sends eth which will be used for prize and fee
    // TODO: Prevent same question multiple times
    function newPrediction(string memory _question, string[] memory _someAnswers, uint256 _duration) external onlyAdmin {
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

    function predict(uint256 pred_id, uint256 answer_idx) external onlyRegistered{
        require(isValidPredictionId(pred_id), "Invalid prediction ID");
        require(isValidAnswerIndex(pred_id, answer_idx), "Invalid answer index");
        require(!users[msg.sender].isAdmin, "An admin can't make a prediction.");
        require(!hasPredicted[pred_id][msg.sender], "Already predicted for this prediction");
        
        Prediction storage pred = predictions[pred_id];
        require(block.timestamp < pred.deadline, "Prediction timeout.");

        pred.predictions[answer_idx].push(msg.sender);
        hasPredicted[pred_id][msg.sender] = true;

        emit PredictionAnswerVoted(pred_id, msg.sender, answer_idx);
    }

    function addAnswer(uint256 pred_id, string memory _answer) external payable onlyRegistered{
        require(users[msg.sender].isAdmin || msg.value == addAnswerFee, "Payment must be same as newAnswerFee");
        require(isValidPredictionId(pred_id), "Invalid prediction ID");
        require(bytes(_answer).length >= minStringBytes && bytes(_answer).length <=32, "Invalid answer length");
        require(!hasPredicted[pred_id][msg.sender], "Already predicted for this prediction.");
        
        Prediction storage pred = predictions[pred_id];
        require(pred.validAnswer.status == ValidAnswerStatus.ONGOING, "Prediction not ongoing");
        require(pred.deadline >= block.number, "Prediction has ended");
        
        uint256 ansId = pred.answers.length;
        pred.answers.push(_answer);

        emit NewAnswerAdded(pred_id, ansId);
    }

    function getPredictionResults(uint _predId) external view returns(uint256[] memory) {
        require(isValidPredictionId(_predId), "Invalid Prediction ID");
        uint256 answers = predictions[_predId].answers.length;
        uint256[] memory results = new uint256[](answers);

        for (uint i=0;i<answers;i++){
            results[i] = predictions[_predId].predictions[i].length;
        }

        return results;
    }

    function getAnswerVoters(uint256 _predId, uint256 answer_idx) external view returns (address[] memory) {
        require(isValidPredictionId(_predId), "Invalid Prediction ID");
        require(isValidAnswerIndex(_predId, answer_idx), "Invalid answer index");
        
        return predictions[_predId].predictions[answer_idx];
    }

    function getPredictionAnswers(uint256 _predId) external view returns (string[] memory){
        require(isValidPredictionId(_predId), "Invalid Prediction ID");
        return predictions[_predId].answers;
    }

    function getPredictionAnswerCount(uint256 pred_id) external view returns (uint256){
        require(pred_id < totalPredictions && pred_id >= 0, "Invalid Prediction ID");
        return predictions[pred_id].answers.length;
    }

    function isValidPredictionId(uint256 _predId) internal view returns (bool){
        if (_predId >= totalPredictions || _predId < 0) return false;
        return true;
    }

    function isValidAnswerIndex(uint256 _predId, uint256 _answerIdx) internal view returns(bool) {
        if (_answerIdx < 0 || _answerIdx >= predictions[_predId].answers.length) return false;
        return true;
    }

    function distributeReward(uint256 _predId, uint256 _mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[_mtxId];
        require(!mtx.executed, "Multisig transaction already executed.");
        require(mtx.txType == MultisigTxType.DistributeReward, "Multisig transaction type not compatible with this function.");
        require(mtx.confirmed, "No enough confirmations to execute this function.");
        require(isValidPredictionId(_predId), "Invalid prediction id");
        
        Prediction storage pred = predictions[_predId];
        require(pred.reward > 0, "No reward assigned for this prediction.");
        require(pred.validAnswer.status == ValidAnswerStatus.VALIDATED, "An answer must be validated to distribute reward");
        
        int256 validAnswerIdx = pred.validAnswer.ansId;
        if (validAnswerIdx != -1) {  // -1 when the valid answer in not in the array
            // TODO: the amount per user can be insignificantly small. Instead, just have a min val
            // if it is smaller than that, randomly select some to stick to the min.
            address[] memory winners = pred.predictions[uint256(validAnswerIdx)];
            uint256 amountPerWinner = pred.reward / winners.length;
            for (uint256 i=0;i<=winners.length;i++) {
                payable(winners[i]).transfer(amountPerWinner);
            }
        }

        lockedAmount -= pred.reward;
        mtx.executed = true;
        pred.rewardDistributed = true;

        emit RewardDistributed(_predId, _mtxId);
    }

    function setReward(uint256 _predId, uint256 _amount) external onlyAdmin {
        require(isValidPredictionId(_predId), "Invalid Prediction ID");
        require(_amount > 0, "Amount must be > 0");
        
        Prediction storage pred = predictions[_predId];
        require(!pred.rewardDistributed, "Can't update reward when it is distributedd");
        uint256 availableFunds = address(this).balance - lockedAmount - pred.reward;  // - pred.reward useful when updating the amount  // Can be -ve, handle it.
        require(availableFunds >= _amount, "Insufficient available funds to cover amount");

        uint256 prevAmount = pred.reward;
        pred.reward = _amount;
        lockedAmount = lockedAmount - prevAmount + _amount;
    }

    function setRegistrationPayment(uint256 _newPayment, uint256 mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[mtxId];
        require(!mtx.executed, "Multisig transaction already executed.");
        require(mtx.txType == MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        require(mtx.confirmed, "No enough confirmations to execute this function.");
        require(_newPayment >= 0, "Amount must be positive");

        uint256 oldPayment = registrationPayment;
        registrationPayment = _newPayment;
        mtx.executed = true;

        emit RegistrationPaymentChanged(oldPayment, _newPayment, mtxId);
    }

    function setNewAnswerFee(uint256 _newFee, uint256 mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[mtxId];
        require(!mtx.executed, "Multisig transaction already executed.");
        require(mtx.txType == MultisigTxType.AddAnswerFeeChange, "Multisig transaction type not compatible with this function.");
        require(mtx.confirmed, "No enough confirmations to execute this function.");
        require(_newFee >= 0, "Amount must be positive");

        uint256 oldFee = addAnswerFee;
        addAnswerFee = _newFee;
        mtx.executed = true;

        emit AddAnswerFeeChanged(oldFee, _newFee, mtxId);
    }

    function setMinStringBytes(uint256 _newLength, uint256 mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[mtxId];
        require(!mtx.executed, "Multisig transaction already executed.");
        require(mtx.txType == MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        require(mtx.confirmed, "No enough confirmations to execute this function.");
        require(_newLength > 0, "Length must be greater than zero");

        uint256 oldLength = minStringBytes;
        minStringBytes = _newLength;
        mtx.executed = true;

        emit MinStringBytesChanged(oldLength, _newLength, mtxId);
    }

    function setMinDuration(uint256 _newValue, uint256 mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[mtxId];
        require(!mtx.executed, "Multisig transaction already executed.");
        require(mtx.txType == MultisigTxType.MinDurationChange, "Multisig transaction type not compatible with this function.");
        require(mtx.confirmed, "No enough confirmations to execute this function.");
        require(_newValue >= 60, "Duration must be greater than or equal to 60 secs");
        
        uint256 oldValue = minDuration;
        minDuration = _newValue;
        mtx.executed = true;

        emit MinDurationChanged(oldValue, _newValue, mtxId);
    }

    function setRequiredValidations(uint256 _newValue, uint256 mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[mtxId];
        require(!mtx.executed, "Multisig transaction already executed.");
        require(mtx.txType == MultisigTxType.RequiredValidationsChange, "Multisig transaction type not compatible with this function.");
        require(mtx.confirmed, "No enough confirmations to execute this function.");
        require(_newValue >= 1, "Value must be greater than zero");

        uint256 oldValue = requiredValidations;
        requiredValidations = _newValue;
        mtx.executed = true;

        emit RequiredValidationsChanged(oldValue, _newValue, mtxId);
    }
    
    function addMultisigTx(MultisigTxType txType) internal onlyAdmin returns(uint256){
        MultisigTx storage mtx = multisigTxs[totalMultisigTxs];
        mtx.id = totalMultisigTxs;
        mtx.txType = txType;

        emit MultisigTxAdded(txType, totalMultisigTxs);
        totalMultisigTxs++;

        return totalMultisigTxs - 1;
    }

    function confirmMultisigTx(uint256 txId) public onlyAdmin {
        require(!multisigConfirmations[txId][msg.sender], "You have already confirmed this transaction.");
        require(txId < totalMultisigTxs, "Invalid transaction ID");  // Prevent confirming an unitiated tx.

        MultisigTx storage mtx = multisigTxs[txId];
        require(!mtx.confirmed, "Transaction already confirmed.");
        mtx.confirmations++;
        multisigConfirmations[txId][msg.sender] = true;

        if (mtx.confirmations >= requiredValidations) mtx.confirmed = true;

        emit MultisigTxConfirmation(multisigTxs[txId].txType, msg.sender, txId);
    }

    function submitMultisigTx(MultisigTxType txType) external onlyAdmin {
        uint256 txId = addMultisigTx(txType);
        confirmMultisigTx(txId);
    }

    function setAnswerToPendingValidation(uint256 _predId, int256 _answerIdx, string memory _answer, string[] memory _references) external onlyAdmin {
        require(block.timestamp > predictions[_predId].deadline, "Prediction still ongoing");
        require(isValidPredictionId(_predId), "Invalid prediction ID");
        require(_answerIdx == -1 || isValidAnswerIndex(_predId, uint256(_answerIdx)), "Invalid answer index");
        // TODO: if _answerIdx >= 0, validate _answer is in prediction's answers list.

        ValidAnswer storage validAnswer = predictions[_predId].validAnswer;
        validAnswer.ansId = _answerIdx;
        validAnswer.answer = _answer;
        validAnswer.status = ValidAnswerStatus.PENDING;
        validAnswer.references = _references;

        uint256 txId = addMultisigTx(MultisigTxType.ValidateAnswer);
        confirmMultisigTx(txId);

        emit ValidAnswerPending(_predId, txId);
    }

    function validatePendingAnswer(uint256 _predId, uint256 mtxId) external onlyAdmin {
        ValidAnswer storage validAnswer = predictions[_predId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.PENDING, "Answer not in Validation queue");
        
        MultisigTx storage mtx = multisigTxs[mtxId];
        require(!mtx.executed, "Multisig transaction already executed.");
        require(mtx.txType == MultisigTxType.ValidateAnswer, "Multisig transaction type not compatible with this function.");
        require(mtx.confirmed, "No enough confirmations to execute this function.");
        
        validAnswer.status = ValidAnswerStatus.VALIDATED;
        mtx.executed = true;

        emit PendingAnswerValidated(_predId, mtxId);
    }

    function getValidAnswer(uint256 _predId) external view returns (string memory){
        require(isValidPredictionId(_predId), "Invalid prediction ID");
        ValidAnswer storage validAnswer = predictions[_predId].validAnswer;
        require(validAnswer.status == ValidAnswerStatus.VALIDATED, "No answer is validated yet");
        return validAnswer.answer;
    }

    function getValidAnswerReferences(uint256 _predId) external view returns (string[] memory){
        require(isValidPredictionId(_predId), "Invalid prediction Id");
        require(predictions[_predId].validAnswer.status == ValidAnswerStatus.VALIDATED, "No answer validated for this prediction yet");
        return predictions[_predId].validAnswer.references;
    }
}