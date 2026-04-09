// pages/VpsDashboard.jsx
/* eslint-disable */
import { useEffect, useRef, useState } from "react";
import { getAuthHeaders, clearToken } from "../lib/auth";
import { API_BASE } from "../lib/http";

const FONT = "'DM Sans', system-ui, sans-serif";

// ─── Terminal component ───────────────────────────────────────────────────────

function VpsTerminal({ vpsId }) {
  const [lines, setLines]   = useState([{ s:"sys", t:"Connected to VPS shell. Type a command." }]);
  const [input, setInput]   = useState("");
  const [busy,  setBusy ]   = useState(false);
  const [hist,  setHist ]   = useState([]);
  const [hi,    setHi   ]   = useState(-1);
  const endRef   = useRef();
  const inputRef = useRef();
  const authH    = getAuthHeaders();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [lines]);

  function push(s, t) { setLines(p => [...p, { s, t, id: Date.now() + Math.random() }]); }

  async function run(cmd) {
    if (!cmd.trim() || busy) return;
    setHist(h => [cmd, ...h]); setHi(-1);
    push("cmd", `$ ${cmd}`);
    setInput(""); setBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/vps/${vpsId}/exec`, {
        method: "POST",
        headers: { "Content-Type":"application/json", ...authH },
        body: JSON.stringify({ cmd }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop();
        for (const part of parts) {
          let evt = "message", dat = null;
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) evt = line.slice(7).trim();
            if (line.startsWith("data: ")) { try { dat = JSON.parse(line.slice(6)); } catch { dat = {}; } }
          }
          if (!dat) continue;
          if (evt === "output") push(dat.stream, dat.line);
          if (evt === "done")   push("sys", `[exited ${dat.exitCode}]`);
          if (evt === "error")  push("err", dat.message);
        }
      }
    } catch (err) {
      push("err", err.message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const onKey = e => {
    if (e.key === "Enter") run(input);
    if (e.key === "ArrowUp")   { e.preventDefault(); const i = Math.min(hi+1, hist.length-1); setHi(i); setInput(hist[i]||""); }
    if (e.key === "ArrowDown") { e.preventDefault(); const i = Math.max(hi-1, -1); setHi(i); setInput(i===-1 ? "" : hist[i]); }
  };

  const C = { cmd:"#fbbf24", stdout:"#4ade80", stderr:"#f87171", sys:"#60a5fa", err:"#f87171" };

  return (
    <div style={ts.term} onClick={() => inputRef.current?.focus()}>
      {lines.map((l, i) => (
        <div key={l.id||i} style={{ fontFamily:"monospace", fontSize:12, lineHeight:"20px", color:C[l.s]||"#9ca3af", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
          {l.t}
        </div>
      ))}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
        <span style={{ color:"#6ee7b7", fontFamily:"monospace", fontSize:12, flexShrink:0 }}>
          {busy ? "⏳" : "user@vps:~$"}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
          placeholder={busy ? "running…" : ""}
          style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e5e7eb", fontFamily:"monospace", fontSize:12, caretColor:"#f97316" }}
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}

// ─── VPS Card ─────────────────────────────────────────────────────────────────

function VpsCard({ vps, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = vps.status === "running" ? "#22c55e" : vps.status === "stopped" ? "#f59e0b" : "#ef4444";

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:statusColor, flexShrink:0,
            boxShadow: vps.status==="running" ? `0 0 0 3px rgba(34,197,94,0.15)` : "none" }} />
          <div>
            <div style={s.cardName}>{vps.name}</div>
            <div style={s.cardSub}>{vps.subdomain} · port {vps.port}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <a href={vps.url} target="_blank" rel="noreferrer" style={s.openBtn} onClick={e => e.stopPropagation()}>
            Open ↗
          </a>
          <button style={s.toggleBtn} onClick={() => onToggle(vps)}>
            {vps.status === "running" ? "■ Stop" : "▶ Start"}
          </button>
          <button style={s.deleteBtn} onClick={() => onDelete(vps._id)}>×</button>
        </div>
      </div>

      {/* Info row */}
      <div style={s.infoRow}>
        <div style={s.infoChip}>
          <span style={s.infoLabel}>nginx</span>
          <span style={s.infoVal}>:80 → :3000</span>
        </div>
        <div style={s.infoChip}>
          <span style={s.infoLabel}>url</span>
          <span style={s.infoVal}>{vps.url}</span>
        </div>
        <div style={s.infoChip}>
          <span style={s.infoLabel}>container</span>
          <span style={s.infoVal}>{vps.containerId?.slice(0,12)}</span>
        </div>
      </div>

      {/* Terminal toggle */}
      {vps.status === "running" && (
        <>
          <button style={s.termToggle} onClick={() => setExpanded(v => !v)}>
            {expanded ? "▲ Hide terminal" : "▼ Open terminal"}
          </button>
          {expanded && (
            <div style={s.termWrap}>
              <div style={s.termBar}>
                {["#ff5f57","#febc2e","#28c840"].map(c => (
                  <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />
                ))}
                <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginLeft:6, fontFamily:"monospace" }}>
                  {vps.name} — bash
                </span>
              </div>
              <VpsTerminal vpsId={vps._id} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Create VPS modal ─────────────────────────────────────────────────────────

function CreateVpsModal({ onClose, onCreated }) {
  const [name,       setName      ] = useState("my-vps");
  const [logs,       setLogs      ] = useState([]);
  const [creating,   setCreating  ] = useState(false);
  const [done,       setDone      ] = useState(false);
  const endRef = useRef();
  const authH  = getAuthHeaders();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [logs]);

  async function create() {
    if (!name.trim() || creating) return;
    setCreating(true); setLogs([]);

    try {
      const res = await fetch(`${API_BASE}/api/vps/create`, {
        method: "POST",
        headers: { "Content-Type":"application/json", ...authH },
        body: JSON.stringify({ name }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

      while (true) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream:true });
        const parts = buf.split("\n\n"); buf = parts.pop();
        for (const part of parts) {
          let evt = "message", dat = null;
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) evt = line.slice(7).trim();
            if (line.startsWith("data: ")) { try { dat = JSON.parse(line.slice(6)); } catch { dat = {}; } }
          }
          if (!dat) continue;
          if (evt === "status") setLogs(p => [...p, { t:dat.message, s:"ok" }]);
          if (evt === "done")   { setDone(true); onCreated(dat.vps); }
          if (evt === "error")  setLogs(p => [...p, { t:`Error: ${dat.message}`, s:"err" }]);
        }
      }
    } catch (err) {
      setLogs(p => [...p, { t:err.message, s:"err" }]);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={m.overlay}>
      <div style={m.modal}>
        <div style={m.header}>
          <div style={m.title}>Create VPS</div>
          <button style={m.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={m.body}>
          <div style={{ marginBottom:14 }}>
            <label style={s.label}>VPS name</label>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)} disabled={creating} />
          </div>

          <div style={m.specBox}>
            <div style={m.specTitle}>What you get</div>
            <div style={m.specRow}><span style={m.specKey}>OS</span><span>Ubuntu 22.04</span></div>
            <div style={m.specRow}><span style={m.specKey}>Runtime</span><span>Node.js 20 + npm</span></div>
            <div style={m.specRow}><span style={m.specKey}>Proxy</span><span>nginx :80 → your app :3000</span></div>
            <div style={m.specRow}><span style={m.specKey}>Tools</span><span>git, curl, wget, vim</span></div>
            <div style={m.specRow}><span style={m.specKey}>Storage</span><span>Persistent workspace bind-mounted</span></div>
          </div>

          {logs.length > 0 && (
            <div style={m.logBox}>
              {logs.map((l, i) => (
                <div key={i} style={{ fontFamily:"monospace", fontSize:11.5, lineHeight:1.75,
                  color: l.s==="err" ? "#f87171" : "#4ade80" }}>
                  {l.s === "ok" ? "✓ " : "✗ "}{l.t}
                </div>
              ))}
              <div ref={endRef}/>
            </div>
          )}

          {done ? (
            <button style={{ ...m.createBtn, background:"#22c55e" }} onClick={onClose}>
              ✓ VPS ready — close
            </button>
          ) : (
            <button style={{ ...m.createBtn, opacity:creating ? 0.6 : 1 }} onClick={create} disabled={creating}>
              {creating ? "Provisioning…" : "Create VPS"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main VPS Dashboard page ──────────────────────────────────────────────────

export default function VpsDashboard({ navigate }) {
  const [vpsList,      setVpsList     ] = useState([]);
  const [loading,      setLoading     ] = useState(true);
  const [showCreate,   setShowCreate  ] = useState(false);
  const authH = getAuthHeaders();

  async function loadVps() {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/vps`, { headers: authH });
      if (res.status === 401) { clearToken(); navigate("/login"); return; }
      const data = await res.json();
      setVpsList(data.vps || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!authH.Authorization) { navigate("/login"); return; }
    loadVps();
  }, []);

  async function handleDelete(id) {
    if (!confirm("Delete this VPS and all its files?")) return;
    await fetch(`${API_BASE}/api/vps/${id}`, { method:"DELETE", headers:authH });
    setVpsList(p => p.filter(v => v._id !== id));
  }

  async function handleToggle(vps) {
    const endpoint = vps.status === "running" ? "stop" : "start";
    await fetch(`${API_BASE}/api/vps/${vps._id}/${endpoint}`, { method:"POST", headers:authH });
    setVpsList(p => p.map(v => v._id === vps._id
      ? { ...v, status: vps.status==="running" ? "stopped" : "running" }
      : v
    ));
  }

  function handleCreated(newVps) {
    setVpsList(p => [newVps, ...p]);
  }

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
      `}</style>

      <header style={s.topBar}>
        <div style={s.brand}>
          <span style={s.brandMark}>▲</span>
          <span style={s.brandText}>VERCELITE</span>
          <span style={s.breadcrumb}>/ VPS</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button style={s.navBtn} onClick={() => navigate("/dashboard")}>← Dashboard</button>
          <button style={s.createBtn} onClick={() => setShowCreate(true)}>+ New VPS</button>
        </div>
      </header>

      <div style={s.wrap}>
        <div style={s.pageHead}>
          <h1 style={s.heading}>Your VPS instances</h1>
          <p style={s.sub}>Each VPS is an isolated Docker container with nginx, Node.js, and a persistent workspace.</p>
        </div>

        {loading ? (
          <div style={s.emptyState}>Loading…</div>
        ) : vpsList.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize:32, marginBottom:12 }}>🖥</div>
            <div style={{ fontSize:18, fontWeight:900, marginBottom:8 }}>No VPS instances yet</div>
            <div style={{ fontSize:14, color:"rgba(11,11,15,0.5)", marginBottom:20 }}>
              Create one to get a persistent Linux environment with nginx and Node.js.
            </div>
            <button style={s.createBtn} onClick={() => setShowCreate(true)}>Create your first VPS</button>
          </div>
        ) : (
          <div style={s.grid}>
            {vpsList.map(vps => (
              <VpsCard key={vps._id} vps={vps} onDelete={handleDelete} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateVpsModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page:      { minHeight:"100vh", background:"#f0ede6", fontFamily:FONT, color:"#0b0b0f" },
  topBar:    { height:64, background:"#fff", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:10 },
  brand:     { display:"flex", alignItems:"center", gap:10 },
  brandMark: { fontSize:16, fontWeight:900 },
  brandText: { fontSize:14, fontWeight:900, letterSpacing:2 },
  breadcrumb:{ fontSize:14, color:"rgba(11,11,15,0.4)", fontWeight:700 },
  navBtn:    { padding:"9px 16px", background:"transparent", border:"1px solid rgba(0,0,0,0.1)", borderRadius:999, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:FONT },
  createBtn: { padding:"9px 18px", background:"#f97316", color:"#fff", border:"none", borderRadius:999, fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:FONT },
  wrap:      { maxWidth:900, margin:"0 auto", padding:"36px 24px" },
  pageHead:  { marginBottom:28 },
  heading:   { fontSize:28, fontWeight:900, letterSpacing:"-0.03em", marginBottom:6 },
  sub:       { fontSize:14, color:"rgba(11,11,15,0.55)" },
  grid:      { display:"flex", flexDirection:"column", gap:16 },
  emptyState:{ textAlign:"center", padding:"60px 20px", color:"rgba(11,11,15,0.5)" },
  label:     { fontSize:11, fontWeight:900, letterSpacing:1, color:"rgba(11,11,15,0.5)", textTransform:"uppercase", display:"block", marginBottom:6 },
  input:     { width:"100%", padding:"11px 14px", background:"#f0ede6", border:"1px solid rgba(0,0,0,0.1)", borderRadius:12, fontSize:14, color:"#0b0b0f", fontFamily:FONT, outline:"none" },

  card:      { background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:20, padding:20 },
  cardHeader:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  cardName:  { fontSize:16, fontWeight:900 },
  cardSub:   { fontSize:12, color:"rgba(11,11,15,0.45)", fontFamily:"monospace" },
  openBtn:   { padding:"6px 12px", fontSize:12, fontWeight:700, color:"#f97316", background:"rgba(249,115,22,0.08)", borderRadius:999, textDecoration:"none" },
  toggleBtn: { padding:"6px 12px", fontSize:12, fontWeight:700, background:"rgba(0,0,0,0.06)", border:"1px solid rgba(0,0,0,0.1)", borderRadius:999, cursor:"pointer", fontFamily:FONT },
  deleteBtn: { width:30, height:30, border:"none", background:"rgba(239,68,68,0.08)", color:"#dc2626", borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT },
  infoRow:   { display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 },
  infoChip:  { background:"#f0ede6", borderRadius:8, padding:"7px 12px", fontSize:12, display:"flex", gap:8 },
  infoLabel: { color:"rgba(11,11,15,0.4)", fontWeight:700 },
  infoVal:   { fontFamily:"monospace", color:"#0b0b0f" },
  termToggle:{ width:"100%", padding:"9px 0", background:"transparent", border:"1px dashed rgba(0,0,0,0.12)", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", color:"rgba(11,11,15,0.5)", fontFamily:FONT },
  termWrap:  { marginTop:12, borderRadius:12, overflow:"hidden", border:"1px solid rgba(0,0,0,0.08)" },
  termBar:   { background:"#1a1a1a", padding:"10px 14px", display:"flex", alignItems:"center", gap:6 },
};

const ts = {
  term: { background:"#0d0d0d", padding:"12px 16px", minHeight:200, maxHeight:360, overflowY:"auto", cursor:"text" },
};

const m = {
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 },
  modal:      { background:"#fff", borderRadius:20, width:"100%", maxWidth:480, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
  header:     { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", borderBottom:"1px solid rgba(0,0,0,0.08)" },
  title:      { fontSize:16, fontWeight:900 },
  closeBtn:   { width:28, height:28, border:"none", background:"rgba(0,0,0,0.06)", borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT },
  body:       { padding:20 },
  specBox:    { background:"#f0ede6", borderRadius:12, padding:14, marginBottom:16, display:"flex", flexDirection:"column", gap:6 },
  specTitle:  { fontSize:11, fontWeight:900, letterSpacing:1, color:"rgba(11,11,15,0.4)", textTransform:"uppercase", marginBottom:4 },
  specRow:    { display:"flex", gap:12, fontSize:13 },
  specKey:    { minWidth:70, color:"rgba(11,11,15,0.45)", fontWeight:700 },
  logBox:     { background:"#0d0d0d", borderRadius:10, padding:"12px 14px", marginBottom:14, maxHeight:140, overflowY:"auto" },
  createBtn:  { width:"100%", padding:"13px", background:"#f97316", color:"#fff", border:"none", borderRadius:12, fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:FONT },
};
