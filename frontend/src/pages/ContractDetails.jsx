import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  RotateCcw,
  MessageSquareCode,
  FileBarChart2,
  Calendar,
  DollarSign,
  ShieldAlert,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  BookOpen
} from 'lucide-react';
import { contractsAPI, risksAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReportView from '../components/report/ReportView';

const ContractDetails = () => {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [risks, setRisks] = useState([]);
  const [activeTab, setActiveTab] = useState('clauses'); // 'clauses', 'risks', 'policies', 'raw_text'
  const [selectedClause, setSelectedClause] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [view, setView] = useState('report'); // 'report' (default) or 'details' (clauses, risks, policy matrix, text)
  const [reportKey, setReportKey] = useState(0); // changes after re-analysis so the report reloads

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractData, risksData] = await Promise.all([
        contractsAPI.getById(id),
        risksAPI.getByContract(id),
      ]);
      setContract(contractData);
      setRisks(risksData);
      if (contractData.clauses && contractData.clauses.length > 0) {
        setSelectedClause(contractData.clauses[0]);
      }
    } catch (err) {
      console.error('Failed to load contract details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await contractsAPI.reanalyze(id);
      await fetchData();
      setReportKey((k) => k + 1);
    } catch (err) {
      alert('Failed to reanalyze contract.');
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading Contract Intelligence..." />;
  if (!contract) return <div className="p-8 text-center text-slate-500">Contract not found.</div>;

  const getClauseRiskStyle = (level) => {
    const l = (level || 'none').toLowerCase();
    if (l === 'high') return 'border-red-400 bg-red-50/40 text-red-950';
    if (l === 'medium') return 'border-amber-400 bg-amber-50/40 text-amber-950';
    if (l === 'low') return 'border-emerald-300 bg-emerald-50/30 text-emerald-950';
    return 'border-slate-200 bg-white text-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {contract.contract_type || 'Commercial Agreement'}
              </span>
              <RiskBadge level={contract.overall_risk_level} size="xs" />
              <span className="text-xs text-slate-400">Score: {contract.overall_risk_score} / 100</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight" title={contract.filename}>
              {contract.title || contract.filename}
            </h1>
            <p className="text-xs text-slate-500">Parties: <b>{contract.parties || 'Unspecified'}</b></p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
              <span>{reanalyzing ? 'Reanalyzing...' : 'Re-Run Risk Engine'}</span>
            </button>

            <Link
              to={`/chat?contractId=${contract.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <MessageSquareCode className="w-3.5 h-3.5" />
              <span>Ask AI Chatbot</span>
            </Link>

            <button
              onClick={() => setView('report')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                view === 'report' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FileBarChart2 className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>

            <button
              onClick={() => setView('details')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                view === 'details' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Clauses &amp; Extracted Text</span>
            </button>
          </div>
        </div>

        {/* Structured Key Entities Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium">Effective Date</span>
            <p className="font-semibold text-slate-800 mt-0.5">{contract.effective_date || 'Not found'}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium">Expiration / Term</span>
            <p className="font-semibold text-slate-800 mt-0.5">{contract.expiration_date || 'Not found'}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium">Payment Terms</span>
            <p className="font-semibold text-slate-800 mt-0.5 truncate" title={contract.payment_terms_summary}>
              {contract.payment_terms_summary || 'Not found'}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium">Governing Law</span>
            <p className="font-semibold text-slate-800 mt-0.5 truncate" title={contract.governing_law}>
              {contract.governing_law || 'Not found'}
            </p>
          </div>
        </div>
      </div>

      {/* Default view: the 12-section report */}
      {view === 'report' && <ReportView key={`${id}-${reportKey}`} contractId={id} embedded />}

      {/* Button view: the four original sections */}
      {view === 'details' && (
        <>
      {/* Interactive Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('clauses')}
          className={`pb-3 transition relative ${
            activeTab === 'clauses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Segmented Clauses & Highlighting ({contract.clauses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('risks')}
          className={`pb-3 transition relative flex items-center gap-1.5 ${
            activeTab === 'risks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Detected Risks & 5-Point Explanations</span>
          {risks.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px]">
              {risks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 transition relative ${
            activeTab === 'policies' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Policy Compliance Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('raw_text')}
          className={`pb-3 transition relative ${
            activeTab === 'raw_text' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Full Extracted Document Text</span>
        </button>
      </div>

      {/* Tab 1: Segmented Clauses & Highlighting */}
      {activeTab === 'clauses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-2 max-h-[650px] overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-slate-500 mb-2">Click any clause to inspect full text & risk level:</p>
            {contract.clauses?.map((clause, idx) => (
              <div
                key={clause.id || idx}
                onClick={() => setSelectedClause(clause)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selectedClause?.id === clause.id
                    ? 'ring-2 ring-blue-500 border-transparent shadow-sm'
                    : 'hover:border-slate-300'
                } ${getClauseRiskStyle(clause.risk_level)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70 border border-slate-200">
                    {clause.category.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500">Page {clause.page_number}</span>
                </div>
                <h4 className="text-xs font-bold truncate">{clause.clause_title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {clause.clause_text}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <RiskBadge level={clause.risk_level} size="xs" />
                  <span className="text-[10px] text-slate-400">Confidence: {(clause.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            {selectedClause ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {selectedClause.category.replace('_', ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedClause.clause_title}</h3>
                  </div>
                  <RiskBadge level={selectedClause.risk_level} size="sm" />
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-1.5">Original Clause Text (Page {selectedClause.page_number}):</h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-serif whitespace-pre-wrap">
                    {selectedClause.clause_text}
                  </div>
                </div>

                {risks.filter((r) => r.clause_id === selectedClause.id).length > 0 && (
                  <div className="mt-4 p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Identified Policy Risk in this Clause:</span>
                    </div>
                    {risks
                      .filter((r) => r.clause_id === selectedClause.id)
                      .map((r, i) => (
                        <div key={i} className="text-xs text-slate-800 space-y-1">
                          <p><b>Policy Rule:</b> {r.matched_policy_rule}</p>
                          <p><b>Mismatch:</b> {r.mismatch_reason}</p>
                          <p className="text-blue-700"><b>Suggested Action:</b> {r.suggested_action}</p>
                        </div>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-24 text-center text-slate-400 text-xs">Select a clause to read full contents.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Detected Risks & 5-Point Explanations */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          {risks.length > 0 ? (
            risks.map((risk, index) => (
              <div key={risk.id || index} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={risk.risk_level} size="xs" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {risk.category.replace('_', ' ')} • Page {risk.source_page}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{risk.risk_title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                    Status: {risk.compliance_status}
                  </span>
                </div>

                {risk.ai_explanation && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>5-Point Cognitive Risk Advisory Assessment:</span>
                    </div>
                    <div className="text-slate-800 whitespace-pre-wrap font-sans leading-relaxed text-[11px] bg-white p-3 rounded-lg border border-slate-100">
                      {risk.ai_explanation}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Original Clause Excerpt</span>
                    <p className="mt-1 text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                      "{risk.original_clause_text?.slice(0, 250)}..."
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Recommended Negotiating Action</span>
                    <p className="mt-1 text-blue-800 font-medium bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-[11px]">
                      {risk.suggested_action}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-xl text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="font-semibold text-sm">No Non-Compliant Policy Violations Detected</p>
              <p className="text-xs text-slate-400">All evaluated contract clauses satisfy active company rules.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Policy Compliance Matrix */}
      {activeTab === 'policies' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Company Policy Verification Matrix</h3>
            <p className="text-xs text-slate-500">Evaluates whether each active corporate governance standard is satisfied.</p>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Standard Policy Rule</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4">Risk Severity</th>
                <th className="py-3 px-4">Contract Finding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {risks.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.matched_policy_rule || r.risk_title}</td>
                  <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">{r.category}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.compliance_status === 'Compliant'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.compliance_status === 'Non-compliant'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.compliance_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <RiskBadge level={r.risk_level} size="xs" />
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={r.mismatch_reason}>
                    {r.mismatch_reason || 'Conforms to policy'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Raw Extracted Document Text */}
      {activeTab === 'raw_text' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Extracted Document Text</h3>
              <p className="text-xs text-slate-500">Extracted via PyMuPDF with page marker separation.</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(contract.extracted_text || '')}
              className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
            >
              Copy Text
            </button>
          </div>
          <pre className="p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-[600px] overflow-y-auto leading-relaxed border border-slate-200">
            {contract.extracted_text || 'No extracted text available.'}
          </pre>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default ContractDetails;
