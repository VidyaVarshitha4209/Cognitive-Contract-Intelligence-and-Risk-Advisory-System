import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  RotateCcw,
  Trash2,
  ExternalLink,
  Calendar,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { contractsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const AnalysisHistory = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reanalyzingId, setReanalyzingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await contractsAPI.list({ search });
      setContracts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search]);

  const handleReanalyze = async (id, name) => {
    setReanalyzingId(id);
    try {
      await contractsAPI.reanalyze(id);
      setNotification(`Re-analyzed "${name}" against updated policies.`);
      await fetchHistory();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert('Reanalysis failed.');
    } finally {
      setReanalyzingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}" from audit history?`)) return;
    try {
      await contractsAPI.delete(id);
      setNotification(`Removed "${name}" from analysis history.`);
      setContracts(contracts.filter((c) => c.id !== id));
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Analysis Audit History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of processed contracts, historical risk assessments, and policy re-evaluation logs.
          </p>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail by contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner size="md" text="Loading Audit Trail..." />
        ) : contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Contract Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Historical Risk Level</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Last Evaluated Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate max-w-[220px]" title={c.filename}>
                        {c.filename}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.contract_type || 'Commercial'}</td>
                    <td className="py-3 px-4">
                      <RiskBadge level={c.overall_risk_level} size="xs" />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{c.overall_risk_score} / 100</td>
                    <td className="py-3 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(c.updated_at || c.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReanalyze(c.id, c.filename)}
                          disabled={reanalyzingId === c.id}
                          title="Re-run Analysis Against Current Policies"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${reanalyzingId === c.id ? 'animate-spin' : ''}`} />
                        </button>
                        <Link
                          to={`/contracts/${c.id}`}
                          title="View Analysis Record"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id, c.filename)}
                          title="Delete Record"
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs">No analysis history recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisHistory;
