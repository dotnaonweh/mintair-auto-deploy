const Web3 = require("web3");
const logger = require("../utils/logger");

class Web3Custom {
  constructor(rpcUrl) {
    this.web3 = new Web3(rpcUrl);
  }

  async estimateGas(tx) {
    try {
      // Make sure the 'from' field is included and values are formatted correctly
      const txForEstimate = {
        ...tx,
        from: tx.from,
        to: tx.to || null, // for contract creation, use null instead of empty string
        data: tx.data,
        value: tx.value ? this.web3.utils.toHex(tx.value) : "0x0",
      };

      const gasEstimate = await this.web3.eth.estimateGas(txForEstimate);
      // Add 20% buffer
      return Math.floor(Number(gasEstimate) * 1.2).toString();
    } catch (error) {
      logger.error(`Gas estimation error: ${error.message}`);
      throw error;
    }
  }

  async getGasParams() {
    try {
      // For MegaEth, let's use legacy transactions to be safe
      const gasPrice = await this.web3.eth.getGasPrice();
      return {
        gasPrice: this.web3.utils.toHex(gasPrice),
      };
    } catch (error) {
      logger.error(`Error getting gas parameters: ${error.message}`);
      // Return a reasonable default gas price
      return {
        gasPrice: this.web3.utils.toHex("20000000000"), // 20 Gwei
      };
    }
  }
}

module.exports = Web3Custom;
