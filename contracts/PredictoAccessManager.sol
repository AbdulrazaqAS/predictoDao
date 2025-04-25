// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/manager/AccessManager.sol";

contract PredictoAccessManager is AccessManager {
    constructor (address initialAdmin) AccessManager(initialAdmin) {}
}