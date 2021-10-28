// contracts/BluToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract BluDacToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER");

    constructor() ERC20("BluDacToken", "BLU") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
    }

    function mint(address account, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount)
        external
        onlyRole(BURNER_ROLE)
    {
        _burn(account, amount);
    }
}
