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

    uint256 public totalMultisigTxs = 1;  // 0 for tx to add admins
    uint256 public requiredValidations;

    address[] public admins;

    mapping(uint256 => MultisigTx) public multisigTxs;
    mapping(uint256 => mapping(address => bool)) public multisigConfirmations;

    event NewAdmin(address addr, uint256 mtxId);
    event MultisigTxAdded(MultisigTxType indexed txType, uint256 mtxId);
    event MultisigTxConfirmation(MultisigTxType indexed txType, address indexed admin, uint256 mtxId);
    event RequiredValidationsChanged(uint256 oldVaue, uint256 newValue, uint256 mtxId);

    modifier onlyAdmin(){
        require(isAdmin(msg.sender), "Caller is not an admin");
        _;
    }

    constructor(address[] memory _admins, uint8 _requiredValidations){
        require(_requiredValidations >= 1, "Required validations must be at least 1");
        require(_admins.length >= _requiredValidations, "Admins must be at least requiredValidations");

        requiredValidations = _requiredValidations;

        // Index 0 for tx to add admins
        MultisigTx storage mtx = multisigTxs[0];
        mtx.confirmations = _admins.length;
        mtx.txType = MultisigTxType.AddAdmin;
        mtx.confirmed = true;
        mtx.executed = true;

        for (uint8 i=0; i<_admins.length; i++){
            address admin = _admins[i];
            if (!isAdmin(admin)) admins.push(admin);  // handling duplicates
            else continue;

            emit NewAdmin(admin, 0);
        }
    }

    function newAdmin(address _addr, uint256 _mtxId) virtual public onlyAdmin {
        MultisigTx storage mtx = multisigTxs[_mtxId];
        require(mtx.txType == MultisigTxType.AddAdmin, "Multisig transaction type not compatible with this function.");
        require(!isAdmin(_addr), "Address already an admin");
        markExecuted(_mtxId);
        admins.push(_addr);

        emit NewAdmin(_addr, _mtxId);
    }

    function isAdmin(address addr) public view returns (bool) {
        for (uint8 i = 0; i < admins.length; ++i){
            if (admins[i] == addr) return true;
        }
        return false;
    }

    function addMultisigTx(MultisigTxType txType) private onlyAdmin returns(uint256){
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

    // TODO: Fix: When called directed (not through other func) by an admin,
    //       it will just make it unusable without updating anything reasonable.
    function markExecuted(uint256 _txId) public onlyAdmin {
        MultisigTx storage mtx = multisigTxs[_txId];
        require(mtx.confirmed, "No enough confirmations to execute this transaction");
        require(!mtx.executed, "Multisig transaction already executed");
        mtx.executed = true;
    }

    function submitMultisigTx(MultisigTxType txType) external onlyAdmin returns (uint256) {
        uint256 txId = addMultisigTx(txType);
        confirmMultisigTx(txId);

        return txId;
    }

    function setRequiredValidations(uint256 _newValue, uint256 mtxId) external onlyAdmin {
        MultisigTx storage mtx = multisigTxs[mtxId];
        require(mtx.txType == MultisigTxType.RequiredValidationsChange, "Multisig transaction type not compatible with this function.");
        require(_newValue >= 1, "Value must be greater than zero");

        markExecuted(mtxId);
        uint256 oldValue = requiredValidations;
        requiredValidations = _newValue;

        emit RequiredValidationsChanged(oldValue, _newValue, mtxId);
    }
}