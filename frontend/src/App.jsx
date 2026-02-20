import { useState, useEffect, useRef } from "react";
import AgentsView from "./AgentsView";

// ─── Constants ─────────────────────────────────────
const API = "https://agents-api.warlet-invest.workers.dev";
const CONTRACTS = {
  realm: "0xBA2cA14375b2cECA4f04350Bd014B375Bc014ad2",
  registry: "0x8Fa9b010D9B30EF3112060F3Afa3c7573a0f9a17",
  router: "0xA9c2bb95f9041922f1D4ad50C90dc9e881b765Cc",
  launchpad: "0x3b5Cb24E7cf42a8a4405968c81D257Ca71B6Aa10",
};
const short = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";
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
  const sections = ["home","agents","explore","launch","stake"];
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
            DAO ↗
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

// ─── Agents Section ──────────────────────────────────────
    // ─── End Agents Section ──────────────────────────────────
    // ─── Explore Section ───────────────────────────────
function Explore() {
  const cards = [
    {icon:"🤖",t:"Agent Registry",d:"Register AI agents as ERC-721 NFTs with on-chain identity, reputation tracking, and verification."},
    {icon:"📈",t:"Bonding Curves",d:"Each agent gets its own sub-token with linear bonding curve pricing. Early supporters get the best price."},
    {icon:"💰",t:"Revenue Router",d:"Automatic distribution: 70% creators, 20% stakers, 10% DAO treasury. 2% burn on all transactions."},
    {icon:"🔒",t:"DAO Governed",d:"All contracts owned by RealmDAO v3. Upgrades and parameters controlled by $REALM holders."},
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
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-6">🚀</div>
      <h2 className="text-2xl font-bold text-white mb-4">Launch an Agent</h2>
      <p className="text-gray-400 mb-8">Register your AI agent on-chain. Pay 100 $REALM fee, get an ERC-721 NFT, and launch your agent's sub-token with bonding curve pricing.</p>
      <button onClick={onConnect}
        className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">
        {account ? "Launch Agent (Coming Soon)" : "Connect Wallet to Launch"}
      </button>
      <p className="text-gray-600 text-xs mt-6">Requires 100 $REALM registration fee + gas on Base L2.</p>
    </div>
  );
}

// ─── Stake Section ─────────────────────────────────
function Stake({ onConnect, account }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-6">🏦</div>
      <h2 className="text-2xl font-bold text-white mb-4">Stake $REALM</h2>
      <p className="text-gray-400 mb-8">Stake your $REALM tokens to earn 20% of all platform revenue. Revenue is distributed from agent sub-token trades via the Revenue Router.</p>
      <button onClick={onConnect}
        className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">
        {account ? "Stake (Coming Soon)" : "Connect Wallet to Stake"}
      </button>
      <p className="text-gray-600 text-xs mt-6">Revenue split: 70% creators, 20% stakers, 10% DAO treasury.</p>
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
      {section === "agents" && <AgentsView />}
      {section === "explore" && <Explore />}
      {section === "launch" && <Launch onConnect={connectWallet} account={account} />}
      {section === "stake" && <Stake onConnect={connectWallet} account={account} />}
      <Footer />
    </div>
  );
}
