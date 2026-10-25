import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, Download, Send, MessageSquare, Share2, SlidersHorizontal, ListChecks,
  GitCompare, TrendingUp, ShieldCheck, Bot, Lightbulb, CalendarDays, Clock, AlertTriangle,
  KeyRound, ShieldAlert, FileX2, FileSpreadsheet,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { contractsAPI, risksAPI, policiesAPI, chatAPI, reportsAPI } from '../../services/api';
import { buildReport, compareVersions, simulate, scoreLevel } from '../../utils/buildReport';
import { useTheme } from '../../context/ThemeContext';
import '../../pages/report.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const LEVEL_COLOR = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const cls = (s) => String(s).replace(/\s+/g, '-');
const Pill = ({ children }) => <span className={`pill ${cls(children)}`}>{children}</span>;
const Card = ({ n, title, icon: Icon, isNew, wide, id, children, right }) => (
  <section className={`rpt-card ${wide ? 'wide' : ''}`} id={id}>
    <h2>
      <span className="n">{n}</span>
      {Icon && <Icon size={15} />}
      <span>{title}</span>
      {isNew && <span className="rpt-new">New Feature</span>}
      <span style={{ marginLeft: 'auto' }}>{right}</span>
    </h2>
    {children}
  </section>
);

/* ---------- risk gauge ---------- */
const Gauge = ({ score, level }) => {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="rpt-gauge">
      <svg viewBox="0 0 100 100" width="96" height="96">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e9f2" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={LEVEL_COLOR[level]} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(Math.min(100, score) / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <div className="g-num"><b>{Math.round(score)}</b><span>/100</span></div>
    </div>
  );
};

/* ---------- 2. dependency graph ---------- */
const DependencyGraph = ({ graph }) => {
  const { nodes, edges, layers } = graph;
  if (nodes.length === 0) return <div className="rpt-empty">No risky clauses were detected, so there are no risk dependencies to show.</div>;
  const W = 360, NW = 128, NH = 46, GAP = 62;
  const layerIds = [...new Set(nodes.map((n) => layers[n.key] ?? 2))].sort((a, b) => a - b);
  const pos = {};
  layerIds.forEach((L, row) => {
    const inRow = nodes.filter((n) => (layers[n.key] ?? 2) === L);
    inRow.forEach((n, i) => {
      pos[n.key] = { x: ((i + 1) * W) / (inRow.length + 1) - NW / 2, y: 8 + row * (NH + GAP) };
    });
  });
  const H = 16 + layerIds.length * (NH + GAP) - GAP;
  return (
    <>
      <svg className="rpt-graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Risk dependency graph">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#475569" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          return <line key={i} x1={a.x + NW / 2} y1={a.y + NH} x2={b.x + NW / 2} y2={b.y - 2} stroke="#475569" strokeWidth="1.4" markerEnd="url(#arr)" />;
        })}
        {nodes.map((n) => (
          <g key={n.key} className={`gn-${n.level}`} transform={`translate(${pos[n.key].x},${pos[n.key].y})`}>
            <rect width={NW} height={NH} rx="8" strokeWidth="1.4" />
            <text className="s1" x={NW / 2} y="18" textAnchor="middle">{n.label.length > 20 ? `${n.label.slice(0, 19)}…` : n.label}</text>
            <text className="s2" x={NW / 2} y="31" textAnchor="middle">{n.sub}{n.page ? ` · p.${n.page}` : ''}</text>
            <text className="s2" x={NW / 2} y="42" textAnchor="middle">{n.level} Risk</text>
          </g>
        ))}
      </svg>
      <div className="rpt-muted" style={{ fontSize: 12, marginTop: 6 }}>
        {edges.length ? edges.map((e, i) => <div key={i}>• {e.text}</div>) : 'The detected risks are independent of each other.'}
      </div>
    </>
  );
};

