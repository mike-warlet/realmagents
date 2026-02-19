const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying RealmAgents with account:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

    // ─── Endereços existentes na Base ───
    const REALM_TOKEN = "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";
    const REALM_DAO = "0x157A257228c5FebB7F332a8E492F0037f3A0526f"; // Treasury = DAO

    console.log("\n═══ Phase 1: Deploy Contracts ═══\n");

    // 1. Deploy AgentRegistry
    console.log("1. Deploying AgentRegistry...");
    const registrationFee = hre.ethers.parseEther("100"); // 100 REALM
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistry.deploy(REALM_TOKEN, registrationFee);
    await registry.waitForDeployment();
    const registryAddr = await registry.getAddress();
    console.log("   AgentRegistry:", registryAddr);

    // 2. Deploy RevenueRouter
    console.log("2. Deploying RevenueRouter...");
    const RevenueRouter = await hre.ethers.getContractFactory("RevenueRouter");
    const router = await RevenueRouter.deploy(REALM_TOKEN, registryAddr, REALM_DAO);
    await router.waitForDeployment();
    const routerAddr = await router.getAddress();
    console.log("   RevenueRouter:", routerAddr);

    // 3. Deploy AgentLaunchpad
    console.log("3. Deploying AgentLaunchpad...");
    const AgentLaunchpad = await hre.ethers.getContractFactory("AgentLaunchpad");
    const launchpad = await AgentLaunchpad.deploy(REALM_TOKEN, registryAddr, routerAddr);
    await launchpad.waitForDeployment();
    const launchpadAddr = await launchpad.getAddress();
    console.log("   AgentLaunchpad:", launchpadAddr);

    console.log("\n═══ Phase 2: Configure Connections ═══\n");

    // 4. Set Launchpad no Registry
    console.log("4. Setting Launchpad in Registry...");
    let tx = await registry.setLaunchpad(launchpadAddr);
    await tx.wait();
    console.log("   Done ✅");

    // 5. Set RevenueRouter no Registry
    console.log("5. Setting RevenueRouter in Registry...");
    tx = await registry.setRevenueRouter(routerAddr);
    await tx.wait();
    console.log("   Done ✅");

    // 6. Set Launchpad no RevenueRouter
    console.log("6. Setting Launchpad in RevenueRouter...");
    tx = await router.setLaunchpad(launchpadAddr);
    await tx.wait();
    console.log("   Done ✅");

    console.log("\n═══ Phase 3: Transfer Ownership to DAO ═══\n");

    // 7. Transfer ownership de todos os contratos para o DAO
    console.log("7. Transferring AgentRegistry ownership to DAO...");
    tx = await registry.transferOwnership(REALM_DAO);
    await tx.wait();
    console.log("   Done ✅");

    console.log("8. Transferring RevenueRouter ownership to DAO...");
    tx = await router.transferOwnership(REALM_DAO);
    await tx.wait();
    console.log("   Done ✅");

    console.log("9. Transferring AgentLaunchpad ownership to DAO...");
    tx = await launchpad.transferOwnership(REALM_DAO);
    await tx.wait();
    console.log("   Done ✅");

    // ─── Summary ───
    console.log("\n" + "═".repeat(50));
    console.log("  REALMAGENTS DEPLOYED SUCCESSFULLY!");
    console.log("═".repeat(50));
    console.log("\nContract Addresses:");
    console.log("  AgentRegistry:  ", registryAddr);
    console.log("  AgentLaunchpad: ", launchpadAddr);
    console.log("  RevenueRouter:  ", routerAddr);
    console.log("\nExisting Addresses:");
    console.log("  $REALM Token:   ", REALM_TOKEN);
    console.log("  RealmDAO (owner):", REALM_DAO);
    console.log("\nConfiguration:");
    console.log("  Registration Fee: 100 REALM");
    console.log("  Trade Fee: 2%");
    console.log("  Burn Rate: 2%");
    console.log("  Revenue Split: 70% creator / 20% stakers / 10% treasury");
    console.log("\n⚠️  Next steps:");
    console.log("  1. Verify contracts on BaseScan");
    console.log("  2. Register first agents via registerAgent()");
    console.log("  3. Launch agent tokens via launchAgent()");
    console.log("  4. Deploy frontend to Cloudflare Workers");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
