// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MultiSig.sol";
import "./QuestionManager.sol";

abstract contract ValidationManager {
    MultiSig private multisig;
    QuestionManager private quesManager;

    event ValidAnswerPending(uint256 predId, uint256 mtxId);  // mtxId: use it to confirm the mtx
    event PendingAnswerValidated(uint256 predId, uint256 mtxId);  // mtxId: mtx used for this

    constructor (MultiSig _multisig, QuestionManager _quesManager){
        multisig = _multisig;
        quesManager = _quesManager;
    }

    function setAnswerToPendingValidation(uint256 _predId, int256 _answerIdx, string memory _answer, string[] memory _references) external {
        require(multisig.isAdmin(msg.sender), "Not an admin");
        quesManager.updateValidAnswer(_predId, _answerIdx, _answer, _references);

        uint256 txId = multisig.submitMultisigTx(MultiSig.MultisigTxType.ValidateAnswer);

        emit ValidAnswerPending(_predId, txId);
    }

    function validatePendingAnswer(uint256 _predId, uint256 _mtxId) external {
        require(multisig.isAdmin(msg.sender), "Not an admin");
        (, bool confirmed, , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.ValidateAnswer, "Multisig transaction type not compatible with this function.");
        require(confirmed, "No enough confirmations to execute this function.");
        
        quesManager.validatePendingAnswer(_predId);
        multisig.markExecuted(_mtxId);

        emit PendingAnswerValidated(_predId, _mtxId);
    }
}