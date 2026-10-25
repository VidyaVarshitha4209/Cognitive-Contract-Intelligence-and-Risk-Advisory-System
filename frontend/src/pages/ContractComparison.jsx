import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  ArrowRight,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Download,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { contractsAPI, compareAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ContractComparison = () => {
  const [contracts, setContracts] = useState([]);
  const [contractAId, setContractAId] = useState('');
  const [contractBId, setContractBId] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const data = await contractsAPI.list();
        setContracts(data);
        if (data.length >= 2) {
          setContractAId(data[0].id);
          setContractBId(data[1].id);
        } else if (data.length === 1) {
          setContractAId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching contracts for comparison:', err);
      } finally {
        setLoadingList(false);
      }
    };
    loadContracts();
  }, []);

  const handleCompare = async () => {
    if (!contractAId || !contractBId) {
      alert('Please select two contracts to compare.');
      return;
    }
    if (contractAId === contractBId) {
      alert('Please choose two different contracts.');
      return;
    }

    setComparing(true);
    setError(null);
    try {
      const result = await compareAPI.compare(contractAId, contractBId);
      setComparisonResult(result);
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.response?.data?.detail || 'Failed to compare contracts.');
    } finally {
      setComparing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loadingList) return <LoadingSpinner size="md" text="Loading Contracts for Comparison..." />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Comparison & Variance Analysis</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conduct side-by-side clause discrepancy analysis, missing term detection, and policy risk evaluation.
          </p>
        </div>

        {comparisonResult && (
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export / Print Comparison</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Contract Selectors Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Contracts to Compare</h3>

        {contracts.length < 2 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-2">
            <p className="font-semibold">At least two contracts are required for comparison.</p>
            <p>You currently have {contracts.length} contract(s) uploaded. Please upload a second contract.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            {/* Contract A */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-xs font-semibold text-blue-700">Contract A (Baseline / Primary)</label>
              <select
                value={contractAId}
                onChange={(e) => setContractAId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === contractBId}>
                    {c.filename} ({c.overall_risk_level} Risk)
                  </option>
                ))}
              </select>
            </div>

            {/* Vs Badge */}
            <div className="md:col-span-1 text-center flex justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                VS
              </div>
            </div>

            {/* Contract B */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-xs font-semibold text-indigo-700">Contract B (Counterparty / New Version)</label>
              <select
                value={contractBId}
                onChange={(e) => setContractBId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === contractAId}>
                    {c.filename} ({c.overall_risk_level} Risk)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {contracts.length >= 2 && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              <GitCompare className={`w-4 h-4 ${comparing ? 'animate-spin' : ''}`} />
              <span>{comparing ? 'Analyzing Discrepancies...' : 'Run Side-by-Side Comparison'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Scale className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">1. Executive Comparison Summary</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
              {comparisonResult.executive_summary}
            </p>

            {/* Policy & Risk Metric Contrast */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {comparisonResult.policy_compliance_comparison?.map((comp, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]" title={comp.contract}>
                      {comp.contract}
                    </span>
                    <RiskBadge level={comp.overall_risk_level} size="xs" />
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Overall Risk Score: <b>{comp.overall_risk_score} / 100</b></p>
                    <p>Violations / High Concerns: <b>{comp.high_risks} High</b>, {comp.medium_risks} Medium, {comp.low_risks} Low</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Similarities & Differences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Key Similarities</span>
                </span>
                <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                  {comparisonResult.key_similarities?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                  {(!comparisonResult.key_similarities || comparisonResult.key_similarities.length === 0) && (
                    <li className="text-slate-400">No substantial identical clauses identified.</li>
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Key Differences & Discrepancies</span>
                </span>
                <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                  {comparisonResult.key_differences?.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                  {(!comparisonResult.key_differences || comparisonResult.key_differences.length === 0) && (
                    <li className="text-slate-400">Contracts share aligned terms.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Missing Clauses Notice */}
          {comparisonResult.missing_clauses?.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Missing Clauses Identified ({comparisonResult.missing_clauses.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {comparisonResult.missing_clauses.map((m, i) => (
                  <div key={i} className="p-2 bg-white rounded-lg border border-red-100">
                    <span className="font-semibold text-red-900">{m.clause}</span>: Missing in <b>{m.missing_in}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-Side Clause Inspection Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Side-by-Side Clause Analysis Table</h3>
                <p className="text-xs text-slate-500">Detailed line-item comparison by clause category.</p>
              </div>
            </div>

            <div className="space-y-4">
              {comparisonResult.clause_comparisons?.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{item.label}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-500">({item.category})</span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Variance: {item.risk_assessment}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    {/* Contract A column */}
                    <div className="p-4 space-y-1 bg-white">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">{comparisonResult.contract_a_name}</span>
                      <p className="text-xs text-slate-700 font-serif leading-relaxed whitespace-pre-wrap">
                        {item.contract_a_clause}
                      </p>
                    </div>

                    {/* Contract B column */}
                    <div className="p-4 space-y-1 bg-slate-50/40">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase">{comparisonResult.contract_b_name}</span>
                      <p className="text-xs text-slate-700 font-serif leading-relaxed whitespace-pre-wrap">
                        {item.contract_b_clause}
                      </p>
                    </div>
                  </div>

                  {/* Impact and Difference notes */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-xs space-y-1">
                    <p><b className="text-slate-700">Observed Difference:</b> <span className="text-slate-600">{item.main_difference}</span></p>
                    <p><b className="text-slate-700">Potential Commercial Impact:</b> <span className="text-slate-600">{item.potential_impact}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractComparison;
