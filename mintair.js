const { retryAsync, sleep, randomInt } = require("./src/utils/helpers");
const {
  EXPLORER_URL_MEGAETH,
  TIMER_PAYLOAD,
  CHAIN_ID,
} = require("./src/utils/constants");
const logger = require("./src/utils/logger");

class Mintair {
  constructor(accountIndex, web3Custom, config, wallet) {
    this.accountIndex = accountIndex;
    this.web3Custom = web3Custom;
    this.config = config;
    this.wallet = wallet;
  }

  async deployTimerContract() {
    return await retryAsync(
      async () => {
        try {
          // Get the nonce
          const nonce = await this.web3Custom.web3.eth.getTransactionCount(
            this.wallet.address
          );

          // Prepare basic transaction with proper hex values
          const tx = {
            from: this.wallet.address,
            to: null, // null for contract deployment
            data: TIMER_PAYLOAD,
            value: "0x0",
            nonce: this.web3Custom.web3.utils.toHex(nonce),
            chainId: CHAIN_ID,
          };

          // Estimate gas
          try {
            const gasLimit = await this.web3Custom.estimateGas(tx);
            tx.gas = this.web3Custom.web3.utils.toHex(gasLimit);
          } catch (error) {
            // If gas estimation fails, use a safe default
            logger.warn(
              `Gas estimation failed: ${error.message}. Using default gas limit.`
            );
            tx.gas = this.web3Custom.web3.utils.toHex("3000000"); // 3 million gas
          }

          // Get gas price parameters
          const gasParams = await this.web3Custom.getGasParams();
          Object.assign(tx, gasParams);

          // Sign transaction
          const signedTx =
            await this.web3Custom.web3.eth.accounts.signTransaction(
              tx,
              this.wallet.privateKey
            );

          // Send transaction
          logger.info(`${this.accountIndex} | Sending transaction...`);
          const receipt = await new Promise((resolve, reject) => {
            this.web3Custom.web3.eth
              .sendSignedTransaction(signedTx.rawTransaction)
              .on("transactionHash", (hash) => {
                logger.info(`${this.accountIndex} | Transaction hash: ${hash}`);
              })
              .on("receipt", (receipt) => {
                resolve(receipt);
              })
              .on("error", (error) => {
                reject(error);
              });
          });

          if (receipt.status) {
            const contractAddress = receipt.contractAddress;
            logger.info(
              `${this.accountIndex} | Timer contract deployed successfully! Address: ${contractAddress} TX: ${EXPLORER_URL_MEGAETH}${receipt.transactionHash}`
            );
            return contractAddress;
          } else {
            throw new Error(`Transaction failed. Status: ${receipt.status}`);
          }
        } catch (error) {
          const randomPause = randomInt(
            this.config.SETTINGS.PAUSE_BETWEEN_ATTEMPTS[0],
            this.config.SETTINGS.PAUSE_BETWEEN_ATTEMPTS[1]
          );
          logger.error(
            `${this.accountIndex} | Error deploying Timer contract: ${error.message}. Waiting ${randomPause} seconds...`
          );
          await sleep(randomPause * 1000);
          throw error;
        }
      },
      {
        attempts: this.config.SETTINGS.ATTEMPTS,
        defaultValue: false,
      }
    );
  }
}

module.exports = Mintair;
