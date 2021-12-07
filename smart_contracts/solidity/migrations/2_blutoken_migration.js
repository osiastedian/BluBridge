const BluToken = artifacts.require("BluDacToken");

module.exports = function (deployer) {
  deployer.deploy(BluToken);
};
