/**
 * RealmAgents API Worker v2
 * Backend for AI agents with dynamic registry + 4 new ERC-8004 agents
 * Backwards compatible: keeps original 3 agents (Yield, Sentiment, Whale)
 * Adds: dynamic registry read, slug-based agent routes, A2A/MCP endpoints
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Wallet",
  "Content-Type": "application/json",
};

// ─── Contract Addresses ─────────────────────────────────────
const REALM_TOKEN = "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";
const WETH = "0x4200000000000000000000000000000000000006";
const AGENT_REGISTRY = "0x8Fa9b010D9B30EF3112060F3Afa3c7573a0f9a17";
const REVENUE_ROUTER = "0xA9c2bb95f9041922f1D4ad50C90dc9e881b765Cc";
const REALM_DAO = "0x157A257228c5FebB7F332a8E492F0037f3A0526f";
const BASE_RPC = "https://mainnet.base.org";

// ─── ABI Selectors ──────────────────────────────────────────
const SEL = {
  balanceOf: "0x70a08231",
  totalSupply: "0x18160ddd",
  agentCount: "0xf3ce93e5",
  getAgent: "0x2a0acc6a",
  totalStaked: "0x817b1cd2",
  proposalCount: "0xda35c664",
};

// ─── Original Agent Metadata (v1 compatibility) ─────────────
const AGENT_METADATA = [
  {
    name: "Yield Optimizer",
    description: "Monitors and ranks the best DeFi yield opportunities on Base L2.",
    image: "https://realmagents.io/agents/yield-optimizer.svg",
    category: "DEFI", capabilities: ["yield_monitoring", "risk_assessment"],
    version: "1.0.0", chain: "base", status: "active"
  },
  {
    name: "Sentiment Analyzer",
    description: "Real-time crypto market sentiment analysis using price data and metrics.",
    image: "https://realmagents.io/agents/sentiment-analyzer.svg",
    category: "ANALYTICS", capabilities: ["sentiment_scoring", "market_analysis"],
    version: "1.0.0", chain: "base", status: "active"
  },
  {
    name: "Whale Tracker",
    description: "Tracks large $REALM and ETH transfers on Base L2 in real-time.",
    image: "https://realmagents.io/agents/whale-tracker.svg",
    category: "ANALYTICS", capabilities: ["whale_detection", "transfer_monitoring"],
    version: "1.0.0", chain: "base", status: "active"
  }
];

// ─── New ERC-8004 Agent Definitions (slug-based) ────────────
const AGENTS_V2 = {
  swap: {
    name: "REALM Swap Agent",
    icon: "\uD83D\uDCB1",
    color: "#8b5cf6",
    category: "DEFI",
    desc: "Real-time REALM price, swap quotes, and trading signals on Base.",
    registryId: 3,
  },
  rebalancer: {
    name: "Portfolio Rebalancer",
    icon: "\uD83D\uDCCA",
    color: "#06b6d4",
    category: "DEFI",
    desc: "Analyzes wallets and finds the best DeFi yields on Base.",
    registryId: 4,
  },
  governance: {
    name: "DAO Governance",
    icon: "\uD83C\uDFDB\uFE0F",
    color: "#f59e0b",
    category: "DAO",
    desc: "Monitors RealmDAO proposals, voting status, and treasury health.",
    registryId: 5,
  },
  whale: {
    name: "Whale Intelligence",
    icon: "\uD83D\uDC0B",
    color: "#10b981",
    category: "ANALYTICS",
    desc: "Tracks large REALM & WETH transfers, labels wallets, analyzes flows.",
    registryId: 6,
  },
};

// ─── RPC Helper ─────────────────────────────────────────────

// Resolve the RPC URL from env. Supports:
// - env.ALCHEMY_URL (full URL like https://base-mainnet.g.alchemy.com/v2/KEY)
// - env.ALCHEMY_KEY (just the key - will construct full URL)
// - fallback to BASE_RPC (public, may be rate-limited from CF Workers)
function getRpcUrl(env) {
  if (env.ALCHEMY_URL) return env.ALCHEMY_URL;
  if (env.ALCHEMY_KEY) return `https://base-mainnet.g.alchemy.com/v2/${env.ALCHEMY_KEY}`;
  return BASE_RPC;
}

async function rpcCall(method, params, rpcUrl) {
  const res = await fetch(rpcUrl || BASE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const data = await res.json();
  return data.result;
}

async function ethCall(to, data, rpcUrl) {
  return rpcCall("eth_call", [{ to, data }, "latest"], rpcUrl);
}

function pad32(hex) {
  return hex.replace("0x", "").padStart(64, "0");
}

// ─── Original Agent Data Fetchers (v1) ──────────────────────

async function fetchYieldData() {
  try {
    const res = await fetch("https://yields.llama.fi/pools");
    const data = await res.json();
    const basePools = data.data
      .filter(p => p.chain === "Base" && p.tvlUsd > 50000 && p.apy > 0)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 15);
    const opportunities = basePools.map(p => ({
      protocol: p.project, pool: p.symbol,
      apy: Math.round(p.apy * 100) / 100,
      tvl: Math.round(p.tvlUsd),
      risk: p.tvlUsd > 10000000 ? "LOW" : p.tvlUsd > 1000000 ? "MEDIUM" : "HIGH",
      rewardTokens: p.rewardTokens || [], stablecoin: p.stablecoin || false,
      il7d: p.ilRisk === "no" ? "None" : "Possible",
    }));
    const avgApy = opportunities.length > 0
      ? Math.round(opportunities.reduce((s, o) => s + o.apy, 0) / opportunities.length * 100) / 100 : 0;
    const totalTvl = opportunities.reduce((s, o) => s + o.tvl, 0);
    return {
      agent: "Yield Optimizer", lastUpdate: new Date().toISOString(),
      summary: {
        totalOpportunities: opportunities.length, avgApy, totalTvlTracked: totalTvl,
        bestApy: opportunities[0]?.apy || 0, bestProtocol: opportunities[0]?.protocol || "N/A",
        recommendation: opportunities[0] ? `Top yield: ${opportunities[0].protocol} ${opportunities[0].pool} at ${opportunities[0].apy}% APY` : "No opportunities found"
      },
      opportunities
    };
  } catch (e) {
    return { agent: "Yield Optimizer", error: e.message, lastUpdate: new Date().toISOString(), opportunities: [] };
  }
}

async function fetchSentimentData() {
  try {
    const [marketRes, globalRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=1h,24h,7d"),
      fetch("https://api.coingecko.com/api/v3/global")
    ]);
    const marketData = await marketRes.json();
    const globalData = await globalRes.json();
    const priceChanges = marketData.map(c => c.price_change_percentage_24h || 0);
    const avgChange = priceChanges.reduce((s, v) => s + v, 0) / priceChanges.length;
    const positiveCount = priceChanges.filter(c => c > 0).length;
    let sentimentScore = Math.round(50 + avgChange * 3 + (positiveCount / priceChanges.length - 0.5) * 30);
    sentimentScore = Math.max(0, Math.min(100, sentimentScore));
    const sentimentLabel = sentimentScore >= 75 ? "Extreme Greed" : sentimentScore >= 60 ? "Greed" : sentimentScore >= 45 ? "Neutral" : sentimentScore >= 25 ? "Fear" : "Extreme Fear";
    const topCoins = marketData.map(c => ({
      symbol: c.symbol.toUpperCase(), name: c.name, price: c.current_price,
      change24h: Math.round((c.price_change_percentage_24h || 0) * 100) / 100,
      change7d: Math.round((c.price_change_percentage_7d_in_currency || 0) * 100) / 100,
      marketCap: c.market_cap, volume24h: c.total_volume,
    }));
    return {
      agent: "Sentiment Analyzer", lastUpdate: new Date().toISOString(),
      summary: {
        sentimentScore, sentimentLabel,
        marketDirection: avgChange > 1 ? "BULLISH" : avgChange < -1 ? "BEARISH" : "NEUTRAL",
        totalMarketCap: globalData.data?.total_market_cap?.usd || 0,
        totalVolume24h: globalData.data?.total_volume?.usd || 0,
        btcDominance: Math.round((globalData.data?.market_cap_percentage?.btc || 0) * 100) / 100,
        recommendation: sentimentScore >= 60 ? "Market showing greed - consider taking profits" : sentimentScore <= 40 ? "Market showing fear - potential buying opportunity" : "Market neutral - monitor for breakout"
      },
      topCoins
    };
  } catch (e) {
    return { agent: "Sentiment Analyzer", error: e.message, lastUpdate: new Date().toISOString(), topCoins: [] };
  }
}

async function fetchWhaleData(env) {
  try {
    const ALCHEMY_URL = getRpcUrl(env);
    const blockResult = await rpcCall("eth_blockNumber", [], ALCHEMY_URL);
    const latestBlock = parseInt(blockResult, 16);
    const fromBlock = "0x" + (latestBlock - 5000).toString(16);
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const logsResult = await rpcCall("eth_getLogs", [{
      fromBlock, toBlock: "latest", address: env.REALM_TOKEN || REALM_TOKEN, topics: [transferTopic]
    }], ALCHEMY_URL);
    const logs = logsResult || [];
    const WHALE_THRESHOLD = 10000n * (10n ** 18n);
    const transfers = [];
    for (const log of logs) {
      const value = BigInt(log.data);
      if (value >= WHALE_THRESHOLD) {
        const from = "0x" + log.topics[1].slice(26);
        const to = "0x" + log.topics[2].slice(26);
        transfers.push({
          from, to, amount: Number(value / (10n ** 18n)),
          txHash: log.transactionHash, blockNumber: parseInt(log.blockNumber, 16),
          type: from === "0x0000000000000000000000000000000000000000" ? "MINT" : to === "0x000000000000000000000000000000000000dead" ? "BURN" : "TRANSFER"
        });
      }
    }
    transfers.sort((a, b) => b.amount - a.amount);
    const totalVolume = transfers.reduce((s, t) => s + t.amount, 0);
    const uniqueWhales = new Set([...transfers.map(t => t.from), ...transfers.map(t => t.to)]).size;
    return {
      agent: "Whale Tracker", lastUpdate: new Date().toISOString(),
      summary: {
        trackedPeriod: "Last ~2.5 hours", whaleTransfers: transfers.length,
        totalVolumeRealm: totalVolume, uniqueWhales,
        largestTransfer: transfers[0] ? `${transfers[0].amount.toLocaleString()} REALM` : "None",
        trend: transfers.length > 5 ? "HIGH_ACTIVITY" : transfers.length > 0 ? "NORMAL" : "QUIET",
        alert: transfers.length > 10 ? "High whale activity detected" : "Normal activity levels"
      },
      transfers: transfers.slice(0, 20)
    };
  } catch (e) {
    return { agent: "Whale Tracker", error: e.message, lastUpdate: new Date().toISOString(), transfers: [] };
  }
}

// ─── New Agent Data Fetchers (v2 - slug based) ─────────────

async function fetchSwapData(env) {
  try {
    const rpcUrl = getRpcUrl(env);
    // Get REALM price from DeFiLlama
    const priceRes = await fetch(`https://coins.llama.fi/prices/current/base:${REALM_TOKEN}`);
    const priceData = await priceRes.json();
    const realmCoin = priceData.coins?.[`base:${REALM_TOKEN}`] || {};
    const realmPrice = realmCoin.price || 0;

    // Get WETH price
    const wethRes = await fetch(`https://coins.llama.fi/prices/current/base:${WETH}`);
    const wethData = await wethRes.json();
    const wethPrice = wethData.coins?.[`base:${WETH}`]?.price || 0;

    // Simple signal based on 24h confidence
    const confidence = realmCoin.confidence || 0;
    const signal = confidence > 0.95 ? "STRONG" : confidence > 0.8 ? "MODERATE" : "WEAK";

    return {
      data: {
        realm_price_usd: realmPrice, weth_price_usd: wethPrice,
        realm_symbol: realmCoin.symbol || "REALM",
        realm_mcap: realmPrice * 100000000, // 100M supply
        signal, confidence: Math.round(confidence * 100),
        decimals: realmCoin.decimals || 18,
        timestamp: realmCoin.timestamp || Date.now() / 1000,
      },
      lastUpdate: new Date().toISOString(),
    };
  } catch (e) {
    return { error: e.message, data: {}, lastUpdate: new Date().toISOString() };
  }
}

async function fetchRebalancerData(env) {
  try {
    const res = await fetch("https://yields.llama.fi/pools");
    const data = await res.json();
    const basePools = data.data
      .filter(p => p.chain === "Base" && p.tvlUsd > 100000 && p.apy > 0)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 20);
    const avgApy = basePools.length > 0
      ? basePools.reduce((s, p) => s + p.apy, 0) / basePools.length : 0;
    const totalTvl = basePools.reduce((s, p) => s + p.tvlUsd, 0);
    return {
      data: {
        total_pools: basePools.length,
        best_apy: basePools[0]?.apy || 0,
        total_tvl_usd: totalTvl,
        avg_apy: avgApy,
        best_protocol: basePools[0]?.project || "N/A",
        pools: basePools.map(p => ({
          protocol: p.project, pool: p.symbol, apy: p.apy, tvl: p.tvlUsd,
          risk: p.tvlUsd > 10e6 ? "LOW" : p.tvlUsd > 1e6 ? "MEDIUM" : "HIGH",
        })),
      },
      lastUpdate: new Date().toISOString(),
    };
  } catch (e) {
    return { error: e.message, data: {}, lastUpdate: new Date().toISOString() };
  }
}

async function fetchGovernanceData(env) {
  try {
    const rpcUrl = getRpcUrl(env);
    // Read DAO treasury (REALM balanceOf DAO)
    const treasuryHex = await ethCall(REALM_TOKEN, SEL.balanceOf + pad32(REALM_DAO), rpcUrl);
    const treasury = Number(BigInt(treasuryHex || "0x0") / (10n ** 18n));

    // Read total supply
    const supplyHex = await ethCall(REALM_TOKEN, SEL.totalSupply, rpcUrl);
    const totalSupply = Number(BigInt(supplyHex || "0x0") / (10n ** 18n));

    // Read proposal count
    const countHex = await ethCall(REALM_DAO, SEL.proposalCount, rpcUrl);
    const proposalCount = Number(BigInt(countHex || "0x0"));

    // Read total staked
    const stakedHex = await ethCall(REALM_DAO, SEL.totalStaked, rpcUrl);
    const totalStaked = Number(BigInt(stakedHex || "0x0") / (10n ** 18n));

    return {
      data: {
        active_proposals: 0, // Would need to iterate proposals to check active
        total_proposals: proposalCount,
        treasury_realm: treasury,
        treasury_eth: 0,
        realm_total_supply: totalSupply,
        total_staked: totalStaked,
        holder_count: "-",
      },
      lastUpdate: new Date().toISOString(),
    };
  } catch (e) {
    return { error: e.message, data: {}, lastUpdate: new Date().toISOString() };
  }
}

async function fetchWhaleV2Data(env) {
  try {
    const rpcUrl = getRpcUrl(env);
    const blockResult = await rpcCall("eth_blockNumber", [], rpcUrl);
    const latestBlock = parseInt(blockResult, 16);
    const fromBlock = "0x" + (latestBlock - 5000).toString(16);
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const logsResult = await rpcCall("eth_getLogs", [{
      fromBlock, toBlock: "latest", address: REALM_TOKEN, topics: [transferTopic]
    }], rpcUrl);
    const logs = logsResult || [];
    const THRESHOLD = 100n * (10n ** 18n); // 100 REALM for v2
    const transfers = [];
    for (const log of logs) {
      const value = BigInt(log.data);
      if (value >= THRESHOLD) {
        const from = "0x" + log.topics[1].slice(26);
        const to = "0x" + log.topics[2].slice(26);
        transfers.push({
          from, to, amount: Number(value / (10n ** 18n)),
          txHash: log.transactionHash, blockNumber: parseInt(log.blockNumber, 16),
          type: from === "0x0000000000000000000000000000000000000000" ? "MINT" : to === "0x000000000000000000000000000000000000dead" ? "BURN" : "TRANSFER"
        });
      }
    }
    transfers.sort((a, b) => b.amount - a.amount);
    const totalVolume = transfers.reduce((s, t) => s + t.amount, 0);
    const uniqueWallets = new Set([...transfers.map(t => t.from), ...transfers.map(t => t.to)]).size;
    return {
      data: {
        total_transfers: transfers.length,
        total_volume: totalVolume,
        unique_wallets: uniqueWallets,
        activity_level: transfers.length > 10 ? "HIGH" : transfers.length > 3 ? "MODERATE" : "QUIET",
        transfers: transfers.slice(0, 20),
      },
      lastUpdate: new Date().toISOString(),
    };
  } catch (e) {
    return { error: e.message, data: {}, lastUpdate: new Date().toISOString() };
  }
}

// ─── Agent Card Generator ───────────────────────────────────

function agentCard(slug, agent, baseUrl) {
  return {
    name: agent.name,
    description: agent.desc,
    url: `${baseUrl}/agents/${slug}`,
    version: "1.0.0",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    capabilities: { streaming: false, pushNotifications: false },
    authentication: {
      schemes: ["realm-token"],
      description: "Hold or stake $REALM for premium features"
    },
    skills: [{
      id: `${slug}_data`,
      name: `Get ${agent.name} Data`,
      description: `Fetch live data from the ${agent.name}`,
    }],
    provider: {
      organization: "RealmAgents",
      url: "https://realmagents.io"
    },
  };
}

// ─── MCP Handler ────────────────────────────────────────────

function handleMCP(slug, agent) {
  const toolName = `get_${slug}_data`;
  return {
    tools: [{
      name: toolName,
      description: `Get real-time data from ${agent.name}`,
      inputSchema: { type: "object", properties: {} },
    }],
  };
}

// ─── Dynamic Registry Routes ────────────────────────────────

async function fetchRegistryAgents(env) {
  try {
    const rpcUrl = getRpcUrl(env);
    const countHex = await ethCall(AGENT_REGISTRY, SEL.agentCount, rpcUrl);
    const count = Number(BigInt(countHex || "0x0"));
    const agents = [];

    for (let i = 0; i < count && i < 50; i++) {
      try {
        const data = SEL.getAgent + pad32("0x" + i.toString(16));
        const result = await ethCall(AGENT_REGISTRY, data, rpcUrl);
        if (result && result !== "0x") {
          agents.push({ id: i, raw: result });
        }
      } catch (e) { /* skip */ }
    }

    return { total: count, agents };
  } catch (e) {
    return { error: e.message, total: 0, agents: [] };
  }
}

