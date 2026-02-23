"""
RealmAgents v2 Complete Fix
- Rewrites worker.js with: Fear & Greed, DeFiLlama, lower whale thresholds, WETH tracking, address labels
- Updates App.jsx to remove ALL Nansen references
- Nansen integration runs silently in backend (no UI exposure)
"""
import os, shutil

print("=" * 50)
print("RealmAgents v2 Complete Fix")
print("=" * 50)

# ═══════════════════════════════════════════════════
# 1. WORKER.JS — Complete rewrite
# ═══════════════════════════════════════════════════
WORKER_PATH = os.path.expanduser("~/realmagents/agents-api/worker.js")

if os.path.exists(WORKER_PATH):
    shutil.copy2(WORKER_PATH, WORKER_PATH + ".bak")
    print("[OK] Backed up worker.js")

WORKER = r'''/**
 * RealmAgents API Worker v2.1
 * Multi-source: DeFiLlama, Alternative.me Fear&Greed, CoinGecko fallback, Alchemy RPC
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// ─── Known Address Labels ─────────────────────────
const KNOWN = {
  "0x3154cf16ccdb4c6d922629664174b904d80f2c35": "Binance 3",
  "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance 8",
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14",
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance 16",
  "0x21a31ee1afc51d94c2efccaa2043aad3dcad7462": "Binance 22",
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": "Coinbase 10",
  "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase 2",
  "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": "Coinbase 3",
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase 4",
  "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance 7",
  "0x0d0707963952f2fba59dd06f2b425ace40b492fe": "Gate.io",
  "0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23": "Gate.io 2",
  "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": "Kraken 4",
  "0x0a4c79ce84202b03e95b7a692e5d728d83c44c76": "KuCoin",
  "0xba12222222228d8ba445958a75a0704d566bf2c8": "Balancer Vault",
  "0x4200000000000000000000000000000000000006": "WETH (Base)",
  "0x0000000000000000000000000000000000000000": "Null (Mint)",
  "0x000000000000000000000000000000000000dead": "Burn Address",
  "0x4200000000000000000000000000000000000010": "Base Bridge",
  "0x4200000000000000000000000000000000000007": "Base L1>L2 Bridge",
  "0x49048044d57e1c92a77f79988d21fa8faf74e97e": "Base Portal",
};
const label = (a) => KNOWN[a.toLowerCase()] || null;

// ─── Metadata ─────────────────────────────────────
const AGENTS = [
  { name:"Yield Optimizer", description:"Monitors DeFi yields on Base L2 with risk scoring, APY trends, and stablecoin filters.", image:"https://realmagents.io/agents/yield-optimizer.svg", category:"DEFI", version:"2.1.0", chain:"base", status:"active" },
  { name:"Sentiment Analyzer", description:"Multi-source market sentiment combining Fear & Greed Index, price momentum, and market breadth.", image:"https://realmagents.io/agents/sentiment-analyzer.svg", category:"ANALYTICS", version:"2.1.0", chain:"base", status:"active" },
  { name:"Whale Tracker", description:"Tracks REALM and WETH transfers on Base with address labeling and exchange flow detection.", image:"https://realmagents.io/agents/whale-tracker.svg", category:"ANALYTICS", version:"2.1.0", chain:"base", status:"active" },
];

// ─── Utils ────────────────────────────────────────
async function safeFetch(url, opts = {}, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opts, signal: c.signal }); clearTimeout(t); return r; }
  catch(e) { clearTimeout(t); throw e; }
}

// ═══════════════════════════════════════════════════
// AGENT 0: YIELD OPTIMIZER
// ═══════════════════════════════════════════════════
async function fetchYieldData() {
  try {
    const res = await safeFetch("https://yields.llama.fi/pools");
    const data = await res.json();

    const basePools = data.data
      .filter(p => p.chain === "Base" && p.tvlUsd > 50000 && p.apy > 0 && p.apy < 10000)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 20);

    const opportunities = basePools.map(p => {
      let rs = 0;
      if (p.tvlUsd < 1000000) rs += 3;
      else if (p.tvlUsd < 10000000) rs += 2;
      else if (p.tvlUsd < 50000000) rs += 1;
      if (p.apy > 500) rs += 2; else if (p.apy > 100) rs += 1;
      if (p.ilRisk === "yes") rs += 1;
      if (p.stablecoin) rs -= 1;
      const risk = rs <= 1 ? "LOW" : rs <= 3 ? "MEDIUM" : "HIGH";

      return {
        protocol: p.project, pool: p.symbol,
        apy: Math.round(p.apy * 100) / 100,
        apyBase: Math.round((p.apyBase || 0) * 100) / 100,
        apyReward: Math.round((p.apyReward || 0) * 100) / 100,
        tvl: Math.round(p.tvlUsd),
        risk, stablecoin: p.stablecoin || false,
        il7d: p.ilRisk === "no" ? "None" : "Possible",
      };
    });

    const avg = opportunities.length ? Math.round(opportunities.reduce((s,o) => s+o.apy, 0) / opportunities.length * 100) / 100 : 0;
    const tvl = opportunities.reduce((s,o) => s+o.tvl, 0);
    const stables = opportunities.filter(o => o.stablecoin);
    const low = opportunities.filter(o => o.risk === "LOW");

    return {
      agent: "Yield Optimizer", version: "2.1.0", lastUpdate: new Date().toISOString(),
      summary: {
        totalOpportunities: opportunities.length, avgApy: avg, totalTvlTracked: tvl,
        bestApy: opportunities[0]?.apy || 0, bestProtocol: opportunities[0]?.protocol || "N/A",
        stablePoolCount: stables.length, bestStableApy: stables[0]?.apy || 0, lowRiskCount: low.length,
        recommendation: opportunities[0]
          ? `Top: ${opportunities[0].protocol} ${opportunities[0].pool} at ${opportunities[0].apy}% APY (${opportunities[0].risk} risk)${stables[0] ? ` | Safe: ${stables[0].protocol} at ${stables[0].apy}%` : ""}`
          : "No opportunities found"
      },
      opportunities
    };
  } catch(e) { return { agent:"Yield Optimizer", error:e.message, lastUpdate:new Date().toISOString(), opportunities:[], summary:{} }; }
}

// ═══════════════════════════════════════════════════
// AGENT 1: SENTIMENT ANALYZER
// ═══════════════════════════════════════════════════
async function fetchFearGreed() {
  try {
    const r = await safeFetch("https://api.alternative.me/fng/?limit=7");
    const d = await r.json();
    if (!d?.data?.length) return null;
    return {
      current: { value: parseInt(d.data[0].value), label: d.data[0].value_classification },
      history: d.data.map(x => ({ value: parseInt(x.value), label: x.value_classification, date: new Date(parseInt(x.timestamp)*1000).toISOString().split("T")[0] })),
      trend: parseInt(d.data[0].value) > parseInt(d.data[d.data.length-1].value) ? "IMPROVING" : "DECLINING",
    };
  } catch(e) { return null; }
}

async function fetchLlamaCoins() {
  try {
    const coins = "coingecko:bitcoin,coingecko:ethereum,coingecko:solana,coingecko:binancecoin,coingecko:ripple,coingecko:cardano,coingecko:avalanche-2,coingecko:chainlink,coingecko:polkadot,coingecko:dogecoin";
    const [pRes, cRes] = await Promise.all([
      safeFetch(`https://coins.llama.fi/prices/current/${coins}`),
      safeFetch(`https://coins.llama.fi/percentage/${coins}?period=1d`),
    ]);
    const prices = await pRes.json();
    const changes = await cRes.json();
    const map = {"coingecko:bitcoin":"BTC","coingecko:ethereum":"ETH","coingecko:solana":"SOL","coingecko:binancecoin":"BNB","coingecko:ripple":"XRP","coingecko:cardano":"ADA","coingecko:avalanche-2":"AVAX","coingecko:chainlink":"LINK","coingecko:polkadot":"DOT","coingecko:dogecoin":"DOGE"};
    const list = [];
    for (const [k,sym] of Object.entries(map)) {
      const p = prices.coins?.[k]; const ch = changes.coins?.[k];
      if (p) list.push({ symbol:sym, price:p.price, change24h: ch ? Math.round(ch*100)/100 : 0, marketCap:p.mcap||null, volume24h:null, source:"defillama" });
    }
    return list.length ? list : null;
  } catch(e) { return null; }
}

async function fetchGeckoCoins() {
  try {
    const r = await safeFetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&price_change_percentage=24h,7d", {}, 6000);
    const raw = await r.json();
    if (!Array.isArray(raw)) return null;
    return raw.map(c => ({ symbol:c.symbol.toUpperCase(), price:c.current_price, change24h:Math.round((c.price_change_percentage_24h||0)*100)/100, change7d:Math.round((c.price_change_percentage_7d_in_currency||0)*100)/100, marketCap:c.market_cap, volume24h:c.total_volume, source:"coingecko" }));
  } catch(e) { return null; }
}

async function fetchGlobalMarket() {
  // Try CoinGecko first, then compute from DeFiLlama coins
  try {
    const r = await safeFetch("https://api.coingecko.com/api/v3/global", {}, 6000);
    const d = await r.json();
    if (d?.data?.total_market_cap?.usd) {
      return {
        totalMarketCap: d.data.total_market_cap.usd, totalVolume24h: d.data.total_volume?.usd || 0,
        btcDominance: Math.round((d.data.market_cap_percentage?.btc||0)*100)/100,
        ethDominance: Math.round((d.data.market_cap_percentage?.eth||0)*100)/100,
        marketCapChange24h: Math.round((d.data.market_cap_change_percentage_24h_usd||0)*100)/100,
      };
    }
  } catch(e) {}
  // Fallback: estimate from DeFiLlama top coin mcaps
  try {
    const r = await safeFetch("https://coins.llama.fi/prices/current/coingecko:bitcoin,coingecko:ethereum");
    const d = await r.json();
    const btcMcap = d.coins?.["coingecko:bitcoin"]?.mcap || 0;
    const ethMcap = d.coins?.["coingecko:ethereum"]?.mcap || 0;
    const estTotal = btcMcap / 0.58; // BTC ~58% dominance estimate
    return { totalMarketCap: Math.round(estTotal), totalVolume24h:0, btcDominance: btcMcap && estTotal ? Math.round(btcMcap/estTotal*10000)/100 : 58, ethDominance: ethMcap && estTotal ? Math.round(ethMcap/estTotal*10000)/100 : 12, marketCapChange24h:0 };
  } catch(e) { return null; }
}

async function fetchSentimentData() {
  try {
    const [fg, llama, gecko, global] = await Promise.all([fetchFearGreed(), fetchLlamaCoins(), fetchGeckoCoins(), fetchGlobalMarket()]);
    const topCoins = gecko || (llama||[]).map(c => ({...c, change7d:null}));

    let score = 50; const sources = [];

    // Fear & Greed (40%)
    if (fg) { score = fg.current.value * 0.4; sources.push({source:"Fear & Greed Index", value:fg.current.value, label:fg.current.label, weight:"40%"}); }
    else score = 50 * 0.4;

    // Price momentum (35%)
    const coins = llama || gecko || [];
    if (coins.length) {
      const avg = coins.reduce((s,c)=>s+(c.change24h||0),0)/coins.length;
      const pos = coins.filter(c=>(c.change24h||0)>0).length/coins.length;
      const ms = Math.max(0, Math.min(100, 50+avg*4+(pos-0.5)*40));
      score += ms*0.35;
      sources.push({source:"Price Momentum", value:Math.round(ms), avgChange24h:Math.round(avg*100)/100, weight:"35%"});
    } else score += 50*0.35;

    // Market breadth (25%)
    if (global?.marketCapChange24h) {
      const cs = Math.max(0, Math.min(100, 50+global.marketCapChange24h*5));
      score += cs*0.25;
      sources.push({source:"Market Cap Trend", value:Math.round(cs), change24h:global.marketCapChange24h, weight:"25%"});
    } else score += 50*0.25;

    score = Math.round(Math.max(0, Math.min(100, score)));
    const lbl = score>=75?"Extreme Greed":score>=60?"Greed":score>=45?"Neutral":score>=25?"Fear":"Extreme Fear";
    const dir = score>=65?"BULLISH":score<=35?"BEARISH":"NEUTRAL";
    const rec = score>=75?"Extreme greed - historically a sell signal. Consider taking profits."
      :score>=60?"Greed - momentum positive but stay cautious. Consider DCA out of risky positions."
      :score>=45?"Neutral - no strong signal. Good time to research and set limit orders."
      :score>=25?"Fear - potential buying opportunity. Consider DCA into high-conviction assets."
      :"Extreme fear - historically a strong buy signal. Maximum opportunity but also uncertainty.";

    return {
      agent:"Sentiment Analyzer", version:"2.1.0", lastUpdate:new Date().toISOString(),
      summary:{ sentimentScore:score, sentimentLabel:lbl, marketDirection:dir, totalMarketCap:global?.totalMarketCap||0, totalVolume24h:global?.totalVolume24h||0, btcDominance:global?.btcDominance||0, ethDominance:global?.ethDominance||0, marketCapChange24h:global?.marketCapChange24h||0, recommendation:rec },
      fearGreed: fg||{current:{value:0,label:"Unavailable"},history:[],trend:"N/A"},
      sentimentSources: sources, topCoins, globalMetrics: global||{},
    };
  } catch(e) { return { agent:"Sentiment Analyzer", error:e.message, lastUpdate:new Date().toISOString(), topCoins:[], summary:{} }; }
}

// ═══════════════════════════════════════════════════
// AGENT 2: WHALE TRACKER
// ═══════════════════════════════════════════════════
async function fetchWhaleData(env) {
  try {
    const RPC = env.ALCHEMY_URL || "https://base-mainnet.g.alchemy.com/v2/2rxzAb3pSRGOv26opqwLo";
    const REALM = env.REALM_TOKEN || "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2";
    const WETH = "0x4200000000000000000000000000000000000006";
    const NANSEN = env.NANSEN_API_KEY || null;

    // Get latest block — scan last 15000 blocks (~8 hours for more data)
    const bRes = await safeFetch(RPC, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",method:"eth_blockNumber",params:[],id:1}) });
    const bData = await bRes.json();
    const latest = parseInt(bData.result, 16);
    const from = "0x" + Math.max(0, latest - 15000).toString(16);
    const topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    // Fetch REALM + WETH logs in parallel
    const [rRes, wRes] = await Promise.all([
      safeFetch(RPC, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",method:"eth_getLogs",params:[{fromBlock:from,toBlock:"latest",address:REALM,topics:[topic]}],id:2}) }),
      safeFetch(RPC, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",method:"eth_getLogs",params:[{fromBlock:from,toBlock:"latest",address:WETH,topics:[topic]}],id:3}) }),
    ]);
    const rLogs = (await rRes.json()).result || [];
    const wLogs = (await wRes.json()).result || [];

    const transfers = [];

    // REALM: threshold 1000 tokens (lowered from 10000 to catch more activity)
    const RT = 1000n * (10n ** 18n);
    for (const l of rLogs) {
      try {
        const v = BigInt(l.data);
        if (v >= RT) {
          const f = "0x"+l.topics[1].slice(26), t = "0x"+l.topics[2].slice(26);
          transfers.push({ asset:"REALM", chain:"Base", from:f, to:t, amount:Number(v/(10n**18n)),
            fromLabel:label(f), toLabel:label(t), txHash:l.transactionHash, blockNumber:parseInt(l.blockNumber,16),
            type: f==="0x0000000000000000000000000000000000000000"?"MINT":t==="0x000000000000000000000000000000000000dead"?"BURN":"TRANSFER" });
        }
      } catch(e) {}
    }

    // WETH: threshold 0.5 ETH (lowered from 1 ETH)
    const WT = 5n * (10n ** 17n);
    for (const l of wLogs) {
      try {
        const v = BigInt(l.data);
        if (v >= WT) {
          const f = "0x"+l.topics[1].slice(26), t = "0x"+l.topics[2].slice(26);
          transfers.push({ asset:"WETH", chain:"Base", from:f, to:t,
            amount: Number(v*10000n/(10n**18n))/10000,
            fromLabel:label(f), toLabel:label(t), txHash:l.transactionHash, blockNumber:parseInt(l.blockNumber,16), type:"TRANSFER" });
        }
      } catch(e) {}
    }

    // Nansen enrichment (silent, no UI exposure)
    if (NANSEN) {
      try {
        const nRes = await safeFetch(`https://api.nansen.ai/api/v1/smart-money/dex-trades?chain=base&token_address=${REALM}&time_period=24h&limit=20`,
          { headers:{"apiKey":NANSEN,"Content-Type":"application/json"} }, 10000);
        const nData = await nRes.json();
        if (nData?.data) {
          const nLabels = {};
          for (const tr of (nData.data||[])) { if (tr.wallet_address && tr.wallet_label) nLabels[tr.wallet_address.toLowerCase()] = tr.wallet_label; }
          for (const t of transfers) {
            const nf = nLabels[t.from.toLowerCase()], nt = nLabels[t.to.toLowerCase()];
            if (nf && !t.fromLabel) t.fromLabel = nf;
            if (nt && !t.toLabel) t.toLabel = nt;
          }
        }
      } catch(e) {}
    }

    transfers.sort((a,b) => b.blockNumber - a.blockNumber);

    const realm = transfers.filter(t=>t.asset==="REALM"), weth = transfers.filter(t=>t.asset==="WETH");
    const volR = realm.reduce((s,t)=>s+t.amount,0), volW = weth.reduce((s,t)=>s+t.amount,0);
    const uniq = new Set([...transfers.map(t=>t.from),...transfers.map(t=>t.to)]).size;
    const labeled = transfers.filter(t=>t.fromLabel||t.toLabel).length;
    const exFlows = transfers.filter(t => (t.fromLabel||"").match(/Binance|Coinbase|Gate|Kraken|KuCoin/i) || (t.toLabel||"").match(/Binance|Coinbase|Gate|Kraken|KuCoin/i));
    const toEx = exFlows.filter(t=>(t.toLabel||"").match(/Binance|Coinbase|Gate|Kraken|KuCoin/i)).length;
    const fromEx = exFlows.filter(t=>(t.fromLabel||"").match(/Binance|Coinbase|Gate|Kraken|KuCoin/i)).length;
    const flow = toEx>fromEx?"DISTRIBUTION":fromEx>toEx?"ACCUMULATION":"NEUTRAL";

    return {
      agent:"Whale Tracker", version:"2.1.0", lastUpdate:new Date().toISOString(),
      summary: {
        trackedPeriod:"Last ~8 hours", whaleTransfers:transfers.length,
        realmTransfers:realm.length, wethTransfers:weth.length,
        totalVolumeRealm:volR, totalVolumeWeth:Math.round(volW*10000)/10000,
        uniqueWhales:uniq, labeledAddresses:labeled, exchangeFlows:exFlows.length, flowDirection:flow,
        trend: transfers.length>10?"HIGH_ACTIVITY":transfers.length>3?"NORMAL":"QUIET",
        alert: transfers.length>10
          ? `High activity: ${transfers.length} whale transfers. ${flow==="DISTRIBUTION"?"Selling pressure.":flow==="ACCUMULATION"?"Buying signal.":"Mixed flow."}`
          : transfers.length>0
          ? `${transfers.length} transfers in the last 8h. ${labeled} from labeled addresses.`
          : "No large transfers (>1K REALM or >0.5 WETH) in the last 8 hours."
      },
      transfers: transfers.slice(0, 30),
    };
  } catch(e) { return { agent:"Whale Tracker", error:e.message, lastUpdate:new Date().toISOString(), transfers:[], summary:{} }; }
}

// ─── Router ─────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    const path = new URL(request.url).pathname;

    if (path.startsWith("/metadata/")) {
      const id = parseInt(path.split("/")[2]);
      return id >= 0 && id < AGENTS.length
        ? new Response(JSON.stringify(AGENTS[id]), { headers: CORS_HEADERS })
        : new Response(JSON.stringify({error:"Not found"}), {status:404, headers:CORS_HEADERS});
    }
    if (path === "/api/agents") return new Response(JSON.stringify({agents:AGENTS,total:AGENTS.length}), {headers:CORS_HEADERS});

    if (path.match(/^\/api\/agents\/\d+\/data$/)) {
      const id = parseInt(path.split("/")[3]);
      const fn = [fetchYieldData, fetchSentimentData, fetchWhaleData];
      if (id < 0 || id >= fn.length) return new Response(JSON.stringify({error:"Not found"}), {status:404, headers:CORS_HEADERS});
      const data = id === 2 ? await fn[id](env) : await fn[id]();
      return new Response(JSON.stringify(data), {headers:CORS_HEADERS});
    }

    if (path === "/api/dashboard") {
      const [y,s,w] = await Promise.all([fetchYieldData(), fetchSentimentData(), fetchWhaleData(env)]);
      return new Response(JSON.stringify({timestamp:new Date().toISOString(), version:"2.1.0",
        agents:[{id:0,name:"Yield Optimizer",status:"active",summary:y.summary},{id:1,name:"Sentiment Analyzer",status:"active",summary:s.summary},{id:2,name:"Whale Tracker",status:"active",summary:w.summary}]
      }), {headers:CORS_HEADERS});
    }

    if (path === "/") return new Response(JSON.stringify({name:"RealmAgents API",version:"2.1.0",
      endpoints:["GET /metadata/:id","GET /api/agents","GET /api/agents/:id/data","GET /api/dashboard"],
      agents:AGENTS.map((a,i)=>({id:i,name:a.name,category:a.category}))
    }), {headers:CORS_HEADERS});

    return new Response(JSON.stringify({error:"Not found"}), {status:404, headers:CORS_HEADERS});
  }
};
'''

