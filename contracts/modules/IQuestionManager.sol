// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IQuestionManager {
    enum ValidAnswerStatus {
        ONGOING,
        PENDING,
        VALIDATED
    }

    struct ValidAnswer {
        int8 ansId;
        ValidAnswerStatus status;
        string answer;
    }

    function totalPredictions() external view returns (uint256);
    function addAnswerFee() external view returns (uint256);
    function minStringBytes() external view returns (uint8);
    function minDuration() external view returns (uint256);
    function questions(uint256 _quesId) external view returns(string memory, uint256, uint256, bool, ValidAnswer memory, string memory);

    function newQuestion(string memory _question, string[] memory _someAnswers, uint256 _duration, string memory imageUrl) external;
    function predict(uint256 _quesId, uint8 answer_idx) external;
    function addAnswer(uint256 _quesId, string memory _answer) external;
    function updateReward(uint256 _quesId, uint256 _amount) external;
    function updateValidAnswerToPending(uint256 _quesId, int8 _answerIdx, string memory _answer) external;
    function validatePendingAnswer(uint256 _quesId) external;
    function markRewardDistributed(uint256 _quesId) external;
    function setNewAnswerFee(uint256 _newFee, uint256 _mtxId) external;
    function setMinStringBytes(uint8 _newLength, uint256 _mtxId) external;
    function setMinDuration(uint256 _newValue, uint256 _mtxId) external;

    function getQuestionResult(uint256 _quesId) external view returns(uint256[] memory);
    function getAnswerVoters(uint256 _quesId, uint256 answer_idx) external view returns (address[] memory);
    function getQuestionAnswers(uint256 _quesId) external view returns (string[] memory);
    function getQuestionAnswersCount(uint256 _quesId) external view returns (uint256);
    function getQuestionValidAnswer(uint256 _quesId) external view returns (ValidAnswer memory);
}
