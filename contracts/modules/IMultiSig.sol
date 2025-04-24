// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IMultiSig {
    enum MultisigTxType {
        AddAdmin,
        RemoveAdmin,
        ValidateAnswer,
        RegistrationPaymentChange,
        AddAnswerFeeChange,
        MinStringBytesChange,
        MinDurationChange,
        RequiredValidationsChange,
        DistributeReward,
        TokenChange
    }

    struct MultisigTx {
        uint256 id;
        bool confirmed;
        bool executed;
        MultisigTxType txType;
        uint256 confirmations;
    }

    function isAdmin(address addr) external view returns (bool);

    function confirmMultisigTx(uint256 txId) external;

    function markExecuted(uint256 txId) external;

    function submitMultisigTx(MultisigTxType txType) external returns (uint256);

    function newAdmin(address _addr, uint256 _mtxId) external;

    function removeAdmin(address _addr, uint256 _mtxId) external;

    function setRequiredValidations(uint256 _newValue, uint256 mtxId) external;

    function totalMultisigTxs() external view returns (uint256);

    function requiredValidations() external view returns (uint256);

    function admins(uint256 index) external view returns (address);

    function multisigTxs(uint256 txId) external view returns (
        uint256 id,
        bool confirmed,
        bool executed,
        MultisigTxType txType,
        uint256 confirmations
    );

    function multisigConfirmations(uint256 txId, address admin) external view returns (bool);
}