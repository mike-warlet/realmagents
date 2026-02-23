/**
 * REALM Token Rescue Script v2 - ULTRA FAST
 *
 * Estratégia melhorada:
 * 1. Pré-assina TUDO offline
 * 2. Broadcast gas + transfer SIMULTANEAMENTE (sem esperar confirmação)
 * 3. Ambas transações entram no sequencer da Base no mesmo momento
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
    console.log("  REALM TOKEN RESCUE v2 - ULTRA FAST");
    console.log("═══════════════════════════════════════════\n");

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const HACKED_PK = process.env.HACKED_PRIVATE_KEY;
    const SENDER_PK = process.env.GAS_SENDER_PRIVATE_KEY;

    if (!HACKED_PK || !SENDER_PK) {
        console.error("ERRO: Configure HACKED_PRIVATE_KEY e GAS_SENDER_PRIVATE_KEY no .env");
        process.exit(1);
    }

    const hackedWallet = new ethers.Wallet(HACKED_PK, provider);
    const gasSender = new ethers.Wallet(SENDER_PK, provider);

    console.log("Hacked wallet:", hackedWallet.address);
    console.log("Gas sender:", gasSender.address);
    console.log("Destino:", NEW_WALLET, "\n");

    // Verificar saldo REALM
    const realmContract = new ethers.Contract(REALM_TOKEN, ERC20_ABI, provider);
    const realmBalance = await realmContract.balanceOf(HACKED_WALLET);
    console.log("Saldo REALM:", ethers.formatEther(realmBalance), "REALM");

    if (realmBalance === 0n) {
        console.error("ERRO: Sem REALM tokens!");
        process.exit(1);
    }

    // Verificar saldo gas sender
    const senderBalance = await provider.getBalance(GAS_SENDER);
    console.log("Saldo gas sender:", ethers.formatEther(senderBalance), "ETH");

    // Gas com prioridade MUITO alta para inclusão rápida
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas * 3n; // 3x normal
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 10n; // 10x priority!
    const gasLimit = 80000n;
    const gasToSend = gasLimit * maxFeePerGas * 2n; // 2x margem

    console.log("Gas a enviar:", ethers.formatEther(gasToSend), "ETH");

    if (senderBalance < gasToSend) {
        console.error("ERRO: Gas sender sem ETH suficiente!");
        process.exit(1);
    }

    // Nonces
    const hackedNonce = await provider.getTransactionCount(HACKED_WALLET, "pending");
    const senderNonce = await provider.getTransactionCount(GAS_SENDER, "pending");
    console.log("Nonce hackeada:", hackedNonce);
    console.log("Nonce sender:", senderNonce);

    // ═══ STEP 1: Pré-assinar AMBAS as transações offline ═══
    console.log("\n[STEP 1] Pré-assinando AMBAS as transações offline...");

    // TX 1: Gas sender → Hacked wallet (enviar ETH)
    const gasTx = {
        to: HACKED_WALLET,
        value: gasToSend,
        nonce: senderNonce,
        gasLimit: 21000n,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        chainId: 8453n,
        type: 2
    };
    const signedGasTx = await gasSender.signTransaction(gasTx);
    console.log("   Gas TX assinada!");

    // TX 2: Hacked wallet → Transfer REALM para nova wallet
    const realmWithHacked = new ethers.Contract(REALM_TOKEN, ERC20_ABI, hackedWallet);
    const transferTx = await realmWithHacked.transfer.populateTransaction(NEW_WALLET, realmBalance);
    transferTx.nonce = hackedNonce;
    transferTx.gasLimit = gasLimit;
    transferTx.maxFeePerGas = maxFeePerGas;
    transferTx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    transferTx.chainId = 8453n;
    transferTx.type = 2;
    const signedTransferTx = await hackedWallet.signTransaction(transferTx);
    console.log("   Transfer TX assinada!");

    // ═══ STEP 2: BROADCAST SIMULTÂNEO ═══
    console.log("\n[STEP 2] BROADCASTING SIMULTÂNEO - GO GO GO!");
    console.log("   Enviando gas + transfer ao mesmo tempo...\n");

    // Broadcast ambas SIMULTANEAMENTE usando Promise.all
    // A gas TX tem que ser processada primeiro (diferente endereço, diferente nonce)
    // O sequencer da Base processa em ordem de chegada
    const [gasResult, transferResult] = await Promise.allSettled([
        provider.broadcastTransaction(signedGasTx),
        // Pequeno delay de 100ms para garantir que o gas chega primeiro no sequencer
        new Promise(resolve => setTimeout(resolve, 100)).then(() =>
            provider.broadcastTransaction(signedTransferTx)
        )
    ]);

    if (gasResult.status === "fulfilled") {
        console.log("   Gas TX broadcast:", gasResult.value.hash);
    } else {
        console.error("   Gas TX FALHOU:", gasResult.reason.message);
    }

    if (transferResult.status === "fulfilled") {
        console.log("   Transfer TX broadcast:", transferResult.value.hash);

        // Aguardar confirmação do transfer
        console.log("\n   Aguardando confirmação do transfer...");
        try {
            const receipt = await transferResult.value.wait(1);
            if (receipt.status === 1) {
                console.log("\n═══════════════════════════════════════════");
                console.log("  RESGATE CONCLUIDO COM SUCESSO!");
                console.log("═══════════════════════════════════════════");
                console.log("TX:", receipt.hash);
                console.log("Block:", receipt.blockNumber);
                const newBal = await realmContract.balanceOf(NEW_WALLET);
                console.log("Saldo REALM na nova wallet:", ethers.formatEther(newBal), "REALM");
            } else {
                console.error("   Transfer FALHOU no bloco!");
            }
        } catch (e) {
            console.error("   Erro aguardando:", e.message);
        }
    } else {
        console.error("   Transfer TX FALHOU:", transferResult.reason.message);
        console.log("\n   Tentando novamente em 1 segundo...");
        await new Promise(r => setTimeout(r, 1000));
        try {
            const retry = await provider.broadcastTransaction(signedTransferTx);
            console.log("   Retry TX:", retry.hash);
            const receipt = await retry.wait(1);
            if (receipt.status === 1) {
                console.log("   RESGATE CONCLUIDO NO RETRY!");
                const newBal = await realmContract.balanceOf(NEW_WALLET);
                console.log("   Saldo REALM na nova wallet:", ethers.formatEther(newBal), "REALM");
            }
        } catch (e2) {
            console.error("   Retry também falhou:", e2.message);
            console.log("\n   O sweeper bot pode ter roubado o gas novamente.");
            console.log("   Considere usar Flashbots Protect ou um serviço MEV.");
        }
    }
}

rescue().catch((error) => {
    console.error("\nERRO FATAL:", error.message);
    process.exit(1);
});
