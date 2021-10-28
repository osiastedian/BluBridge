// contracts/BluToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Oracled is Ownable {
    mapping(address => bool) oracles;

    function registerOracle(address oracleAddress) public onlyOwner {
        require(!oracles[oracleAddress], "Oracle already registered");
        oracles[oracleAddress] = true;
    }

    function unregisterOracle(address oracleAddress) public onlyOwner {
        require(oracles[oracleAddress], "Oracle is not registered");
        oracles[oracleAddress] = false;
    }
}

contract TokenBridge is Oracled, AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 minimumOracleConfirmations = 3;

    address public tokenAddress;

    constructor(address _tokenAddress) {
        tokenAddress = tokenAddress;
    }

    function send() public {}
}