/* ---------- 3. what-if simulator ---------- */
const Simulator = ({ items, score }) => {
  const [id, setId] = useState('0');
  const [value, setValue] = useState('');
  const [res, setRes] = useState(null);
  useEffect(() => { setId('0'); setValue(''); setRes(null); }, [items]);
  if (items.length === 0) return <div className="rpt-empty">No violations or review items to simulate for this contract.</div>;
  const item = items.find((i) => i.id === id) || items[0];
  return (
    <>
      <div className="rpt-form">
        <label>Change:</label>
        <select value={item.id} onChange={(e) => { setId(e.target.value); setRes(null); }}>
          {items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>
        <label>New value:</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" placeholder={item.threshold != null ? `e.g. ${item.threshold}` : 'Enter a number'} value={value}
            onChange={(e) => setValue(e.target.value)} />
          <button className="rpt-btn dark" onClick={() => setRes(simulate(item, value, score))}>Simulate</button>
        </div>
      </div>
      <div className="rpt-muted" style={{ fontSize: 11, margin: '6px 2px' }}>Company rule: {item.rule || 'n/a'}</div>
      <div className="rpt-sim">
        <div>
          <h4>Current</h4>
          <div className="rpt-row"><span>Risk score</span><Pill>{scoreLevel(score)}</Pill><b>{Math.round(score)}</b></div>
          <div className="rpt-row"><span>Compliance</span><Pill>Violated</Pill></div>
        </div>
        <div>
          <h4>After change</h4>
          {res && res.ok ? (
            <>
              <div className="rpt-row"><span>Risk score</span><Pill>{res.afterLevel}</Pill><b>{Math.round(res.after)}</b></div>
              <div className="rpt-row"><span>Compliance</span>{res.satisfied === true ? <Pill>Compliant</Pill> : res.satisfied === false ? <Pill>Violated</Pill> : <Pill>Review</Pill>}</div>
            </>
          ) : <div className="rpt-muted">Enter a value and press Simulate.</div>}
        </div>
      </div>
      {res && <div className={`rpt-tip ${res.ok && res.satisfied === false ? 'bad' : ''}`}>{res.message} <i>(Estimate only.)</i></div>}
    </>
  );
};

/* ---------- 4. clause analysis ---------- */
const ClauseAnalysis = ({ rep }) => {
  const [tab, setTab] = useState('key');
  const [all, setAll] = useState(false);
  const tabs = [['key', 'Key Clauses'], ['risks', `Risks (${rep.issues.length})`], ['viol', `Policy Violations (${rep.violations.length})`], ['miss', `Missing Info (${rep.missing.length})`]];
  let rows = [];
  if (tab === 'key') rows = rep.clauseRows.map((c) => [c.title, (c.text || '').slice(0, 90) + ((c.text || '').length > 90 ? '…' : ''), c.level]);
  if (tab === 'risks') rows = rep.issues.map((f) => [f.title, f.mismatch_reason || '', f.level]);
  if (tab === 'viol') rows = rep.violations.map((f) => [f.title, f.matched_policy_rule || '', f.level]);
  const shown = all ? rows : rows.slice(0, 5);
  return (
    <>
      <div className="rpt-tabs">{tabs.map(([k, l]) => <button key={k} className={`rpt-tab ${tab === k ? 'on' : ''}`} onClick={() => { setTab(k); setAll(false); }}>{l}</button>)}</div>
      {tab === 'miss' ? (
        rep.missing.length === 0 ? <div className="rpt-empty">No missing information detected.</div> :
        <div className="rpt-scroll"><table className="rpt-table"><thead><tr><th>Clause</th><th>Details</th></tr></thead>
          <tbody>{rep.missing.map((m) => <tr key={m.key}><td><b>{m.label}</b></td><td>{m.detail}</td></tr>)}</tbody></table></div>
      ) : rows.length === 0 ? <div className="rpt-empty">Nothing to show in this tab.</div> : (
        <div className="rpt-scroll"><table className="rpt-table"><thead><tr><th>Clause</th><th>Details</th><th>Risk</th></tr></thead>
          <tbody>{shown.map((r, i) => <tr key={i}><td><b>{r[0]}</b></td><td>{r[1]}</td><td><Pill>{r[2]}</Pill></td></tr>)}</tbody></table></div>
      )}
      {tab !== 'miss' && rows.length > 5 && <button className="rpt-btn" style={{ marginTop: 8 }} onClick={() => setAll(!all)}>{all ? 'Show less' : 'View All Clauses'}</button>}
    </>
  );
};

/* ---------- 5. contract comparison ---------- */
const Comparison = ({ contract, rep, allContracts }) => {
  const others = allContracts.filter((c) => c.id !== contract.id && c.processing_status === 'analyzed');
  const sameFamily = others.filter((c) => rep.versions.some((v) => v.id === c.id));
  const [otherId, setOtherId] = useState('');
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { setOtherId(sameFamily.length ? sameFamily[sameFamily.length - 1].id : (others[0]?.id || '')); setDiff(null); setOpen(false); }, [contract.id, allContracts.length]); // eslint-disable-line
  const run = async () => {
    if (!otherId) return;
    setBusy(true);
    try { setDiff(compareVersions(contract, await contractsAPI.getById(otherId))); } finally { setBusy(false); }
  };
  if (others.length === 0) return <div className="rpt-empty">Upload another analyzed contract (for example an earlier version) to compare against it.</div>;
  return (
    <>
      <div className="rpt-muted" style={{ marginBottom: 6 }}>Compare with:</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="rpt-select" style={{ flex: 1 }} value={otherId} onChange={(e) => { setOtherId(e.target.value); setDiff(null); }}>
          {sameFamily.length > 0 && <optgroup label="Previous versions">{sameFamily.map((c) => <option key={c.id} value={c.id}>{c.filename}</option>)}</optgroup>}
          <optgroup label="Other contracts">{others.filter((c) => !sameFamily.includes(c)).map((c) => <option key={c.id} value={c.id}>{c.filename}</option>)}</optgroup>
        </select>
        <button className="rpt-btn primary" onClick={run} disabled={busy}>{busy ? '…' : 'Compare'}</button>
      </div>
      {diff && (
        <>
          <b style={{ display: 'block', marginTop: 12 }}>Key Differences</b>
          <ul className="rpt-diff">
            {diff.added.map((a) => <li key={a.key}><span className="dot g" /><span><b>Added clause:</b> {a.label}</span></li>)}
            {diff.modified.map((a) => <li key={a.key}><span className="dot o" /><span><b>Modified clause:</b> {a.label}</span></li>)}
            {diff.removed.map((a) => <li key={a.key}><span className="dot r" /><span><b>Removed clause:</b> {a.label}</span></li>)}
            <li><span className="dot r" /><span><b>Risk change:</b> score {diff.scoreChange >= 0 ? 'increased' : 'decreased'} from {Math.round(diff.scoreBefore)} → {Math.round(diff.scoreAfter)}</span></li>
          </ul>
          {diff.added.length + diff.modified.length + diff.removed.length === 0 && <div className="rpt-empty">No clause differences found.</div>}
          <button className="rpt-btn" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'View Detailed Comparison'}</button>
          {open && (
            <div className="rpt-diffbox">
              {diff.modified.map((m) => <div key={m.key}><b>{m.label}</b><div className="rpt-muted">Other contract:</div><pre>{m.before}</pre><div className="rpt-muted">This contract:</div><pre>{m.now}</pre></div>)}
              {diff.added.map((m) => <div key={m.key}><b>{m.label} (only in this contract)</b><pre>{m.now}</pre></div>)}
              {diff.removed.map((m) => <div key={m.key}><b>{m.label} (only in the other contract)</b><pre>{m.before}</pre></div>)}
            </div>
          )}
        </>
      )}
    </>
  );
};

