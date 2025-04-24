// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IRewardManager {
    function lockedAmount() external view returns (uint256);

    function setReward(uint256 _quesId, uint256 _amount) external;

    function distributeReward(uint256 _quesId, uint256 _mtxId) external;
}
