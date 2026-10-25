import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  UploadCloud,
  RotateCcw,
  MessageSquareCode,
  FileBarChart2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { contractsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (riskFilter) params.risk_level = riskFilter;
      const data = await contractsAPI.list(params);
      setContracts(data);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchContracts();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, riskFilter]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This removes all associated clauses, risks, and vector records.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await contractsAPI.delete(id);
      setNotification(`Deleted "${name}" successfully.`);
      setContracts(contracts.filter((c) => c.id !== id));
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert('Failed to delete contract.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Documents</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage repository contracts, review risk assessments, and trigger re-analysis.
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </Link>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="analyzed">Analyzed</option>
            <option value="extracted">Extracted</option>
            <option value="uploaded">Uploaded</option>
            <option value="failed">Failed</option>
          </select>

          {(search || riskFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setRiskFilter('');
                setStatusFilter('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Contract Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner size="md" text="Loading Contracts..." />
        ) : contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Document Title & Filename</th>
                  <th className="py-3 px-4">Contract Type</th>
                  <th className="py-3 px-4">Pages & Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Risk Advisory</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800 max-w-[220px] truncate" title={c.title || c.filename}>
                            {c.title || c.filename}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{c.filename}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {c.contract_type || 'Commercial Agreement'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.page_count} pg • {(c.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                        {c.processing_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <RiskBadge level={c.overall_risk_level} size="xs" />
                        <span className="text-[10px] text-slate-400">Score: {c.overall_risk_score}/100</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/contracts/${c.id}`}
                          title="View Details & Risk Analysis"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/chat?contractId=${c.id}`}
                          title="Ask RAG Chatbot"
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        >
                          <MessageSquareCode className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/reports?contractId=${c.id}`}
                          title="View 12-Module Report"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <FileBarChart2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id, c.filename)}
                          disabled={deletingId === c.id}
                          title="Delete Contract"
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs">No contracts match your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contracts;
