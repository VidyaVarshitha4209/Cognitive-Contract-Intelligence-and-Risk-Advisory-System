import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  Plus,
  RotateCcw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Save,
  X
} from 'lucide-react';
import { policiesAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CATEGORIES = [
  { value: 'liability', label: 'Liability & Indemnification' },
  { value: 'termination', label: 'Termination & Cancellation' },
  { value: 'payment', label: 'Payment Terms & Invoicing' },
  { value: 'confidentiality', label: 'Confidentiality & NDA' },
  { value: 'renewal', label: 'Renewal & Extension' },
  { value: 'governing_law', label: 'Governing Law & Dispute Resolution' },
  { value: 'data_protection', label: 'Data Protection & Security' },
  { value: 'intellectual_property', label: 'Intellectual Property' },
  { value: 'penalties', label: 'Penalties & Late Fees' },
];

const CompanyPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'liability',
    description: '',
    expected_condition: '',
    severity: 'Medium',
    numeric_threshold: '',
    is_active: true,
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await policiesAPI.list();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
      setError('Failed to load company policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormData({
      name: '',
      category: 'liability',
      description: '',
      expected_condition: '',
      severity: 'Medium',
      numeric_threshold: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPolicy(p);
    setFormData({
      name: p.name,
      category: p.category,
      description: p.description || '',
      expected_condition: p.expected_condition || '',
      severity: p.severity,
      numeric_threshold: p.numeric_threshold !== null && p.numeric_threshold !== undefined ? p.numeric_threshold : '',
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.expected_condition.trim()) {
      alert('Please fill out the policy name and expected condition.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        numeric_threshold: formData.numeric_threshold ? parseFloat(formData.numeric_threshold) : null,
      };

      if (editingPolicy) {
        await policiesAPI.update(editingPolicy.id, payload);
        setSuccessMsg(`Policy "${formData.name}" updated successfully.`);
      } else {
        await policiesAPI.create(payload);
        setSuccessMsg(`New policy "${formData.name}" created successfully.`);
      }

      setModalOpen(false);
      fetchPolicies();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      alert('Failed to save policy: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete policy "${name}"?`)) return;
    try {
      await policiesAPI.delete(id);
      setSuccessMsg(`Policy "${name}" deleted.`);
      setPolicies(policies.filter((p) => p.id !== id));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert('Failed to delete policy.');
    }
  };

  const handleToggleActive = async (policy) => {
    try {
      await policiesAPI.update(policy.id, { is_active: !policy.is_active });
      setPolicies(policies.map((p) => (p.id === policy.id ? { ...p, is_active: !p.is_active } : p)));
    } catch (err) {
      alert('Failed to toggle status.');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all policies back to standard demonstration baseline policies?')) return;
    setLoading(true);
    try {
      const data = await policiesAPI.resetDefaults();
      setPolicies(data);
      setSuccessMsg('Policies reset to standard baseline defaults.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert('Failed to reset defaults.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Company Policy Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure acceptable legal thresholds and organizational risk tolerance rules for contract comparison.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Policy</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          <b>Risk Engine Advisory:</b> When a contract is analyzed, each clause category is compared against active policies below. Mismatches trigger non-compliant or needs-review risk findings and feed into the 5-part AI explanation generator.
        </p>
      </div>

      {/* Policies Grid */}
      {loading ? (
        <LoadingSpinner size="md" text="Loading Company Policies..." />
      ) : policies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border p-5 shadow-sm space-y-3 transition ${
                p.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={p.severity} size="xs" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {p.category.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(p)}
                    title={p.is_active ? 'Deactivate policy' : 'Activate policy'}
                    className={`p-1.5 rounded-lg text-xs font-medium transition ${
                      p.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {p.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(p)}
                    title="Edit policy"
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    title="Delete policy"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Expected Condition / Rule:</span>
                <p className="font-semibold text-slate-800">{p.expected_condition}</p>
              </div>

              {p.description && (
                <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
              )}

              {p.numeric_threshold !== null && p.numeric_threshold !== undefined && (
                <div className="text-[11px] text-blue-700 font-medium">
                  Numeric Threshold: <b>{p.numeric_threshold}</b>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl text-center text-slate-400 space-y-2 border border-slate-200">
          <BookOpenCheck className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-xs">No policies defined yet.</p>
          <button onClick={handleResetDefaults} className="text-xs font-semibold text-blue-600 hover:underline">
            Load default demonstration policies
          </button>
        </div>
      )}

      {/* Create / Edit Policy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingPolicy ? 'Edit Company Policy' : 'Create New Company Policy'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Liability Cap Limitation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clause Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Risk Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="High">High Severity</option>
                    <option value="Medium">Medium Severity</option>
                    <option value="Low">Low Severity</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected Condition / Rule</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Maximum liability capped at $500,000 or 1x contract fees"
                  value={formData.expected_condition}
                  onChange={(e) => setFormData({ ...formData, expected_condition: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Legal Context</label>
                <textarea
                  rows={3}
                  placeholder="Provide guidance on why this rule exists and acceptable fallback positions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Numeric Threshold (optional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 30 (days) or 500000 ($)"
                    value={formData.numeric_threshold}
                    onChange={(e) => setFormData({ ...formData, numeric_threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="font-semibold text-slate-700 text-xs">Active Rule</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving...' : 'Save Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPolicies;
