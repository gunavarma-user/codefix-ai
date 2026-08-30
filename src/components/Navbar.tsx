import React from 'react';
import { Sparkles, Code2, History, LayoutDashboard, User as UserIcon, LogOut, Terminal, BookOpen } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: 'landing' | 'analyze' | 'examples' | 'history' | 'dashboard';
  setActiveTab: (tab: 'landing' | 'analyze' | 'examples' | 'history' | 'dashboard') => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0B0F1A]/95 backdrop-blur-md border-b border-slate-800/90 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => setActiveTab('landing')}
          className="flex items-center space-x-2.5 group select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
          id="nav-brand-logo"
          aria-label="CodeFix AI Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-sm shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-200">
            <div className="w-full h-full bg-[#0F172A] rounded-[7px] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-emerald-400 group-hover:scale-105 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base text-slate-100 tracking-tight">CodeFix<span className="text-emerald-400">.AI</span></span>
              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block leading-none">AI Code Error Analyzer</p>
          </div>
        </button>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#0F172A] p-1 rounded-xl border border-slate-800/90 shadow-inner" aria-label="Main Navigation">
          <button
            id="nav-tab-landing"
            onClick={() => setActiveTab('landing')}
            aria-current={activeTab === 'landing' ? 'page' : undefined}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'landing'
                ? 'bg-slate-800 text-slate-100 shadow-xs border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Home
          </button>
          <button
            id="nav-tab-analyze"
            onClick={() => setActiveTab('analyze')}
            aria-current={activeTab === 'analyze' ? 'page' : undefined}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'analyze'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analyzer</span>
          </button>
          <button
            id="nav-tab-examples"
            onClick={() => setActiveTab('examples')}
            aria-current={activeTab === 'examples' ? 'page' : undefined}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'examples'
                ? 'bg-slate-800 text-slate-100 shadow-xs border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>Examples</span>
          </button>
          <button
            id="nav-tab-history"
            onClick={() => setActiveTab('history')}
            aria-current={activeTab === 'history' ? 'page' : undefined}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-slate-100 shadow-xs border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>History</span>
          </button>
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-slate-100 shadow-xs border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dashboard</span>
          </button>
        </nav>

        {/* Right side controls (Profile / Auth) */}
        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2 bg-[#0F172A] border border-slate-800/90 px-2.5 py-1.5 rounded-xl shadow-xs">
              <div 
                className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[11px]"
                title={`Logged in as ${user.username}`}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-200 font-mono hidden sm:inline max-w-[120px] truncate">
                {user.username}
              </span>
              <button
                id="btn-logout"
                onClick={onLogout}
                title="Log Out"
                aria-label="Log Out"
                className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-auth"
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700/80 transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden border-t border-slate-800/90 bg-[#0F172A] px-1 py-1.5 justify-around text-xs" aria-label="Mobile Navigation">
        <button
          onClick={() => setActiveTab('landing')}
          aria-current={activeTab === 'landing' ? 'page' : undefined}
          className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'landing' 
              ? 'text-emerald-300 bg-slate-800 border border-slate-700/60' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setActiveTab('analyze')}
          aria-current={activeTab === 'analyze' ? 'page' : undefined}
          className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'analyze' 
              ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Analyzer
        </button>
        <button
          onClick={() => setActiveTab('examples')}
          aria-current={activeTab === 'examples' ? 'page' : undefined}
          className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'examples' 
              ? 'text-emerald-300 bg-slate-800 border border-slate-700/60' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Examples
        </button>
        <button
          onClick={() => setActiveTab('history')}
          aria-current={activeTab === 'history' ? 'page' : undefined}
          className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'history' 
              ? 'text-emerald-300 bg-slate-800 border border-slate-700/60' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'dashboard' 
              ? 'text-emerald-300 bg-slate-800 border border-slate-700/60' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Dashboard
        </button>
      </div>
    </header>
  );
};
