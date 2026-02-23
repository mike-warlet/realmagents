/**
 * REALM Token Rescue Script
 *
 * Estratégia:
 * 1. Pré-assina a transação de transfer dos REALM tokens (wallet hackeada → nova wallet)
 * 2. Envia gas mínimo da wallet auxiliar → wallet hackeada
 * 3. Imediatamente broadcast a transação pré-assinada
 *
 * IMPORTANTE: Execute este script o mais rápido possível após configurar o .env
 */

const { ethers } = require("ethers");

// ─── Configuração ────────────────────────────────────────
const RPC_URL = "https://base-mainnet.g.alchemy.com/v2/2rxzAb3pSRGOv26opqwLo";

// Endereços
const HACKED_WALLET = "0xD1D211831672a923F9679247688BF6DAA63c1718";
const NEW_WALLET = "0xDc9d4232c1B9E4FbC7d426e6cbdB67EF07C4051C";
const GAS_SENDER = "0xd2477CE8A75d1340dD665486F9e3Ab168e5B6817";
const REALM_TOKEN = "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";

// ABI mínimo para transfer ERC-20
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];

async function rescue() {
    console.log("═══════════════════════════════════════════");
    console.log("  REALM TOKEN RESCUE SCRIPT");
    console.log("═══════════════════════════════════════════\n");

    // ─── Setup Provider e Wallets ───
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Chaves privadas do .env
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
    console.log("Destino (nova wallet):", NEW_WALLET);
    console.log("");

    // Verificar que os endereços batem
    if (hackedWallet.address.toLowerCase() !== HACKED_WALLET.toLowerCase()) {
        console.error("ERRO: HACKED_PRIVATE_KEY não corresponde à wallet hackeada!");
        process.exit(1);
    }
    if (gasSender.address.toLowerCase() !== GAS_SENDER.toLowerCase()) {
        console.error("ERRO: GAS_SENDER_PRIVATE_KEY não corresponde à wallet de gas!");
        process.exit(1);
    }

    // ─── Verificar saldo REALM ───
    const realmContract = new ethers.Contract(REALM_TOKEN, ERC20_ABI, provider);
    const realmBalance = await realmContract.balanceOf(HACKED_WALLET);
    console.log("Saldo REALM na wallet hackeada:", ethers.formatEther(realmBalance), "REALM");

    if (realmBalance === 0n) {
        console.error("ERRO: Sem REALM tokens na wallet hackeada!");
        process.exit(1);
    }

    // ─── Verificar saldo ETH do gas sender ───
    const senderBalance = await provider.getBalance(GAS_SENDER);
    console.log("Saldo ETH do gas sender:", ethers.formatEther(senderBalance), "ETH");

    // ─── Calcular gas necessário ───
    // ERC-20 transfer usa ~65,000 gas
    const gasLimit = 80000n; // margem de segurança
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas * 2n; // 2x para garantir inclusão rápida
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 2n;
    const gasNeeded = gasLimit * maxFeePerGas;
    const gasToSend = gasNeeded * 15n / 10n; // 1.5x de margem

    console.log("\nGas necessário:", ethers.formatEther(gasNeeded), "ETH");
    console.log("Gas a enviar (com margem):", ethers.formatEther(gasToSend), "ETH");
    console.log("Custo em USD (aprox):", (Number(ethers.formatEther(gasToSend)) * 1945).toFixed(4), "USD");

    if (senderBalance < gasToSend) {
        console.error("\nERRO: Gas sender não tem ETH suficiente!");
        console.error("Necessário:", ethers.formatEther(gasToSend), "ETH");
        console.error("Disponível:", ethers.formatEther(senderBalance), "ETH");
        process.exit(1);
    }

    // ─── Pegar nonce atual da wallet hackeada ───
    const hackedNonce = await provider.getTransactionCount(HACKED_WALLET, "pending");
    console.log("\nNonce da wallet hackeada:", hackedNonce);

    // ─── STEP 1: Pré-assinar a transação de transfer REALM ───
    console.log("\n[STEP 1] Pré-assinando transação de transfer REALM...");

    const realmWithHacked = new ethers.Contract(REALM_TOKEN, ERC20_ABI, hackedWallet);

    // Preparar a transação (sem enviar)
    const transferTx = await realmWithHacked.transfer.populateTransaction(NEW_WALLET, realmBalance);
    transferTx.nonce = hackedNonce;
    transferTx.gasLimit = gasLimit;
    transferTx.maxFeePerGas = maxFeePerGas;
    transferTx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    transferTx.chainId = 8453n; // Base
    transferTx.type = 2; // EIP-1559

    // Assinar offline
    const signedTransferTx = await hackedWallet.signTransaction(transferTx);
    console.log("   Transação assinada! Pronta para broadcast.");

    // ─── STEP 2: Enviar ETH para a wallet hackeada ───
    console.log("\n[STEP 2] Enviando gas para wallet hackeada...");

    const sendGasTx = await gasSender.sendTransaction({
        to: HACKED_WALLET,
        value: gasToSend,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
    });

    console.log("   Gas TX enviada:", sendGasTx.hash);
    console.log("   Aguardando confirmação...");

    // Aguardar confirmação do envio de gas
    const gasReceipt = await sendGasTx.wait(1);
    console.log("   Gas recebido! Block:", gasReceipt.blockNumber);

    // ─── STEP 3: Broadcast IMEDIATO da transação de transfer ───
    console.log("\n[STEP 3] BROADCASTING transfer REALM AGORA!");

    const txResponse = await provider.broadcastTransaction(signedTransferTx);
    console.log("   Transfer TX enviada:", txResponse.hash);
    console.log("   Aguardando confirmação...");

    const transferReceipt = await txResponse.wait(1);

    if (transferReceipt.status === 1) {
        console.log("\n═══════════════════════════════════════════");
        console.log("  RESGATE CONCLUÍDO COM SUCESSO!");
        console.log("═══════════════════════════════════════════");
        console.log("\nTransfer TX:", transferReceipt.hash);
        console.log("Block:", transferReceipt.blockNumber);

        // Verificar novo saldo
        const newBalance = await realmContract.balanceOf(NEW_WALLET);
        console.log("\nSaldo REALM na nova wallet:", ethers.formatEther(newBalance), "REALM");
        console.log("\nTOKENS SALVOS!");
    } else {
        console.error("\nERRO: Transação falhou!");
        console.error("Receipt:", transferReceipt);
    }
}

rescue().catch((error) => {
    console.error("\nERRO FATAL:", error.message);
    process.exit(1);
});
