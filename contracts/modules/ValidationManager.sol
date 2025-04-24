// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IMultiSig.sol";
import "./IQuestionManager.sol";

contract ValidationManager {
    IMultiSig private multisig;
    IQuestionManager private quesManager;

    event ValidAnswerPending(uint256 predId, uint256 mtxId);  // mtxId: use it to confirm the mtx
    event PendingAnswerValidated(uint256 predId, uint256 mtxId);  // mtxId: mtx used for this

    constructor (address _multisig, address _quesManager){
        multisig = IMultiSig(_multisig);
        quesManager = IQuestionManager(_quesManager);
    }

    function setAnswerToPendingValidation(uint256 _quesId, int8 _answerIdx, string memory _answer) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        quesManager.updateValidAnswerToPending(_quesId, _answerIdx, _answer);

        uint256 txId = multisig.submitMultisigTx(IMultiSig.MultisigTxType.ValidateAnswer);

        emit ValidAnswerPending(_quesId, txId);
    }

    function validatePendingAnswer(uint256 _quesId, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");
        (, , , IMultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == IMultiSig.MultisigTxType.ValidateAnswer, "Multisig transaction type not compatible with this function.");
        // require(confirmed, "No enough confirmations to execute this function.");
        
        quesManager.validatePendingAnswer(_quesId);
        multisig.markExecuted(_mtxId);

        emit PendingAnswerValidated(_quesId, _mtxId);
    }
}