/* ---------- 6. timeline ---------- */
const Timeline = ({ versions }) => {
  const { theme } = useTheme();
  const tick = theme === 'dark' ? '#94a3b8' : '#64748b';
  const grid = theme === 'dark' ? '#2a3342' : '#e5e9f2';
  if (versions.length < 2) {
    return <div className="rpt-empty">Only one version found. Upload another version of this contract (same title or file name, e.g. “… v2.pdf”) to see how the risk score changes.</div>;
  }
  const data = {
    labels: versions.map((v) => v.label),
    datasets: [{ data: versions.map((v) => v.score), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,.14)', fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#f97316' }],
  };
  const first = versions[0].score, last = versions[versions.length - 1].score;
  return (
    <>
      <div style={{ height: 190 }}>
        <Line key={theme} data={data} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { x: { ticks: { color: tick }, grid: { color: grid } }, y: { min: 0, max: 100, ticks: { color: tick }, grid: { color: grid } } } }} />
      </div>
      <div className="rpt-tip info">
        Risk score went from {Math.round(first)} (first version) to {Math.round(last)} (current): {last > first ? 'higher risk' : last < first ? 'lower risk' : 'no change'}.
      </div>
    </>
  );
};

/* ---------- 8. AI assistant ---------- */
const Assistant = ({ contractId }) => {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    let live = true;
    chatAPI.getHistory(contractId).then((h) => live && setMsgs(h.messages || [])).catch(() => live && setMsgs([]));
    return () => { live = false; };
  }, [contractId]);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs, busy]);
  const ask = async (q) => {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    setText(''); setBusy(true);
    setMsgs((m) => [...m, { role: 'user', content: question }]);
    try { const r = await chatAPI.ask(contractId, question); setMsgs((m) => [...m, r]); }
    catch { setMsgs((m) => [...m, { role: 'assistant', content: 'Could not get an answer. Check that the backend and AI provider are configured (Settings page).' }]); }
    finally { setBusy(false); }
  };
  return (
    <>
      {msgs.length === 0 && (
        <div className="rpt-chips">
          {['What are the payment terms?', 'Why is the termination clause risky?', 'Does it mention automatic renewal?'].map((q) => <button key={q} className="rpt-chip" onClick={() => ask(q)}>{q}</button>)}
        </div>
      )}
      <div className="rpt-chat" ref={box}>
        {msgs.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.content}</div>)}
        {busy && <div className="bubble assistant">Thinking…</div>}
      </div>
      <div className="rpt-chatbar">
        <input value={text} placeholder="Ask anything about this contract…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} />
        <button className="rpt-btn primary" onClick={() => ask()} disabled={busy} aria-label="Send"><Send size={14} /></button>
      </div>
    </>
  );
};

