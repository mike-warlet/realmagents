import { useState, useEffect } from 'react';

const API = "https://agents-api.warlet-invest.workers.dev";

const AGENTS = [
  { slug: "swap", name: "REALM Swap Agent", icon: "\u{1F4B1}", color: "#8b5cf6", cat: "DEFI", desc: "Real-time price data, swap quotes & trading signals",
    stats: (d) => [
      { l: "REALM Price", v: d?.data?.realm_price_usd ? "$" + Number(d.data.realm_price_usd).toFixed(6) : "$0.00" },
      { l: "WETH Price", v: d?.data?.weth_price_usd ? "$" + Number(d.data.weth_price_usd).toFixed(0) : "-" },
      { l: "Signal", v: d?.data?.signal || "N/A" },
      { l: "Confidence", v: d?.data?.confidence ? d.data.confidence + "%" : "-" },
    ] },
  { slug: "rebalancer", name: "Portfolio Rebalancer", icon: "\u{1F4CA}", color: "#06b6d4", cat: "DEFI", desc: "Wallet analysis, DeFi yields & rebalancing suggestions",
    stats: (d) => [
      { l: "Pools Tracked", v: d?.data?.total_pools || "0" },
      { l: "Best APY", v: d?.data?.best_apy ? Number(d.data.best_apy).toFixed(1) + "%" : "-" },
      { l: "Total TVL", v: d?.data?.total_tvl_usd ? "$" + (Number(d.data.total_tvl_usd) / 1e9).toFixed(1) + "B" : "-" },
      { l: "Avg APY", v: d?.data?.avg_apy ? Number(d.data.avg_apy).toFixed(1) + "%" : "-" },
    ] },
  { slug: "governance", name: "DAO Governance", icon: "\u{1F3DB}\uFE0F", color: "#f59e0b", cat: "DAO", desc: "Proposals, voting status & treasury analytics",
    stats: (d) => [
      { l: "Active Proposals", v: d?.data?.active_proposals || "0" },
      { l: "Treasury", v: d?.data?.treasury_eth ? Number(d.data.treasury_eth).toFixed(3) + " ETH" : "-" },
      { l: "REALM Supply", v: d?.data?.realm_total_supply ? (Number(d.data.realm_total_supply) / 1e6).toFixed(1) + "M" : "-" },
      { l: "Holders", v: d?.data?.holder_count || "-" },
    ] },
  { slug: "whale", name: "Whale Intelligence", icon: "\u{1F40B}", color: "#10b981", cat: "ANALYTICS", desc: "Large transfers, wallet profiles & flow analysis",
    stats: (d) => [
      { l: "Whale Txs", v: d?.data?.total_transfers || "0" },
      { l: "Volume", v: d?.data?.total_volume ? Number(d.data.total_volume).toLocaleString() : "0" },
      { l: "Unique Wallets", v: d?.data?.unique_wallets || "0" },
      { l: "Activity", v: d?.data?.activity_level || "QUIET" },
    ] },
];

export default function AgentsView() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const r = {};
      await Promise.all(AGENTS.map(async (a) => {
        try { const res = await fetch(API + "/agents/" + a.slug + "/api/data"); r[a.slug] = await res.json(); }
        catch (e) { r[a.slug] = { error: e.message }; }
      }));
      setData(r);
      setLoading(false);
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return (
    <div className="text-center py-20 text-gray-400">
      <div className="inline-block w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"/>
      <p>Loading agents...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-1 rounded-full text-xs text-purple-400 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
          ERC-8004 Compliant
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Agents</h2>
        <p className="text-gray-500 text-sm">4 autonomous agents with A2A & MCP endpoints, powered by $REALM</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENTS.map((agent) => {
          const d = data[agent.slug] || {};
          const st = agent.stats(d);
          const ok = !d.error;
          return (
            <div key={agent.slug} className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3 p-4 pb-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{background:agent.color+"18"}}>{agent.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">{agent.name}</div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{background:agent.color+"18",color:agent.color}}>{agent.cat}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className={"w-1.5 h-1.5 rounded-full " + (ok ? "bg-green-500" : "bg-yellow-500")}/>
                  <span className={ok ? "text-green-500" : "text-yellow-500"}>{ok ? "Active" : "Error"}</span>
                </div>
              </div>
              <div className="px-4 pb-3 text-xs text-gray-500">{agent.desc}</div>
              <div className="grid grid-cols-2 border-t border-gray-800/50">
                {st.map((s, i) => (
                  <div key={i} className={"p-3 " + (i < 2 ? "border-b border-gray-800/30 " : "") + (i % 2 === 0 ? "border-r border-gray-800/30" : "")}>
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">{s.l}</div>
                    <div className="text-sm font-bold text-white mt-0.5">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="p-3 flex gap-2 border-t border-gray-800/30">
                <a href={API+"/agents/"+agent.slug+"/.well-known/agent-card.json"} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold no-underline transition-colors" style={{background:agent.color+"18",color:agent.color,border:"1px solid "+agent.color+"30"}}>Agent Card</a>
                <a href={API+"/agents/"+agent.slug+"/api/data"} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-500 border border-white/10 no-underline">API Data</a>
                <a href={API+"/agents/"+agent.slug+"/mcp"} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-500 border border-white/10 no-underline">MCP</a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
