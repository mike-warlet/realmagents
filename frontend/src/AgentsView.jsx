import { useState, useEffect } from 'react';

const API = "https://agents-api.warlet-invest.workers.dev";

const AGENTS = [
  {
    slug: "swap", name: "REALM Swap Agent", icon: "\u{1F4B1}", color: "#8b5cf6", cat: "DEFI",
    desc: "Real-time price data, swap quotes & trading signals",
    stats: (d) => [
      { l: "REALM Price", v: d?.data?.realm_price_usd ? "$" + Number(d.data.realm_price_usd).toFixed(6) : "$0.00" },
      { l: "WETH Price", v: d?.data?.weth_price_usd ? "$" + Number(d.data.weth_price_usd).toFixed(0) : "-" },
      { l: "Signal", v: d?.data?.signal || "N/A" },
      { l: "Confidence", v: d?.data?.confidence ? d.data.confidence + "%" : "-" },
    ]
  },
  {
    slug: "rebalancer", name: "Portfolio Rebalancer", icon: "\u{1F4CA}", color: "#06b6d4", cat: "DEFI",
    desc: "Wallet analysis, DeFi yields & rebalancing suggestions",
    stats: (d) => [
      { l: "Pools Tracked", v: d?.data?.total_pools || "0" },
      { l: "Best APY", v: d?.data?.best_apy ? Number(d.data.best_apy).toFixed(1) + "%" : "-" },
      { l: "Total TVL", v: d?.data?.total_tvl_usd ? "$" + (Number(d.data.total_tvl_usd) / 1e9).toFixed(1) + "B" : "-" },
      { l: "Avg APY", v: d?.data?.avg_apy ? Number(d.data.avg_apy).toFixed(1) + "%" : "-" },
    ]
  },
  {
    slug: "governance", name: "DAO Governance", icon: "\u{1F3DB}\uFE0F", color: "#f59e0b", cat: "DAO",
    desc: "Proposals, voting status & treasury analytics",
    stats: (d) => [
      { l: "Active Proposals", v: d?.data?.active_proposals || "0" },
      { l: "Treasury", v: d?.data?.treasury_eth ? Number(d.data.treasury_eth).toFixed(3) + " ETH" : "-" },
      { l: "REALM Supply", v: d?.data?.realm_total_supply ? (Number(d.data.realm_total_supply) / 1e6).toFixed(1) + "M" : "-" },
      { l: "Holders", v: d?.data?.holder_count || "-" },
    ]
  },
  {
    slug: "whale", name: "Whale Intelligence", icon: "\u{1F40B}", color: "#10b981", cat: "ANALYTICS",
    desc: "Large transfers, wallet profiles & flow analysis",
    stats: (d) => [
      { l: "Whale Txs", v: d?.data?.total_transfers || "0" },
      { l: "Volume", v: d?.data?.total_volume ? Number(d.data.total_volume).toLocaleString() : "0" },
      { l: "Unique Wallets", v: d?.data?.unique_wallets || "0" },
      { l: "Activity", v: d?.data?.activity_level || "QUIET" },
    ]
  },
];

function Modal({ open, onClose, title, icon, color, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{ background: color + "18" }}>{icon}</div>
            <h3 className="text-white font-bold text-sm">{title}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-lg">x</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">{children}</div>
      </div>
    </div>
  );
}

