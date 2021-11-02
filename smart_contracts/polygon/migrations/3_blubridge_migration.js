const TokenBridge = artifacts.require("TokenBridge");

module.exports = function (deployer) {
  deployer.deploy(TokenBridge, 1);
};
