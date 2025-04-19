// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

contract Forecast {
    struct Prediction {
        string question;
        string[] answers;
        mapping(uint256 => address[]) predictions;  // ans_idx => users that go for it
        uint256 deadline;
        ValidAnswer validAnswer;
    }

    struct ValidAnswer {
        int256 id;
        bool available;
        string answer;
        string[] references;
    }

    struct User {
        bool isRegistered;
        bool isAdmin;
    }
    
    uint256 public registrationPayment = 0.005 ether;
    uint256 public totalUsers;
    uint256 public totalPredictions;
    uint256 public minStringBytes = 4;
    uint256 public minDuration = 6 hours;
    uint256 public requiredValidations = 1;

    address public owner;
    address[] public admins;
    mapping(address => User) public users;
    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => mapping(address => bool)) public hasPredicted;
    mapping(uint256 => mapping(address => bool)) public validations;

    modifier onlyAdmin(){
        require(users[msg.sender].isAdmin, "Only admin can call this function");
        _;
    }

    modifier onlyRegistered(){
        require(users[msg.sender].isRegistered, "User not registered yet.");
        _;
    }
    
    event NewAdmin(address addr);
    event NewUser(address addr);
    event NewPrediction(uint256 id);
    event PredictionAnswerVoted(uint256 indexed id, uint256 answerIdx);
    event ValidAnswerSelected(uint256 indexed predId, address validator);
    event RegistrationPaymentChanged(uint256 oldPayment, uint256 newPayment);
    event MinStringBytesChanged(uint256 oldLength, uint256 newLength);

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

        emit NewPrediction(totalPredictions);
        totalPredictions++;
    }

    function predict(uint256 pred_id, uint256 answer_idx) external onlyRegistered{
        require(isValidPredictionId(pred_id), "Invalid prediction ID");
        require(isValidAnswerIndex(pred_id, answer_idx), "Invalid answer index");
        require(!hasPredicted[pred_id][msg.sender], "Already predicted for this prediction");
        
        Prediction storage pred = predictions[pred_id];
        require(block.timestamp < pred.deadline, "Prediction timeout.");

        pred.predictions[answer_idx].push(msg.sender);
        hasPredicted[pred_id][msg.sender] = true;

        emit PredictionAnswerVoted(pred_id, answer_idx);
    }

    // Not needed with getPredictionAnswers function
    function getAnswerAtIndex(uint256 pred_id, uint256 ans_idx) external view returns (string memory) {
        require(pred_id < totalPredictions && pred_id >= 0, "Invalid Prediction ID");
        require(ans_idx < predictions[pred_id].answers.length && ans_idx >= 0, "Invalid answer index");

        return predictions[pred_id].answers[ans_idx];
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

    // TODO: Make it require validations by multiple admins.
    function setRegistrationPayment(uint256 _newPayment) external onlyAdmin {
        require(_newPayment >= 0, "Amount must be positive");
        uint256 oldPayment = registrationPayment;
        registrationPayment = _newPayment;

        emit RegistrationPaymentChanged(oldPayment, _newPayment);
    }

    // TODO: Multisig
    function setMinStringBytes(uint256 _newLength) external onlyAdmin {
        require(_newLength > 0, "Length must be greater than zero");
        uint256 oldLength = minStringBytes;
        minStringBytes = _newLength;

        emit MinStringBytesChanged(oldLength, _newLength);
    }

    function setValidAnswer(uint256 _predId, int256 _answerIdx, string memory _answer, string[] memory _references) external onlyAdmin {
        require(block.timestamp > predictions[_predId].deadline, "Prediction still ongoing");
        require(isValidPredictionId(_predId), "Invalid prediction ID");
        require(_answerIdx == -1 || isValidAnswerIndex(_predId, uint256(_answerIdx)), "Invalid answer index");
        // TODO: if _answerIdx >= 0, validate _answer is in prediction's answers list.
                                                
        ValidAnswer storage validAnswer = predictions[_predId].validAnswer;
        validAnswer.id = _answerIdx;
        validAnswer.available = true;
        validAnswer.answer = _answer;
        validAnswer.references = _references;

        emit ValidAnswerSelected(_predId, msg.sender);
    }

    function getValidAnswer(uint256 _predId) external view returns (string memory){
        require(isValidPredictionId(_predId), "Invalid prediction ID");
        ValidAnswer storage validAnswer = predictions[_predId].validAnswer;
        require(validAnswer.available, "No answer is validated yet");
        return validAnswer.answer;
    }

    function getValidAnswerReferences(uint256 _predId) external view returns (string[] memory){
        require(isValidPredictionId(_predId), "Invalid prediction Id");
        require(predictions[_predId].validAnswer.available, "No answer validated for this prediction yet");
        return predictions[_predId].validAnswer.references;
    }
}