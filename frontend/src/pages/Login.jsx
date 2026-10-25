import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, Lock, Mail, User, ArrowRight, AlertCircle, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Turns any failed request into a clear, human-readable message (never an object, never a blank guess)
const describeError = (err) => {
  if (!err.response) {
    return 'Cannot reach the backend. Make sure it is running (uvicorn on port 8000), then refresh this page.';
  }
  const { status, data } = err.response;
  const detail = data && data.detail;
  if (typeof detail === 'string') return detail;                       // e.g. "Incorrect email or password."
  if (Array.isArray(detail)) {                                         // validation errors (HTTP 422)
    return detail.map((d) => `${(d.loc || []).slice(1).join('.') || 'input'}: ${d.msg}`).join(' • ');
  }
  if (status >= 500) return `Server error (${status}). Look at the backend terminal window for the error message.`;
  return `Request failed (${status}).`;
};

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseDemo = () => {
    setEmail('test@example.com');
    setPassword('StrongPass123');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      {/* Theme toggle (dark <-> light) */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className="fixed top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:border-orange-400 rounded-lg bg-white transition"
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        <span>Toggle Theme</span>
      </button>

      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
        {/* Brand Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">CogniContract</h1>
          <p className="text-xs text-slate-500">Legal Risk Advisory & Policy Intelligence Platform</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              !isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g., Sarah Connor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="reviewer@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{submitting ? 'Authenticating...' : isRegister ? 'Register & Sign In' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Button */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-2">
          <button
            type="button"
            onClick={handleUseDemo}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
          >
            Fill Demo Credentials (test@example.com)
          </button>
          <div>
            <Link to="/" className="text-[11px] text-slate-500 hover:underline">
              Continue to Dashboard as Guest Reviewer →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
