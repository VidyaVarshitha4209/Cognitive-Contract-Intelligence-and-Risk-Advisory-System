import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, User, LogOut, UploadCloud, Sparkles, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState(null); // real backend status from /api/health

  useEffect(() => {
    api.get('/health').then((r) => setHealth(r.data)).catch(() => setHealth({ status: 'offline' }));
  }, []);

  const online = health && health.status === 'ok';
  const aiMock = health?.ai_provider === 'mock';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Context */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-slate-800 hidden sm:block">
          Cognitive Contract Intelligence & Risk Advisory
        </h2>
        
        {/* Backend status badge (real) */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium ${online ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <Database className="w-3.5 h-3.5" />
          <span>{online ? `Backend online${health.database_type ? ` • ${String(health.database_type).toUpperCase()}` : ''}` : 'Backend offline'}</span>
        </div>

        {/* AI mode badge (real: mock vs. configured provider) */}
        {online && (
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium ${aiMock ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiMock ? 'AI: demo (mock) mode' : `AI: ${health.ai_provider}`}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <Link
          to="/upload"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Contract</span>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 text-xs font-semibold">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <p className="font-semibold text-slate-800 leading-tight">{user?.full_name || 'Legal Reviewer'}</p>
              <p className="text-[10px] text-slate-500 leading-none">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 border border-slate-300 hover:border-blue-400 rounded-lg transition"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}

        {/* Theme toggle (dark <-> light) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 border border-slate-300 hover:border-blue-400 rounded-lg transition"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Toggle Theme</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