with open(WORKER_PATH, "w") as f:
    f.write(WORKER)
print(f"[OK] Wrote worker.js v2.1 ({len(WORKER)} chars)")

# ═══════════════════════════════════════════════════
# 2. UPDATE App.jsx — Remove Nansen references
# ═══════════════════════════════════════════════════
APP_PATH = os.path.expanduser("~/realmagents/frontend/src/App.jsx")

if not os.path.exists(APP_PATH):
    print(f"[SKIP] App.jsx not found at {APP_PATH}")
else:
    with open(APP_PATH) as f:
        jsx = f.read()

    shutil.copy2(APP_PATH, APP_PATH + ".pre-v2fix")

    # Remove Nansen references from the Agents section
    replacements = [
        # Remove Nansen mention from data sources subtitle
        ('Multi-source data: DeFiLlama, Fear & Greed Index, Alchemy RPC{ws.nansenAvailable ? ", Nansen Smart Money" : ""}',
         'Multi-source data: DeFiLlama, Fear & Greed Index, Alchemy RPC'),
        # Remove nansenAvailable check from subtitle (alternate pattern)
        ('{ws.nansenAvailable ? ", Nansen Smart Money" : ""}', ''),
        # Remove Nansen Smart Money section title addition
        ('{ws.nansenAvailable ? " + Smart Money" : ""}', ''),
        # Remove entire Nansen Smart Money section block if present
    ]

    for old, new in replacements:
        if old in jsx:
            jsx = jsx.replace(old, new)
            print(f"[OK] Removed: '{old[:50]}...'")

    # Remove the entire Nansen Smart Money section (if it exists as a JSX block)
    # Look for the block between "Nansen Smart Money" markers
    nansen_start = jsx.find('{/* Nansen Smart Money')
    if nansen_start >= 0:
        # Find the closing of this conditional block
        nansen_end = jsx.find(')}\n', nansen_start)
        if nansen_end >= 0:
            nansen_block = jsx[nansen_start:nansen_end+3]
            jsx = jsx.replace(nansen_block, '')
            print(f"[OK] Removed Nansen Smart Money JSX block ({len(nansen_block)} chars)")

    with open(APP_PATH, "w") as f:
        f.write(jsx)
    print(f"[OK] Updated App.jsx (Nansen refs removed)")

print()
print("=" * 50)
print("FIX COMPLETE!")
print("=" * 50)
print()
print("Changes made:")
print("  - worker.js v2.1: Fear & Greed, DeFiLlama fallback for global data,")
print("    lower thresholds (1K REALM, 0.5 WETH), 8h scan window, address labels")
print("  - App.jsx: All Nansen references removed from UI")
print("  - Nansen runs silently in backend (enriches whale labels)")
print()
print("Now deploy:")
print("  cd ~/realmagents/agents-api && npx wrangler deploy")
print("  cd ~/realmagents/frontend && npm run build && npx wrangler pages deploy dist")
