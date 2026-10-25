import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Upload } from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { dashboardAPI, contractsAPI } from '../services/api';
import { catKey, CAT_LABEL, parseDate } from '../utils/buildReport';
import { useTheme } from '../context/ThemeContext';
import './dashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = { High: '#ef4444', Medium: '#eab308', Low: '#22c55e' };

const MONTHS_BACK = 6;
// Last 6 calendar months, oldest first: [{key:'2026-05', label:'May'}...]
const lastMonths = () => {
  const out = [];
  const now = new Date();
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }) });
  }
  return out;
};

const Dashboard = () => {
  const { theme } = useTheme();
  const GRID = theme === 'dark' ? '#2a3342' : '#e5e9f2';
  const TICK = theme === 'dark' ? '#94a3b8' : '#64748b';
  const PANEL = theme === 'dark' ? '#151b25' : '#ffffff';
  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), contractsAPI.list()])
      .then(([s, c]) => { setStats(s); setContracts(c); })
      .catch(() => setError('Could not load dashboard data. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  // ---- everything below is computed from real data ----
  const monthly = useMemo(() => {
    const months = lastMonths();
    const rows = months.map((m) => ({ ...m, High: 0, Medium: 0, Low: 0 }));
    contracts.forEach((c) => {
      const lvl = ['High', 'Medium', 'Low'].find((l) => l === c.overall_risk_level);
      const d = c.created_at ? new Date(c.created_at) : null;
      if (!lvl || !d) return;
      const row = rows.find((r) => r.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (row) row[lvl] += 1;
    });
    return rows;
  }, [contracts]);

  const avgScore = useMemo(() => {
    const scored = contracts.filter((c) => c.processing_status === 'analyzed' && c.overall_risk_score != null);
    return scored.length ? Math.round(scored.reduce((s, c) => s + Number(c.overall_risk_score), 0) / scored.length) : null;
  }, [contracts]);

  const expiring = useMemo(() => {
    const now = new Date();
    return contracts.filter((c) => {
      const d = parseDate(c.expiration_date);
      if (!d) return false;
      const days = (d - now) / 86400000;
      return days >= 0 && days <= 30;
    }).length;
  }, [contracts]);

  const flagged = useMemo(() => {
    const merged = {};
    Object.entries(stats?.category_risk_counts || {}).forEach(([cat, n]) => {
      const label = CAT_LABEL[catKey(cat)] || cat;
      merged[label] = (merged[label] || 0) + n;
    });
    return Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [stats]);

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts
      .filter((c) => !q || [c.filename, c.title, c.parties, c.contract_type].some((v) => String(v || '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [contracts, query]);

  if (loading) return <div className="dk"><div className="dk-empty">Loading dashboard…</div></div>;
  if (error) return <div className="dk"><div className="dk-empty" style={{ color: '#f87171' }}>{error}</div></div>;

  const total = stats?.total_contracts || 0;
  const dist = stats?.risk_distribution || {};
  const distTotal = (dist.High || 0) + (dist.Medium || 0) + (dist.Low || 0);
  const high = stats?.high_risk_contracts || 0;
  const axis = { ticks: { color: TICK }, grid: { color: GRID }, border: { color: GRID } };

  return (
    <div className="dk">
      <div className="dk-top">
        <label className="dk-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contracts, parties…" aria-label="Search contracts" />
        </label>
        <Link to="/upload" className="dk-btn solid"><Upload size={14} /> Upload contract</Link>
      </div>

      <h1>Contract portfolio</h1>
      <div className="dk-sub">
        {total} contract{total === 1 ? '' : 's'} uploaded • <b>{high} high-risk</b> • {stats?.analyzed_contracts || 0} analyzed
      </div>

      <div className="dk-stats">
        <div className="dk-card dk-stat"><div className="v">{total}</div><div className="l">Contracts under management</div></div>
        <div className="dk-card dk-stat"><div className="v" style={{ color: '#ef4444' }}>{high}</div><div className="l">High-risk contracts</div></div>
        <div className="dk-card dk-stat"><div className="v">{avgScore ?? '—'}{avgScore != null && <small style={{ fontSize: 14, color: 'var(--mute)' }}> /100</small>}</div><div className="l">Average risk score</div></div>
        <div className="dk-card dk-stat"><div className="v">{expiring}</div><div className="l">Expiring in next 30 days</div></div>
      </div>

      {total === 0 ? (
        <div className="dk-card"><div className="dk-empty">No contracts yet. <Link to="/upload" style={{ color: '#f97316', fontWeight: 600 }}>Upload your first contract</Link> to see charts here.</div></div>
      ) : (
        <>
          <div className="dk-grid">
            <div className="dk-card">
              <h2>Contracts uploaded per month</h2>
              <div className="hint">Stacked by risk level • last {MONTHS_BACK} months</div>
              <div className="dk-chart">
                <Bar
                  key={theme}
                  data={{
                    labels: monthly.map((m) => m.label),
                    datasets: ['High', 'Medium', 'Low'].map((l) => ({
                      label: l, data: monthly.map((m) => m[l]), backgroundColor: COLORS[l], borderWidth: 0, maxBarThickness: 44,
                    })),
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: TICK, boxWidth: 10 } } },
                    scales: { x: { ...axis, stacked: true, grid: { display: false } }, y: { ...axis, stacked: true, beginAtZero: true, ticks: { color: TICK, precision: 0 } } },
                  }}
                />
              </div>
            </div>

            <div className="dk-card">
              <h2>Risk distribution</h2>
              <div className="hint">All analyzed contracts</div>
              <div className="dk-donut">
                <Doughnut
                  key={theme}
                  data={{
                    labels: ['High', 'Medium', 'Low'],
                    datasets: [{ data: [dist.High || 0, dist.Medium || 0, dist.Low || 0], backgroundColor: [COLORS.High, COLORS.Medium, COLORS.Low], borderColor: PANEL, borderWidth: 3 }],
                  }}
                  options={{ maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }}
                />
                <div className="mid"><b>{distTotal}</b><span>contracts</span></div>
              </div>
              <div className="dk-legend">
                {['High', 'Medium', 'Low'].map((l) => (
                  <div key={l}>
                    <span><i style={{ background: COLORS[l] }} />{l}</span>
                    <b>{distTotal ? Math.round(((dist[l] || 0) / distTotal) * 100) : 0}% ({dist[l] || 0})</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="dk-card">
              <h2>Most flagged clauses</h2>
              <div className="hint">Risk findings by clause type</div>
              {flagged.length === 0 ? <div className="dk-empty">No risk findings yet.</div> : (
                <div className="dk-bars">
                  {flagged.map(([label, n]) => (
                    <div className="dk-bar" key={label}>
                      <div className="row"><span>{label}</span><b>{n}</b></div>
                      <div className="track"><div className="fill" style={{ width: `${(n / flagged[0][1]) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dk-card">
            <h2>{query ? 'Search results' : 'Recent contracts'}</h2>
            <div className="hint">Newest first</div>
            {recent.length === 0 ? <div className="dk-empty">No contracts match “{query}”.</div> : (
              <div className="dk-scroll">
                <table className="dk-table">
                  <thead><tr><th>Contract</th><th>Type</th><th>Status</th><th>Risk</th><th>Score</th><th /></tr></thead>
                  <tbody>
                    {recent.map((c) => (
                      <tr key={c.id}>
                        <td><Link to={`/contracts/${c.id}`}><b>{c.title || c.filename}</b><div style={{ color: '#94a3b8', fontSize: 11.5 }}>{c.filename}</div></Link></td>
                        <td>{c.contract_type || '—'}</td>
                        <td><span className="dk-pill n">{c.processing_status}</span></td>
                        <td>{c.overall_risk_level ? <span className={`dk-pill ${c.overall_risk_level}`}>{c.overall_risk_level}</span> : '—'}</td>
                        <td>{c.overall_risk_score != null ? `${Math.round(c.overall_risk_score)}/100` : '—'}</td>
                        <td><Link to={`/reports?contractId=${c.id}`} style={{ color: '#f97316', fontWeight: 600 }}>Report →</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