/* ---------- 12. risk explanation ---------- */
const Explanation = ({ items }) => {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  useEffect(() => { setI(0); setFull(false); }, [items]);
  if (items.length === 0) return <div className="rpt-empty">No risks to explain for this contract.</div>;
  const e = items[i] || items[0];
  return (
    <>
      <select className="rpt-select" style={{ width: '100%', marginBottom: 8 }} value={i} onChange={(ev) => { setI(Number(ev.target.value)); setFull(false); }}>
        {items.map((x, k) => <option key={k} value={k}>{x.level} – {x.title}</option>)}
      </select>
      <div className={`rpt-expl ${e.level}`}>
        <b>{e.level} Risk – {e.title}</b>
        <dl>
          <dt>Risk</dt><dd>{e.risk || 'Not specified'}</dd>
          <dt>Clause</dt><dd>{e.clause}</dd>
          <dt>Company rule</dt><dd>{e.rule || 'Not specified'}</dd>
          <dt>Reason</dt><dd>{e.reason || 'Not specified'}</dd>
          <dt>Possible impact</dt><dd>{e.impact}</dd>
          <dt>Suggested action</dt><dd>{e.action || 'Reviewer to decide'}</dd>
        </dl>
        {full && <div className="rpt-ai"><b>Original clause text</b>{'\n'}{e.clauseText || 'Not available'}{e.ai ? `\n\nAI explanation\n${e.ai}` : ''}</div>}
      </div>
      <div style={{ textAlign: 'right', marginTop: 8 }}><button className="rpt-btn" onClick={() => setFull(!full)}>{full ? 'Hide' : 'View Full Explanation'}</button></div>
    </>
  );
};

/* ================= main page ================= */
/**
 * ReportView = the 12-section report.
 *  contractId : which contract to show
 *  onSelect   : (optional) called when the user picks another contract in the dropdown
 *  embedded   : true when shown inside the Contract Details page (hides the page title + selector)
 */
