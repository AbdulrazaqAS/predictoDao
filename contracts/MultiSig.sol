// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

abstract contract MultiSig {
    struct MultisigTx {
    uint256 id;
    address to;
    bool executed;
    uint8 txType;
    uint256 confirmations;
    bytes data;
    // TODO: Add created time, then don't execute it after some max time
    }

    uint256 public totalMultisigTxs;
    uint8 public requiredValidations;

    uint8 public constant ADD_ADMIN = 0;
    uint8 public constant REMOVE_ADMIN = 1;
    uint8 public constant CHANGE_VALIDATIONS = 2;

    address[] public admins;

    mapping(uint256 => MultisigTx) public multisigTxs;
    mapping(uint256 => mapping(address => bool)) public multisigConfirmations;

    event AdminAdded(address addr);
    event AdminRemoved(address addr);
    event ValidationsChanged(uint8 oldValue, uint8 newValue);
    event MultisigTxAdded(uint8 indexed txType, uint256 mtxId);
    event MultisigTxConfirmation(uint8 indexed txType, address indexed admin, uint256 mtxId);
    event MultisigTxExecuted(uint8 indexed txType, uint256 mtxId);

    modifier onlyAdmin(){
        require(isAdmin(msg.sender), "Caller is not an admin");
        _;
    }

    constructor(address[] memory _admins, uint8 _requiredValidations){
        require(_requiredValidations >= 1, "Required validations must be at least 1");
        require(_admins.length >= _requiredValidations, "Admins must be at least requiredValidations");

        requiredValidations = _requiredValidations;

        for (uint8 i=0; i<_admins.length; i++){
            address admin = _admins[i];
            if (!isAdmin(admin)) admins.push(admin);  // handling duplicates
            else continue;

            emit AdminAdded(admin);
        }
    }

    function newAdmin(address _addr) private {
        require(!isAdmin(_addr), "Address already an admin");
        admins.push(_addr);
        emit AdminAdded(_addr);
    }

    function removeAdmin(address _addr) private {
        uint256 adminIdx;
        bool found = false;

        for (uint256 i=0; i<admins.length; i++) {
            address admin = admins[i];
            if (admin == _addr) {
                adminIdx = i;
                found = true;
                break;
            }
        }
        require(found, "Admin not found");
        
        // Replace the element at index with the last element
        admins[adminIdx] = admins[admins.length - 1];
        
        // Remove the last element
        admins.pop();
        
        emit AdminRemoved(_addr);
    }

    function isAdmin(address addr) public view returns (bool) {
        for (uint8 i = 0; i < admins.length; ++i){
            if (admins[i] == addr) return true;
        }
        return false;
    }

    function addMultisigTx(uint8 txType, bytes memory data) private onlyAdmin returns(uint256){
        MultisigTx storage mtx = multisigTxs[totalMultisigTxs];
        mtx.id = totalMultisigTxs;
        mtx.txType = txType;
        mtx.data = data;

        emit MultisigTxAdded(txType, totalMultisigTxs);
        totalMultisigTxs++;

        return totalMultisigTxs - 1;
    }

    function confirmMultisigTx(uint256 txId) public onlyAdmin {
        require(!multisigConfirmations[txId][msg.sender], "You have already confirmed this transaction.");
        require(txId < totalMultisigTxs, "Invalid transaction ID");  // Prevent confirming an unitiated tx.

        MultisigTx storage mtx = multisigTxs[txId];
        require(!mtx.executed, "Multisig transaction already executed");
        mtx.confirmations++;
        multisigConfirmations[txId][msg.sender] = true;

        if (mtx.confirmations >= requiredValidations) executeTx(txId);

        emit MultisigTxConfirmation(multisigTxs[txId].txType, msg.sender, txId);
    }

    function executeSelfTx(uint256 _txId) internal virtual returns (bool) {
        MultisigTx storage mtx = multisigTxs[_txId];
        if (mtx.txType == ADD_ADMIN){
            address admin = abi.decode(mtx.data, (address));
            newAdmin(admin);
            return true;
        } else if (mtx.txType == REMOVE_ADMIN){
            address admin = abi.decode(mtx.data, (address));
            removeAdmin(admin);
            return true;
        }
        else if (mtx.txType == CHANGE_VALIDATIONS){
            uint8 newValue = abi.decode(mtx.data, (uint8));
            setRequiredValidations(newValue);
            return true;
        }

        return false;
    }

    function executeTx(uint256 _txId) private {
        MultisigTx storage mtx = multisigTxs[_txId];
        
        mtx.executed = true;
        
        if (mtx.to == address(this)){
            executeSelfTx(_txId);
        }
        else {
            (bool success, ) = mtx.to.call(mtx.data);
            require(success, "Tx failed");
            // TODO: follow up failure
        }

        emit MultisigTxExecuted(mtx.txType, _txId);
    }

    function submitMultisigTx(uint8 txType, bytes calldata data) external onlyAdmin returns (uint256) {
        uint256 txId = addMultisigTx(txType, data);
        confirmMultisigTx(txId);

        return txId;
    }

    function setRequiredValidations(uint8 _newValue) private onlyAdmin {
        require(_newValue >= 1, "Value must be greater than zero");
        uint8 oldValue = requiredValidations;
        requiredValidations = _newValue;

        emit ValidationsChanged(oldValue, _newValue);
    }
}