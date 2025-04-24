// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract PredictoToken is ERC20, AccessManaged, ERC20Permit {
    constructor(address manager)
        ERC20("Predicto", "PRD")
        ERC20Permit("Predicto")
        AccessManaged(manager)
    {}

    // To MINTER
    function mint(address to, uint256 amount) public restricted {
        _mint(to, amount);
    }
}
