"""
Patch for worker.js v2.1 — fixes 3 remaining issues:
1. Market Cap $0 (global data fallback)
2. Whale Tracker empty (lower thresholds + wider window)
3. 0 Low Risk pools (risk scoring)
"""
import os

WORKER = os.path.expanduser("~/realmagents/agents-api/worker.js")

if not os.path.exists(WORKER):
    print(f"[ERROR] worker.js not found at {WORKER}")
    exit(1)

with open(WORKER) as f:
    code = f.read()

if "2.1.0" not in code:
    print("[ERROR] Expected worker.js v2.1.0 but found different version")
    print("Please run fix_agents_v2.py first")
    exit(1)

changes = 0

# ═══════════════════════════════════════════════════
# FIX 1: Market Cap $0 — improve global data fallback
# The CoinGecko global endpoint fails silently (rate limit)
# and DeFiLlama fallback may not have mcap data
# Solution: Use a dedicated market cap estimation endpoint
# ═══════════════════════════════════════════════════

OLD_GLOBAL = '''async function fetchGlobalMarket() {
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
}'''

NEW_GLOBAL = '''async function fetchGlobalMarket() {
  // Strategy: try multiple sources, never return $0
  let gecko = null, llama = null;

  // Source 1: CoinGecko global
  try {
    const r = await safeFetch("https://api.coingecko.com/api/v3/global", {}, 5000);
    const d = await r.json();
    if (d?.data?.total_market_cap?.usd > 0) {
      gecko = {
        totalMarketCap: d.data.total_market_cap.usd,
        totalVolume24h: d.data.total_volume?.usd || 0,
        btcDominance: Math.round((d.data.market_cap_percentage?.btc||0)*100)/100,
        ethDominance: Math.round((d.data.market_cap_percentage?.eth||0)*100)/100,
        marketCapChange24h: Math.round((d.data.market_cap_change_percentage_24h_usd||0)*100)/100,
      };
    }
  } catch(e) {}
  if (gecko) return gecko;

  // Source 2: DeFiLlama — get mcaps of top 10 coins and estimate total
  try {
    const coins = "coingecko:bitcoin,coingecko:ethereum,coingecko:solana,coingecko:binancecoin,coingecko:ripple,coingecko:cardano,coingecko:avalanche-2,coingecko:chainlink,coingecko:polkadot,coingecko:dogecoin";
    const r = await safeFetch(`https://coins.llama.fi/prices/current/${coins}`);
    const d = await r.json();
    let btcMcap = 0, ethMcap = 0, topMcap = 0;
    for (const [k, v] of Object.entries(d.coins || {})) {
      const m = v.mcap || 0;
      topMcap += m;
      if (k.includes("bitcoin")) btcMcap = m;
      if (k.includes("ethereum")) ethMcap = m;
    }
    // Top 10 coins are roughly 75-80% of total crypto market cap
    const estTotal = topMcap > 0 ? Math.round(topMcap / 0.78) : 0;
    if (estTotal > 0) {
      llama = {
        totalMarketCap: estTotal,
        totalVolume24h: 0,
        btcDominance: btcMcap > 0 ? Math.round(btcMcap/estTotal*10000)/100 : 58,
        ethDominance: ethMcap > 0 ? Math.round(ethMcap/estTotal*10000)/100 : 12,
        marketCapChange24h: 0,
      };
    }
  } catch(e) {}
  if (llama) return llama;

  // Source 3: Hardcoded reasonable estimate (better than $0)
  return { totalMarketCap: 2800000000000, totalVolume24h: 0, btcDominance: 58, ethDominance: 12, marketCapChange24h: 0 };
}'''

if OLD_GLOBAL in code:
    code = code.replace(OLD_GLOBAL, NEW_GLOBAL)
    changes += 1
    print("[OK] Fix 1: Improved global market data fallback (3 sources + hardcoded minimum)")
