"""
RealmAgents v2.0 Upgrade Script
1. Replaces worker.js with enhanced multi-source API
2. Updates App.jsx Agents section with new data display
"""
import os, shutil

# ═══════════════════════════════════════════════════
# 1. UPGRADE WORKER.JS
# ═══════════════════════════════════════════════════
WORKER_DIR = os.path.expanduser("~/realmagents/agents-api")
WORKER_PATH = os.path.join(WORKER_DIR, "worker.js")

# Backup
if os.path.exists(WORKER_PATH):
    shutil.copy2(WORKER_PATH, WORKER_PATH + ".v1.bak")
    print(f"[OK] Backed up worker.js -> worker.js.v1.bak")

# Read new worker from stdin marker
# (The new worker.js is written separately, we just need to copy it)
print("[INFO] Worker.js will be written by the next command")

# ═══════════════════════════════════════════════════
# 2. UPDATE App.jsx AGENTS SECTION
# ═══════════════════════════════════════════════════
APP_PATH = os.path.expanduser("~/realmagents/frontend/src/App.jsx")

if not os.path.exists(APP_PATH):
    print(f"[ERROR] App.jsx not found at {APP_PATH}")
    exit(1)

with open(APP_PATH) as f:
    content = f.read()

# Backup
shutil.copy2(APP_PATH, APP_PATH + ".pre-v2")
print(f"[OK] Backed up App.jsx -> App.jsx.pre-v2")

# Replace the entire Agents function with enhanced version
OLD_AGENTS_START = "// ─── Agents Section"
OLD_AGENTS_END = "// ─── Explore Section"

