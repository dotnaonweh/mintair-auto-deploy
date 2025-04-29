const logger = require("./logger");

// Custom retry implementation without external dependencies
const retryAsync = async (fn, options = {}) => {
  const {
    attempts = 3,
    delay = 1000,
    backoff = 2,
    defaultValue = null,
  } = options;

  let lastError;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        logger.warn(
          `Attempt ${attempt}/${attempts} failed: ${
            error.message
          }. Retrying in ${currentDelay / 1000}s...`
        );
        await sleep(currentDelay);
        currentDelay *= backoff; // Exponential backoff
      } else {
        logger.error(`All ${attempts} attempts failed: ${error.message}`);
      }
    }
  }

  return defaultValue;
};

// Sleep function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Random integer between min and max (inclusive)
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

module.exports = {
  retryAsync,
  sleep,
  randomInt,
};
