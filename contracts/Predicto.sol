// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Predicto is ERC20, AccessControl, ERC20Permit {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address[] memory _admins, uint256 _adminMintAmount)
        ERC20("Predicto", "PRD")
        ERC20Permit("Predicto")
    {
        for (uint8 i=0; i<_admins.length; i++){
            address admin = _admins[i];
            _mint(admin, _adminMintAmount * 10 ** decimals());
            _grantRole(DEFAULT_ADMIN_ROLE, admin);
        }
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
