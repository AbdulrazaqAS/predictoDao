// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

contract MultiSig {
    struct MultisigTx {
    uint256 id;
    bool confirmed;
    bool executed;
    MultisigTxType txType;
    uint256 confirmations;
    // TODO: Add purpose
    // TODO: Add created time, then don't execute it after some max time
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

    uint256 public totalMultisigTxs;
    uint256 public requiredValidations;

    address[] public admins;

    mapping(uint256 => MultisigTx) public multisigTxs;
    mapping(uint256 => mapping(address => bool)) public multisigConfirmations;

    event NewAdmin(address addr);
    event MultisigTxAdded(MultisigTxType indexed txType, uint256 mtxId);
    event MultisigTxConfirmation(MultisigTxType indexed txType, address indexed admin, uint256 mtxId);

    modifier onlyAdmin(){
        require(isAdmin(msg.sender), "Caller is not an admin");
        _;
    }

    // TODO: make it take an array. This is just for dev
    constructor(address _admin, uint8 _requiredValidations){
        require(_requiredValidations >= 1, "Required validations must be at least 1");
        //require(_admins.length >= _requiredValidations, "Admins must be at least requiredValidations");
        //admins = _admins;
        admins.push(_admin);
        requiredValidations = _requiredValidations;

        // should it emit the admins added?
    }

    function newAdmin(address _addr) virtual public {
        require(!isAdmin(_addr), "Address already an admin");
        admins.push(_addr);

        emit NewAdmin(_addr);
    }

    function isAdmin(address addr) public view returns (bool) {
        for (uint8 i = 0; i < admins.length; ++i){
            if (admins[i] == addr) return true;
        }
        return false;
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
}