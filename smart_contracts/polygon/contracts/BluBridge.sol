// contracts/BluToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
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
    uint256 id;
    uint256 amount;
    uint8 chainId;
    bytes32 toAddress;
    address tokenContractAddress;
    bool claimed;
}

contract TokenBridge is AccessControl {
    using ECDSA for bytes32;
    using Address for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    event RegisterToken(address indexed tokenAddress);
    event UnregisterToken(address indexed tokenAddress);
    event RegisterChainId(uint8 recepientChainId);
    event UnregisterChainId(uint8 recepientChainId);
    event Claimed(
        uint256 indexed id,
        address indexed toAddress,
        uint256 amount
    );

    event Sent(
        uint256 id,
        address fromAddress,
        uint256 amount,
        uint8 toChainId,
        bytes32 toAddress
    );

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    uint256 public minimumOracleConfirmations = 3;
    uint8 public chainId;

    mapping(uint256 => TransferData) public tansferMap;
    mapping(address => bool) public supportedTokens;
    mapping(uint8 => bool) public supportedChainIds;

    mapping(uint256 => SendTransferData) public sendTransferMap;
    mapping(uint256 => mapping(address => bool)) signatureLookup;
    mapping(uint256 => EnumerableSet.Bytes32Set) sendTransferSignatures;

    constructor(uint8 _chainId) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        chainId = _chainId;
    }

    function registerToken(address tokenContractAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(tokenContractAddress.isContract(), "Address is not a contract");
        require(
            !supportedTokens[tokenContractAddress],
            "Token is already supported"
        );
        supportedTokens[tokenContractAddress] = true;
        emit RegisterToken(tokenContractAddress);
    }

    function unregisterToken(address tokenContractAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            supportedTokens[tokenContractAddress],
            "Token is not supported"
        );
        supportedTokens[tokenContractAddress] = false;
        emit UnregisterToken(tokenContractAddress);
    }

    function registerChainId(uint8 recepientChainId)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            !supportedChainIds[recepientChainId],
            "ChainId already supported"
        );
        supportedChainIds[recepientChainId] = true;
        emit RegisterChainId(recepientChainId);
    }

    function ungisterChainId(uint8 recepientChainId)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(supportedChainIds[recepientChainId], "ChainId not supported");
        supportedChainIds[recepientChainId] = false;
        emit UnregisterChainId(recepientChainId);
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
    ) public returns (uint256) {
        require(tokenContractAddress.isContract(), "Address is not a contract");
        require(
            supportedTokens[tokenContractAddress],
            "Token is not supported"
        );
        require(supportedChainIds[toChainId], "Not Supported Chain ID");

        BridgeERC20 erc20 = BridgeERC20(tokenContractAddress);
        erc20.burnFrom(msg.sender, amount);

        uint256 id = block.number;
        sendTransferMap[id] = SendTransferData({
            id: id,
            amount: amount,
            chainId: toChainId,
            toAddress: toAddress,
            tokenContractAddress: tokenContractAddress,
            claimed: false
        });

        emit Sent(id, msg.sender, amount, toChainId, toAddress);
        return id;
    }

    function getSignatures(uint256 sendId)
        public
        view
        returns (bytes32[] memory)
    {
        require(sendTransferMap[sendId].id != 0, "Send Id does not exist");
        return sendTransferSignatures[sendId].values();
    }

    function sign(uint256 sendId, bytes32 signature)
        public
        onlyRole(ORACLE_ROLE)
    {
        require(sendTransferMap[sendId].id != 0, "Send Id does not exist");
        require(!signatureLookup[sendId][msg.sender], "Oracle already signed");

        sendTransferSignatures[sendId].add(signature);
        signatureLookup[sendId][msg.sender] = true;
    }

    function claim(
        address tokenAddress,
        bytes memory data,
        bytes[] calldata signatures
    ) public {
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
            tokenAddress == transferData.tokenAddress,
            "Invalid token address"
        );

        require(supportedTokens[tokenAddress], "Unsupported token address");

        require(transferData.toAddress == msg.sender, "Not eligible for claim");

        BridgeERC20 erc20 = BridgeERC20(tokenAddress);
        erc20.mint(msg.sender, transferData.amount);

        emit Claimed(transferData.id, msg.sender, transferData.amount);
    }
}
