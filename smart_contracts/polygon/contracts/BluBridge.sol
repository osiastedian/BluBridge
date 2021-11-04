// contracts/BluToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract BridgeERC20 is ERC20Burnable {
    function mint(address account, uint256 amount) public virtual;
}

struct TransferData {
    uint64 id;
    uint256 amount;
    uint8 chainId;
    address tokenAddress;
    address toAddress;
}

struct SendTransferData {
    uint256 amount;
    uint8 chainId;
    bytes32 toAddress;
    address tokenContractAddress;
}

contract TokenBridge is AccessControl {
    using ECDSA for bytes32;
    using Address for address;

    event RegisterToken(address indexed tokenAddress);
    event UnregisterToken(address indexed tokenAddress);
    event Claimed(
        uint256 indexed id,
        address indexed toAddress,
        uint256 amount
    );
    event Sent(
        address indexed tokenContractAddress,
        uint256 amount,
        uint8 chainId,
        bytes32 toAddress
    );

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    uint256 public minimumOracleConfirmations = 3;
    uint8 public chainId;

    mapping(uint256 => TransferData) public tansferMap;
    mapping(address => bool) public supportedTokens;
    mapping(uint8 => bool) public supportedChainIds;

    constructor(uint8 _chainId) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        chainId = _chainId;
    }

    function registerToken(address tokenContractAddress) public {
        require(tokenContractAddress.isContract(), "Address is not a contract");
        require(
            !supportedTokens[tokenContractAddress],
            "Token is already supported"
        );
        supportedTokens[tokenContractAddress] = true;
        emit RegisterToken(tokenContractAddress);
    }

    function unregisterToken(address tokenContractAddress) public {
        require(
            supportedTokens[tokenContractAddress],
            "Token is not supported"
        );
        supportedTokens[tokenContractAddress] = false;
        emit UnregisterToken(tokenContractAddress);
    }

    function _extractTransferData(bytes memory data)
        internal
        pure
        returns (TransferData memory transferData)
    {
        (
            uint64 id,
            uint256 amount,
            uint8 toChainId,
            address tokenAddress,
            address toAddress
        ) = abi.decode(data, (uint64, uint256, uint8, address, address));

        transferData = TransferData({
            id: id,
            amount: amount,
            chainId: toChainId,
            tokenAddress: tokenAddress,
            toAddress: toAddress
        });
    }

    function send(
        address tokenContractAddress,
        uint256 amount,
        uint8 toChainId,
        bytes32 toAddress
    ) public {
        require(tokenContractAddress.isContract(), "Address is not a contract");
        require(
            supportedTokens[tokenContractAddress],
            "Token is not supported"
        );
        require(supportedChainIds[chainId], "Not Supported Chain ID");

        BridgeERC20 erc20 = BridgeERC20(tokenContractAddress);
        erc20.burnFrom(msg.sender, amount);

        emit Sent(tokenContractAddress, amount, toChainId, toAddress);
    }

    function claim(bytes memory data, bytes[] calldata signatures) public {
        bytes32 message = keccak256(data);
        bytes32 hashed = message.toEthSignedMessageHash();
        uint8 validSignatures;
        for (uint8 i = 0; i < signatures.length; i++) {
            bytes calldata signature = signatures[i];
            address signer = hashed.recover(signature);
            if (hasRole(ORACLE_ROLE, signer)) {
                validSignatures += 1;
            }
        }
        require(
            validSignatures >= minimumOracleConfirmations,
            "Not enough valid signatures"
        );

        TransferData memory transferData = _extractTransferData(data);

        require(
            supportedTokens[transferData.tokenAddress],
            "Unsupported token address"
        );
        require(transferData.toAddress == msg.sender, "Not eligible for claim");

        BridgeERC20 erc20 = BridgeERC20(transferData.tokenAddress);
        erc20.mint(transferData.toAddress, transferData.amount);

        emit Claimed(
            transferData.id,
            transferData.toAddress,
            transferData.amount
        );
    }
}
