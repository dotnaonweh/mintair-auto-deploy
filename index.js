require("dotenv").config();
const Web3 = require("web3");
const { randomInt, sleep } = require("./src/utils/helpers");
const { getConfig } = require("./src/utils/config");
const Web3Custom = require("./src/web3/web3Custom");
const Mintair = require("./mintair");
const logger = require("./src/utils/logger");

async function main() {
  try {
    // Load configuration
    const config = getConfig();

    // Load private keys from .env file
    const privateKeysStr = process.env.PRIVATE_KEYS;
    if (!privateKeysStr) {
      logger.error("No private keys found in .env file");
      return;
    }

    const privateKeys = privateKeysStr.split(",");
    logger.info(`Loaded ${privateKeys.length} private keys`);

    // Initialize Web3 with RPC from config
    const rpcUrl =
      config.RPCS.MEGAETH[
        Math.floor(Math.random() * config.RPCS.MEGAETH.length)
      ];
    logger.info(`Using RPC URL: ${rpcUrl}`);
    const web3Custom = new Web3Custom(rpcUrl);

    // Process each wallet
    for (let idx = 0; idx < privateKeys.length; idx++) {
      try {
        const privateKey = privateKeys[idx];

        // Create wallet from private key
        const wallet =
          web3Custom.web3.eth.accounts.privateKeyToAccount(privateKey);
        logger.info(`[${idx}] Using wallet: ${wallet.address}`);

        // Check wallet balance
        const balance = await web3Custom.web3.eth.getBalance(wallet.address);
        const balanceEth = web3Custom.web3.utils.fromWei(balance, "ether");
        logger.info(`[${idx}] Wallet balance: ${balanceEth} ETH`);

        if (Number(balanceEth) === 0) {
          logger.warn(
            `[${idx}] Wallet has no ETH balance. Skipping deployment.`
          );
          continue;
        }

        // Create Mintair instance
        const mintair = new Mintair(idx, web3Custom, config, wallet);

        // Deploy timer contract 10 times
        for (let i = 0; i < 10; i++) {
          logger.info(`[${idx}] Starting deployment ${i + 1}/10`);

          const contractAddress = await mintair.deployTimerContract();

          if (contractAddress) {
            logger.info(
              `[${idx}] Contract #${i + 1} deployed at: ${contractAddress}`
            );
          } else {
            logger.error(`[${idx}] Failed to deploy contract #${i + 1}`);
          }

          // Add random pause between deployments if not the last one
          if (i < 9) {
            const pause = randomInt(
              config.SETTINGS.RANDOM_PAUSE_BETWEEN_ACTIONS[0],
              config.SETTINGS.RANDOM_PAUSE_BETWEEN_ACTIONS[1]
            );
            logger.info(
              `[${idx}] Pausing for ${pause} seconds before next deployment`
            );
            await sleep(pause * 1000);
          }
        }

        // Add random pause between accounts
        if (idx < privateKeys.length - 1) {
          const pause = randomInt(
            config.SETTINGS.RANDOM_PAUSE_BETWEEN_ACCOUNTS[0],
            config.SETTINGS.RANDOM_PAUSE_BETWEEN_ACCOUNTS[1]
          );
          logger.info(`Pausing for ${pause} seconds before next account`);
          await sleep(pause * 1000);
        }
      } catch (error) {
        logger.error(`[${idx}] Error processing wallet: ${error.message}`);
      }
    }

    logger.info("All deployments completed!");
  } catch (error) {
    logger.error(`Main error: ${error.message}`);
  }
}

// Run the main function
main().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
