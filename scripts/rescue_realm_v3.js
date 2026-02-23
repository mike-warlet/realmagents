/**
 * REALM Token Rescue Script v3 - SPAM RACE
 *
 * Estratégia:
 * 1. Pré-assina tudo offline
 * 2. Envia gas TX
 * 3. SPAM broadcast do transfer a cada 50ms até ser aceito
 * 4. O instante que o gas chega, nossa TX já está na fila
 */

const { ethers } = require("ethers");

const RPC_URL = "https://base-mainnet.g.alchemy.com/v2/2rxzAb3pSRGOv26opqwLo";

const HACKED_WALLET = "0xD1D211831672a923F9679247688BF6DAA63c1718";
const NEW_WALLET = "0xDc9d4232c1B9E4FbC7d426e6cbdB67EF07C4051C";
const GAS_SENDER = "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817";
const REALM_TOKEN = "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";

const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];

async function rescue() {
    console.log("═══════════════════════════════════════════");
    console.log("  REALM TOKEN RESCUE v3 - SPAM RACE");
    console.log("═══════════════════════════════════════════\n");

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const HACKED_PK = process.env.HACKED_PRIVATE_KEY;
    const SENDER_PK = process.env.GAS_SENDER_PRIVATE_KEY;

    if (!HACKED_PK || !SENDER_PK) {
        console.error("ERRO: Configure as private keys no .env");
        process.exit(1);
    }

    const hackedWallet = new ethers.Wallet(HACKED_PK, provider);
    const gasSender = new ethers.Wallet(SENDER_PK, provider);

    console.log("Hacked wallet:", hackedWallet.address);
    console.log("Gas sender:", gasSender.address);
    console.log("Destino:", NEW_WALLET, "\n");

    const realmContract = new ethers.Contract(REALM_TOKEN, ERC20_ABI, provider);
    const realmBalance = await realmContract.balanceOf(HACKED_WALLET);
    console.log("Saldo REALM:", ethers.formatEther(realmBalance), "REALM");

    if (realmBalance === 0n) {
        console.error("ERRO: Sem REALM tokens!");
        process.exit(1);
    }

    const senderBalance = await provider.getBalance(GAS_SENDER);
    console.log("Saldo gas sender:", ethers.formatEther(senderBalance), "ETH");

    // Gas com prioridade MÁXIMA
    const feeData = await provider.getFeeData();
    // Para o transfer: usar gas baixo para ser barato e rápido
    const transferMaxFee = feeData.maxFeePerGas * 2n;
    const transferPriority = feeData.maxPriorityFeePerGas * 2n;
    const gasLimit = 80000n;
    // Enviar gas generoso (10x o necessário)
    const gasToSend = gasLimit * transferMaxFee * 10n;

    console.log("Gas a enviar:", ethers.formatEther(gasToSend), "ETH");
    console.log("Custo USD:", (Number(ethers.formatEther(gasToSend)) * 1945).toFixed(4));

    if (senderBalance < gasToSend + 21000n * transferMaxFee) {
        console.error("ERRO: ETH insuficiente no gas sender!");
        process.exit(1);
    }

    // Nonces
    const hackedNonce = await provider.getTransactionCount(HACKED_WALLET, "pending");
    const senderNonce = await provider.getTransactionCount(GAS_SENDER, "pending");
    console.log("Nonce hackeada:", hackedNonce);

    // ═══ STEP 1: Pré-assinar transfer TX ═══
    console.log("\n[STEP 1] Pré-assinando transfer TX...");

    const realmWithHacked = new ethers.Contract(REALM_TOKEN, ERC20_ABI, hackedWallet);
    const transferTx = await realmWithHacked.transfer.populateTransaction(NEW_WALLET, realmBalance);
    transferTx.nonce = hackedNonce;
    transferTx.gasLimit = gasLimit;
    transferTx.maxFeePerGas = transferMaxFee;
    transferTx.maxPriorityFeePerGas = transferPriority;
    transferTx.chainId = 8453n;
    transferTx.type = 2;
    const signedTransferTx = await hackedWallet.signTransaction(transferTx);
    console.log("   Transfer TX assinada com nonce:", hackedNonce);

    // ═══ STEP 2: Enviar gas TX ═══
    console.log("\n[STEP 2] Enviando gas TX...");

    const gasTxResponse = await gasSender.sendTransaction({
        to: HACKED_WALLET,
        value: gasToSend,
        nonce: senderNonce,
        gasLimit: 21000n,
        maxFeePerGas: feeData.maxFeePerGas * 3n,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas * 5n,
    });
    console.log("   Gas TX:", gasTxResponse.hash);

    // ═══ STEP 3: SPAM transfer TX até conseguir ═══
    console.log("\n[STEP 3] SPAM broadcast transfer - tentando a cada 50ms...");

    let success = false;
    let attempts = 0;
    const maxAttempts = 200; // 10 segundos máximo (200 x 50ms)
    const startTime = Date.now();

    while (!success && attempts < maxAttempts) {
        attempts++;
        try {
            const txResponse = await provider.broadcastTransaction(signedTransferTx);
            console.log(`\n   ACEITO na tentativa ${attempts}! TX: ${txResponse.hash}`);
            console.log("   Tempo: " + (Date.now() - startTime) + "ms");
            console.log("   Aguardando confirmação...");

            const receipt = await txResponse.wait(1);
            if (receipt.status === 1) {
                success = true;
                console.log("\n═══════════════════════════════════════════");
                console.log("  RESGATE CONCLUIDO COM SUCESSO!");
                console.log("═══════════════════════════════════════════");
                console.log("TX:", receipt.hash);
                console.log("Block:", receipt.blockNumber);
                const newBal = await realmContract.balanceOf(NEW_WALLET);
                console.log("REALM na nova wallet:", ethers.formatEther(newBal));
            } else {
                console.error("   TX confirmada mas FALHOU (status 0)");
                break;
            }
        } catch (e) {
            // Silenciar erros de insufficient funds (esperado)
            if (!e.message.includes("insufficient funds") && !e.message.includes("already known") && !e.message.includes("nonce")) {
                console.error(`   Tentativa ${attempts}: ${e.message.substring(0, 80)}`);
            }
            if (e.message.includes("nonce")) {
                console.error(`\n   NONCE CONFLICT! O bot usou nonce ${hackedNonce} antes de nós.`);
                console.log("   O bot pode ter executado uma transação da wallet hackeada.");
                break;
            }
            // Esperar 50ms antes da próxima tentativa
            await new Promise(r => setTimeout(r, 50));
        }
    }

    if (!success) {
        console.log(`\n   Falhou após ${attempts} tentativas (${Date.now() - startTime}ms)`);

        // Verificar o que aconteceu
        const hackedBal = await provider.getBalance(HACKED_WALLET);
        const realmBal = await realmContract.balanceOf(HACKED_WALLET);
        console.log("\n   Status atual:");
        console.log("   ETH na hackeada:", ethers.formatEther(hackedBal));
        console.log("   REALM na hackeada:", ethers.formatEther(realmBal));

        if (realmBal === 0n) {
            console.error("\n   OS REALM TOKENS FORAM ROUBADOS PELO BOT!");
        } else {
            console.log("\n   REALM tokens ainda estão lá. Tente novamente ou use Flashbots.");
        }
    }
}

rescue().catch((error) => {
    console.error("\nERRO FATAL:", error.message);
    process.exit(1);
});
