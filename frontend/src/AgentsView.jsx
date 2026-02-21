import { useState, useEffect, useRef } from 'react';
const API = "https://agents-api.warlet-invest.workers.dev";
const AGENTS = [
  { slug: "swap", name: "REALM Swap Agent", icon: "\u{1F4B1}", color: "#8b5cf6", cat: "DEFI",
    desc: "Real-time price data, swap quotes & trading signals",
    greeting: "Hi! I'm the REALM Swap Agent. Ask me about REALM price, swap quotes, or trading signals.",
    stats: (d) => [
      { l: "REALM Price", v: d?.data?.price_usd !== undefined ? "$" + Number(d.data.price_usd).toFixed(6) : "$0.00" },
      { l: "WETH Price", v: d?.data?.weth_price_usd ? "$" + Number(d.data.weth_price_usd).toFixed(0) : "-" },
      { l: "Signal", v: d?.data?.signal || "N/A" },
      { l: "Confidence", v: d?.data?.confidence ? d.data.confidence + "%" : "-" },
    ],
    chat: (q, d) => {
      const data = d?.data || {}; const ql = q.toLowerCase();
      if (ql.match(/pre[cç]o|price|valor|quanto/)) return "REALM: $" + Number(data.price_usd||0).toFixed(6) + " USD\nWETH: $" + Number(data.weth_price_usd||0).toFixed(2) + "\nSource: " + (data.source||"DeFiLlama");
      if (ql.match(/swap|trocar|converter/)) { const w=data.weth_price_usd||0, p=data.price_usd||0; return p>0&&w>0 ? "1 WETH = " + Math.round(w/p).toLocaleString() + " REALM\n1 REALM = " + (p/w).toFixed(8) + " WETH\n\nSwap on Aerodrome or Uniswap V3 (Base)." : "Price data unavailable."; }
      if (ql.match(/signal|sinal|trad/)) return "Signal: " + (data.signal||"N/A") + "\nConfidence: " + (data.confidence||"low") + "%\nChange 24h: " + (data.change_24h||0) + "%";
      return "REALM: $" + Number(data.price_usd||0).toFixed(6) + "\nWETH: $" + Number(data.weth_price_usd||0).toFixed(2) + "\nSignal: " + (data.signal||"N/A") + "\n\nAsk about: price, swap quotes, or signals.";
    }
  },
  { slug: "rebalancer", name: "Portfolio Rebalancer", icon: "\u{1F4CA}", color: "#06b6d4", cat: "DEFI",
    desc: "Wallet analysis, DeFi yields & rebalancing suggestions",
    greeting: "Hi! I'm the Portfolio Rebalancer. Ask me about best DeFi yields, pool analysis, or strategies.",
    stats: (d) => [
      { l: "Pools Tracked", v: d?.data?.total_pools || "0" },
      { l: "Best APY", v: d?.data?.best_apy ? Number(d.data.best_apy).toFixed(1) + "%" : "-" },
      { l: "Total TVL", v: d?.data?.total_tvl_usd ? "$" + (Number(d.data.total_tvl_usd) / 1e9).toFixed(1) + "B" : "-" },
      { l: "Avg APY", v: d?.data?.avg_apy ? Number(d.data.avg_apy).toFixed(1) + "%" : "-" },
    ],
    chat: (q, d) => {
      const data = d?.data || {}; const ql = q.toLowerCase();
      if (ql.match(/best|melhor|top|yield/)) return "Best APY: " + (data.best_apy ? Number(data.best_apy).toFixed(1)+"%" : "N/A") + "\nAvg APY: " + (data.avg_apy ? Number(data.avg_apy).toFixed(1)+"%" : "N/A") + "\nPools: " + (data.total_pools||0) + "\nTVL: $" + (data.total_tvl_usd ? (Number(data.total_tvl_usd)/1e9).toFixed(1)+"B" : "N/A");
      if (ql.match(/pool|tvl|liquid/)) return "Pools on Base: " + (data.total_pools||0) + "\nTotal TVL: $" + (data.total_tvl_usd ? (Number(data.total_tvl_usd)/1e9).toFixed(1)+"B" : "N/A") + "\nAvg APY: " + (data.avg_apy ? Number(data.avg_apy).toFixed(1)+"%" : "N/A");
      return "Pools: " + (data.total_pools||0) + "\nBest APY: " + (data.best_apy ? Number(data.best_apy).toFixed(1)+"%" : "N/A") + "\nAvg APY: " + (data.avg_apy ? Number(data.avg_apy).toFixed(1)+"%" : "N/A") + "\n\nAsk about: best yields, pools, or strategies.";
    }
  },
  { slug: "governance", name: "DAO Governance", icon: "\u{1F3DB}\uFE0F", color: "#f59e0b", cat: "DAO",
    desc: "Proposals, voting status & treasury analytics",
    greeting: "Hi! I'm the DAO Governance Agent. Ask me about proposals, voting, or treasury.",
    stats: (d) => [
      { l: "Active Proposals", v: d?.data?.active_proposals || "0" },
      { l: "Treasury", v: d?.data?.treasury_eth ? Number(d.data.treasury_eth).toFixed(3) + " ETH" : "-" },
      { l: "REALM Supply", v: d?.data?.realm_total_supply ? (Number(d.data.realm_total_supply) / 1e6).toFixed(1) + "M" : "-" },
      { l: "Holders", v: d?.data?.holder_count || "-" },
    ],
    chat: (q, d) => {
      const data = d?.data || {}; const ql = q.toLowerCase();
      if (ql.match(/proposal|proposta|vota/)) return "Active proposals: " + (data.active_proposals||0) + "\n" + (data.active_proposals > 0 ? "Connect wallet to vote at realmdao.com/governance" : "No active proposals. Check back soon.");
      if (ql.match(/treasury|tesour|fund/)) return "Treasury:\nETH: " + (data.treasury_eth ? Number(data.treasury_eth).toFixed(4)+" ETH" : "N/A") + "\nREALM: " + (data.treasury_realm ? Number(data.treasury_realm).toLocaleString() : "N/A");
      if (ql.match(/supply|holder|token/)) return "REALM Token:\nSupply: " + (data.realm_total_supply ? (Number(data.realm_total_supply)/1e6).toFixed(1)+"M" : "100M") + "\nHolders: " + (data.holder_count||"N/A") + "\nContract: 0xBA2c...ad2 (Base)";
      return "Proposals: " + (data.active_proposals||0) + "\nTreasury: " + (data.treasury_eth ? Number(data.treasury_eth).toFixed(4)+" ETH" : "N/A") + "\nHolders: " + (data.holder_count||"N/A") + "\n\nAsk about: proposals, treasury, or supply.";
    }
  },
  { slug: "whale", name: "Whale Intelligence", icon: "\u{1F40B}", color: "#10b981", cat: "ANALYTICS",
    desc: "Large transfers, wallet profiles & flow analysis",
    greeting: "Hi! I'm the Whale Intelligence Agent. Ask me about whale activity, transfers, or market flow.",
    stats: (d) => [
      { l: "Whale Txs", v: d?.data?.total_transfers || "0" },
      { l: "Volume", v: d?.data?.total_volume ? Number(d.data.total_volume).toLocaleString() : "0" },
      { l: "Unique Wallets", v: d?.data?.unique_wallets || "0" },
      { l: "Activity", v: d?.data?.activity_level || "QUIET" },
    ],
    chat: (q, d) => {
      const data = d?.data || {}; const ql = q.toLowerCase();
      if (ql.match(/whale|baleia|big/)) return "Whale activity (8h):\nTransfers: " + (data.total_transfers||0) + "\nWallets: " + (data.unique_wallets||0) + "\nLevel: " + (data.activity_level||"QUIET");
      if (ql.match(/flow|fluxo|exchange|buy|sell/)) return "Exchange flow: " + (data.flow_direction||"NEUTRAL") + "\n" + (data.flow_direction==="ACCUMULATION" ? "Buying pressure detected." : data.flow_direction==="DISTRIBUTION" ? "Selling pressure detected." : "Balanced flow.");
      if (ql.match(/volume|transfer/)) return "Volume (8h): " + (data.total_volume ? Number(data.total_volume).toLocaleString() : 0) + "\nREALM txs: " + (data.realm_transfers||0) + "\nWETH txs: " + (data.weth_transfers||0);
      return "Transfers: " + (data.total_transfers||0) + "\nVolume: " + (data.total_volume ? Number(data.total_volume).toLocaleString() : 0) + "\nActivity: " + (data.activity_level||"QUIET") + "\n\nAsk about: whales, exchange flow, or volume.";
    }
  },
];
function safeStr(v) { if (v==null) return ""; if (typeof v==="string") return v; if (typeof v==="number"||typeof v==="boolean") return String(v); return JSON.stringify(v); }
function Modal({ open, onClose, title, icon, color, children }) {
  if (!open) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" /><div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e)=>e.stopPropagation()}><div className="flex items-center justify-between p-4 border-b border-gray-800"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{background:color+"18"}}>{icon}</div><h3 className="text-white font-bold text-sm">{title}</h3></div><button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-lg">x</button></div><div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">{children}</div></div></div>);
}
function AgentCardModal({ data, agent }) {
  if (!data) return <p className="text-gray-500 text-sm">Loading...</p>;
  return (<div className="space-y-4"><div className="bg-gray-800/50 rounded-xl p-4"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Description</div><p className="text-gray-300 text-sm">{safeStr(data.description)}</p></div><div className="grid grid-cols-2 gap-3"><div className="bg-gray-800/50 rounded-xl p-3"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Version</div><div className="text-white text-sm font-mono">{safeStr(data.version)||"1.0.0"}</div></div><div className="bg-gray-800/50 rounded-xl p-3"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Protocol</div><div className="text-white text-sm font-mono">ERC-8004 / A2A</div></div></div>{data.skills&&data.skills.length>0&&(<div><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Skills ({data.skills.length})</div><div className="space-y-2">{data.skills.map((s,i)=>(<div key={i} className="bg-gray-800/50 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><span className="text-white text-sm font-semibold">{safeStr(s.name)}</span><span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">{safeStr(s.id)}</span></div><p className="text-gray-500 text-xs">{safeStr(s.description)}</p></div>))}</div></div>)}{data.realmEconomy&&(<div><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">$REALM Tiers</div><div className="space-y-1.5">{Object.entries(data.realmEconomy.tiers||{}).map(([t,info])=>(<div key={t} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"><span className="text-white text-xs font-semibold capitalize">{t}</span><span className="text-gray-500 text-xs">{safeStr(info.requirement)}</span><span className="text-purple-400 text-xs">{safeStr(info.features)}</span></div>))}</div></div>)}</div>);
}
function ApiDataModal({ data, agent }) {
  if (!data) return <p className="text-gray-500 text-sm">Loading...</p>;
  const entries = data.data ? Object.entries(data.data) : [];
  return (<div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="bg-gray-800/50 rounded-xl p-3"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Agent</div><div className="text-white text-sm">{typeof data.agent==="string"?data.agent:(data.agent?.name||agent.name)}</div></div><div className="bg-gray-800/50 rounded-xl p-3"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</div><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"/><span className="text-green-400 text-sm">{typeof data.status==="string"?data.status:"active"}</span></div></div></div>{entries.length>0&&(<div><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Live Data ({entries.length} fields)</div><div className="space-y-1.5">{entries.map(([k,v])=>(<div key={k} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"><span className="text-gray-400 text-xs font-mono">{k}</span><span className="text-white text-xs font-mono text-right max-w-[60%] truncate">{typeof v==="object"?JSON.stringify(v).substring(0,60):String(v)}</span></div>))}</div></div>)}</div>);
}
function McpModal({ data, agent }) {
  if (!data) return <p className="text-gray-500 text-sm">Loading...</p>;
  const tools = data.tools||data.result?.tools||[];
  return (<div className="space-y-4"><div className="bg-gray-800/50 rounded-xl p-3"><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Endpoint</div><div className="text-purple-400 text-xs font-mono break-all">{API}/agents/{agent.slug}/mcp</div></div>{tools.length>0?(<div><div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tools ({tools.length})</div><div className="space-y-2">{tools.map((t,i)=>(<div key={i} className="bg-gray-800/50 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">tool</span><span className="text-white text-sm font-semibold font-mono">{safeStr(t.name)}</span></div><p className="text-gray-500 text-xs">{safeStr(t.description)}</p></div>))}</div></div>):(<div className="bg-gray-800/50 rounded-xl p-4 text-center"><p className="text-gray-500 text-sm">POST to endpoint with:</p><pre className="bg-black/50 rounded-lg p-3 mt-2 text-xs text-gray-300 text-left">{"{"}"jsonrpc":"2.0","method":"tools/list","id":1{"}"}</pre></div>)}</div>);
}
function ChatModal({ agent, apiData }) {
  const [messages, setMessages] = useState([{ role:"agent", text:agent.greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);
  async function send() {
    const q = input.trim(); if (!q) return;
    setMessages(p => [...p, {role:"user",text:q}]); setInput(""); setLoading(true);
    try {
      const res = await fetch(API+"/agents/"+agent.slug+"/api/data");
      const fresh = await res.json();
      setMessages(p => [...p, {role:"agent",text:agent.chat(q,fresh)}]);
    } catch(e) { setMessages(p => [...p, {role:"agent",text:"Error fetching data: "+e.message}]); }
    setLoading(false);
  }
  const suggestions = agent.slug==="swap" ? ["REALM price?","How much REALM per ETH?","Trading signal?"] : agent.slug==="rebalancer" ? ["Best yields on Base?","Top pools?","Average APY?"] : agent.slug==="governance" ? ["Active proposals?","Treasury balance?","Token supply?"] : ["Whale activity?","Exchange flows?","Recent transfers?"];
  return (<div className="flex flex-col h-[60vh]"><div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">{messages.map((m,i)=>(<div key={i} className={m.role==="user"?"flex justify-end":"flex justify-start"}><div className={m.role==="user"?"bg-purple-600/30 border border-purple-500/30 rounded-2xl rounded-br-md px-4 py-2 max-w-[85%]":"bg-gray-800/70 border border-gray-700/50 rounded-2xl rounded-bl-md px-4 py-2 max-w-[85%]"}>{m.role==="agent"&&<div className="text-[10px] font-semibold mb-1" style={{color:agent.color}}>{agent.icon} {agent.name}</div>}<pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">{m.text}</pre></div></div>))}{loading&&(<div className="flex justify-start"><div className="bg-gray-800/70 border border-gray-700/50 rounded-2xl px-4 py-3"><div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:"0ms"}}/><div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:"150ms"}}/><div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:"300ms"}}/></div></div></div>)}<div ref={bottomRef}/></div>{messages.length<=1&&(<div className="flex flex-wrap gap-1.5 mb-3">{suggestions.map((s,i)=>(<button key={i} onClick={()=>setInput(s)} className="text-[11px] px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors cursor-pointer">{s}</button>))}</div>)}<div className="flex gap-2"><input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&!loading&&send()} placeholder={"Ask "+agent.name+"..."} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/50 transition-colors" disabled={loading}/><button onClick={send} disabled={loading||!input.trim()} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40" style={{background:agent.color,color:"white"}}>Send</button></div></div>);
}
export default function AgentsView() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  useEffect(() => { async function load() { setLoading(true); const r={}; await Promise.all(AGENTS.map(async(a)=>{ try { const res=await fetch(API+"/agents/"+a.slug+"/api/data"); r[a.slug]=await res.json(); } catch(e){r[a.slug]={error:e.message};} })); setData(r); setLoading(false); } load(); const iv=setInterval(load,60000); return()=>clearInterval(iv); }, []);
  async function openModal(agent, type) { setModal({agent,type}); if(type==="chat")return; setModalData(null); setModalLoading(true); try { let url; if(type==="card")url=API+"/agents/"+agent.slug+"/.well-known/agent-card.json"; else if(type==="api")url=API+"/agents/"+agent.slug+"/api/data"; else url=API+"/agents/"+agent.slug+"/mcp"; if(type==="mcp"){const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"tools/list",id:1})}); setModalData(await res.json());} else {const res=await fetch(url); setModalData(await res.json());} }catch(e){setModalData({error:e.message});} setModalLoading(false); }
  function closeModal(){setModal(null);setModalData(null);}
  if (loading) return (<div className="text-center py-20 text-gray-400"><div className="inline-block w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"/><p>Loading agents...</p></div>);
  return (<div className="max-w-6xl mx-auto"><div className="text-center mb-8"><div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-1 rounded-full text-xs text-purple-400 mb-3"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>ERC-8004 Compliant</div><h2 className="text-2xl font-bold text-white mb-2">AI Agents</h2><p className="text-gray-500 text-sm">4 autonomous agents with A2A & MCP endpoints, powered by $REALM</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{AGENTS.map((agent)=>{const d=data[agent.slug]||{};const st=agent.stats(d);const ok=!d.error;return(<div key={agent.slug} className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all hover:-translate-y-1"><div className="flex items-center gap-3 p-4 pb-2"><div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{background:agent.color+"18"}}>{agent.icon}</div><div className="flex-1"><div className="font-bold text-white text-sm">{agent.name}</div><span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{background:agent.color+"18",color:agent.color}}>{agent.cat}</span></div><div className="flex items-center gap-1 text-xs"><span className={"w-1.5 h-1.5 rounded-full "+(ok?"bg-green-500":"bg-yellow-500")}/><span className={ok?"text-green-500":"text-yellow-500"}>{ok?"Active":"Error"}</span></div></div><div className="px-4 pb-3 text-xs text-gray-500">{agent.desc}</div><div className="grid grid-cols-2 border-t border-gray-800/50">{st.map((s,i)=>(<div key={i} className={"p-3 "+(i<2?"border-b border-gray-800/30 ":"")+(i%2===0?"border-r border-gray-800/30":"")}><div className="text-[9px] text-gray-600 uppercase tracking-wider">{s.l}</div><div className="text-sm font-bold text-white mt-0.5">{s.v}</div></div>))}</div><div className="p-3 flex gap-2 border-t border-gray-800/30"><button onClick={()=>openModal(agent,"chat")} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer" style={{background:agent.color,color:"white"}}>Chat</button><button onClick={()=>openModal(agent,"card")} className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer" style={{background:agent.color+"18",color:agent.color,border:"1px solid "+agent.color+"30"}}>Agent Card</button><button onClick={()=>openModal(agent,"api")} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">API Data</button><button onClick={()=>openModal(agent,"mcp")} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">MCP</button></div></div>);})}</div>{modal&&(<Modal open={true} onClose={closeModal} title={modal.type==="chat"?"Chat with "+modal.agent.name:modal.type==="card"?modal.agent.name+" — Agent Card":modal.type==="api"?modal.agent.name+" — Live Data":modal.agent.name+" — MCP Tools"} icon={modal.agent.icon} color={modal.agent.color}>{modal.type==="chat"?(<ChatModal agent={modal.agent} apiData={data[modal.agent.slug]}/>):modalLoading?(<div className="text-center py-8"><div className="inline-block w-6 h-6 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3"/><p className="text-gray-500 text-sm">Fetching data...</p></div>):modalData?.error?(<div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"><p className="text-red-400 text-sm">Error: {safeStr(modalData.error)}</p></div>):modal.type==="card"?(<AgentCardModal data={modalData} agent={modal.agent}/>):modal.type==="api"?(<ApiDataModal data={modalData} agent={modal.agent}/>):(<McpModal data={modalData} agent={modal.agent}/>)}</Modal>)}</div>);
}
