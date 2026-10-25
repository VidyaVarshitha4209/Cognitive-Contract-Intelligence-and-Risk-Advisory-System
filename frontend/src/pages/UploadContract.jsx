import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { contractsAPI } from '../services/api';

const UploadContract = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    const validExtensions = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.txt'];
    const fileName = selectedFile.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt) {
      setError('Unsupported file type. Please upload a PDF, DOCX, PNG, JPG, or TXT contract document.');
      return;
    }

    // 25 MB limit
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25 MB maximum limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(15);
    setCurrentStep('Saving document and verifying file integrity...');
    setError(null);

    try {
      setTimeout(() => {
        setProgress(45);
        setCurrentStep('Running PyMuPDF digital text and OCR extraction pipeline...');
      }, 600);

      setTimeout(() => {
        setProgress(70);
        setCurrentStep('Segmenting legal clauses and extracting entities...');
      }, 1400);

      setTimeout(() => {
        setProgress(90);
        setCurrentStep('Building RAG vector store and evaluating policy risks...');
      }, 2200);

      const contractDetail = await contractsAPI.upload(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 30) / progressEvent.total);
          setProgress(percent);
        }
      });

      setProgress(100);
      setCurrentStep('Analysis complete!');
      setResult(contractDetail);
    } catch (err) {
      console.error('Upload failed:', err);
      const detailMsg = err.response?.data?.detail || err.message || 'Processing failed.';
      setError(`Failed to process contract: ${detailMsg}`);
    } finally {
      setUploading(false);
    }
  };

  // Sample contract loader for demo
  const handleLoadSample = async (sampleType) => {
    try {
      const fileName = sampleType === 'vendor' ? 'sample_vendor_agreement.txt' : 'sample_safe_nda.txt';
      const sampleText = sampleType === 'vendor' ? `MASTER SERVICES AND VENDOR AGREEMENT
This Agreement is between Apex Global Solutions Inc. and CloudMatrix Technologies LLC as of January 15, 2026.
1. Payment Terms
Client shall pay all fees within Net 60 days. Late penalty of 2% per month applies.
2. Termination
Either party may terminate upon seven (7) business days prior written notice.
3. Automatic Renewal
This agreement automatically renews for successive 1-year terms without written notice.
4. Limitation of Liability and Indemnification
Neither party's liability shall be capped. The parties agree to unlimited liability for all damages. Client shall indemnify Vendor without limitation.
5. Confidentiality
Confidentiality obligations shall survive for a period of one (1) year following termination.
6. Governing Law
This Agreement is governed by New York State law.` : `MUTUAL NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT
This Agreement is between Apex Global Solutions Inc. and Horizon Dynamics Corp. dated February 1, 2026.
1. Definition of Confidential Information
Confidential information includes proprietary, technical, and commercial secrets.
2. Term and Survival
Confidentiality survives for five (5) years following termination.
3. Termination
Either party may terminate with forty-five (45) days prior written notice.
4. Limitation of Liability
Total liability capped at $100,000 USD. No consequential damages.
5. Governing Law
Governed by Delaware law.`;

      const blob = new Blob([sampleText], { type: 'text/plain' });
      const sampleFile = new File([blob], fileName, { type: 'text/plain' });
      validateAndSetFile(sampleFile);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Upload Contract for Cognitive Analysis</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit contracts in PDF, Word (DOCX), Scanned Document, or Image formats for automated risk evaluation.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            file
              ? 'border-blue-500 bg-blue-50/30'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
            onChange={handleFileChange}
          />

          <div className="w-14 h-14 mx-auto rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            {file ? file.name : 'Click to select or drag and drop your contract file'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports Digital PDF, DOCX, Scanned PDF/Images (PNG, JPG, TIFF), TXT (up to 25 MB)
          </p>

          {file && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-xs font-medium">
              <FileText className="w-4 h-4" />
              <span>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
        </div>

        {/* Quick Demo Pre-load buttons */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Fast College Demo: Try Sample Test Contracts</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleLoadSample('vendor')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-medium border border-red-200 transition"
            >
              Load Sample Vendor Agreement (Contains High Liability & Notice Risk)
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('nda')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium border border-emerald-200 transition"
            >
              Load Sample Compliant NDA
            </button>
          </div>
        </div>

        {/* Upload Action Button & Progress */}
        {uploading && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                <span>{currentStep}</span>
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Trigger Button */}
        {!uploading && !result && (
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Start Extraction & Risk Analysis</span>
            </button>
          </div>
        )}

        {/* Upload Completion Banner */}
        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Document successfully extracted and analyzed!</span>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <p><b>Extracted Clauses:</b> {result.clauses?.length || 0} sections categorized</p>
              <p><b>Risk Score:</b> {result.overall_risk_score}/100 ({result.overall_risk_level} Risk)</p>
              <p><b>Contract Type:</b> {result.contract_type || 'Commercial'}</p>
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => navigate(`/contracts/${result.id}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>Inspect Clauses & Risk Breakdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => navigate(`/chat?contractId=${result.id}`)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>Ask AI Contract Chatbot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advisory Legal Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-500 text-[11px] flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <b>Advisory Notice:</b> This cognitive intelligence system is designed to accelerate contract review and detect potential organizational policy variances. It does not replace formal legal counsel. Always review original contract language before final execution.
        </p>
      </div>
    </div>
  );
};

export default UploadContract;
