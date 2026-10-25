import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { contractsAPI, risksAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const RiskAnalysis = () => {
  const [contracts, setContracts] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const data = await contractsAPI.list();
        setContracts(data);
        if (data.length > 0) {
          setSelectedContractId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  useEffect(() => {
    if (!selectedContractId) return;

    const loadRisks = async () => {
      setLoading(true);
      try {
        const data = await risksAPI.getByContract(selectedContractId);
        setRisks(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadRisks();
  }, [selectedContractId]);

  const handleReanalyze = async () => {
    if (!selectedContractId) return;
    setReanalyzing(true);
    try {
      await risksAPI.analyzeContract(selectedContractId);
      const data = await risksAPI.getByContract(selectedContractId);
      setRisks(data);
    } catch (err) {
      alert('Re-analysis failed.');
    } finally {
      setReanalyzing(false);
    }
  };

  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Risk Advisory & Policy Audit</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify high-exposure clauses, corporate policy deviations, and AI-grounded mitigating actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 max-w-[240px] truncate"
          >
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.filename}
              </option>
            ))}
          </select>

          {selectedContractId && (
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
              <span>{reanalyzing ? 'Evaluating...' : 'Re-Run Policy Rules'}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Evaluating Contract Risk Profile..." />
      ) : selectedContract ? (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RiskBadge level={selectedContract.overall_risk_level} size="xs" />
                <span className="text-xs font-bold text-slate-500">Risk Score: {selectedContract.overall_risk_score} / 100</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{selectedContract.title || selectedContract.filename}</h2>
              <p className="text-xs text-slate-500">
                Identified: <b>{selectedContract.high_risk_count} High</b>, {selectedContract.medium_risk_count} Medium, {selectedContract.low_risk_count} Low risks
              </p>
            </div>

            <Link
              to={`/contracts/${selectedContract.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              <span>Inspect Full Clauses</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Risk Cards */}
          <div className="space-y-4">
            {risks.length > 0 ? (
              risks.map((risk, index) => (
                <div key={risk.id || index} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={risk.risk_level} size="xs" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                          {risk.category.replace('_', ' ')} • Page {risk.source_page}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{risk.risk_title}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                      {risk.compliance_status}
                    </span>
                  </div>

                  {/* 5-Point AI Risk Explanation Box */}
                  {risk.ai_explanation && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold">
                        <Sparkles className="w-4 h-4" />
                        <span>5-Point Cognitive Advisory Assessment:</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {risk.ai_explanation}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Policy Standard Rule</span>
                      <p className="font-semibold text-slate-800">{risk.matched_policy_rule}</p>
                    </div>
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">Recommended Reviewer Action</span>
                      <p className="font-semibold text-blue-900">{risk.suggested_action}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                <p className="text-xs font-bold text-slate-700">No policy violations detected for this contract.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs">No contracts available for risk analysis. Please upload a contract first.</p>
        </div>
      )}
    </div>
  );
};

export default RiskAnalysis;
