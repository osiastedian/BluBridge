const BluDacTokenBridge = artifacts.require("BluDacTokenBridge");

module.exports = function (deployer) {
  deployer.deploy(BluDacTokenBridge, 3);
};
