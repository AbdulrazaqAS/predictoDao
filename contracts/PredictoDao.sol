// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "./modules/IUserManager.sol";
// import "./modules/IQuestionManager.sol";
import "./modules/MultiSig.sol";


contract PredictoDao is MultiSig {
    // IUserManager private userRegistry;
    // IQuestionManager private questionManager;

    address public token;

    uint8 public constant CHANGE_TOKEN = 11;

    event TokenChanged(address addr);

    constructor(
        address[] memory _admins,
        uint8 requiredValidations,
        address _token
    ) MultiSig(_admins, requiredValidations) {
        token = _token;
    }

    function executeSelfTx(uint256 _txId) internal override returns (bool) {
        MultisigTx storage mtx = multisigTxs[_txId];
        bool executed = super.executeSelfTx(_txId);

        if (executed) return true;

        if (mtx.txType == CHANGE_TOKEN){
            address newToken = abi.decode(mtx.data, (address));
            changeToken(newToken);
            executed = true;
        }

        return executed;
    }

    function changeToken(address _addr) private {
        require(_addr != address(0), "Token address can't be address zero");
        require(_addr != token, "Token address same");
        token = _addr;

        emit TokenChanged(_addr);
    }
}