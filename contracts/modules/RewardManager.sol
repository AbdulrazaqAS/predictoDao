// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MultiSig.sol";
import "./UserRegistry.sol";
import "./QuestionManager.sol";

contract RewardManager {
    uint256 public lockedAmount;  // amount assigned for distribution

    MultiSig private multisig;
    QuestionManager private quesManager;
    UserRegistry private userRegistry;

    event RewardDistributed(uint256 predId, uint256 mtxId);

    constructor(MultiSig _multisig, QuestionManager _quesManager, UserRegistry _userRegistry) {
        multisig = _multisig;
        quesManager = _quesManager;
        userRegistry = _userRegistry;
    }

    function setReward(uint256 _quesId, uint256 _amount) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, , uint256 reward, bool rewardDistributed, ) = quesManager.predictions(_quesId);
        require(!rewardDistributed, "Can't update reward when it is distributedd");
        unchecked {
            uint256 availableFunds = address(this).balance - lockedAmount - reward;  // - reward useful when updating the amount  // Can be -ve, handle it.
            require(availableFunds >= _amount, "Insufficient available funds to cover amount");
        }

        quesManager.updateReward(_quesId, _amount);
        uint256 prevAmount = reward;
        lockedAmount = lockedAmount - prevAmount + _amount;
    }

    function distributeReward(uint256 _quesId, uint256 _mtxId) external {
        // require(multisig.isAdmin(msg.sender), "Not an admin");

        (, , , MultiSig.MultisigTxType txType,) = multisig.multisigTxs(_mtxId);
        require(txType == MultiSig.MultisigTxType.DistributeReward, "Multisig transaction type not compatible with this function.");
        // require(confirmed, "No enough confirmations to execute this function.");
        
        (, , uint256 reward, , QuestionManager.ValidAnswer memory validAns) = quesManager.predictions(_quesId);
        require(reward > 0, "No reward assigned for this Question.");
        require(validAns.status == QuestionManager.ValidAnswerStatus.VALIDATED, "An answer must be validated to distribute reward");
        
        multisig.markExecuted(_mtxId);
        quesManager.markRewardDistributed(_quesId);
        lockedAmount -= reward;
        
        int256 validAnswerIdx = validAns.ansId;
        if (validAnswerIdx != -1) {  // -1 when the valid answer in not in the array
            // TODO: the amount per user can be insignificantly small. Have a min withdraw
            address[] memory winners = quesManager.getAnswerVoters(_quesId, uint256(validAnswerIdx));
            uint256 amountPerWinner = reward / winners.length;
            for (uint256 i=0;i<=winners.length;i++) {
                userRegistry.increaseUserBalance(winners[i], amountPerWinner);
            }
        }

        emit RewardDistributed(_quesId, _mtxId);
    }
}