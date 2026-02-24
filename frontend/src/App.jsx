import { useState, useEffect, useRef } from "react";

// ─── Constants ─────────────────────────────────────
const API = "https://agents-api.warlet-invest.workers.dev";
const CONTRACTS = {
  realm: "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2",
  registry: "0x8Fa9b010D9B30EF3112060F3Afa3c7573a0f9a17",
  router: "0xA9c2bb95f9041922f1D4ad50C90dc9e881b765Cc",
  launchpad: "0x3b5Cb24E7cf42a8a4405968c81D257Ca71B6Aa10",
};
const short = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";
const ABIS = {
  realm: [
    "function approve(address,uint256) returns (bool)",
    "function allowance(address,address) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
  ],
  registry: [
    "function registerAgent(uint8,string,address) returns (uint256)",
    "function registrationFee() view returns (uint256)",
    "function agentCount() view returns (uint256)",
    "function getAgent(uint256) view returns (tuple(address creator, uint8 category, uint8 status, string metadataURI, uint256 createdAt, uint256 totalRevenue, uint256 totalUses, uint256 reputationScore, bool active, address agentWallet))",
    "function getCreatorAgents(address) view returns (uint256[])",
  ],
  router: [
    "function claimCreatorRevenue(uint256)",
    "function pendingCreatorRevenue(uint256) view returns (uint256)",
  ],
  launchpad: [
    "function launchAgent(uint256,string,string) returns (address)",
    "function quoteBuy(uint256,uint256) view returns (uint256)",
    "function quoteSell(uint256,uint256) view returns (uint256)",
    "function buyTokens(uint256,uint256) returns (uint256)",
    "function sellTokens(uint256,uint256) returns (uint256)",
  ],
};

// Helper: get ethers provider + signer
const getProvider = () => {
  if (!window.ethers || !window.ethereum) return null;
  return new window.ethers.BrowserProvider(window.ethereum);
};
const getContract = (addr, abi, signerOrProvider) => new window.ethers.Contract(addr, abi, signerOrProvider);
const parseUnits = (v, d=18) => window.ethers.parseUnits(v, d);
const fmtUnits = (v, d=18) => window.ethers.formatUnits(v, d);
const fmt = (n) => {
  if (!n || isNaN(n)) return "$0";
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

// ─── Disclaimer ────────────────────────────────────
function Disclaimer({ onAccept }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <img src="https://realmdao.com/logo.svg" alt="R" className="w-8 h-8 rounded-lg" />
          <h2 className="text-xl font-bold text-white">RealmAgents</h2>
        </div>
        <h3 className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-4">Important Disclaimers</h3>
        {[
          {t:"Risk Warning", c:"Interacting with smart contracts and digital assets involves significant risk, including the possible loss of all funds. Only invest what you can afford to lose.", bg:"bg-red-950 border-red-900"},
          {t:"No Financial Advice", c:"Nothing on this platform constitutes financial, investment, legal, or tax advice. Token prices are volatile and speculative.", bg:"bg-amber-950 border-amber-900"},
          {t:"Smart Contract Risk", c:"Contracts are on Base L2 and immutable. They have not undergone a formal third-party security audit. Bugs or exploits may exist.", bg:"bg-blue-950 border-blue-900"},
          {t:"Regulatory Notice", c:"This platform is experimental. It may not be legal in all jurisdictions. Users are solely responsible for compliance with local laws.", bg:"bg-purple-950 border-purple-900"},
          {t:"No Warranty", c:"Provided as-is without warranty. Developers and RealmDAO are not liable for any damages.", bg:"bg-gray-800 border-gray-700"},
        ].map(d => (
          <div key={d.t} className={`${d.bg} border rounded-xl p-4 mb-3`}>
            <h4 className="text-sm font-bold text-yellow-400 mb-1">{d.t}</h4>
            <p className="text-sm text-gray-300">{d.c}</p>
          </div>
        ))}
        <button onClick={onAccept} className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors">
          I Understand and Accept the Risks
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">By proceeding, you acknowledge these disclaimers.</p>
      </div>
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────
function Navbar({ section, setSection, account, onConnect }) {
  const sections = ["home","agents","explore","launch","dashboard"];
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <button onClick={() => setSection("home")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src="https://realmdao.com/logo.svg" alt="R" className="w-7 h-7 rounded-md" />
          <span className="text-white font-bold text-lg">RealmAgents</span>
        </button>
        <div className="flex gap-1">
          {sections.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                section === s ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}>{s}</button>
          ))}
          <a href="https://realmdao.com" target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors no-underline">
            DAO &#x2197;
          </a>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <a href={`https://basescan.org/address/${CONTRACTS.registry}`} target="_blank" rel="noopener noreferrer"
          className="text-gray-500 text-sm hover:text-gray-300 no-underline">Base Mainnet</a>
        <button onClick={onConnect}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
          {account ? short(account) : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
}

// ─── Home Section ──────────────────────────────────
function Home({ setSection, onConnect }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <div className="flex justify-center mb-6">
        <img src="https://realmdao.com/logo.svg" alt="R" className="w-16 h-16 rounded-2xl opacity-80" />
      </div>
      <div className="inline-flex items-center gap-2 bg-green-950 border border-green-800 rounded-full px-4 py-1.5 mb-6">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-green-400 text-xs font-medium">Live on Base L2</span>
      </div>
      <h1 className="text-5xl font-extrabold text-white mb-2">The AI Agent</h1>
      <h1 className="text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-6">Launchpad</h1>
      <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
        Register, launch, and monetize AI agents on-chain. Each agent gets its own token with bonding curve pricing, powered by $REALM.
      </p>
      <div className="flex justify-center gap-4 mb-16">
        <button onClick={onConnect}
          className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">
          Connect to Start
        </button>
        <button onClick={() => setSection("agents")}
          className="px-8 py-3.5 border-2 border-violet-500/50 hover:border-violet-400 text-gray-200 font-semibold rounded-xl transition-colors">
          Explore Agents
        </button>
      </div>
      <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
        {[{l:"Total Supply",v:"100M $REALM"},{l:"Revenue Split",v:"70/20/10"},{l:"Network",v:"Base L2"}].map(s => (
          <div key={s.l}><div className="text-2xl font-bold text-white">{s.v}</div><div className="text-gray-500 text-sm">{s.l}</div></div>
        ))}
      </div>
    </div>
  );
}