function AgentCardModal({ data, agent }) {
  if (!data) return <p className="text-gray-500 text-sm">Loading...</p>;
  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-xl p-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Description</div>
        <p className="text-gray-300 text-sm">{data.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Version</div>
          <div className="text-white text-sm font-mono">{data.version || "1.0.0"}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Protocol</div>
          <div className="text-white text-sm font-mono">ERC-8004 / A2A</div>
        </div>
      </div>
      {data.skills && data.skills.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Skills ({data.skills.length})</div>
          <div className="space-y-2">
            {data.skills.map((skill, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-semibold">{skill.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">{skill.id}</span>
                </div>
                <p className="text-gray-500 text-xs">{skill.description}</p>
                {skill.tags && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {skill.tags.map((tag, j) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.authentication && (
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Authentication</div>
          <p className="text-gray-300 text-xs">{data.authentication.description}</p>
        </div>
      )}
      {data.realmEconomy && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">$REALM Tiers</div>
          <div className="space-y-1.5">
            {Object.entries(data.realmEconomy.tiers || {}).map(([tier, info]) => (
              <div key={tier} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                <span className="text-white text-xs font-semibold capitalize">{tier}</span>
                <span className="text-gray-500 text-xs">{info.requirement}</span>
                <span className="text-purple-400 text-xs">{info.features}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pt-2 border-t border-gray-800">
        <a href={data.url || API + "/agents/" + agent.slug + "/.well-known/agent-card.json"} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-xs font-mono no-underline">View raw JSON →</a>
      </div>
    </div>
  );
}

function ApiDataModal({ data, agent }) {
  if (!data) return <p className="text-gray-500 text-sm">Loading...</p>;
  const entries = data.data ? Object.entries(data.data) : [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Agent</div>
          <div className="text-white text-sm">{data.agent || agent.name}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-400 text-sm">{data.status || "active"}</span>
          </div>
        </div>
      </div>
      {data.tier && (
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Access Tier</div>
          <div className="text-yellow-400 text-sm font-semibold capitalize">{data.tier}</div>
        </div>
      )}
      {entries.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Live Data ({entries.length} fields)</div>
          <div className="space-y-1.5">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-xs font-mono">{key}</span>
                <span className="text-white text-xs font-mono text-right max-w-[60%] truncate">{typeof val === "object" ? JSON.stringify(val).substring(0, 60) : String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.updated && (
        <div className="text-gray-600 text-[10px] text-center">Last updated: {new Date(data.updated).toLocaleString()}</div>
      )}
      <div className="pt-2 border-t border-gray-800">
        <a href={API + "/agents/" + agent.slug + "/api/data"} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-xs font-mono no-underline">View raw JSON →</a>
      </div>
    </div>
  );
}

function McpModal({ data, agent }) {
  if (!data) return <p className="text-gray-500 text-sm">Loading...</p>;
  const tools = data.tools || data.result?.tools || [];
  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-xl p-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Protocol</div>
        <p className="text-gray-300 text-sm">Model Context Protocol (MCP) — exposes tools that AI models can call directly</p>
      </div>
      <div className="bg-gray-800/50 rounded-xl p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Endpoint</div>
        <div className="text-purple-400 text-xs font-mono break-all">{API}/agents/{agent.slug}/mcp</div>
      </div>
      {tools.length > 0 ? (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Available Tools ({tools.length})</div>
          <div className="space-y-2">
            {tools.map((tool, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">tool</span>
                  <span className="text-white text-sm font-semibold font-mono">{tool.name}</span>
                </div>
                <p className="text-gray-500 text-xs">{tool.description}</p>
                {tool.inputSchema?.properties && (
                  <div className="mt-2 space-y-1">
                    <div className="text-[9px] text-gray-600 uppercase">Parameters:</div>
                    {Object.entries(tool.inputSchema.properties).map(([pName, pDef]) => (
                      <div key={pName} className="flex items-center gap-2 text-[10px]">
                        <span className="text-purple-400 font-mono">{pName}</span>
                        <span className="text-gray-600">({pDef.type || "string"})</span>
                        {pDef.description && <span className="text-gray-500">{pDef.description}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <p className="text-gray-500 text-sm">Send a POST to the MCP endpoint with:</p>
          <pre className="bg-black/50 rounded-lg p-3 mt-2 text-xs text-gray-300 text-left overflow-x-auto">{`{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}`}</pre>
        </div>
      )}
      <div className="pt-2 border-t border-gray-800">
        <a href={API + "/agents/" + agent.slug + "/mcp"} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-xs font-mono no-underline">View raw endpoint →</a>
      </div>
    </div>
  );
}

export default function AgentsView() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const r = {};
      await Promise.all(AGENTS.map(async (a) => {
        try {
          const res = await fetch(API + "/agents/" + a.slug + "/api/data");
          r[a.slug] = await res.json();
        } catch (e) { r[a.slug] = { error: e.message }; }
      }));
      setData(r);
      setLoading(false);
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  async function openModal(agent, type) {
    setModal({ agent, type });
    setModalData(null);
    setModalLoading(true);
    try {
      let url;
      if (type === "card") url = API + "/agents/" + agent.slug + "/.well-known/agent-card.json";
      else if (type === "api") url = API + "/agents/" + agent.slug + "/api/data";
      else url = API + "/agents/" + agent.slug + "/mcp";
      if (type === "mcp") {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }) });
        setModalData(await res.json());
      } else {
        const res = await fetch(url);
        setModalData(await res.json());
      }
    } catch (e) { setModalData({ error: e.message }); }
    setModalLoading(false);
  }

  function closeModal() { setModal(null); setModalData(null); }

  if (loading) return (
    <div className="text-center py-20 text-gray-400">
      <div className="inline-block w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
      <p>Loading agents...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-1 rounded-full text-xs text-purple-400 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
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
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: agent.color + "18" }}>{agent.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">{agent.name}</div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: agent.color + "18", color: agent.color }}>{agent.cat}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className={"w-1.5 h-1.5 rounded-full " + (ok ? "bg-green-500" : "bg-yellow-500")} />
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
                <button onClick={() => openModal(agent, "card")} className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer" style={{ background: agent.color + "18", color: agent.color, border: "1px solid " + agent.color + "30" }}>Agent Card</button>
                <button onClick={() => openModal(agent, "api")} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">API Data</button>
                <button onClick={() => openModal(agent, "mcp")} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">MCP</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <Modal open={true} onClose={closeModal} title={modal.type === "card" ? modal.agent.name + " — Agent Card" : modal.type === "api" ? modal.agent.name + " — Live Data" : modal.agent.name + " — MCP Tools"} icon={modal.agent.icon} color={modal.agent.color}>
          {modalLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
              <p className="text-gray-500 text-sm">Fetching data...</p>
            </div>
          ) : modalData?.error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 text-sm">Error: {modalData.error}</p>
            </div>
          ) : modal.type === "card" ? (
            <AgentCardModal data={modalData} agent={modal.agent} />
          ) : modal.type === "api" ? (
            <ApiDataModal data={modalData} agent={modal.agent} />
          ) : (
            <McpModal data={modalData} agent={modal.agent} />
          )}
        </Modal>
      )}
    </div>
  );
}