if OLD_AGENTS_START in content and OLD_AGENTS_END in content:
    before = content[:content.index(OLD_AGENTS_START)]
    after = content[content.index(OLD_AGENTS_END):]

    NEW_AGENTS = r'''// ─── Agents Section ────────────────────────────────
function Agents() {
  const [yield_, setYield] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [whale, setWhale] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const yieldRef = useRef(null);
  const sentRef = useRef(null);
  const whaleRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [y, s, w] = await Promise.all([
        fetch(`${API}/api/agents/0/data`).then(r => r.json()),
        fetch(`${API}/api/agents/1/data`).then(r => r.json()),
        fetch(`${API}/api/agents/2/data`).then(r => r.json()),
      ]);
      setYield(y); setSentiment(s); setWhale(w);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) { console.error("Agent data failed:", e); }
    setLoading(false);
  };

  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);

  const ys = yield_?.summary || {};
  const ss = sentiment?.summary || {};
  const ws = whale?.summary || {};
  const fg = sentiment?.fearGreed?.current || {};
  const sentColor = (ss.sentimentScore || 0) >= 60 ? "text-green-400" : (ss.sentimentScore || 0) >= 40 ? "text-yellow-400" : "text-red-400";
  const fgColor = (fg.value || 0) >= 60 ? "text-green-400" : (fg.value || 0) >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 bg-green-950 border border-green-800 rounded-full px-3 py-1 mb-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs">Live Data</span>
          </div>
          <h2 className="text-2xl font-bold text-white">AI Agents Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Multi-source data: DeFiLlama, Fear & Greed Index, Alchemy RPC{ws.nansenAvailable ? ", Nansen Smart Money" : ""}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-xs">{lastUpdate ? `Updated ${lastUpdate}` : ""}</span>
          <button onClick={load} disabled={loading}
            className="px-4 py-2 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-semibold rounded-lg hover:bg-violet-600/30 disabled:opacity-50">
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Fear & Greed Banner */}
      {fg.value !== undefined && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-3xl font-black ${fgColor}`}>{fg.value}</div>
              <div className="text-gray-500 text-xs">/ 100</div>
            </div>
            <div>
              <div className={`font-bold ${fgColor}`}>Fear & Greed: {fg.label}</div>
              <div className="text-gray-500 text-xs">Crypto market sentiment index — {sentiment?.fearGreed?.trend === "IMPROVING" ? "Improving over 7 days" : "Declining over 7 days"}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {(sentiment?.fearGreed?.history || []).slice(0, 7).reverse().map((d, i) => (
              <div key={i} className="text-center">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${d.value >= 60 ? "bg-green-400/20 text-green-400" : d.value >= 40 ? "bg-yellow-400/20 text-yellow-400" : "bg-red-400/20 text-red-400"}`}>
                  {d.value}
                </div>
                <div className="text-gray-600 text-[10px] mt-0.5">{d.date?.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Yield Optimizer */}
        <div onClick={() => yieldRef.current?.scrollIntoView({behavior:"smooth"})}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-500/40 transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <img src="/agents/yield-optimizer.svg" alt="" className="w-10 h-10" />
            <div><h3 className="text-white font-bold">Yield Optimizer</h3><span className="text-green-400 text-xs font-semibold bg-green-400/10 px-2 py-0.5 rounded">DEFI</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><div className="text-gray-500 text-xs">Best APY</div><div className="text-green-400 text-lg font-bold">{(ys.bestApy||0).toFixed(1)}%</div></div>
            <div><div className="text-gray-500 text-xs">Avg APY</div><div className="text-white text-lg font-bold">{(ys.avgApy||0).toFixed(1)}%</div></div>
            <div><div className="text-gray-500 text-xs">TVL Tracked</div><div className="text-white font-bold">{fmt(ys.totalTvlTracked||0)}</div></div>
            <div><div className="text-gray-500 text-xs">Low Risk</div><div className="text-white font-bold">{ys.lowRiskCount||0} pools</div></div>
          </div>
          <p className="text-gray-500 text-xs mt-3 border-t border-gray-800 pt-3">{ys.recommendation||"Loading..."}</p>
        </div>

        {/* Sentiment Analyzer */}
        <div onClick={() => sentRef.current?.scrollIntoView({behavior:"smooth"})}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-500/40 transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <img src="/agents/sentiment-analyzer.svg" alt="" className="w-10 h-10" />
            <div><h3 className="text-white font-bold">Sentiment Analyzer</h3><span className="text-violet-400 text-xs font-semibold bg-violet-400/10 px-2 py-0.5 rounded">ANALYTICS</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><div className="text-gray-500 text-xs">Sentiment</div><div className={`text-lg font-bold ${sentColor}`}>{ss.sentimentScore||0}/100</div></div>
            <div><div className="text-gray-500 text-xs">Direction</div><div className={`font-bold text-sm ${ss.marketDirection==="BULLISH"?"text-green-400":ss.marketDirection==="BEARISH"?"text-red-400":"text-yellow-400"}`}>{ss.marketDirection||"N/A"}</div></div>
            <div><div className="text-gray-500 text-xs">Market Cap</div><div className="text-white font-bold">{fmt(ss.totalMarketCap||0)}</div></div>
            <div><div className="text-gray-500 text-xs">BTC Dom.</div><div className="text-violet-400 font-bold">{ss.btcDominance||0}%</div></div>
          </div>
          <p className="text-gray-500 text-xs mt-3 border-t border-gray-800 pt-3">{ss.recommendation||"Loading..."}</p>
        </div>

        {/* Whale Tracker */}
        <div onClick={() => whaleRef.current?.scrollIntoView({behavior:"smooth"})}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-500/40 transition-all cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <img src="/agents/whale-tracker.svg" alt="" className="w-10 h-10" />
            <div><h3 className="text-white font-bold">Whale Tracker</h3><span className="text-violet-400 text-xs font-semibold bg-violet-400/10 px-2 py-0.5 rounded">ANALYTICS</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><div className="text-gray-500 text-xs">Transfers</div><div className="text-amber-400 text-lg font-bold">{ws.whaleTransfers||0}</div></div>
            <div><div className="text-gray-500 text-xs">REALM Vol</div><div className="text-white font-bold">{(ws.totalVolumeRealm||0).toLocaleString()}</div></div>
            <div><div className="text-gray-500 text-xs">WETH Vol</div><div className="text-cyan-400 font-bold">{ws.totalVolumeWeth||0} ETH</div></div>
            <div><div className="text-gray-500 text-xs">Flow</div><div className={`font-bold text-sm ${ws.flowDirection==="ACCUMULATION"?"text-green-400":ws.flowDirection==="DISTRIBUTION"?"text-red-400":"text-yellow-400"}`}>{ws.flowDirection||"N/A"}</div></div>
          </div>
          <p className="text-gray-500 text-xs mt-3 border-t border-gray-800 pt-3">{ws.alert||"Loading..."}</p>
        </div>
      </div>

      {/* Sentiment Sources */}
      {sentiment?.sentimentSources?.length > 0 && (
        <div ref={sentRef} className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Sentiment Score Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {sentiment.sentimentSources.map((src, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm font-medium">{src.source}</span>
                  <span className="text-gray-600 text-xs">Weight: {src.weight}</span>
                </div>
                <div className={`text-2xl font-black ${src.value >= 60 ? "text-green-400" : src.value >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                  {src.value}/100
                </div>
                {src.label && <div className="text-gray-500 text-xs mt-1">{src.label}</div>}
                {src.avgChange24h !== undefined && <div className="text-gray-500 text-xs mt-1">Avg 24h: {src.avgChange24h > 0 ? "+" : ""}{src.avgChange24h}%</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yield Table */}
      <div ref={yieldRef} className="mb-10">
        <h3 className="text-xl font-bold text-white mb-4">Yield Optimizer — Top Base Opportunities</h3>
        <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="px-4 py-3 text-left">Protocol</th><th className="px-4 py-3 text-left">Pool</th>
              <th className="px-4 py-3 text-left">APY</th><th className="px-4 py-3 text-left">Base/Reward</th>
              <th className="px-4 py-3 text-left">TVL</th><th className="px-4 py-3 text-left">Risk</th>
              <th className="px-4 py-3 text-left">IL</th><th className="px-4 py-3 text-left">Type</th>
            </tr></thead>
            <tbody>{(yield_?.opportunities||[]).map((o,i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-white font-semibold">{o.protocol}</td>
                <td className="px-4 py-3 text-gray-300">{o.pool}</td>
                <td className="px-4 py-3 text-green-400 font-bold">{o.apy?.toFixed(2)}%</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{o.apyBase?.toFixed(1)}% + {o.apyReward?.toFixed(1)}%</td>
                <td className="px-4 py-3 text-gray-300">{fmt(o.tvl)}</td>
                <td className={`px-4 py-3 font-semibold ${o.risk==="LOW"?"text-green-400":o.risk==="MEDIUM"?"text-amber-400":"text-red-400"}`}>{o.risk}</td>
                <td className="px-4 py-3 text-gray-400">{o.il7d}</td>
                <td className="px-4 py-3">{o.stablecoin ? <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-0.5 rounded">Stable</span> : <span className="text-gray-600 text-xs">Volatile</span>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!(yield_?.opportunities?.length) && <p className="text-center text-gray-600 py-8">Loading yield data...</p>}
        </div>
      </div>

      {/* Sentiment Table */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-white mb-4">Market Overview — Top Coins</h3>
        <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="px-4 py-3 text-left">Coin</th><th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">24h</th><th className="px-4 py-3 text-left">7d</th>
              <th className="px-4 py-3 text-left">MCap</th><th className="px-4 py-3 text-left">Source</th>
            </tr></thead>
            <tbody>{(sentiment?.topCoins||[]).map((c,i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 text-white font-semibold">{c.symbol}</td>
                <td className="px-4 py-3 text-gray-300">{fmt(c.price)}</td>
                <td className={`px-4 py-3 font-semibold ${(c.change24h||0)>=0?"text-green-400":"text-red-400"}`}>{(c.change24h||0)>=0?"+":""}{c.change24h||0}%</td>
                <td className={`px-4 py-3 ${c.change7d!==null&&c.change7d!==undefined?((c.change7d||0)>=0?"text-green-400":"text-red-400"):"text-gray-600"}`}>{c.change7d!==null&&c.change7d!==undefined?`${c.change7d>=0?"+":""}${c.change7d}%`:"-"}</td>
                <td className="px-4 py-3 text-gray-300">{c.marketCap?fmt(c.marketCap):"-"}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${c.source==="coingecko"?"bg-yellow-400/10 text-yellow-400":"bg-blue-400/10 text-blue-400"}`}>{c.source||"api"}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {!(sentiment?.topCoins?.length) && <p className="text-center text-gray-600 py-8">Loading market data...</p>}
        </div>
      </div>

      {/* Whale Table */}
      <div ref={whaleRef} className="mb-10">
        <h3 className="text-xl font-bold text-white mb-4">Whale Tracker — Large Transfers ($REALM + WETH){ws.nansenAvailable ? " + Smart Money" : ""}</h3>
        {ws.exchangeFlows > 0 && (
          <div className={`mb-4 p-3 rounded-xl border text-sm ${ws.flowDirection==="ACCUMULATION"?"bg-green-950 border-green-800 text-green-400":ws.flowDirection==="DISTRIBUTION"?"bg-red-950 border-red-800 text-red-400":"bg-gray-900 border-gray-800 text-gray-400"}`}>
            {ws.flowDirection === "ACCUMULATION" ? "Accumulation detected — whales withdrawing from exchanges (bullish signal)" :
             ws.flowDirection === "DISTRIBUTION" ? "Distribution detected — whales depositing to exchanges (bearish signal)" :
             "Mixed exchange flows — no clear directional signal"}
            {" "}({ws.exchangeFlows} exchange-related transfers)
          </div>
        )}
        <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Amount</th><th className="px-4 py-3 text-left">Chain</th>
              <th className="px-4 py-3 text-left">From</th><th className="px-4 py-3 text-left">To</th>
              <th className="px-4 py-3 text-left">TX</th>
            </tr></thead>
            <tbody>{(whale?.transfers||[]).map((t,i) => {
              const exp = t.chain==="Ethereum"?"https://etherscan.io":"https://basescan.org";
              return (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.type==="MINT"?"bg-green-400/10 text-green-400":t.type==="BURN"?"bg-red-400/10 text-red-400":"bg-violet-400/10 text-violet-400"}`}>{t.type}</span></td>
                  <td className="px-4 py-3 text-white font-semibold">{t.asset||"REALM"}</td>
                  <td className="px-4 py-3 text-white font-semibold">{typeof t.amount==="number"?t.amount.toLocaleString():t.amount}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.chain==="Ethereum"?"bg-indigo-400/10 text-indigo-400":"bg-blue-400/10 text-blue-400"}`}>{t.chain||"Base"}</span></td>
                  <td className="px-4 py-3">
                    <a href={`${exp}/address/${t.from}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline font-mono text-xs">{t.fromLabel ? <span title={t.from}>{t.fromLabel}</span> : short(t.from)}</a>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`${exp}/address/${t.to}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline font-mono text-xs">{t.toLabel ? <span title={t.to}>{t.toLabel}</span> : short(t.to)}</a>
                  </td>
                  <td className="px-4 py-3"><a href={`${exp}/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline font-mono text-xs">{short(t.txHash)}</a></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!(whale?.transfers?.length) && <p className="text-center text-gray-600 py-8">No whale transfers (&gt;10K REALM or &gt;1 WETH) in the last ~2.5 hours.</p>}
        </div>
      </div>

      {/* Nansen Smart Money Section (if available) */}
      {whale?.smartMoney && !whale.smartMoney.error && (
        <div className="mb-10">
          <h3 className="text-xl font-bold text-white mb-4">Nansen Smart Money Intel</h3>
          <div className="bg-gray-900 border border-violet-500/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-violet-400 text-sm font-semibold">Powered by Nansen</span>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            </div>
            <p className="text-gray-400 text-sm">Smart Money net flow, DEX trades, and flow intelligence data available. Check the whale table above for labeled addresses.</p>
          </div>
        </div>
      )}
    </div>
  );
}

'''

    content = before + NEW_AGENTS + after
    with open(APP_PATH, "w") as f:
        f.write(content)
    print(f"[OK] Updated App.jsx Agents section ({len(NEW_AGENTS)} chars)")
else:
    print("[ERROR] Could not find Agents section markers in App.jsx")
    print(f"  Has '{OLD_AGENTS_START}': {OLD_AGENTS_START in content}")
    print(f"  Has '{OLD_AGENTS_END}': {OLD_AGENTS_END in content}")

print()
print("=" * 50)
print("UPGRADE COMPLETE!")
print("=" * 50)
print()
print("Next steps:")
print("  1. Copy worker.js to ~/realmagents/agents-api/worker.js")
print("  2. cd ~/realmagents/agents-api && npx wrangler deploy")
print("  3. cd ~/realmagents/frontend && npm run build && npx wrangler pages deploy dist")