const ReportView = ({ contractId = '', onSelect, embedded = false }) => {
  const id = contractId;
  const [list, setList] = useState([]);
  const [contract, setContract] = useState(null);
  const [risks, setRisks] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dl, setDl] = useState('');

  useEffect(() => {
    contractsAPI.list().then((d) => {
      setList(d);
      if (!id && d.length && onSelect) onSelect(d[0].id);
      if (!d.length) setLoading(false);
    }).catch(() => { setError('Could not load contracts. Is the backend running?'); setLoading(false); });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!id) return;
    let live = true;
    setLoading(true); setError('');
    Promise.all([contractsAPI.getById(id), risksAPI.getByContract(id), policiesAPI.list().catch(() => [])])
      .then(([c, r, p]) => { if (live) { setContract(c); setRisks(r); setPolicies(p); } })
      .catch((e) => live && setError(e?.response?.data?.detail || 'Could not load this report.'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [id]);

  const rep = useMemo(() => (contract ? buildReport({ contract, risks, policies, allContracts: list }) : null), [contract, risks, policies, list]);

  const choose = (v) => { if (onSelect) onSelect(v); };
  // "Download Report" = browser Save-as-PDF of this exact page (so the PDF looks like the screen).
  const printPdf = () => {
    const old = document.title;
    document.title = `Contract Report - ${rep.header.title}`;
    const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  };
  const downloadCsv = async () => {
    setDl('csv');
    try { await reportsAPI.downloadCSV(id); }
    catch (e) { setError(`CSV download failed: ${e?.response?.status === 401 ? 'please sign in first' : (e?.message || 'unknown error')}`); }
    finally { setDl(''); }
  };
  const negotiate = () => {
    const lines = rep.issues.map((f, i) => `${i + 1}. ${f.title} (${f.level}) - ${f.mismatch_reason || ''}\n   Proposed change: ${f.suggested_action || 'To be discussed'}`);
    const body = `Hello,\n\nAfter reviewing "${rep.header.title}", we would like to discuss the following points:\n\n${lines.join('\n\n') || 'No major issues found.'}\n\nRegards`;
    window.location.href = `mailto:?subject=${encodeURIComponent(`Negotiation points: ${rep.header.title}`)}&body=${encodeURIComponent(body)}`;
  };

  if (!loading && list.length === 0) {
    return <div className="rpt"><div className="rpt-empty"><FileX2 size={28} /><p>No contracts yet. <Link to="/upload" style={{ color: '#f97316', fontWeight: 600 }}>Upload a contract</Link> to generate its report.</p></div></div>;
  }
  if (loading) return <div className="rpt"><div className="rpt-empty">Generating report…</div></div>;
  if (error && !rep) return <div className="rpt"><div className="rpt-empty" style={{ color: '#b91c1c' }}>{error}</div></div>;
  if (!rep) return null;

  const k = rep.kpis;
  return (
    <div className={`rpt ${embedded ? 'embedded' : ''}`}>
      {!embedded && <Link to="/contracts" className="rpt-back"><ArrowLeft size={14} /> Back to Contracts</Link>}

      <div className={`rpt-head ${embedded ? 'embedded' : ''}`}>
        {!embedded && <div className="rpt-title">
          <div className="ico"><FileText size={22} /></div>
          <div>
            <h1>{rep.header.title} <span className="rpt-badge">{rep.header.status === 'analyzed' ? '✓ Analyzed' : rep.header.status}</span></h1>
            <div className="rpt-meta">
              <span>Parties: {rep.header.parties}</span>
              <span>Date: {rep.header.date}</span>
              {rep.header.pages ? <span>{rep.header.pages} pages</span> : null}
              <span>File: {rep.header.filename}</span>
              <span>Report generated: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>}
        <div className="rpt-actions">
          {!embedded && onSelect && (
            <select className="rpt-select" value={id} onChange={(e) => choose(e.target.value)} aria-label="Select contract">
              {list.map((c) => <option key={c.id} value={c.id}>{c.filename}</option>)}
            </select>
          )}
          <button className="rpt-btn" onClick={printPdf}><Download size={14} /> Download Report (PDF)</button>
          <button className="rpt-btn" onClick={downloadCsv} disabled={!!dl}><FileSpreadsheet size={14} /> {dl === 'csv' ? 'Preparing…' : 'Risks CSV'}</button>
          <button className="rpt-btn primary" onClick={negotiate}><Send size={14} /> Send for Negotiation</button>
          <button className="rpt-btn dark" onClick={() => document.getElementById('sec-8')?.scrollIntoView({ behavior: 'smooth' })}><MessageSquare size={14} /> Chat with AI</button>
        </div>
      </div>
      {error && <div className="rpt-tip bad" style={{ marginBottom: 12 }}>{error}</div>}

      {/* KPI cards */}
      <div className="rpt-kpis">
        <div className="rpt-kpi">
          <Gauge score={rep.score} level={rep.level} />
          <div><div className="lbl">Overall Risk Score</div><div style={{ fontWeight: 700, fontSize: 17, color: LEVEL_COLOR[rep.level] }}>{rep.level} Risk</div>
            <div className="sub">{k.violations} policy violation(s), {k.missing} missing clause type(s).</div></div>
        </div>
        <div className="rpt-kpi"><div className="kico" style={{ background: 'rgba(249,115,22,.14)', color: '#f97316' }}><KeyRound size={20} /></div>
          <div><div className="lbl">Key Clauses Extracted</div><div className="num">{k.clauses}</div><div className="sub">Important clauses identified</div></div></div>
        <div className="rpt-kpi"><div className="kico" style={{ background: '#fee2e2', color: '#dc2626' }}><AlertTriangle size={20} /></div>
          <div><div className="lbl">Risks Detected</div><div className="num">{k.risks}</div><div className="sub">{k.high} High / {k.medium} Medium / {k.low} Low</div></div></div>
        <div className="rpt-kpi"><div className="kico" style={{ background: '#fce7f3', color: '#db2777' }}><ShieldAlert size={20} /></div>
          <div><div className="lbl">Policy Violations</div><div className="num">{k.violations}</div><div className="sub">Against company rules</div></div></div>
        <div className="rpt-kpi"><div className="kico" style={{ background: '#d1fae5', color: '#059669' }}><FileX2 size={20} /></div>
          <div><div className="lbl">Missing Information</div><div className="num">{k.missing}</div><div className="sub">Expected details not found</div></div></div>
      </div>

      {/* row 1 */}
      <div className="rpt-grid">
        <Card n="1" title="Executive Summary" icon={FileText}>
          <p style={{ margin: 0 }}>{rep.summary.text}</p>
          <div className={`rpt-concern ${rep.summary.concernLevel}`}><b>Key Concern</b>{rep.summary.concern}{rep.summary.extra ? ` ${rep.summary.extra}` : ''}</div>
        </Card>
        <Card n="2" title="Risk Dependency Graph" icon={Share2} isNew><DependencyGraph graph={rep.graph} /></Card>
        <Card n="3" title="What-If Contract Simulator" icon={SlidersHorizontal} isNew><Simulator items={rep.simulatorItems} score={rep.score} /></Card>
      </div>

      {/* row 2 */}
      <div className="rpt-grid">
        <Card n="4" title="Clause Analysis" icon={ListChecks}><ClauseAnalysis rep={rep} /></Card>
        <Card n="5" title="Contract Comparison" icon={GitCompare} isNew><Comparison contract={contract} rep={rep} allContracts={list} /></Card>
        <Card n="6" title="Risk Evolution Timeline" icon={TrendingUp} isNew><Timeline versions={rep.versions} /></Card>
      </div>

      {/* row 3 */}
      <div className="rpt-grid">
        <Card n="7" title="Company Policy Compliance" icon={ShieldCheck}
          right={<><Pill>Compliant</Pill> {rep.complianceCounts.compliant} &nbsp;<Pill>Violated</Pill> {rep.complianceCounts.violated}</>}>
          {rep.complianceRows.length === 0 ? <div className="rpt-empty">No policy comparisons available. Add active policies on the Company Policies page and re-run analysis.</div> : (
            <div className="rpt-scroll"><table className="rpt-table"><thead><tr><th>Policy rule</th><th>Contract clause</th><th>Status</th><th>Details</th></tr></thead>
              <tbody>{rep.complianceRows.slice(0, 6).map((r, i) => (
                <tr key={i}><td>{r.rule}</td><td>{r.clause}{r.page ? ` (p.${r.page})` : ''}</td>
                  <td><Pill>{r.status === 'violation' ? 'Violated' : r.status === 'compliant' ? 'Compliant' : r.status === 'missing' ? 'Missing' : 'Review'}</Pill></td><td>{r.detail}</td></tr>))}</tbody></table></div>
          )}
          {rep.complianceRows.length > 6 && <div className="rpt-muted" style={{ marginTop: 6 }}>Showing 6 of {rep.complianceRows.length} rules. Open Risk Analysis for all.</div>}
        </Card>
        <Card n="8" title="AI Assistant – Ask Questions" icon={Bot} id="sec-8"><Assistant contractId={id} /></Card>
        <Card n="9" title="Key Insights & Recommendations" icon={Lightbulb}>
          <b>Top Risks</b>
          {rep.insights.top.length ? <ul className="rpt-list">{rep.insights.top.map((f, i) => <li key={i}>{f.title} <Pill>{f.level}</Pill></li>)}</ul> : <div className="rpt-muted" style={{ margin: '6px 0' }}>No risks detected.</div>}
          <b>Recommendations</b>
          {rep.insights.recs.length ? <ul className="rpt-list">{rep.insights.recs.map((r, i) => <li key={i}>{r}</li>)}</ul> : <div className="rpt-muted" style={{ margin: '6px 0' }}>No corrective actions needed.</div>}
          <div className="rpt-verdict">{rep.insights.verdict}</div>
        </Card>
      </div>

      {/* row 4 */}
      <div className="rpt-grid">
        <Card n="10" title="Important Dates" icon={CalendarDays} isNew>
          {rep.dates.length === 0 ? <div className="rpt-empty">No dates were found in this contract.</div> : (
            <div className="rpt-scroll"><table className="rpt-table"><thead><tr><th>Event</th><th>Date</th><th>Days remaining</th><th>Status</th></tr></thead>
              <tbody>{rep.dates.map((d, i) => <tr key={i}><td>{d.label}</td><td>{d.date}</td>
                <td style={{ color: d.left < 0 ? '#dc2626' : d.left <= 30 ? '#d97706' : 'var(--mute)', fontWeight: 600 }}>{d.left < 0 ? `${-d.left} days ago` : `${d.left} days`}</td>
                <td><Pill>{d.status}</Pill></td></tr>)}</tbody></table></div>
          )}
        </Card>
        <Card n="11" title="Deadline Tracker" icon={Clock} isNew>
          {rep.deadlines.length === 0 ? <div className="rpt-empty">No deadlines to track.</div> : rep.deadlines.map((d, i) => {
            const color = d.status === 'Overdue' ? '#ef4444' : d.status === 'At Risk' ? '#f59e0b' : '#10b981';
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="rpt-row"><span>{d.label}</span><span className="rpt-muted">{d.left < 0 ? 'passed' : `${d.left} days left`}</span></div>
                <div className="rpt-bar"><i style={{ width: `${Math.min(100, (d.used / d.total) * 100)}%`, background: color }} /></div>
              </div>
            );
          })}
          <div className="rpt-legend"><span style={{ color: '#10b981' }}>● On Track</span><span style={{ color: '#f59e0b' }}>● At Risk (≤30 days)</span><span style={{ color: '#ef4444' }}>● Overdue</span></div>
        </Card>
        <Card n="12" title="Risk Explanation" icon={AlertTriangle} isNew><Explanation items={rep.explanations} /></Card>
      </div>

      <div className="rpt-muted" style={{ fontSize: 11 }}>
        This report is generated automatically to assist contract reviewers. It is not legal advice; please verify findings against the original contract.
      </div>
    </div>
  );
};

export default ReportView;
