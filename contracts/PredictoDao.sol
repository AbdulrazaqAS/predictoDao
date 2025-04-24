// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IPredictoToken} from "./IPredictoToken.sol";
import "./modules/MultiSig.sol";

contract PredictoDao is MultiSig {
    address public token;

    uint8 public constant CHANGE_TOKEN = 11;
    uint8 public constant DISTRIBUTE_REWARD = 12;

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
        }else if (mtx.txType == DISTRIBUTE_REWARD){
            (address[] memory winners, uint256 amount) = abi.decode(mtx.data, (address[], uint256));
            mintToMany(winners, amount);
            executed = true;
        }

        return executed;
    }

    function mintToMany(address[] memory winners, uint256 amount) private {
        IPredictoToken predictoToken = IPredictoToken(token);
        for (uint256 i=0; i<winners.length; i++) {
            predictoToken.mint(winners[i], amount);
        }
    }

    function changeToken(address _addr) private {
        require(_addr != address(0), "Token address can't be address zero");
        require(_addr != token, "Token address same");
        token = _addr;

        emit TokenChanged(_addr);
    }
}