// ─── Chat Handler (Workers AI) ──────────────────────────────

async function handleChat(slug, agent, message, env) {
  let liveData = {};
  try {
    switch (slug) {
      case "swap": liveData = await fetchSwapData(env); break;
      case "rebalancer": liveData = await fetchRebalancerData(env); break;
      case "governance": liveData = await fetchGovernanceData(env); break;
      case "whale": liveData = await fetchWhaleV2Data(env); break;
    }
  } catch (e) { /* use empty data */ }

  const dataStr = JSON.stringify(liveData.data || {}, null, 2);

  const systemPrompt = `You are ${agent.name}, an AI agent on the RealmAgents platform (Base L2 blockchain).
${agent.desc}

You are part of the MegaRealms/RealmDAO ecosystem. Key facts:
- $REALM token: ${REALM_TOKEN}
- Agent Registry: ${AGENT_REGISTRY} (ERC-8004 / ERC-721)
- Revenue Router: ${REVENUE_ROUTER} (70% creators, 20% DAO, 10% treasury)
- RealmDAO: ${REALM_DAO}
- Network: Base L2 (chain ID 8453)
- Total Supply: 100,000,000 REALM

Your current live data:
${dataStr}

Rules:
- Answer concisely and helpfully based on your live data
- If asked about something outside your data, say you specialize in your domain
- Respond in the same language the user writes in (Portuguese, English, etc.)
- Include relevant numbers from your live data when possible
- Be professional but friendly
- Never invent data - only use what is in your live data above`;

  try {
    if (env.AI) {
      const aiResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 500,
      });
      return {
        response: aiResult.response || "I couldn't generate a response.",
        powered_by: "workers-ai",
        model: "llama-3.1-8b",
        tier: "free",
        agent: agent.name,
      };
    }
    throw new Error("AI binding not available");
  } catch (e) {
    const d = liveData.data || {};
    const ql = message.toLowerCase();
    let response = "";
    if (slug === "swap") {
      const p = d.realm_price_usd || 0, w = d.weth_price_usd || 0;
      if (ql.match(/pre[cç]o|price|valor|quanto/)) response = "REALM: $" + p.toFixed(6) + " USD | WETH: $" + w.toFixed(2) + " | Signal: " + (d.signal||"N/A") + " (" + (d.confidence||0) + "%)";
      else if (ql.match(/swap|trocar|converter|trade/)) response = w>0&&p>0 ? "1 WETH = " + Math.round(w/p).toLocaleString() + " REALM. Swap on Aerodrome (Base)." : "Price data unavailable.";
      else response = "REALM: $" + p.toFixed(6) + " | WETH: $" + w.toFixed(2) + " | Signal: " + (d.signal||"N/A") + ". Ask about: price, swap, signals.";
    } else if (slug === "rebalancer") {
      const pools = d.pools || [];
      if (ql.match(/best|melhor|top|yield|apy/)) response = pools[0] ? "Top: " + pools[0].protocol + " " + pools[0].pool + " at " + pools[0].apy.toFixed(1) + "% APY (" + pools[0].risk + ")" : "No pools.";
      else response = "Tracking " + (d.total_pools||0) + " pools. Best: " + (d.best_apy||0).toFixed(1) + "% on " + (d.best_protocol||"N/A") + ".";
    } else if (slug === "governance") {
      if (ql.match(/treasury|tesour|saldo/)) response = "Treasury: " + (d.treasury_realm||0).toLocaleString() + " REALM. Supply: " + (d.realm_total_supply||0).toLocaleString() + " REALM.";
      else response = "RealmDAO: " + (d.total_proposals||0) + " proposals. Treasury: " + (d.treasury_realm||0).toLocaleString() + " REALM.";
    } else if (slug === "whale") {
      const tx = d.transfers || [];
      response = (d.total_transfers||0) + " whale txs. Volume: " + (d.total_volume||0).toLocaleString() + " REALM. Activity: " + (d.activity_level||"QUIET") + ".";
    }
    return { response: response || "Ask me about " + agent.desc, powered_by: "keyword-fallback", tier: "free", agent: agent.name };
  }
}

