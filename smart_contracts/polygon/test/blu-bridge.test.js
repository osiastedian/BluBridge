const truffleAssertions = require("truffle-assertions");
const Bridge = artifacts.require("TokenBridge");
const BluToken = artifacts.require("BluDacToken");

contract("Bridge", (accounts) => {
  it("should have chain id of 1", async () => {
    const bridge = await Bridge.deployed();
    const chainId = await bridge.chainId();
    expect(chainId.toNumber()).to.be.equal(1);
  });
  it("should be able to register blu token", async () => {
    const bridge = await Bridge.deployed();
    const bluToken = await BluToken.deployed();

    await bridge.registerToken(bluToken.address);

    const isSupported = await bridge.supportedTokens(bluToken.address);
    expect(isSupported).to.be.equal(true);
  });

  it("should be able to claim ", async () => {
    // Arrange
    const bridge = await Bridge.deployed();
    const bluToken = await BluToken.deployed();
    const minterRole = await bluToken.MINTER_ROLE();
    await bluToken.grantRole(minterRole, bridge.address);
    const oracleRole = await bridge.ORACLE_ROLE();
    await bridge.grantRole(oracleRole, accounts[1]);
    await bridge.grantRole(oracleRole, accounts[2]);
    await bridge.grantRole(oracleRole, accounts[3]);
    const encoded = web3.eth.abi.encodeParameter(
      {
        ParentStruct: {
          propertyOne: "uint64", // id
          propertyTwo: "uint256", // amount
          propertyThree: "uint8", // chainId
          propertyFour: "address", // tokenAddress
          propertyFive: "address", // toAddress
        },
      },
      {
        propertyOne: 1,
        propertyTwo: 2000,
        propertyThree: 3,
        propertyFour: bluToken.address,
        propertyFive: accounts[4],
      }
    );

    const hashed = web3.utils.sha3(encoded);
    const createSignature = async (data, signer) =>
      web3.eth
        .sign(data, signer)
        .then(
          (signature) =>
            signature.substr(0, 130) +
            (signature.substr(130) == "00" ? "1b" : "1c")
        );

    const signatures = await Promise.all([
      createSignature(hashed, accounts[1]),
      createSignature(hashed, accounts[2]),
      createSignature(hashed, accounts[3]),
    ]);

    // Act

    const claimedTx = await bridge.claim(encoded, signatures, {
      from: accounts[4],
    });

    // Assert
    const balance = await bluToken.balanceOf(accounts[4]);
    truffleAssertions.eventEmitted(
      claimedTx,
      "Claimed",
      ({ id, toAddress, amount }) =>
        id.toNumber() === 1 &&
        toAddress === accounts[4] &&
        amount.toNumber() === 2000
    );
    expect(balance.toNumber()).to.be.equal(2000);
  });

  it("should be able to send", async () => {
    const bridge = await Bridge.deployed();
    const bluToken = await BluToken.deployed();
    const minterRole = await bluToken.MINTER_ROLE();
    await bluToken.grantRole(minterRole, accounts[2]);

    const toAmount = 2000;

    const waxChainId = 2;
    await bridge.registerChainId(waxChainId);

    await bluToken.mint(accounts[2], toAmount, { from: accounts[2] });
    let balance = await bluToken.balanceOf(accounts[2]);

    expect(balance.toNumber()).to.be.equal(toAmount);

    await bluToken.approve(bridge.address, toAmount, { from: accounts[2] });
    const allowance = await bluToken.allowance(accounts[2], bridge.address);

    expect(allowance.toNumber()).to.be.equal(toAmount);

    const waxAccount = "alice";

    const tx = await bridge.send(
      bluToken.address,
      balance,
      waxChainId,
      web3.utils.asciiToHex(waxAccount),
      { from: accounts[2] }
    );

    truffleAssertions.eventEmitted(
      tx,
      "Sent",
      ({ id, fromAddress, toChainId, toAddress, amount }) => {
        return (
          id.toNumber() === tx.logs[0].blockNumber &&
          toAddress.toString().startsWith(web3.utils.asciiToHex(waxAccount)) &&
          amount.toNumber() === toAmount &&
          toChainId.toNumber() === waxChainId &&
          fromAddress === accounts[2]
        );
      }
    );
  });
});
