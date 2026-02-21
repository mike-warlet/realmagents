/**
 * Register 4 ERC-8004 Agents on AgentRegistry
 * Run: npx hardhat run scripts/register-agents.js --network base
 */
const hre = require("hardhat");

const REGISTRY = "0x8Fa9b010D9B30EF3112060F3Afa3c7573a0f9a17";
const REALM_TOKEN = "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";

// AgentCategory enum: DEFI=0, ANALYTICS=1, AUTOMATION=2, CUSTOM=3
const agents = [
  {
    name: "REALM Swap Agent",
    category: 0, // DEFI
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/swap/.well-known/agent-card.json",
    wallet: "0x0000000000000000000000000000000000000001", // Replace with actual agent wallet
  },
  {
    name: "Portfolio Rebalancer",
    category: 0, // DEFI
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/rebalancer/.well-known/agent-card.json",
    wallet: "0x0000000000000000000000000000000000000002", // Replace with actual agent wallet
  },
  {
    name: "DAO Governance Agent",
    category: 1, // ANALYTICS
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/governance/.well-known/agent-card.json",
    wallet: "0x0000000000000000000000000000000000000003", // Replace with actual agent wallet
  },
  {
    name: "Whale Intelligence Agent",
    category: 1, // ANALYTICS
    metadataURI: "https://agents-api.warlet-invest.workers.dev/agents/whale/.well-known/agent-card.json",
    wallet: "0x0000000000000000000000000000000000000004", // Replace with actual agent wallet
  },
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Registering agents with account:", signer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(signer.address)), "ETH");

  // Connect to contracts
  const registryABI = [
    "function registerAgent(uint8 category, string metadataURI, address agentWallet) external returns (uint256)",
    "function registrationFee() view returns (uint256)",
    "function agentCount() view returns (uint256)",
    "function getAgent(uint256 agentId) view returns (tuple(address creator, uint8 category, uint8 status, string metadataURI, uint256 createdAt, uint256 totalRevenue, uint256 totalUses, uint256 reputationScore, bool active, address agentWallet, address tokenAddress))",
  ];
  const erc20ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];

  const registry = new hre.ethers.Contract(REGISTRY, registryABI, signer);
  const realm = new hre.ethers.Contract(REALM_TOKEN, erc20ABI, signer);

  // Check registration fee
  const fee = await registry.registrationFee();
  console.log("\nRegistration fee per agent:", hre.ethers.formatEther(fee), "REALM");
  const totalFee = fee * BigInt(agents.length);
  console.log("Total fee for 4 agents:", hre.ethers.formatEther(totalFee), "REALM");

  // Check REALM balance
  const balance = await realm.balanceOf(signer.address);
  console.log("Your REALM balance:", hre.ethers.formatEther(balance), "REALM");

  if (balance < totalFee) {
    console.error("\n❌ Insufficient REALM balance!");
    console.log("Need:", hre.ethers.formatEther(totalFee), "REALM");
    console.log("Have:", hre.ethers.formatEther(balance), "REALM");

    // Check if fee is 0 (owner may have set it to 0)
    if (fee === 0n) {
      console.log("\n✅ Registration fee is 0 — proceeding without approval");
    } else {
      process.exit(1);
    }
  }

  // Approve REALM spend if fee > 0
  if (fee > 0n) {
    const allowance = await realm.allowance(signer.address, REGISTRY);
    if (allowance < totalFee) {
      console.log("\nApproving REALM spend...");
      const approveTx = await realm.approve(REGISTRY, totalFee);
      await approveTx.wait();
      console.log("✅ Approved", hre.ethers.formatEther(totalFee), "REALM");
    } else {
      console.log("\n✅ Already approved sufficient REALM");
    }
  }

  // Check existing agents
  const currentCount = await registry.agentCount();
  console.log("\nCurrent registered agents:", currentCount.toString());

  // Register each agent
  console.log("\n═══ Registering Agents ═══\n");

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`${i + 1}. Registering ${agent.name}...`);
    console.log(`   Category: ${["DEFI", "ANALYTICS", "AUTOMATION", "CUSTOM"][agent.category]}`);
    console.log(`   MetadataURI: ${agent.metadataURI}`);
    console.log(`   Wallet: ${agent.wallet}`);

    try {
      const tx = await registry.registerAgent(
        agent.category,
        agent.metadataURI,
        agent.wallet
      );
      const receipt = await tx.wait();
      console.log(`   ✅ Registered! TX: ${receipt.hash}`);

      // Find AgentRegistered event
      const event = receipt.logs?.find(l => l.address?.toLowerCase() === REGISTRY.toLowerCase());
      if (event) {
        const agentId = parseInt(event.topics?.[1], 16);
        console.log(`   Agent ID: ${agentId}`);
      }
    } catch (e) {
      console.error(`   ❌ Failed: ${e.message}`);
    }
    console.log();
  }

  // Final summary
  const finalCount = await registry.agentCount();
  console.log("═".repeat(50));
  console.log(" REGISTRATION COMPLETE");
  console.log("═".repeat(50));
  console.log("Agents before:", currentCount.toString());
  console.log("Agents after:", finalCount.toString());
  console.log("New agents:", (finalCount - currentCount).toString());
  console.log("\nRegistry:", REGISTRY);
  console.log("View on BaseScan: https://basescan.org/address/" + REGISTRY);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
