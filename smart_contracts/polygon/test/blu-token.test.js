const BluToken = artifacts.require("BluToken");
contract("BluDacToken", (accounts) => {
  it("should be deployed", async () => {
    const instance = await BluToken.deployed();
    console.log({ instance });
  });

  it("should be able to mint", async () => {
    const instance = await BluToken.deployed();
    const minterRole = await instance.MINTER_ROLE();
    await instance.grantRole(minterRole, accounts[1]);

    await instance.mint(accounts[2], 10000, { from: accounts[1] });
    const balance = await instance.balanceOf(accounts[2]);
    const totalSupply = await instance.totalSupply();
    expect(totalSupply.toNumber()).to.be.equal(10000);
    expect(balance.toNumber()).to.be.equal(10000);
  });

  it("should be able to burn", async () => {
    const instance = await BluToken.deployed();
    const burnerRole = await instance.BURNER_ROLE();
    await instance.grantRole(burnerRole, accounts[3]);

    await instance.burn(accounts[2], 10000, { from: accounts[3] });
    const balance = await instance.balanceOf(accounts[2]);
    const totalSupply = await instance.totalSupply();
    expect(totalSupply.toNumber()).to.be.equal(0);
    expect(balance.toNumber()).to.be.equal(0);
  });
});