// ─── New Agents Data (v2 - 5 agents with chat) ─────
const AGENTS_V2 = [
  {
    slug: "swap", name: "REALM Swap Agent", icon: "\uD83D\uDCB1", color: "#8b5cf6", cat: "DEFI",
    desc: "Real-time price data, swap quotes & trading signals",
    greeting: "Hi! I'm the REALM Swap Agent \uD83D\uDCB1\n\nI can help you with:\n\u2022 REALM price & market data\n\u2022 Swap quotes (REALM \u2194 WETH)\n\u2022 Trading signals & analysis\n\nPowered by Workers AI + live DeFiLlama data.",
    stats: (d) => [
      { l: "REALM Price", v: d?.data?.realm_price_usd != null ? "$" + Number(d.data.realm_price_usd).toFixed(6) : "$0.00" },
      { l: "WETH Price", v: d?.data?.weth_price_usd ? "$" + Number(d.data.weth_price_usd).toFixed(0) : "-" },
      { l: "Signal", v: d?.data?.signal || "N/A" },
      { l: "Confidence", v: d?.data?.confidence != null ? d.data.confidence + "%" : "-" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const ql = q.toLowerCase();
      if (ql.match(/pre[cç]o|price|valor|quanto/)) return "REALM: $" + Number(data.realm_price_usd || 0).toFixed(6) + "\nWETH: $" + Number(data.weth_price_usd || 0).toFixed(2) + "\nSignal: " + (data.signal || "N/A");
      if (ql.match(/swap|trocar|converter/)) { const w = data.weth_price_usd || 0, p = data.realm_price_usd || 0; return p > 0 && w > 0 ? "1 WETH = " + Math.round(w / p).toLocaleString() + " REALM\nSwap on Aerodrome (Base)." : "Price data unavailable."; }
      return "REALM: $" + Number(data.realm_price_usd || 0).toFixed(6) + " | WETH: $" + Number(data.weth_price_usd || 0).toFixed(2) + " | Signal: " + (data.signal || "N/A") + "\nAsk about: price, swap quotes, or signals.";
    },
    suggestions: ["REALM price?", "How to swap REALM?", "Trading signal?", "Market analysis"],
  },
  {
    slug: "rebalancer", name: "Portfolio Rebalancer", icon: "\uD83D\uDCCA", color: "#06b6d4", cat: "DEFI",
    desc: "DeFi yield opportunities & rebalancing strategies",
    greeting: "Hi! I'm the Portfolio Rebalancer \uD83D\uDCCA\n\nI can help you with:\n\u2022 Best DeFi yields on Base\n\u2022 Pool risk analysis\n\u2022 Portfolio allocation\n\nPowered by Workers AI + live DeFiLlama data.",
    stats: (d) => [
      { l: "Pools", v: d?.data?.total_pools != null ? String(d.data.total_pools) : "0" },
      { l: "Best APY", v: d?.data?.best_apy ? Number(d.data.best_apy).toFixed(1) + "%" : "-" },
      { l: "Top Protocol", v: d?.data?.best_protocol || "-" },
      { l: "Total TVL", v: d?.data?.total_tvl_usd ? "$" + (d.data.total_tvl_usd / 1e6).toFixed(1) + "M" : "-" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const pools = data.pools || [];
      const ql = q.toLowerCase();
      if (ql.match(/best|melhor|top|yield|apy/)) return pools[0] ? "Top pool: " + pools[0].protocol + " " + pools[0].pool + " at " + pools[0].apy.toFixed(1) + "% APY (" + pools[0].risk + " risk)" : "No pools available.";
      return "Tracking " + (data.total_pools || 0) + " Base pools. Best APY: " + (data.best_apy ? data.best_apy.toFixed(1) : "0") + "%. Ask about: best yields, safe pools, or risk.";
    },
    suggestions: ["Best yields on Base?", "Low risk pools?", "Portfolio analysis", "Top protocol?"],
  },
  {
    slug: "governance", name: "DAO Governance", icon: "\uD83C\uDFDB\uFE0F", color: "#f59e0b", cat: "DAO",
    desc: "Proposals, voting status & treasury analytics",
    greeting: "Hi! I'm the DAO Governance Agent \uD83C\uDFDB\uFE0F\n\nI can help you with:\n\u2022 RealmDAO proposals & voting\n\u2022 Treasury balance\n\u2022 Contract addresses\n\nPowered by Workers AI + on-chain data.",
    stats: (d) => [
      { l: "Treasury", v: d?.data?.treasury_realm != null ? Number(d.data.treasury_realm).toLocaleString() + " REALM" : "-" },
      { l: "Proposals", v: d?.data?.total_proposals != null ? String(d.data.total_proposals) : "0" },
      { l: "Staked", v: d?.data?.total_staked != null ? Number(d.data.total_staked).toLocaleString() + " REALM" : "-" },
      { l: "Holders", v: d?.data?.holder_count || "-" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const ql = q.toLowerCase();
      if (ql.match(/treasury|tesour|saldo/)) return "Treasury: " + Number(data.treasury_realm || 0).toLocaleString() + " REALM\nTotal Supply: " + Number(data.realm_total_supply || 0).toLocaleString() + " REALM\nStaked: " + Number(data.total_staked || 0).toLocaleString() + " REALM";
      if (ql.match(/contract|contrato/)) return "Registry: 0x8Fa9b010D9B30EF3112060F3Afa3c7573a0f9a17\nRouter: 0xA9c2bb95f9041922f1D4ad50C90dc9e881b765Cc\nDAO: 0x157A257228c5FebB7F332a8E492F0037f3A0526f";
      return "RealmDAO: " + Number(data.treasury_realm || 0).toLocaleString() + " REALM in treasury. " + (data.total_proposals || 0) + " proposals.\nAsk about: treasury, proposals, or contracts.";
    },
    suggestions: ["Treasury balance?", "Active proposals?", "Contract addresses?", "Revenue split?"],
  },
  {
    slug: "whale", name: "Whale Intelligence", icon: "\uD83D\uDC0B", color: "#10b981", cat: "ANALYTICS",
    desc: "Large transfers, wallet profiles & flow analysis",
    greeting: "Hi! I'm the Whale Intelligence Agent \uD83D\uDC0B\n\nI can help you with:\n\u2022 Large REALM transfers\n\u2022 Exchange flow analysis\n\u2022 Whale wallet tracking\n\nPowered by Workers AI + Alchemy RPC.",
    stats: (d) => [
      { l: "Transfers", v: d?.data?.total_transfers != null ? String(d.data.total_transfers) : "0" },
      { l: "Volume", v: d?.data?.total_volume ? Number(d.data.total_volume).toLocaleString() + " REALM" : "0" },
      { l: "Wallets", v: d?.data?.unique_wallets != null ? String(d.data.unique_wallets) : "0" },
      { l: "Activity", v: d?.data?.activity_level || "QUIET" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const tx = data.transfers || [];
      const ql = q.toLowerCase();
      if (ql.match(/whale|transfer|baleia|movimento/)) return tx.length ? (data.total_transfers || 0) + " whale transfers. Volume: " + (data.total_volume || 0).toLocaleString() + " REALM\nLargest: " + (tx[0]?.amount || 0).toLocaleString() + " REALM" : "No whale transfers detected.";
      return "Whale Intelligence: " + (data.total_transfers || 0) + " transfers | " + (data.total_volume || 0).toLocaleString() + " REALM volume | Activity: " + (data.activity_level || "QUIET") + "\nAsk about: whales, transfers, or flows.";
    },
    suggestions: ["Whale activity?", "Exchange flows?", "Recent transfers?", "Market flow?"],
  },
  {
    slug: "treasury", name: "Treasury Manager", icon: "🏦", color: "#eab308", cat: "GOVERNANCE",
    desc: "AI-powered treasury analytics, risk assessment & governance advisor",
    greeting: "Hi! I'm the Treasury Manager Agent 🏦\n\nI can help you with:\n• DAO treasury balance & analytics\n• Risk assessment & scoring\n• Governance proposal analysis\n\nPowered by Workers AI + on-chain data.",
    stats: (d) => [
      { l: "Treasury", v: d?.data?.treasury_realm != null ? Number(d.data.treasury_realm).toLocaleString() + " REALM" : "0" },
      { l: "Risk Level", v: d?.data?.risk_level || "N/A" },
      { l: "Proposals", v: d?.data?.total_proposals != null ? String(d.data.total_proposals) : "0" },
      { l: "Staked", v: d?.data?.total_staked != null ? Number(d.data.total_staked).toLocaleString() + " REALM" : "0" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const ql = q.toLowerCase();
      if (ql.match(/treasury|tesour|saldo|balance/)) return "Treasury: " + Number(data.treasury_realm || 0).toLocaleString() + " REALM\nRisk: " + (data.risk_level || "N/A") + " (Score: " + (data.risk_score || 0) + "/10)\nStaked: " + Number(data.total_staked || 0).toLocaleString() + " REALM";
      if (ql.match(/risk|risco|score/)) return "Risk Level: " + (data.risk_level || "N/A") + "\nRisk Score: " + (data.risk_score || 0) + "/10";
      return "Treasury: " + Number(data.treasury_realm || 0).toLocaleString() + " REALM | Risk: " + (data.risk_level || "N/A") + " | Proposals: " + (data.total_proposals || 0) + "\nAsk about: treasury balance, risk assessment, or proposals.";
    },
    suggestions: ["Treasury balance?", "Risk assessment?", "Staking info?", "Proposal count?"],
  },
];

const AGENT_META = {
  swap: {
    registryId: 3,
    capabilities: ["price_tracking", "swap_quotes", "trading_signals", "market_analysis"],
    creator: "0x157A257228c5FebB7F332a8E492F0037f3A0526f",
    chain: "Base",
    apiBase: API + "/agents/swap",
    agentWallet: null,
    createdAt: "2025-01-15",
    protocol: "ERC-8004",
  },
  rebalancer: {
    registryId: 4,
    capabilities: ["yield_analysis", "pool_tracking", "risk_assessment", "portfolio_allocation"],
    creator: "0x157A257228c5FebB7F332a8E492F0037f3A0526f",
    chain: "Base",
    apiBase: API + "/agents/rebalancer",
    agentWallet: null,
    createdAt: "2025-01-15",
    protocol: "ERC-8004",
  },
  governance: {
    registryId: 5,
    capabilities: ["proposal_monitoring", "voting_status", "treasury_analytics", "contract_info"],
    creator: "0x157A257228c5FebB7F332a8E492F0037f3A0526f",
    chain: "Base",
    apiBase: API + "/agents/governance",
    agentWallet: null,
    createdAt: "2025-01-15",
    protocol: "ERC-8004",
  },
  whale: {
    registryId: 6,
    capabilities: ["transfer_tracking", "wallet_profiling", "flow_analysis", "exchange_monitoring"],
    creator: "0x157A257228c5FebB7F332a8E492F0037f3A0526f",
    chain: "Base",
    apiBase: API + "/agents/whale",
    agentWallet: null,
    createdAt: "2025-01-15",
    protocol: "ERC-8004",
  },
  treasury: {
    registryId: 4,
    capabilities: ["treasury_monitoring", "risk_assessment", "governance_advisory", "financial_reporting"],
    creator: "0x157A257228c5FebB7F332a8E492F0037f3A0526f",
    chain: "Base",
    apiBase: "https://treasury-agent.warlet-invest.workers.dev",
    agentWallet: null,
    createdAt: "2025-02-23",
    protocol: "ERC-8004",
  },
};


// ─── Modal Component ─────────────────────────────
function Modal({ isOpen, onClose, icon, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 text-gray-100 text-sm">{children}</div>
      </div>
    </div>
  );
}

// ─── Agent Card Modal ────────────────────────────
function AgentCardModal({ isOpen, onClose, slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (isOpen && slug) {
      setLoading(true);
      fetch(`${API}/agents/${slug}/.well-known/agent-card.json`)
        .then(r => r.json()).then(setData)
        .catch(() => setData({ error: "Failed to load" }))
        .finally(() => setLoading(false));
    }
  }, [isOpen, slug]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} icon="\uD83D\uDCC4" title="Agent Card (ERC-8004)">
      {loading ? <p className="text-gray-400">Loading agent card...</p> :
        data?.error ? <p className="text-red-400">{data.error}</p> : (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-bold text-lg mb-1">{data?.name}</h3>
              <p className="text-gray-400 text-sm">{data?.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3"><span className="text-gray-500 text-xs">Version</span><p className="text-white text-sm font-medium">{data?.version}</p></div>
              <div className="bg-gray-800 rounded-lg p-3"><span className="text-gray-500 text-xs">Provider</span><p className="text-white text-sm font-medium">{data?.provider?.organization}</p></div>
            </div>
            {data?.skills?.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-3">
                <span className="text-gray-500 text-xs block mb-2">Skills</span>
                {data.skills.map((s, i) => (
                  <div key={i} className="text-sm"><span className="text-violet-400">{s.name}</span><span className="text-gray-500"> - {s.description}</span></div>
                ))}
              </div>
            )}
            <details className="bg-gray-800 rounded-lg p-3">
              <summary className="text-gray-500 text-xs cursor-pointer">Raw JSON</summary>
              <pre className="mt-2 text-xs overflow-auto text-gray-300">{JSON.stringify(data, null, 2)}</pre>
            </details>
          </div>
        )}
    </Modal>
  );
}

// ─── API Data Modal ──────────────────────────────
function ApiDataModal({ isOpen, onClose, slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (isOpen && slug) {
      setLoading(true);
      fetch(`${API}/agents/${slug}/api/data`)
        .then(r => r.json()).then(setData)
        .catch(() => setData({ error: "Failed to load" }))
        .finally(() => setLoading(false));
    }
  }, [isOpen, slug]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} icon="\uD83D\uDCCA" title="Live API Data">
      {loading ? <p className="text-gray-400">Fetching live data...</p> :
        data?.error ? <p className="text-red-400">{data.error}</p> : (
          <div className="space-y-3">
            {data?.data && Object.entries(data.data).filter(([k]) => k !== "pools" && k !== "transfers").map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-gray-800 rounded-lg px-4 py-2.5">
                <span className="text-gray-400 text-sm">{k.replace(/_/g, " ")}</span>
                <span className="text-white font-medium text-sm">{typeof v === "number" ? v.toLocaleString() : String(v)}</span>
              </div>
            ))}
            {data?.lastUpdate && <p className="text-gray-600 text-xs">Last update: {data.lastUpdate}</p>}
            <details className="bg-gray-800 rounded-lg p-3">
              <summary className="text-gray-500 text-xs cursor-pointer">Raw JSON</summary>
              <pre className="mt-2 text-xs overflow-auto text-gray-300">{JSON.stringify(data, null, 2)}</pre>
            </details>
          </div>
        )}
    </Modal>
  );
}