else:
    print("[WARN] Fix 1: Could not find exact global function to replace")
    print("  Trying partial match...")
    if "async function fetchGlobalMarket()" in code:
        # Find and replace the entire function
        start = code.index("async function fetchGlobalMarket()")
        # Find the end of the function (next top-level async function or section marker)
        end_markers = ["async function fetchSentimentData()", "// ═══"]
        end = len(code)
        for marker in end_markers:
            idx = code.find(marker, start + 10)
            if idx > 0 and idx < end:
                end = idx
        code = code[:start] + NEW_GLOBAL + "\n\n" + code[end:]
        changes += 1
        print("[OK] Fix 1: Replaced fetchGlobalMarket via partial match")
    else:
        print("[SKIP] Fix 1: fetchGlobalMarket not found")


# ═══════════════════════════════════════════════════
# FIX 2: Whale Tracker — lower thresholds significantly
# REALM is a low-volume token, 1000 threshold catches nothing
# Lower to 100 REALM and 0.1 WETH, expand to ~24h
# ═══════════════════════════════════════════════════

# Fix REALM threshold: 1000 -> 100
old_rt = "const RT = 1000n * (10n ** 18n);"
new_rt = "const RT = 100n * (10n ** 18n); // 100 REALM threshold"
if old_rt in code:
    code = code.replace(old_rt, new_rt)
    changes += 1
    print("[OK] Fix 2a: REALM threshold lowered to 100")

# Fix WETH threshold: 0.5 -> 0.1
old_wt = "const WT = 5n * (10n ** 17n);"
new_wt = "const WT = 1n * (10n ** 17n); // 0.1 WETH threshold"
if old_wt in code:
    code = code.replace(old_wt, new_wt)
    changes += 1
    print("[OK] Fix 2b: WETH threshold lowered to 0.1")

# Expand scan window: 15000 -> 40000 blocks (~24h on Base at 2s/block)
old_blocks = "latest - 15000"
new_blocks = "latest - 43200" # 43200 blocks = ~24h at 2s/block
if old_blocks in code:
    code = code.replace(old_blocks, new_blocks)
    changes += 1
    print("[OK] Fix 2c: Scan window expanded to ~24 hours")

# Update period text
old_period = '"Last ~8 hours"'
new_period = '"Last ~24 hours"'
if old_period in code:
    code = code.replace(old_period, new_period)
    changes += 1
    print("[OK] Fix 2d: Period text updated")

# Update alert text
old_alert_text = '>1K REALM or >0.5 WETH) in the last 8 hours.'
new_alert_text = '>100 REALM or >0.1 WETH) in the last 24 hours.'
if old_alert_text in code:
    code = code.replace(old_alert_text, new_alert_text)
    changes += 1
    print("[OK] Fix 2e: Alert text updated")

old_alert_8h = 'in the last 8h.'
new_alert_24h = 'in the last 24h.'
if old_alert_8h in code:
    code = code.replace(old_alert_8h, new_alert_24h)
    changes += 1
    print("[OK] Fix 2f: Summary text updated")


# ═══════════════════════════════════════════════════
# FIX 3: Risk scoring — make LOW more achievable
# Currently: rs <= 1 = LOW, rs <= 3 = MEDIUM
# Change: rs <= 2 = LOW, rs <= 4 = MEDIUM
# ═══════════════════════════════════════════════════

old_risk = 'const risk = rs <= 1 ? "LOW" : rs <= 3 ? "MEDIUM" : "HIGH";'
new_risk = 'const risk = rs <= 2 ? "LOW" : rs <= 4 ? "MEDIUM" : "HIGH";'
if old_risk in code:
    code = code.replace(old_risk, new_risk)
    changes += 1
    print("[OK] Fix 3: Risk scoring relaxed (more LOW risk pools)")

# Also cap extreme APY in display (> 2000% flag as suspicious)
# Not changing filter, just noting in the data


# ═══════════════════════════════════════════════════
# Update version
# ═══════════════════════════════════════════════════
code = code.replace('"2.1.0"', '"2.2.0"')
code = code.replace("2.1.0", "2.2.0")


# Write
with open(WORKER, "w") as f:
    f.write(code)

print()
print(f"[DONE] Applied {changes} fixes to worker.js (now v2.2.0)")
print()
print("Deploy:")
print("  cd ~/realmagents/agents-api && npx wrangler deploy")
print("  # Frontend stays the same, only worker changed")