// ─── Router ─────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const baseUrl = url.origin;

    // ── v2 Agent Routes: /agents/:slug/... ──

    // Agent card discovery
    const cardMatch = path.match(/^\/agents\/(\w+)\/.well-known\/agent-card\.json$/);
    if (cardMatch) {
      const slug = cardMatch[1];
      const agent = AGENTS_V2[slug];
      if (!agent) return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: CORS_HEADERS });
      return new Response(JSON.stringify(agentCard(slug, agent, baseUrl)), { headers: CORS_HEADERS });
    }

    // Agent MCP endpoint
    const mcpMatch = path.match(/^\/agents\/(\w+)\/mcp$/);
    if (mcpMatch) {
      const slug = mcpMatch[1];
      const agent = AGENTS_V2[slug];
      if (!agent) return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: CORS_HEADERS });
      return new Response(JSON.stringify(handleMCP(slug, agent)), { headers: CORS_HEADERS });
    }

    // Agent data endpoint
    const dataMatch = path.match(/^\/agents\/(\w+)\/api\/data$/);
    if (dataMatch) {
      const slug = dataMatch[1];
      if (!AGENTS_V2[slug]) return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: CORS_HEADERS });

      let data;
      switch (slug) {
        case "swap": data = await fetchSwapData(env); break;
        case "rebalancer": data = await fetchRebalancerData(env); break;
        case "governance": data = await fetchGovernanceData(env); break;
        case "whale": data = await fetchWhaleV2Data(env); break;
        default: data = { error: "Unknown agent" };
      }
      return new Response(JSON.stringify(data), { headers: CORS_HEADERS });
    }

    // Agent Chat endpoint (Workers AI)
    const chatMatch = path.match(/^\/agents\/(\w+)\/chat$/);
    if (chatMatch && request.method === "POST") {
      const slug = chatMatch[1];
      const agent = AGENTS_V2[slug];
      if (!agent) return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: CORS_HEADERS });
      try {
        const body = await request.json();
        const message = body.message || body.query || "";
        if (!message) return new Response(JSON.stringify({ error: "No message provided" }), { status: 400, headers: CORS_HEADERS });
        const result = await handleChat(slug, agent, message, env);
        return new Response(JSON.stringify(result), { headers: CORS_HEADERS });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, response: "Chat error: " + e.message, powered_by: "error" }), { status: 500, headers: CORS_HEADERS });
      }
    }

    // Agent A2A endpoint (simplified)
    const a2aMatch = path.match(/^\/agents\/(\w+)\/a2a$/);
    if (a2aMatch) {
      const slug = a2aMatch[1];
      const agent = AGENTS_V2[slug];
      if (!agent) return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: CORS_HEADERS });
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        result: { status: "ready", agent: agent.name, capabilities: ["tasks/send"] },
        id: 1
      }), { headers: CORS_HEADERS });
    }

    // ── Discovery: /.well-known/agents.json ──
    if (path === "/.well-known/agents.json") {
      const agents = Object.entries(AGENTS_V2).map(([slug, a]) => ({
        name: a.name, slug, category: a.category,
        url: `${baseUrl}/agents/${slug}/.well-known/agent-card.json`,
      }));
      return new Response(JSON.stringify({ agents }), { headers: CORS_HEADERS });
    }

    // ── Dynamic Registry: /api/registry/agents ──
    if (path === "/api/registry/agents") {
      const data = await fetchRegistryAgents(env);
      return new Response(JSON.stringify(data), { headers: CORS_HEADERS });
    }

    // ── v1 Routes (backwards compatible) ──

    // GET /metadata/:id
    if (path.startsWith("/metadata/")) {
      const id = parseInt(path.split("/")[2]);
      if (id >= 0 && id < AGENT_METADATA.length) {
        return new Response(JSON.stringify(AGENT_METADATA[id]), { headers: CORS_HEADERS });
      }
      return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: CORS_HEADERS });
    }

    // GET /api/agents
    if (path === "/api/agents") {
      return new Response(JSON.stringify({
        agents: AGENT_METADATA,
        total: AGENT_METADATA.length,
        v2_agents: Object.entries(AGENTS_V2).map(([slug, a]) => ({ slug, ...a })),
      }), { headers: CORS_HEADERS });
    }

    // GET /api/agents/:id/data
    if (path.match(/^\/api\/agents\/\d+\/data$/)) {
      const id = parseInt(path.split("/")[3]);
      let data;
      switch (id) {
        case 0: data = await fetchYieldData(); break;
        case 1: data = await fetchSentimentData(); break;
        case 2: data = await fetchWhaleData(env); break;
        default: return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: CORS_HEADERS });
      }
      return new Response(JSON.stringify(data), { headers: CORS_HEADERS });
    }

    // GET /api/dashboard
    if (path === "/api/dashboard") {
      const [yield_data, sentiment, whales] = await Promise.all([
        fetchYieldData(), fetchSentimentData(), fetchWhaleData(env)
      ]);
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        agents: [
          { id: 0, name: "Yield Optimizer", status: "active", summary: yield_data.summary },
          { id: 1, name: "Sentiment Analyzer", status: "active", summary: sentiment.summary },
          { id: 2, name: "Whale Tracker", status: "active", summary: whales.summary }
        ],
        v2_agents: Object.keys(AGENTS_V2),
      }), { headers: CORS_HEADERS });
    }

    // GET /
    if (path === "/") {
      return new Response(JSON.stringify({
        name: "RealmAgents API",
        version: "2.0.0",
        endpoints: [
          "GET / - API info",
          "GET /.well-known/agents.json - Agent discovery",
          "GET /agents/:slug/.well-known/agent-card.json - Agent card",
          "GET /agents/:slug/api/data - Agent live data",
          "GET /agents/:slug/mcp - MCP tools",
          "GET /agents/:slug/a2a - A2A endpoint",
          "GET /api/registry/agents - On-chain registry",
          "GET /metadata/:id - v1 metadata",
          "GET /api/agents - v1 agent list",
          "GET /api/agents/:id/data - v1 agent data",
          "GET /api/dashboard - v1 dashboard",
        ],
        v2_agents: Object.entries(AGENTS_V2).map(([slug, a]) => ({ slug, name: a.name, category: a.category })),
        v1_agents: AGENT_METADATA.map((a, i) => ({ id: i, name: a.name, category: a.category })),
      }), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS_HEADERS });
  }
};
