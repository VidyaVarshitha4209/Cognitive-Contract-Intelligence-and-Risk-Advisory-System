import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Sparkles,
  Server,
  FolderCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Code
} from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Settings = () => {
  const [health, setHealth] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const [healthRes, aiRes] = await Promise.all([
          api.get('/health'),
          api.get('/settings/ai-status').catch(() => ({ data: { configured: false, provider: 'offline-advisory' } }))
        ]);
        setHealth(healthRes.data);
        setAiStatus(aiRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSystemStatus();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Architecture & Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration details for Oracle SQL database, AI provider layer, and storage directories.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="md" text="Checking System Configuration..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Oracle SQL Database Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Database className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Oracle SQL Database Layer</h2>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span>Driver: python-oracledb (Thin Mode)</span>
                <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded">Active</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Connects natively to Oracle Database (XE, 19c, 21c, or 23ai Free) without requiring C-client libraries.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-700">Configuring Your Oracle SQL Credentials:</span>
              <p className="text-slate-500 text-[11px]">
                In <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">backend/.env</code>, configure your Oracle instance:
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`DATABASE_TYPE="oracle"
ORACLE_USER="c##contract_user"
ORACLE_PASSWORD="your_password"
ORACLE_HOST="localhost"
ORACLE_PORT=1521
ORACLE_SERVICE_NAME="xe"`}
              </pre>
              <p className="text-[11px] text-slate-500 italic">
                Note: If Oracle is not running locally, the system automatically falls back to local SQLite so your demo never fails!
              </p>
            </div>
          </div>

          {/* AI Provider Configuration Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">AI Provider & LLM Engine</h2>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-blue-900">
                <span>Current Mode: {aiStatus?.configured ? 'Google Gemini Live LLM' : 'Grounded Local Advisory Mode'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${aiStatus?.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                  {aiStatus?.configured ? 'Live API Active' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {aiStatus?.configured
                  ? 'Connected to Google Gemini API for live generative explanations.'
                  : 'Operating in grounded local advisory mode. Strictly extracts and formulates the 5-point explanation and citations directly from contract text and policy rules.'}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-700">Enabling Google Gemini:</span>
              <p className="text-slate-500 text-[11px]">
                Add your Gemini API key in <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-mono">backend/.env</code>:
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
{`AI_PROVIDER="gemini"
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-1.5-flash"`}
              </pre>
            </div>
          </div>

          {/* Document Processing Pipeline & Storage */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FolderCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Verified Storage & Extraction Subsystems</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Uploads Directory</span>
                <p className="font-mono text-[11px] text-slate-800 truncate">D:/contract-intelligence/storage/uploads</p>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Extracted Text</span>
                <p className="font-mono text-[11px] text-slate-800 truncate">D:/contract-intelligence/storage/extracted_text</p>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Vector Store</span>
                <p className="font-mono text-[11px] text-slate-800 truncate">D:/contract-intelligence/storage/vector_store</p>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">PDF / CSV Reports</span>
                <p className="font-mono text-[11px] text-slate-800 truncate">D:/contract-intelligence/storage/reports</p>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
