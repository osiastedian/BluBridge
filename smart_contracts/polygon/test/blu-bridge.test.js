const truffleAssertions = require("truffle-assertions");
const Bridge = artifacts.require("BluDacTokenBridge");
const BluToken = artifacts.require("BluDacToken");

contract("Bridge", (accounts) => {
  let bridge, bluToken, minterRole;
  before(async () => {
    bridge = await Bridge.deployed();
    bluToken = await BluToken.deployed();
    minterRole = await bluToken.MINTER_ROLE();
  });

  it("should have chain id of 2", async () => {
    const chainId = await bridge.chainId();
    expect(chainId.toNumber()).to.be.equal(2);
  });
  it("should be able to register blu token", async () => {
    await bridge.registerToken(bluToken.address);

    const isSupported = await bridge.supportedTokens(bluToken.address);
    expect(isSupported).to.be.equal(true);
  });

  it("should be able to claim ", async () => {
    // Arrange
    await bluToken.grantRole(minterRole, bridge.address);
    const oracleRole = await bridge.ORACLE_ROLE();
    const oracle1 = web3.eth.accounts.create();
    const oracle2 = web3.eth.accounts.create();
    const oracle3 = web3.eth.accounts.create();
    await bridge.grantRole(oracleRole, oracle1.address);
    await bridge.grantRole(oracleRole, oracle2.address);
    await bridge.grantRole(oracleRole, oracle3.address);

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
        propertyThree: 2,
        propertyFour: bluToken.address,
        propertyFive: accounts[4],
      }
    );

    const hashed = web3.utils.sha3(encoded);

    const signatures = [
      oracle1.sign(hashed).signature,
      oracle2.sign(hashed).signature,
      oracle3.sign(hashed).signature,
    ];

    // Act

    const claimedTx = await bridge.claim(
      bluToken.address,
      encoded,
      signatures,
      {
        from: accounts[4],
      }
    );

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
    const transferData = await bridge.transferMap(1);
    expect(transferData.id.toNumber()).to.be.equal(1);
    expect(transferData.amount.toNumber()).to.be.equal(2000);
    expect(transferData.chainId.toNumber()).to.be.equal(2);
    expect(transferData.tokenAddress).to.be.equal(bluToken.address);
    expect(transferData.toAddress).to.be.equal(accounts[4]);
  });

  describe("sending", async () => {
    let bridge, bluToken;
    const waxChainId = 2;
    before(async () => {
      bridge = await Bridge.deployed();
      bluToken = await BluToken.deployed();
      const minterRole = await bluToken.MINTER_ROLE();
      await bluToken.grantRole(minterRole, accounts[2]);
      await bridge.registerChainId(waxChainId);
    });
    it("should be able to send", async () => {
      const toAmount = 2000;

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

      const burnRate = 20;
      const remainingAmount = toAmount * ((100 - burnRate) / 100);

      truffleAssertions.eventEmitted(
        tx,
        "Sent",
        ({ id, fromAddress, toChainId, toAddress, amount }) => {
          return (
            id.toNumber() === tx.logs[0].blockNumber &&
            toAddress
              .toString()
              .startsWith(web3.utils.asciiToHex(waxAccount)) &&
            amount.toNumber() === remainingAmount &&
            toChainId.toNumber() === waxChainId &&
            fromAddress === accounts[2]
          );
        }
      );
    });

    it("should be able to send full amount when burn rate is set to zero", async () => {
      const toAmount = 2000;
      await bridge.setBurnRate(0);

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

      const burnRate = 0;
      const remainingAmount = toAmount * ((100 - burnRate) / 100);

      truffleAssertions.eventEmitted(
        tx,
        "Sent",
        ({ id, fromAddress, toChainId, toAddress, amount }) => {
          return (
            id.toNumber() === tx.logs[0].blockNumber &&
            toAddress
              .toString()
              .startsWith(web3.utils.asciiToHex(waxAccount)) &&
            amount.toNumber() === remainingAmount &&
            toChainId.toNumber() === waxChainId &&
            fromAddress === accounts[2]
          );
        }
      );
    });

    context("contract is paused", () => {
      before(async () => {
        await bridge.pause({ from: accounts[0] });
      });

      it("should error when trying to send", async () => {
        await truffleAssertions.reverts(
          bridge.send(
            bluToken.address,
            1000,
            waxChainId,
            web3.utils.asciiToHex("alice"),
            { from: accounts[2] }
          ),
          "Pausable: paused"
        );
      });
    });

    context("contract is unpaused", () => {
      before(async () => {
        await bridge.unpause({ from: accounts[0] });
      });

      it("should mark the contract unpaused", async () => {
        const isPaused = await bridge.paused();
        expect(isPaused).to.be.equal(false);
      });
    });
  });
});
