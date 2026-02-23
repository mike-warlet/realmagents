/**
 * Register 4 ERC-8004 Agents on AgentRegistry (Base)
 *
 * Usage:
 *   1. Set your private key below (DEPLOYER_PRIVATE_KEY)
 *   2. Run: node register-agents.mjs
 */
import { ethers } from "ethers";

// ============================================
// CONFIG - SET YOUR PRIVATE KEY HERE
// ============================================
const DEPLOYER_PRIVATE_KEY = process.env.PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";

const RPC_URL = "https://mainnet.base.org";
const REGISTRY = "0x8Fa9b010D9B30EF3112060F3Afa3c7573a0f9a17";
const REALM_TOKEN = "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";

const agents = [
  {
    name: "REALM Swap Agent",
    category: 0,
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/swap/.well-known/agent-card.json",
    wallet: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817",
  },
  {
    name: "Portfolio Rebalancer",
    category: 0,
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/rebalancer/.well-known/agent-card.json",
    wallet: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817",
  },
  {
    name: "DAO Governance Agent",
    category: 1,
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/governance/.well-known/agent-card.json",
    wallet: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817",
  },
  {
    name: "Whale Intelligence Agent",
    category: 1,
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/whale/.well-known/agent-card.json",
    wallet: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817",
  },
];

const registryABI = [
  "function registerAgent(uint8 category, string metadataURI, address agentWallet) external returns (uint256)",
  "function registrationFee() view returns (uint256)",
  "function agentCount() view returns (uint256)",
];
const erc20ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  console.log("=".repeat(50));
  console.log(" ERC-8004 Agent Registration on Base");
  console.log("=".repeat(50));

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log("\nDeployer:", wallet.address);

  const ethBalance = await provider.getBalance(wallet.address);
  console.log("ETH balance:", ethers.formatEther(ethBalance), "ETH");

  const registry = new ethers.Contract(REGISTRY, registryABI, wallet);
  const realm = new ethers.Contract(REALM_TOKEN, erc20ABI, wallet);

  const realmBalance = await realm.balanceOf(wallet.address);
  console.log("REALM balance:", ethers.formatEther(realmBalance), "REALM");

  const fee = await registry.registrationFee();
  console.log("\nRegistration fee per agent:", ethers.formatEther(fee), "REALM");
  const totalFee = fee * BigInt(agents.length);
  console.log("Total fee for", agents.length, "agents:", ethers.formatEther(totalFee), "REALM");

  if (realmBalance < totalFee) {
    console.error("\nInsufficient REALM! Need", ethers.formatEther(totalFee), "but have", ethers.formatEther(realmBalance));
    process.exit(1);
  }

  // Approve REALM spend
  if (fee > 0n) {
    const allowance = await realm.allowance(wallet.address, REGISTRY);
    if (allowance < totalFee) {
      console.log("\nApproving REALM spend...");
      const approveTx = await realm.approve(REGISTRY, totalFee);
      console.log("Approve TX:", approveTx.hash);
      await approveTx.wait();
      console.log("Approved!");
    } else {
      console.log("\nAlready approved sufficient REALM");
    }
  }

  const currentCount = await registry.agentCount();
  console.log("\nCurrent registered agents:", currentCount.toString());
  console.log("\n" + "=".repeat(50));
  console.log(" Registering Agents");
  console.log("=".repeat(50) + "\n");

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const categories = ["DEFI", "ANALYTICS", "AUTOMATION", "CUSTOM"];
    console.log(`${i + 1}. ${agent.name} (${categories[agent.category]})`);

    try {
      const tx = await registry.registerAgent(agent.category, agent.metadataURI, agent.wallet);
      console.log("   TX:", tx.hash);
      const receipt = await tx.wait();
      console.log("   Confirmed! Gas used:", receipt.gasUsed.toString());

      const event = receipt.logs?.find(l => l.address?.toLowerCase() === REGISTRY.toLowerCase());
      if (event && event.topics?.[1]) {
        console.log("   Agent ID:", parseInt(event.topics[1], 16));
      }
    } catch (e) {
      console.error("   FAILED:", e.shortMessage || e.message);
    }
    console.log();
  }

  const finalCount = await registry.agentCount();
  console.log("=".repeat(50));
  console.log(" REGISTRATION COMPLETE");
  console.log("=".repeat(50));
  console.log("Agents before:", currentCount.toString());
  console.log("Agents after:", finalCount.toString());
  console.log("New agents:", (finalCount - currentCount).toString());
  console.log("\nView on BaseScan: https://basescan.org/address/" + REGISTRY);
}

main().catch(e => { console.error(e); process.exit(1); });
