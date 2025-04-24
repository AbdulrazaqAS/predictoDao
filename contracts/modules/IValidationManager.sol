// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IValidationManager {
    function setAnswerToPendingValidation(uint256 _quesId, int8 _answerIdx, string memory _answer) external;
    function validatePendingAnswer(uint256 _quesId, uint256 _mtxId) external;
}