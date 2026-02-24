import { useState, useEffect } from 'react';

const API = "https://agents-api.warlet-invest.workers.dev";

const AGENT_DEFS = [
  {
    slug: "swap",
    name: "REALM Swap Agent",
    icon: "\u{1F4B1}",
    color: "#6b5cf6",
    category: "DEFI",
    desc: "Real-time REALM price, swap quotes, and trading signals on Base.",
    getStats: (d) => [
      { label: "REALM Price", value: d?.data?.realm_price_usd ? "$" + Number(d.data.realm_price_usd).toFixed(6) : "$0.00" },
      { label: "WETH Price", value: d?.data?.weth_price_usd ? "$" + Number(d.data.weth_price_usd).toFixed(0) : "-" },
      { label: "Signal", value: d?.data?.signal || "N/A" },
      { label: "Confidence", value: d?.data?.confidence ? d.data.confidence + "%" : "-" },
    ],
  },
  {
    slug: "rebalancer",
    name: "Portfolio Rebalancer",
    icon: "\u{1F4CA}",
    color: "#06b6d4",
    category: "DEFI",
    desc: "Analyzes wallets and finds the best DeFi yields on Base.",
    getStats: (d) => [
      { label: "Pools Tracked", value: d?.data?.total_pools || "0" },
      { label: "Best APY", value: d?.data?.best_apy ? d.data.best_apy.toFixed(1) + "%" : "-" },
      { label: "Total TVL", value: d?.data?.total_tvl_usd ? "$" + (d.data.total_tvl_usd / 1e9).toFixed(1) + "B" : "-" },
      { label: "Avg APY", value: d?.data?.avg_apy ? d.data.avg_apy.toFixed(1) + "%" : "-" },
    ],
  },
  {
    slug: "governance",
    name: "DAO Governance",
    icon: "\u{1F3DB}\uFE0F",
    color: "#f59e0b",
    category: "DAO",
    desc: "Monitors RealmDAO proposals, voting status, and treasury health.",
    getStats: (d) => [
      { label: "Active Proposals", value: d?.data?.active_proposals || "0" },
      { label: "Treasury", value: d?.data?.treasury_eth ? d.data.treasury_eth.toFixed(3) + " ETH" : "-" },
      { label: "REALM Supply", value: d?.data?.realm_total_supply ? (d.data.realm_total_supply / 1e6).toFixed(1) + "M" : "-" },
      { label: "Holders", value: d?.data?.holder_count || "-" },
    ],
  },
  {
    slug: "whale",
    name: "Whale Intelligence",
    icon: "\u{1F40B}",
    color: "#10b981",
    category: "ANALYTICS",
    desc: "Tracks large REALM & WETH transfers, labels wallets, analyzes flows.",
    getStats: (d) => [
      { label: "Whale Txs", value: d?.data?.total_transfers || "0" },
      { label: "Volume", value: d?.data?.total_volume ? Number(d.data.total_volume).toLocaleString() : "0" },
      { label: "Unique Wallets", value: d?.data?.unique_wallets || "0" },
      { label: "Activity", value: d?.data?.activity_level || "QUIET" },
    ],
  },
  {
    slug: "treasury",
    name: "Treasury Manager",
    icon: "\u{1F3E6}",
    color: "#eab308",
    category: "GOVERNANCE",
    desc: "AI-powered treasury analytics, risk assessment, and governance advisor for RealmDAO.",
    getStats: (d) => [
      { label: "Treasury REALM", value: d?.data?.treasury_realm ? Number(d.data.treasury_realm).toLocaleString() : "0" },
      { label: "Risk Level", value: d?.data?.risk_level || "N/A" },
      { label: "Proposals", value: d?.data?.total_proposals || "0" },
      { label: "Total Staked", value: d?.data?.total_staked ? Number(d.data.total_staked).toLocaleString() : "0" },
    ],
  },
];

export default function AgentsView() {
  const [agentData, setAgentData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results = {};
      await Promise.all(
        AGENT_DEFS.map(async (a) => {
          try {
            const r = await fetch(API + "/agents/" + a.slug + "/api/data");
            results[a.slug] = await r.json();
          } catch (e) {
            results[a.slug] = { error: e.message };
          }
        })
      );
      setAgentData(results);
      setLoading(false);
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#688" }}>
          <div style={{
            width: 32, height: 32,
            border: "3px solid rgba(139,92,246,0.2)",
            borderTopColor: "#6b5cf6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px"
          }} />
          Loading agents...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
          padding: "4px 14px", borderRadius: 20, fontSize: 12, color: "#a78bfa", marginBottom: 12
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite", display: "inline-block" }} />
          ERC-8004 Compliant
        </div>
        <h2 style={{
          fontSize: 28, fontWeight: 800,
          background: "linear-gradient(135deg, #6b5cf6, #06b6d4)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 8
        }}>
          AI Agents
        </h2>
        <p style={{ color: "#688", fontSize: 14, maxWidth: 500, margin: "0 auto" }}>
          5 autonomous agents with A2A &amp; MCP endpoints, powered by $REALM economy
        </p>
      </div>

      {/* Agent Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16, maxWidth: 1100, margin: "0 auto"
      }}>
        {AGENT_DEFS.map((agent) => {
          const d = agentData[agent.slug] || {};
          const stats = agent.getStats(d);
          const healthy = !d.error;

          return (
            <div
              key={agent.slug}
              style={{
                background: "rgba(18,18,26,0.8)",
                border: "1px solid rgba(139,92,246,0.15)",
                borderRadius: 16, overflow: "hidden",
                transition: "border-color 0.3s, transform 0.3s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = agent.color + "60"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.transform = "none"; }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 10px" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: agent.color + "18",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                }}>
                  {agent.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{agent.name}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: agent.color + "18", color: agent.color
                  }}>{agent.category}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: healthy ? "#10b981" : "#f59e0b", display: "inline-block" }} />
                  <span style={{ color: healthy ? "#10b981" : "#f59e0b" }}>{healthy ? "Active" : "Error"}</span>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: "0 16px 12px", fontSize: 12, color: "#688", lineHeight: 1.5 }}>
                {agent.desc}
              </div>

              {/* Stats 2x2 Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid rgba(139,92,246,0.1)" }}>
                {stats.map((s, i) => (
                  <div key={i} style={{
                    padding: "10px 14px",
                    borderBottom: i < 2 ? "1px solid rgba(139,92,246,0.06)" : "none",
                    borderRight: i % 2 === 0 ? "1px solid rgba(139,92,246,0.06)" : "none"
                  }}>
                    <div style={{ fontSize: 9, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ padding: "10px 16px", display: "flex", gap: 6, borderTop: "1px solid rgba(139,92,246,0.06)" }}>
                <a
                  href={API + "/agents/" + agent.slug + "/.well-known/agent-card.json"}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: agent.color + "18", color: agent.color,
                    border: "1px solid " + agent.color + "30", textDecoration: "none"
                  }}
                >
                  Agent Card
                </a>
                <a
                  href={API + "/agents/" + agent.slug + "/api/data"}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)", color: "#688",
                    border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none"
                  }}
                >
                  API Data
                </a>
                <a
                  href={API + "/agents/" + agent.slug + "/mcp"}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)", color: "#688",
                    border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none"
                  }}
                >
                  MCP
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