// ─── MCP Modal ───────────────────────────────────
function McpModal({ isOpen, onClose, slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (isOpen && slug) {
      setLoading(true);
      fetch(`${API}/agents/${slug}/mcp`)
        .then(r => r.json()).then(setData)
        .catch(() => setData({ error: "Failed to load" }))
        .finally(() => setLoading(false));
    }
  }, [isOpen, slug]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} icon="\uD83E\uDDE0" title="MCP Tools">
      {loading ? <p className="text-gray-400">Loading MCP tools...</p> :
        data?.error ? <p className="text-red-400">{data.error}</p> : (
          <div className="space-y-3">
            {data?.tools?.map((t, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4">
                <p className="text-violet-400 font-mono text-sm font-bold">{t.name}</p>
                <p className="text-gray-400 text-sm mt-1">{t.description}</p>
                {t.inputSchema && (
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto">{JSON.stringify(t.inputSchema, null, 2)}</pre>
                )}
              </div>
            ))}
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">MCP Endpoint</p>
              <code className="text-violet-400 text-xs">{API}/agents/{slug}/mcp</code>
            </div>
          </div>
        )}
    </Modal>
  );
}

// ─── Chat Modal (Workers AI) ─────────────────────
function ChatModal({ isOpen, onClose, agent, agentData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);
  const messagesEndRef = useRef(null);

  // Reset messages when agent changes
  useEffect(() => {
    if (isOpen && agent) {
      setMessages([{ role: "assistant", text: agent.greeting }]);
      setSuggestionsVisible(true);
      setInput("");
    }
  }, [isOpen, agent?.slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput("");
    setSuggestionsVisible(false);
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/agents/${agent.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", text: data.response || "No response.", isAI: data.powered_by === "workers-ai" }]);
    } catch (e) {
      // Use local fallback
      const fallback = agent.fallback ? agent.fallback(userMsg, agentData) : "Service unavailable. Try again later.";
      setMessages(m => [...m, { role: "assistant", text: fallback, offline: true }]);
    }
    setLoading(false);
  };

  if (!agent) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} icon={agent.icon} title={agent.name + " Chat"}>
      <div className="flex flex-col" style={{ height: "400px" }}>
        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-lg ${m.role === "user" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-100"}`}>
                <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                {m.isAI && <p className="text-xs text-gray-500 mt-1">Powered by Workers AI</p>}
                {m.offline && <p className="text-xs text-orange-400 mt-1">Offline mode (fallback)</p>}
              </div>
            </div>
          ))}
          {suggestionsVisible && agent.suggestions && (
            <div className="flex flex-wrap gap-2">
              {agent.suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700">
                  {s}
                </button>
              ))}
            </div>
          )}
          {loading && (
            <div className="flex gap-1 pl-2">
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-700">
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:border-violet-500 outline-none"
          />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Send
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Agents Section (v2 - 5 agents with modals) ──
function AgentDetail({ agent, meta, onBack }) {
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (agent.greeting) {
      setChatMsgs([{ role: "assistant", text: agent.greeting }]);
    }
  }, [agent.slug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const q = chatInput.trim();
    setChatInput("");
    setChatMsgs(prev => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const r = await fetch(`${API}/agents/${agent.slug}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const d = await r.json();
      const reply = d.response || d.reply || d.message || (agent.fallback ? agent.fallback(q, agent.apiData) : "No response.");
      setChatMsgs(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      const fb = agent.fallback ? agent.fallback(q, agent.apiData) : "Connection error.";
      setChatMsgs(prev => [...prev, { role: "assistant", text: fb }]);
    }
    setChatLoading(false);
  };

  const stats = agent.stats(agent.apiData);
  const endpoints = [
    { label: "API Data", url: `${API}/agents/${agent.slug}/api/data` },
    { label: "Agent Card", url: `${API}/agents/${agent.slug}/.well-known/agent-card.json` },
    { label: "MCP Manifest", url: `${API}/agents/${agent.slug}/mcp` },
    { label: "Chat API", url: `${API}/agents/${agent.slug}/api/chat` },
  ];
  if (agent.slug === "treasury") {
    endpoints.push({ label: "Treasury Worker", url: "https://treasury-agent.warlet-invest.workers.dev" });
    endpoints.push({ label: "Health Check", url: "https://treasury-agent.warlet-invest.workers.dev/health" });
  }

  const tabs = ["overview", "chat", "endpoints", "metadata"];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Back Button */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <span>\u2190</span> Back to Agents
      </button>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="text-5xl w-16 h-16 flex items-center justify-center rounded-xl"
            style={{ background: agent.color + "18" }}>
            {agent.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md"
                style={{ background: agent.color + "20", color: agent.color }}>
                {agent.cat}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-green-500/10 text-green-400">
                \u25CF Active
              </span>
            </div>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">{agent.desc}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
              <span>Registry ID: <span className="text-gray-300">#{meta.registryId}</span></span>
              <span>Chain: <span className="text-gray-300">{meta.chain}</span></span>
              <span>Protocol: <span className="text-gray-300">{meta.protocol}</span></span>
              <span>Created: <span className="text-gray-300">{meta.createdAt}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === t
                ? "bg-violet-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Live Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3">
                  <div className="text-gray-500 text-xs uppercase tracking-wide">{s.l}</div>
                  <div className="text-white font-bold text-lg mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Creator & Contract Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Agent Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Creator</span>
                  <button onClick={() => copyText(meta.creator, "creator")}
                    className="text-violet-400 text-xs font-mono hover:text-violet-300">
                    {meta.creator.slice(0,6) + "..." + meta.creator.slice(-4)}
                    {copied === "creator" ? " \u2713" : ""}
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Registry Contract</span>
                  <button onClick={() => copyText(CONTRACTS.registry, "registry")}
                    className="text-violet-400 text-xs font-mono hover:text-violet-300">
                    {CONTRACTS.registry.slice(0,6) + "..." + CONTRACTS.registry.slice(-4)}
                    {copied === "registry" ? " \u2713" : ""}
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Chain</span>
                  <span className="text-gray-300 text-xs">{meta.chain} (ID: 8453)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Registry ID</span>
                  <span className="text-gray-300 text-xs">#{meta.registryId}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {meta.capabilities.map((c, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700">
                    {c.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setActiveTab("chat")}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90"
                style={{ background: agent.color }}>
                Start Chat
              </button>
              <a href={`${API}/agents/${agent.slug}/api/data`} target="_blank" rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 no-underline">
                View API Data
              </a>
              <a href={`${API}/agents/${agent.slug}/.well-known/agent-card.json`} target="_blank" rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 no-underline">
                Agent Card JSON
              </a>
              <a href={`https://basescan.org/address/${meta.creator}`} target="_blank" rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 no-underline">
                View on BaseScan
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Chat */}
      {activeTab === "chat" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3">
            <span className="text-xl">{agent.icon}</span>
            <div>
              <div className="text-white font-semibold text-sm">{agent.name}</div>
              <div className="text-green-400 text-xs">Online - Powered by Workers AI</div>
            </div>
          </div>
          <div className="h-96 overflow-y-auto p-4 space-y-3" style={{ background: "rgba(0,0,0,0.2)" }}>
            {chatMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-200 rounded-bl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 px-4 py-2.5 rounded-xl text-sm rounded-bl-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {agent.suggestions && chatMsgs.length <= 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-800/50">
              {agent.suggestions.map((s, i) => (
                <button key={i} onClick={() => { setChatInput(s); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 hover:bg-violet-600/20">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="p-4 border-t border-gray-800 flex gap-3">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={`Ask ${agent.name} anything...`}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-violet-500"
            />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90"
              style={{ background: agent.color }}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Tab: Endpoints */}
      {activeTab === "endpoints" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">API Endpoints</h3>
          <div className="space-y-3">
            {endpoints.map((ep, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-white text-sm font-medium">{ep.label}</div>
                  <div className="text-gray-500 text-xs font-mono mt-0.5 break-all">{ep.url}</div>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button onClick={() => copyText(ep.url, ep.label)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-gray-700 text-gray-300 hover:bg-gray-600">
                    {copied === ep.label ? "Copied!" : "Copy"}
                  </button>
                  <a href={ep.url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 no-underline">
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Metadata */}
      {activeTab === "metadata" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">On-Chain Metadata</h3>
            <button onClick={() => copyText(JSON.stringify({
              name: agent.name,
              description: agent.desc,
              category: agent.cat,
              registryId: meta.registryId,
              chain: meta.chain,
              protocol: meta.protocol,
              creator: meta.creator,
              capabilities: meta.capabilities,
              endpoints: {
                api: `${API}/agents/${agent.slug}/api/data`,
                chat: `${API}/agents/${agent.slug}/api/chat`,
                agentCard: `${API}/agents/${agent.slug}/.well-known/agent-card.json`,
                mcp: `${API}/agents/${agent.slug}/mcp`,
              },
            }, null, 2), "json")}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white">
              {copied === "json" ? "Copied!" : "Copy JSON"}
            </button>
          </div>
          <pre className="bg-black rounded-lg p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed">{
            JSON.stringify({
              name: agent.name,
              description: agent.desc,
              category: agent.cat,
              registryId: meta.registryId,
              chain: meta.chain,
              chainId: 8453,
              protocol: meta.protocol,
              creator: meta.creator,
              createdAt: meta.createdAt,
              capabilities: meta.capabilities,
              contracts: {
                registry: CONTRACTS.registry,
                router: CONTRACTS.router,
                realm: CONTRACTS.realm,
              },
              endpoints: {
                api: `${API}/agents/${agent.slug}/api/data`,
                chat: `${API}/agents/${agent.slug}/api/chat`,
                agentCard: `${API}/agents/${agent.slug}/.well-known/agent-card.json`,
                mcp: `${API}/agents/${agent.slug}/mcp`,
              },
            }, null, 2)
          }</pre>
        </div>
      )}
    </div>
  );
}

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const initialRef = useRef(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await Promise.all(
        AGENTS_V2.map(a =>
          fetch(`${API}/agents/${a.slug}/api/data`)
            .then(r => r.json())
            .catch(() => ({}))
        )
      );
      setAgents(AGENTS_V2.map((a, i) => ({ ...a, apiData: data[i] })));
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Agent data failed:", e);
      setAgents(AGENTS_V2.map(a => ({ ...a, apiData: {} })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!initialRef.current) {
      initialRef.current = true;
      loadAgents();
      const interval = setInterval(loadAgents, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  // Detail view
  if (selectedSlug) {
    const agent = agents.find(a => a.slug === selectedSlug);
    if (agent) {
      return <AgentDetail agent={agent} meta={AGENT_META[agent.slug] || {}} onBack={() => setSelectedSlug(null)} />;
    }
  }

  // Filter
  const filtered = agents.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.cat.toLowerCase().includes(search.toLowerCase()) ||
    a.slug.toLowerCase().includes(search.toLowerCase()) ||
    a.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 bg-green-950 border border-green-800 rounded-full px-3 py-1 mb-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs">Live Data</span>
          </div>
          <h2 className="text-2xl font-bold text-white">AI Agents</h2>
          <p className="text-gray-500 text-sm mt-1">{AGENTS_V2.length} autonomous agents with A2A & MCP endpoints</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full md:w-64 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-white text-sm outline-none focus:border-violet-500"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          </div>
          <button onClick={loadAgents} disabled={loading}
            className="px-4 py-2.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-semibold rounded-xl hover:bg-violet-600/30 disabled:opacity-50 shrink-0">
            {loading ? "..." : "\u21BB"}
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      {loading && agents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Loading agents...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No agents match your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => {
            const stats = agent.stats(agent.apiData);
            const meta = AGENT_META[agent.slug] || {};
            return (
              <div key={agent.slug}
                onClick={() => setSelectedSlug(agent.slug)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-500/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-lg"
                    style={{ background: agent.color + "15" }}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm group-hover:text-violet-300 transition-colors truncate">{agent.name}</h3>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ background: agent.color + "18", color: agent.color }}>
                        {agent.cat}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-400">
                        Active
                      </span>
                      {meta.registryId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                          #{meta.registryId}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-lg">\u2192</span>
                </div>
                <p className="text-gray-500 text-xs mb-3 leading-relaxed">{agent.desc}</p>
                <div className="grid grid-cols-2 gap-2">
                  {stats.slice(0, 2).map((s, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg px-3 py-2">
                      <div className="text-gray-600 text-[10px] uppercase">{s.l}</div>
                      <div className="text-white font-semibold text-xs mt-0.5">{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Last update */}
      {lastUpdate && (
        <div className="text-center mt-6 text-gray-600 text-xs">
          Last updated: {lastUpdate}
        </div>
      )}
    </div>
  );
}

function Explore() {
  const cards = [
    {icon:"\uD83E\uDD16",t:"Agent Registry",d:"Register AI agents as ERC-721 NFTs with on-chain identity, reputation tracking, and verification."},
    {icon:"\uD83D\uDCC8",t:"Bonding Curves",d:"Each agent gets its own sub-token with linear bonding curve pricing. Early supporters get the best price."},
    {icon:"\uD83D\uDCB0",t:"Revenue Router",d:"Automatic distribution: 70% creators, 20% DAO governance, 10% treasury. 2% burn on all transactions."},
    {icon:"\uD83D\uDD12",t:"DAO Governed",d:"All contracts owned by RealmDAO v3. Upgrades and parameters controlled by $REALM holders."},
  ];
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h2 className="text-2xl font-bold text-white text-center mb-10">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
        {cards.map(c => (
          <div key={c.t} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-violet-500/30 transition-colors">
            <div className="text-3xl mb-3">{c.icon}</div>
            <h3 className="text-white font-bold text-lg mb-2">{c.t}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{c.d}</p>
          </div>
        ))}
      </div>

      {/* Revenue Split Visual */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-10">
        <h3 className="text-white font-bold text-lg mb-4">Revenue Distribution</h3>
        <div className="flex gap-3 mb-4">
          {[{l:"Creators",v:"70%",c:"bg-violet-500"},{l:"DAO Governance",v:"20%",c:"bg-amber-500"},{l:"Treasury",v:"10%",c:"bg-emerald-500"}].map(s => (
            <div key={s.l} className="flex-1 text-center">
              <div className={`h-2 rounded-full ${s.c} mb-2`} />
              <div className="text-white font-bold text-sm">{s.v}</div>
              <div className="text-gray-500 text-xs">{s.l}</div>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs">+ 2% burn on all agent token transactions.</p>
      </div>

      <h3 className="text-gray-500 text-xs uppercase tracking-widest text-center mb-6">Contracts on Base</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries({AgentRegistry:CONTRACTS.registry,RevenueRouter:CONTRACTS.router,AgentLaunchpad:CONTRACTS.launchpad,"$REALM Token":CONTRACTS.realm}).map(([n,a]) => (
          <a key={n} href={`https://basescan.org/address/${a}`} target="_blank" rel="noopener noreferrer"
            className="flex justify-between items-center bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 hover:border-violet-500/30 transition-colors no-underline">
            <span className="text-gray-300 font-medium">{n}</span>
            <span className="text-gray-600 font-mono text-xs">{short(a)}</span>
          </a>
        ))}
      </div>
      <p className="text-gray-600 text-xs text-center mt-4">Contracts are immutable and owned by RealmDAO v3. Not formally audited.</p>
    </div>
  );
}

// ─── Launch Section ────────────────────────────────
function Launch({ onConnect, account }) {
  const [step, setStep] = useState(0); // 0=form, 1=approving, 2=registering, 3=launch-token, 4=done
  const [form, setForm] = useState({ name: "", desc: "", category: "0", endpoint: "" });
  const [tokenForm, setTokenForm] = useState({ name: "", symbol: "" });
  const [status, setStatus] = useState("");
  const [agentId, setAgentId] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [wantToken, setWantToken] = useState(false);
  const [realmBal, setRealmBal] = useState("0");
  const [fee, setFee] = useState("100");

  // Load balance + fee
  useEffect(() => {
    if (!account) return;
    (async () => {
      try {
        const p = getProvider();
        const realm = getContract(CONTRACTS.realm, ABIS.realm, p);
        const reg = getContract(CONTRACTS.registry, ABIS.registry, p);
        const [bal, f] = await Promise.all([realm.balanceOf(account), reg.registrationFee()]);
        setRealmBal(fmtUnits(bal));
        setFee(fmtUnits(f));
      } catch (e) { console.error(e); }
    })();
  }, [account]);

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-6">&#x1F680;</div>
        <h2 className="text-2xl font-bold text-white mb-4">Launch an Agent</h2>
        <p className="text-gray-400 mb-8">Register your AI agent on-chain. Pay {fee} $REALM fee, get an ERC-721 NFT, and optionally launch a sub-token with bonding curve pricing.</p>
        <button onClick={onConnect} className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">Connect Wallet to Launch</button>
        <p className="text-gray-600 text-xs mt-6">Requires {fee} $REALM registration fee + gas on Base L2.</p>
      </div>
    );
  }

  const doApproveAndRegister = async () => {
    try {
      const p = getProvider();
      const signer = await p.getSigner();
      const realm = getContract(CONTRACTS.realm, ABIS.realm, signer);
      const reg = getContract(CONTRACTS.registry, ABIS.registry, signer);
      const feeWei = parseUnits(fee);

      // Check allowance
      setStep(1); setStatus("Checking allowance...");
      const allowance = await realm.allowance(account, CONTRACTS.registry);
      if (allowance < feeWei) {
        setStatus("Approving " + fee + " REALM...");
        const appTx = await realm.approve(CONTRACTS.registry, feeWei);
        setStatus("Waiting for approval confirmation...");
        await appTx.wait();
      }

      // Register
      setStep(2); setStatus("Registering agent on-chain...");
      const metaURI = "data:application/json," + encodeURIComponent(JSON.stringify({
        name: form.name, description: form.desc,
        category: ["DEFI","ANALYTICS","AUTOMATION","CUSTOM"][parseInt(form.category)],
        endpoint: form.endpoint, version: "1.0.0",
      }));
      const tx = await reg.registerAgent(parseInt(form.category), metaURI, account);
      setStatus("Waiting for registration confirmation...");
      const receipt = await tx.wait();
      setTxHash(receipt.hash);

      // Get agent ID from event
      const count = await reg.agentCount();
      const newId = Number(count) - 1;
      setAgentId(newId);

      if (wantToken) {
        setStep(3);
      } else {
        setStep(4); setStatus("Agent registered successfully!");
      }
    } catch (e) {
      setStatus("Error: " + (e.reason || e.message));
      console.error(e);
    }
  };

  const doLaunchToken = async () => {
    try {
      setStatus("Launching sub-token with bonding curve...");
      const p = getProvider();
      const signer = await p.getSigner();
      const lp = getContract(CONTRACTS.launchpad, ABIS.launchpad, signer);
      const tx = await lp.launchAgent(agentId, tokenForm.name, tokenForm.symbol);
      setStatus("Waiting for token launch confirmation...");
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStep(4); setStatus("Agent + sub-token launched!");
    } catch (e) {
      setStatus("Error: " + (e.reason || e.message));
      console.error(e);
    }
  };

  const cats = ["DEFI", "ANALYTICS", "AUTOMATION", "CUSTOM"];

  // Step 4: Success
  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-6xl mb-6">&#x2705;</div>
        <h2 className="text-2xl font-bold text-green-400 mb-4">{status}</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 text-left">
          <div className="text-sm text-gray-400 mb-1">Agent ID</div>
          <div className="text-white font-bold text-lg mb-4">#{agentId}</div>
          <div className="text-sm text-gray-400 mb-1">Transaction</div>
          <a href={"https://basescan.org/tx/" + txHash} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline text-sm break-all">{txHash}</a>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setStep(0); setForm({name:"",desc:"",category:"0",endpoint:""}); setAgentId(null); setTxHash(""); }}
            className="px-6 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700">Launch Another</button>
          <a href={"https://basescan.org/address/" + CONTRACTS.registry} target="_blank" rel="noopener noreferrer"
            className="px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 no-underline">View on BaseScan</a>
        </div>
      </div>
    );
  }

  // Step 3: Launch sub-token
  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Launch Sub-Token</h2>
        <p className="text-gray-400 text-sm text-center mb-8">Agent #{agentId} registered! Now create a bonding curve token.</p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Token Name</label>
            <input value={tokenForm.name} onChange={e => setTokenForm({...tokenForm, name: e.target.value})}
              placeholder="e.g. Swap Agent Token" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Token Symbol</label>
            <input value={tokenForm.symbol} onChange={e => setTokenForm({...tokenForm, symbol: e.target.value.toUpperCase()})}
              placeholder="e.g. SWAP" maxLength={8} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none" />
          </div>
          {status && <div className="text-yellow-400 text-sm">{status}</div>}
          <div className="flex gap-3">
            <button onClick={() => { setStep(4); setStatus("Agent registered (no sub-token)"); }}
              className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700">Skip</button>
            <button onClick={doLaunchToken} disabled={!tokenForm.name || !tokenForm.symbol}
              className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-500 disabled:opacity-50">Launch Token</button>
          </div>
        </div>
      </div>
    );
  }

  // Steps 1-2: Processing
  if (step > 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-10 h-10 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-6" style={{borderWidth:3}} />
        <h2 className="text-xl font-bold text-white mb-2">{step === 1 ? "Approving REALM..." : "Registering Agent..."}</h2>
        <p className="text-gray-400 text-sm">{status}</p>
        <p className="text-gray-600 text-xs mt-4">Please confirm the transaction in your wallet.</p>
      </div>
    );
  }

  // Step 0: Form
  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">&#x1F680;</div>
        <h2 className="text-2xl font-bold text-white mb-2">Launch an Agent</h2>
        <p className="text-gray-400 text-sm">Fee: {fee} REALM | Your balance: {parseFloat(realmBal).toLocaleString()} REALM</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Agent Name *</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            placeholder="My DeFi Agent" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Description *</label>
          <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} rows={3}
            placeholder="What does your agent do?" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none resize-none" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Category *</label>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none">
            {cats.map((c, i) => <option key={i} value={i}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Agent Endpoint URL</label>
          <input value={form.endpoint} onChange={e => setForm({...form, endpoint: e.target.value})}
            placeholder="https://your-agent-api.com" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 outline-none" />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input type="checkbox" id="wantToken" checked={wantToken} onChange={e => setWantToken(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700" />
          <label htmlFor="wantToken" className="text-sm text-gray-300">Also launch a sub-token (bonding curve)</label>
        </div>

        {status && <div className="text-red-400 text-sm">{status}</div>}

        <button onClick={doApproveAndRegister} disabled={!form.name || !form.desc}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
          Register Agent ({fee} REALM)
        </button>
      </div>

      <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-300 mb-3">How it works</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex gap-2"><span className="text-violet-400 font-bold">1.</span> Approve {fee} REALM for the registry contract</div>
          <div className="flex gap-2"><span className="text-violet-400 font-bold">2.</span> Register your agent (mints an ERC-721 NFT to you)</div>
          <div className="flex gap-2"><span className="text-violet-400 font-bold">3.</span> Optionally launch a sub-token with bonding curve pricing</div>
          <div className="flex gap-2"><span className="text-violet-400 font-bold">4.</span> Earn 70% of all revenue your agent generates</div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Section ─────────────────────────────
function Dashboard({ onConnect, account }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState({});

  const loadAgents = async () => {
    if (!account) { setLoading(false); return; }
    try {
      const p = getProvider();
      const reg = getContract(CONTRACTS.registry, ABIS.registry, p);
      const router = getContract(CONTRACTS.router, ABIS.router, p);
      const ids = await reg.getCreatorAgents(account);
      const agentList = [];
      for (const id of ids) {
        const info = await reg.getAgent(id);
        let pending = "0";
        try { pending = fmtUnits(await router.pendingCreatorRevenue(id)); } catch (e) {}
        agentList.push({
          id: Number(id),
          creator: info.creator || info[0],
          category: ["DEFI","ANALYTICS","AUTOMATION","CUSTOM"][Number(info.category || info[1])] || "CUSTOM",
          metadataURI: info.metadataURI || info[3],
          createdAt: Number(info.createdAt || info[4]),
          totalRevenue: fmtUnits(info.totalRevenue || info[5]),
          totalUses: Number(info.totalUses || info[6]),
          active: info.active ?? info[8],
          pendingRevenue: pending,
        });
      }
      setAgents(agentList);
    } catch (e) { console.error("Dashboard load error:", e); }
    setLoading(false);
  };

  useEffect(() => { loadAgents(); }, [account]);

  const claimRevenue = async (agentId) => {
    setClaimStatus(s => ({...s, [agentId]: "claiming"}));
    try {
      const p = getProvider();
      const signer = await p.getSigner();
      const router = getContract(CONTRACTS.router, ABIS.router, signer);
      const tx = await router.claimCreatorRevenue(agentId);
      await tx.wait();
      setClaimStatus(s => ({...s, [agentId]: "done"}));
      await loadAgents();
    } catch (e) {
      setClaimStatus(s => ({...s, [agentId]: "error: " + (e.reason || e.message)}));
    }
  };

  // Parse metadata
  const parseMeta = (uri) => {
    try {
      if (uri.startsWith("data:application/json,")) return JSON.parse(decodeURIComponent(uri.slice(22)));
      return { name: "Agent" };
    } catch { return { name: "Agent" }; }
  };

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-6">&#x1F4CA;</div>
        <h2 className="text-2xl font-bold text-white mb-4">Creator Dashboard</h2>
        <p className="text-gray-400 mb-8">View your registered agents, track revenue, and claim earnings.</p>
        <button onClick={onConnect} className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">Connect Wallet</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" style={{borderWidth:3}} />
        <p className="text-gray-400">Loading your agents...</p>
      </div>
    );
  }

  const totalPending = agents.reduce((s, a) => s + parseFloat(a.pendingRevenue || 0), 0);
  const totalEarned = agents.reduce((s, a) => s + parseFloat(a.totalRevenue || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Creator Dashboard</h2>
        <p className="text-gray-400 text-sm">{agents.length} agent{agents.length !== 1 ? "s" : ""} registered</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="text-gray-500 text-xs mb-1">Your Agents</div>
          <div className="text-white font-bold text-2xl">{agents.length}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="text-gray-500 text-xs mb-1">Total Earned</div>
          <div className="text-green-400 font-bold text-2xl">{totalEarned.toLocaleString("en-US", {maximumFractionDigits:2})} REALM</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="text-gray-500 text-xs mb-1">Pending Revenue</div>
          <div className="text-yellow-400 font-bold text-2xl">{totalPending.toLocaleString("en-US", {maximumFractionDigits:2})} REALM</div>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="text-4xl mb-3">&#x1F916;</div>
          <p className="text-gray-400 mb-4">You haven't registered any agents yet.</p>
          <p className="text-gray-500 text-sm">Go to the Launch page to register your first agent!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map(a => {
            const meta = parseMeta(a.metadataURI);
            const cs = claimStatus[a.id];
            return (
              <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center text-violet-400 font-bold">#{a.id}</div>
                    <div>
                      <h3 className="text-white font-bold">{meta.name || "Agent #" + a.id}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-400/10 text-violet-400">{a.category}</span>
                    </div>
                  </div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded ${a.active ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
                    {a.active ? "Active" : "Inactive"}
                  </div>
                </div>
                {meta.description && <p className="text-gray-400 text-sm mb-3">{meta.description}</p>}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div><div className="text-gray-600 text-xs">Total Revenue</div><div className="text-green-400 font-semibold text-sm">{parseFloat(a.totalRevenue).toLocaleString()} REALM</div></div>
                  <div><div className="text-gray-600 text-xs">Total Uses</div><div className="text-white font-semibold text-sm">{a.totalUses.toLocaleString()}</div></div>
                  <div><div className="text-gray-600 text-xs">Pending</div><div className="text-yellow-400 font-semibold text-sm">{parseFloat(a.pendingRevenue).toLocaleString()} REALM</div></div>
                  <div><div className="text-gray-600 text-xs">Created</div><div className="text-gray-300 text-sm">{new Date(a.createdAt * 1000).toLocaleDateString()}</div></div>
                </div>
                <div className="flex gap-2">
                  {parseFloat(a.pendingRevenue) > 0 && (
                    <button onClick={() => claimRevenue(a.id)} disabled={cs === "claiming"}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                      {cs === "claiming" ? "Claiming..." : cs === "done" ? "Claimed!" : "Claim Revenue"}
                    </button>
                  )}
                  <a href={"https://basescan.org/nft/" + CONTRACTS.registry + "/" + a.id} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-800 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-700 no-underline">View NFT</a>
                </div>
                {cs && cs.startsWith("error") && <div className="text-red-400 text-xs mt-2">{cs}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Footer ────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <img src="https://realmdao.com/logo.svg" alt="R" className="w-5 h-5 rounded" />
            <span className="text-gray-400 font-semibold text-sm">RealmAgents</span>
          </div>
          <div className="flex gap-6">
            {[["BaseScan",`https://basescan.org/address/${CONTRACTS.registry}`],["DAO","https://realmdao.com"],["MegaRealms","https://megarealms.io"]].map(([n,u]) => (
              <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-300 text-sm no-underline">{n}</a>
            ))}
          </div>
        </div>
        <p className="text-gray-700 text-xs leading-relaxed">
          RealmAgents is an experimental, decentralized protocol on Base L2. Smart contracts have not been formally audited.
          $REALM and agent tokens are not securities and carry no promise of returns. Nothing on this site constitutes financial, legal, or investment advice.
        </p>
        <p className="text-gray-700 text-xs mt-2">
          By using this platform you accept full responsibility for your transactions. Governed by RealmDAO v3. All interactions are final and irreversible.
        </p>
        <p className="text-gray-800 text-xs mt-4">&copy; 2026 RealmAgents &mdash; Powered by $REALM on Base L2</p>
      </div>
    </footer>
  );
}

// ─── Main App ──────────────────────────────────────
export default function App() {
  const [accepted, setAccepted] = useState(() => localStorage.getItem("ra_accepted") === "1");
  const [section, setSection] = useState("home");
  const [account, setAccount] = useState(null);
  const [warning, setWarning] = useState(true);

  const handleAccept = () => { setAccepted(true); localStorage.setItem("ra_accepted", "1"); };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") { alert("Please install MetaMask or another Web3 wallet."); return; }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts[0]) setAccount(accounts[0]);
      // Ensure Base network
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: "0x2105", chainName: "Base", rpcUrls: ["https://mainnet.base.org"], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, blockExplorerUrls: ["https://basescan.org"] }],
          });
        }
      }
    } catch (e) { console.error("Wallet connect failed:", e); }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then(accs => { if (accs[0]) setAccount(accs[0]); });
      window.ethereum.on?.("accountsChanged", accs => setAccount(accs[0] || null));
    }
  }, []);

  if (!accepted) return <Disclaimer onAccept={handleAccept} />;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {warning && (
        <div className="bg-yellow-950 border-b border-yellow-900 px-4 py-2 flex items-center justify-between">
          <p className="text-yellow-400/80 text-xs">Experimental DeFi protocol. Smart contracts are unaudited. Use at your own risk. Not financial advice.</p>
          <button onClick={() => setWarning(false)} className="text-yellow-500/60 hover:text-yellow-400 text-xs ml-4 shrink-0">Dismiss</button>
        </div>
      )}
      <Navbar section={section} setSection={setSection} account={account} onConnect={connectWallet} />
      {section === "home" && <Home setSection={setSection} onConnect={connectWallet} />}
      {section === "agents" && <Agents />}
      {section === "explore" && <Explore />}
      {section === "launch" && <Launch onConnect={connectWallet} account={account} />}
      {section === "dashboard" && <Dashboard onConnect={connectWallet} account={account} />}
      <Footer />
    </div>
  );
}
