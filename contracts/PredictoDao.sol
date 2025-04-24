// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "./modules/IUserManager.sol";
// import "./modules/IQuestionManager.sol";
import "./modules/MultiSig.sol";


contract PredictoDao is MultiSig {
    // IUserManager private userRegistry;
    // IQuestionManager private questionManager;

    address public token;

    uint8 constant CHANGE_TOKEN = 11;

    event TokenChanged(address addr, uint256 mtxId);

    constructor(
        address[] memory _admins,
        uint8 requiredValidations,
    ) MultiSig(_admins, requiredValidations) {
    }

    function changeToken(address _addr, uint256 _mtxId) private {
        require(_addr != address(0), "Token address can't be address zero");

        markExecuted(_mtxId);
        token = _addr;

        emit TokenChanged(_addr, _mtxId);
    }

    // TODO: MAke multisig
    function setUserRegistry(address _addr) external onlyAdmin {
        userRegistry = IUserRegistry(_addr);
    }

}