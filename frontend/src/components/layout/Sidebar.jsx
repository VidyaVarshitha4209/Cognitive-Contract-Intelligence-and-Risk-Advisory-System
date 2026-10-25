import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  ShieldAlert,
  BookOpenCheck,
  GitCompare,
  MessageSquareCode,
  FileBarChart2,
  History,
  Settings
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Contracts', path: '/contracts', icon: FileText },
  { name: 'Upload Contract', path: '/upload', icon: UploadCloud },
  { name: 'Risk Analysis', path: '/risks', icon: ShieldAlert },
  { name: 'Company Policies', path: '/policies', icon: BookOpenCheck },
  { name: 'Contract Comparison', path: '/compare', icon: GitCompare },
  { name: 'AI Contract Chatbot', path: '/chat', icon: MessageSquareCode },
  { name: 'Reports', path: '/reports', icon: FileBarChart2 },
  { name: 'Analysis History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-black font-extrabold text-lg shadow-md shadow-orange-500/20">
          C
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white leading-tight">CogniContract</h1>
          <p className="text-[10px] font-medium text-slate-400">Contract Intelligence</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Core Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-medium text-slate-200">System Ready</span>
          </div>
          <p className="text-[10px] text-slate-400">Final-Year B.Tech Project</p>
          <p className="text-[10px] text-blue-400 font-mono mt-0.5">React • FastAPI • RAG</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
