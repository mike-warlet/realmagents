import { useState, useEffect, useRef } from 'react';
const API = "https://agents-api.warlet-invest.workers.dev";
const AGENTS = [
  {
    slug: "swap", name: "REALM Swap Agent", icon: "💱", color: "#8b5cf6", cat: "DEFI",
    desc: "Real-time price data, swap quotes & trading signals",
    greeting: "Hi! I'm the REALM Swap Agent 💱\n\nI can help you with:\n• REALM price & market data\n• Swap quotes (REALM ↔ WETH)\n• Trading signals & analysis\n\nPowered by Workers AI + live DeFiLlama data.",
    stats: (d) => [
      { l: "REALM Price", v: d?.data?.price_usd !== undefined ? "$" + Number(d.data.price_usd).toFixed(6) : "$0.00" },
      { l: "WETH Price", v: d?.data?.weth_price_usd ? "$" + Number(d.data.weth_price_usd).toFixed(0) : "-" },
      { l: "24h Change", v: d?.data?.change_24h ? Number(d.data.change_24h).toFixed(2) + "%" : "0%" },
      { l: "Tier", v: d?.tier || "free" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const ql = q.toLowerCase();
      if (ql.match(/pre[cç]o|price|valor|quanto/)) return "REALM: $" + Number(data.price_usd||0).toFixed(6) + " USD\nWETH: $" + Number(data.weth_price_usd||0).toFixed(2);
      if (ql.match(/swap|trocar|converter/)) {
        const w=data.weth_price_usd||0, p=data.price_usd||0;
        return p>0&&w>0 ? "1 WETH = " + Math.round(w/p).toLocaleString() + " REALM\nSwap on Aerodrome (Base)." : "Price data unavailable.";
      }
      return "REALM: $" + Number(data.price_usd||0).toFixed(6) + " | WETH: $" + Number(data.weth_price_usd||0).toFixed(2) + "\nAsk about: price, swap quotes, or signals.";
    },
    suggestions: ["REALM price?","How to swap REALM?","Trading signal?","Market analysis"],
  },
  {
    slug: "rebalancer", name: "Portfolio Rebalancer", icon: "📊", color: "#06b6d4", cat: "DEFI",
    desc: "Wallet analysis, DeFi yields & rebalancing suggestions",
    greeting: "Hi! I'm the Portfolio Rebalancer 📊\n\nI can help you with:\n• Best DeFi yields on Base\n• Pool risk analysis\n• Portfolio allocation\n\nPowered by Workers AI + live DeFiLlama data.",
    stats: (d) => [
      { l: "Pools", v: d?.data?.total_pools || d?.data?.showing || "0" },
      { l: "Best APY", v: d?.data?.pools?.[0]?.apy ? Number(d.data.pools[0].apy).toFixed(1) + "%" : "-" },
      { l: "Top Protocol", v: d?.data?.pools?.[0]?.protocol || "-" },
      { l: "Tier", v: d?.tier || "free" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const pools = data.pools || [];
      const ql = q.toLowerCase();
      if (ql.match(/best|melhor|top|yield|apy/)) return pools[0] ? "Top pool: " + pools[0].protocol + " " + pools[0].pool + " at " + pools[0].apy + "% APY (" + pools[0].risk + " risk)" : "No pools available.";
      return "Tracking " + (data.total_pools||0) + " Base pools. Ask about: best yields, safe pools, or risk.";
    },
    suggestions: ["Best yields on Base?","Low risk pools?","Portfolio analysis","Top protocol?"],
  },
  {
    slug: "governance", name: "DAO Governance", icon: "🏛️", color: "#f59e0b", cat: "DAO",
    desc: "Proposals, voting status & treasury analytics",
    greeting: "Hi! I'm the DAO Governance Agent 🏛️\n\nI can help you with:\n• RealmDAO proposals & voting\n• Treasury balance\n• Contract addresses\n\nPowered by Workers AI + on-chain data.",
    stats: (d) => [
      { l: "Treasury REALM", v: d?.data?.treasury?.realm ? Number(d.data.treasury.realm).toLocaleString() : "-" },
      { l: "Treasury ETH", v: d?.data?.treasury?.eth !== undefined ? Number(d.data.treasury.eth).toFixed(4) : "-" },
      { l: "Agents", v: d?.data?.agents?.registered || "0" },
      { l: "Tier", v: d?.tier || "free" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const t = data.treasury || {};
      const ql = q.toLowerCase();
      if (ql.match(/treasury|tesour|saldo/)) return "Treasury: " + (t.eth||0).toFixed(4) + " ETH + " + Number(t.realm||0).toLocaleString() + " REALM";
      if (ql.match(/contract|contrato/)) return "Registry: " + (data.contracts?.registry||"") + "\nRouter: " + (data.contracts?.router||"");
      return "RealmDAO: " + Number(t.realm||0).toLocaleString() + " REALM in treasury. Ask about: treasury, proposals, or contracts.";
    },
    suggestions: ["Treasury balance?","Active proposals?","Contract addresses?","Revenue split?"],
  },
  {
    slug: "whale", name: "Whale Intelligence", icon: "🐋", color: "#10b981", cat: "ANALYTICS",
    desc: "Large transfers, wallet profiles & flow analysis",
    greeting: "Hi! I'm the Whale Intelligence Agent 🐋\n\nI can help you with:\n• Large REALM transfers\n• Exchange flow analysis\n• Whale wallet tracking\n\nPowered by Workers AI + Alchemy RPC.",
    stats: (d) => [
      { l: "Transfers", v: d?.data?.count || "0" },
      { l: "Volume", v: d?.data?.total_volume ? Number(d.data.total_volume).toLocaleString() : "0" },
      { l: "Period", v: d?.data?.period || "24h" },
      { l: "Tier", v: d?.tier || "free" },
    ],
    fallback: (q, d) => {
      const data = d?.data || {};
      const tx = data.transfers || [];
      const ql = q.toLowerCase();
      if (ql.match(/whale|transfer|movimento/)) return tx.length ? data.count + " whale transfers in " + data.period + ".\nLargest: " + tx[0]?.amount + " REALM" : "No whale transfers detected.";
      return "Whale Intelligence: " + (data.count||0) + " transfers in " + (data.period||"24h") + ". Ask about: whales, exchange flows, or transfers.";
    },
    suggestions: ["Whale activity?","Exchange flows?","Recent large transfers?","Market flow?"],
  },
];

function safeStr(v) {
  if (v==null) return "";
  if (typeof v==="string") return v;
  if (typeof v==="number"||typeof v==="boolean") return String(v);
  return JSON.stringify(v);
}

function Modal({ open, onClose, title, icon, color, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{background:color+"18"}}>{icon}</div>
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
        <p className="text-gray-300 text-sm">{safeStr(data.description)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Version</div>
          <div className="text-white text-sm font-mono">{safeStr(data.version)||"1.0.0"}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Protocol</div>
          <div className="text-white text-sm font-mono">ERC-8004 / A2A</div>
        </div>
      </div>
      {data.skills&&data.skills.length>0&&(
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Skills ({data.skills.length})</div>
          <div className="space-y-2">{data.skills.map((s,i)=>(
            <div key={i} className="bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-sm font-semibold">{safeStr(s.name)}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">{safeStr(s.id)}</span>
              </div>
              <p className="text-gray-500 text-xs">{safeStr(s.description)}</p>
            </div>
          ))}</div>
        </div>
      )}
      {data.realmEconomy&&(
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">$REALM Tiers</div>
          <div className="space-y-1.5">{Object.entries(data.realmEconomy.tiers||{}).map(([t,info])=>(
            <div key={t} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="text-white text-xs font-semibold capitalize">{t}</span>
              <span className="text-gray-500 text-xs">{safeStr(info.requirement)}</span>
              <span className="text-purple-400 text-xs">{safeStr(info.features)}</span>
            </div>
          ))}</div>
        </div>
      )}
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
          <div className="text-white text-sm">{typeof data.agent==="string"?data.agent:(data.agent?.name||agent.name)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Tier</div>
          <div className="flex items-center gap-1.5">
            <span className={"w-2 h-2 rounded-full "+(data.tier==="staker"?"bg-yellow-500":data.tier==="holder"||data.tier==="realm"?"bg-purple-500":"bg-green-500")}/>
            <span className="text-white text-sm capitalize">{typeof data.tier==="string"?data.tier:"free"}</span>
          </div>
        </div>
      </div>
      {entries.length>0&&(
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Live Data ({entries.length} fields)</div>
          <div className="space-y-1.5">{entries.map(([k,v])=>(
            <div key={k} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="text-gray-400 text-xs font-mono">{k}</span>
              <span className="text-white text-xs font-mono text-right max-w-[60%] truncate">{typeof v==="object"?JSON.stringify(v).substring(0,60):String(v)}</span>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

function McpModal({ data, agent }) {
  if (!data) return <p className="text-gray-500 text-sm">Loading...</p>;
  const tools = data.tools||data.result?.tools||[];
  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-xl p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Endpoint</div>
        <div className="text-purple-400 text-xs font-mono break-all">{API}/agents/{agent.slug}/mcp</div>
      </div>
      {tools.length>0?(
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tools ({tools.length})</div>
          <div className="space-y-2">{tools.map((t,i)=>(
            <div key={i} className="bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">tool</span>
                <span className="text-white text-sm font-semibold font-mono">{safeStr(t.name)}</span>
              </div>
              <p className="text-gray-500 text-xs">{safeStr(t.description)}</p>
            </div>
          ))}</div>
        </div>
      ):(
        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
          <p className="text-gray-500 text-sm">POST to endpoint with:</p>
          <pre className="bg-black/50 rounded-lg p-3 mt-2 text-xs text-gray-300 text-left">{"{"}"jsonrpc":"2.0","method":"tools/list","id":1{"}"}</pre>
        </div>
      )}
    </div>
  );
}

function ChatModal({ agent, apiData }) {
  const [messages, setMessages] = useState([{ role:"agent", text:agent.greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);
  async function send() {
    const q = input.trim();
    if (!q) return;
    setMessages(p => [...p, {role:"user",text:q}]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(API+"/agents/"+agent.slug+"/chat", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ message: q }),
      });
      if (res.ok) {
        const d = await res.json();
        const aiTag = d.powered_by === "workers-ai" ? "\n\n🤖 Powered by Workers AI" : "";
        const tierTag = d.tier && d.tier !== "free" ? " | Tier: " + d.tier : "";
        setMessages(p => [...p, {role:"agent", text: d.response + (tierTag ? "\n" + tierTag : "") + aiTag}]);
      } else {
        throw new Error("API returned " + res.status);
      }
    } catch(e) {
      try {
        const res = await fetch(API+"/agents/"+agent.slug+"/api/data");
        const fresh = await res.json();
        const reply = agent.fallback(q, fresh);
        setMessages(p => [...p, {role:"agent", text: reply + "\n\n⚠️ Offline mode (keyword)"}]);
      } catch(e2) {
        setMessages(p => [...p, {role:"agent", text:"Error: " + e2.message}]);
      }
    }
    setLoading(false);
  }
  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.map((m,i)=>(
          <div key={i} className={m.role==="user"?"flex justify-end":"flex justify-start"}>
            <div className={m.role==="user"?"bg-purple-600/30 border border-purple-500/30 rounded-2xl rounded-br-md px-4 py-2 max-w-[85%]":"bg-gray-800/70 border border-gray-700/50 rounded-2xl rounded-bl-md px-4 py-2 max-w-[85%]"}>
              {m.role==="agent"&&<div className="text-[10px] font-semibold mb-1" style={{color:agent.color}}>{agent.icon} {agent.name}</div>}
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">{m.text}</pre>
            </div>
          </div>
        ))}
        {loading&&(
          <div className="flex justify-start">
            <div className="bg-gray-800/70 border border-gray-700/50 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:"0ms"}}/>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:"150ms"}}/>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:"300ms"}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {messages.length<=1&&(
        <div className="flex flex-wrap gap-1.5 mb-3">
          {agent.suggestions.map((s,i)=>(
            <button key={i} onClick={()=>setInput(s)} className="text-[11px] px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors cursor-pointer">{s}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&!loading&&send()} placeholder={"Ask "+agent.name+"..."} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/50 transition-colors" disabled={loading}/>
        <button onClick={send} disabled={loading||!input.trim()} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40" style={{background:agent.color,color:"white"}}>Send</button>
      </div>
    </div>
  );
}

export default function AgentsView() {
  const [data, setData] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // FIX: Use ref to track if initial load is done
  // Subsequent refreshes update data silently without resetting UI
  const initialLoadDone = useRef(false);

  useEffect(() => {
    async function load() {
      // Only show full-screen loading on first load
      if (!initialLoadDone.current) {
        setInitialLoading(true);
      }
      const r={};
      await Promise.all(AGENTS.map(async(a)=>{
        try {
          const res=await fetch(API+"/agents/"+a.slug+"/api/data");
          r[a.slug]=await res.json();
        } catch(e){r[a.slug]={error:e.message};}
      }));
      setData(r);
      if (!initialLoadDone.current) {
        setInitialLoading(false);
        initialLoadDone.current = true;
      }
    }
    load();
    const iv=setInterval(load,60000);
    return()=>clearInterval(iv);
  }, []);

  async function openModal(agent, type) {
    setModal({agent,type});
    if(type==="chat")return;
    setModalData(null);
    setModalLoading(true);
    try {
      let url;
      if(type==="card")url=API+"/agents/"+agent.slug+"/.well-known/agent-card.json";
      else if(type==="api")url=API+"/agents/"+agent.slug+"/api/data";
      else url=API+"/agents/"+agent.slug+"/mcp";
      const res=await fetch(url);
      setModalData(await res.json());
    }catch(e){setModalData({error:e.message});}
    setModalLoading(false);
  }

  function closeModal(){setModal(null);setModalData(null);}

  if (initialLoading) return (
    <div className="text-center py-20 text-gray-400">
      <div className="inline-block w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"/>
      <p>Loading agents...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-1 rounded-full text-xs text-purple-400 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>ERC-8004 Compliant &bull; Workers AI &bull; 4 Agents On-Chain
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Agents</h2>
        <p className="text-gray-500 text-sm">4 autonomous agents with A2A, MCP & AI chat, powered by $REALM</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENTS.map((agent)=>{const d=data[agent.slug]||{};const st=agent.stats(d);const ok=!d.error;return(
          <div key={agent.slug} className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 p-4 pb-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{background:agent.color+"18"}}>{agent.icon}</div>
              <div className="flex-1"><div className="font-bold text-white text-sm">{agent.name}</div><span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{background:agent.color+"18",color:agent.color}}>{agent.cat}</span></div>
              <div className="flex items-center gap-1 text-xs"><span className={"w-1.5 h-1.5 rounded-full "+(ok?"bg-green-500":"bg-yellow-500")}/><span className={ok?"text-green-500":"text-yellow-500"}>{ok?"Active":"Error"}</span></div>
            </div>
            <div className="px-4 pb-3 text-xs text-gray-500">{agent.desc}</div>
            <div className="grid grid-cols-2 border-t border-gray-800/50">{st.map((s,i)=>(
              <div key={i} className={"p-3 "+(i<2?"border-b border-gray-800/30 ":"")+(i%2===0?"border-r border-gray-800/30":"")}>
                <div className="text-[9px] text-gray-600 uppercase tracking-wider">{s.l}</div>
                <div className="text-sm font-bold text-white mt-0.5">{s.v}</div>
              </div>
            ))}</div>
            <div className="p-3 flex gap-2 border-t border-gray-800/30">
              <button onClick={()=>openModal(agent,"chat")} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1" style={{background:agent.color,color:"white"}}><span>{"🤖"}</span> AI Chat</button>
              <button onClick={()=>openModal(agent,"card")} className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer" style={{background:agent.color+"18",color:agent.color,border:"1px solid "+agent.color+"30"}}>Agent Card</button>
              <button onClick={()=>openModal(agent,"api")} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">API Data</button>
              <button onClick={()=>openModal(agent,"mcp")} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">MCP</button>
            </div>
          </div>
        );})}
      </div>
      {modal&&(
        <Modal open={true} onClose={closeModal} title={modal.type==="chat"?"🤖 Chat with "+modal.agent.name:modal.type==="card"?modal.agent.name+" — Agent Card":modal.type==="api"?modal.agent.name+" — Live Data":modal.agent.name+" — MCP Tools"} icon={modal.agent.icon} color={modal.agent.color}>
          {modal.type==="chat"?(
            <ChatModal agent={modal.agent} apiData={data[modal.agent.slug]}/>
          ):modalLoading?(
            <div className="text-center py-8"><div className="inline-block w-6 h-6 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3"/><p className="text-gray-500 text-sm">Fetching data...</p></div>
          ):modalData?.error?(
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"><p className="text-red-400 text-sm">Error: {safeStr(modalData.error)}</p></div>
          ):modal.type==="card"?(
            <AgentCardModal data={modalData} agent={modal.agent}/>
          ):modal.type==="api"?(
            <ApiDataModal data={modalData} agent={modal.agent}/>
          ):(
            <McpModal data={modalData} agent={modal.agent}/>
          )}
        </Modal>
      )}
    </div>
  );
}
