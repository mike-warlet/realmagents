require("@nomicfoundation/hardhat-toolbox");

const fs = require('fs');
let PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001";
let ALCHEMY_KEY = "";

if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key === 'PRIVATE_KEY') PRIVATE_KEY = val.trim();
    if (key === 'ALCHEMY_KEY') ALCHEMY_KEY = val.trim();
  });
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    hardhat: { chainId: 8453 },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 8453,
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || "",
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  }
};
