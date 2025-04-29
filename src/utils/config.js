const fs = require("fs");

// Load configuration from JSON file
const loadConfig = () => {
  const configData = fs.readFileSync("./config.json", "utf8");
  return JSON.parse(configData);
};

// Singleton pattern for config
let config = null;

const getConfig = () => {
  if (!config) {
    config = loadConfig();
  }
  return config;
};

module.exports = {
  getConfig,
};
