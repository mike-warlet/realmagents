require("@nomicfoundation/hardhat-toolbox");

// Carrega .env se existir
const fs = require('fs');
let PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001"; // placeholder
let ALCHEMY_KEY = "";

if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key === 'PRIVATE_KEY') PRIVATE_KEY = val.trim();
    if (key === 'ALCHEMY_KEY') ALCHEMY_KEY = val.trim();
  });
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 8453, // Base chain ID para testes locais
    },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 8453,
      gasPrice: "auto"
    },
    baseSepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 84532,
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || ""
    },
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
