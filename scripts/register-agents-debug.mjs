import { ethers } from "ethers";
const PK = process.env.PRIVATE_KEY || process.argv[2];
if (!PK || PK === "YOUR_KEY") { console.error("Set PRIVATE_KEY env var"); process.exit(1); }
const RPC = "https://base-mainnet.g.alchemy.com/v2/2rxzAb3pSRGOv26opqwLo";
const REG = "0x8Fa9b010D9B30EF3112060F3Afa3c7573a0f9a17";
const REALM = "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";
const agents = [
  { name: "REALM Swap Agent", cat: 0, uri: "https://agents-api.warlet-invest.workers.dev/agents/swap/.well-known/agent-card.json", w: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817" },
  { name: "Portfolio Rebalancer", cat: 0, uri: "https://agents-api.warlet-invest.workers.dev/agents/rebalancer/.well-known/agent-card.json", w: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817" },
  { name: "DAO Governance Agent", cat: 1, uri: "https://agents-api.warlet-invest.workers.dev/agents/governance/.well-known/agent-card.json", w: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817" },
  { name: "Whale Intelligence Agent", cat: 1, uri: "https://agents-api.warlet-invest.workers.dev/agents/whale/.well-known/agent-card.json", w: "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817" },
];
const regABI = [
  "function registerAgent(uint8 category, string metadataURI, address agentWallet) external returns (uint256)",
  "function registrationFee() view returns (uint256)",
  "function agentCount() view returns (uint256)",
  "function realmToken() view returns (address)",
  "function owner() view returns (address)",
  "error ERC721InvalidOwner(address owner)",
  "error ERC721InvalidReceiver(address receiver)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InvalidReceiver(address receiver)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error OwnableUnauthorizedAccount(address account)",
  "error ReentrancyGuardReentrantCall()",
];
const erc20ABI = [
  "function approve(address s, uint256 a) external returns (bool)",
  "function balanceOf(address a) view returns (uint256)",
  "function allowance(address o, address s) view returns (uint256)",
];
async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  const reg = new ethers.Contract(REG, regABI, wallet);
  const realm = new ethers.Contract(REALM, erc20ABI, wallet);
  console.log("Deployer:", wallet.address);
  console.log("ETH:", ethers.formatEther(await provider.getBalance(wallet.address)));
  console.log("REALM:", ethers.formatEther(await realm.balanceOf(wallet.address)));
  const fee = await reg.registrationFee();
  console.log("Fee:", ethers.formatEther(fee));
  console.log("Allowance:", ethers.formatEther(await realm.allowance(wallet.address, REG)));
  console.log("Owner:", await reg.owner());
  console.log("realmToken:", await reg.realmToken());
  console.log("agentCount:", (await reg.agentCount()).toString());
  const total = fee * BigInt(agents.length);
  const allow = await realm.allowance(wallet.address, REG);
  if (allow < total) {
    console.log("\nApproving", ethers.formatEther(total), "REALM...");
    const tx = await realm.approve(REG, total);
    await tx.wait();
    console.log("Approved!");
  }
  const a = agents[0];
  console.log("\n--- Simulating registerAgent for:", a.name, "---");
  try {
    const result = await reg.registerAgent.staticCall(a.cat, a.uri, a.w);
    console.log("staticCall OK! agentId:", result.toString());
  } catch (e) {
    console.error("staticCall FAILED");
    console.error("code:", e.code);
    console.error("shortMessage:", e.shortMessage);
    console.error("data:", e.data);
    if (e.info) console.error("info:", JSON.stringify(e.info));
    if (e.data) {
      try {
        const iface = new ethers.Interface(regABI);
        const decoded = iface.parseError(e.data);
        console.error("DECODED:", decoded.name, decoded.args.map(x => x.toString()));
      } catch (_) { console.error("Raw:", e.data); }
    }
    return;
  }
  console.log("\n--- Registering all agents (one at a time) ---");
  for (let i = 0; i < agents.length; i++) {
    const ag = agents[i];
    console.log((i+1) + ". " + ag.name + "...");
    try {
      const tx = await reg.registerAgent(ag.cat, ag.uri, ag.w);
      console.log("TX:", tx.hash);
      const receipt = await tx.wait();
      console.log("OK! Gas:", receipt.gasUsed.toString());
    } catch (e) { console.error("FAIL:", e.shortMessage || e.message); }
    if (i < agents.length - 1) {
      console.log("Waiting 2s...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.log("\nFinal agentCount:", (await reg.agentCount()).toString());
}
main().catch(e => { console.error(e); process.exit(1); });
