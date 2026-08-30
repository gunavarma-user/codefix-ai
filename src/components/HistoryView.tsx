import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  Trash2, 
  ExternalLink, 
  Filter, 
  Calendar, 
  Code2, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { AnalysisResult, SupportedLanguage, User } from '../types';
import { safeApiFetch } from '../lib/api';

interface HistoryViewProps {
  user: User | null;
  onOpenInEditor: (item: AnalysisResult) => void;
  onRequireAuth: () => void;
  onNavigateToAnalyzer?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  user,
  onOpenInEditor,
  onRequireAuth,
  onNavigateToAnalyzer
}) => {
  const [historyItems, setHistoryItems] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [selectedErrorType, setSelectedErrorType] = useState<string>('all');

  const fetchHistory = async () => {
    if (!user) {
      setHistoryItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLang !== 'all') params.append('language', selectedLang);
      if (selectedErrorType !== 'all') params.append('error_type', selectedErrorType);
      if (search.trim()) params.append('search', search.trim());

      const data = await safeApiFetch<AnalysisResult[]>(`/api/history?${params.toString()}`);
      setHistoryItems(data);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, selectedLang, selectedErrorType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await safeApiFetch<{ message: string }>(`/api/history/${id}`, {
        method: 'DELETE'
      });
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error('Failed to delete history item', e);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <HistoryIcon className="w-7 h-7" />
          </div>
          
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
              Personal Analysis History
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sign in to securely store your code analyses, track your bug-fixing history, and review previous solutions anytime.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onRequireAuth}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-md shadow-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            >
              Sign In or Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 shadow-md">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold uppercase mb-1">
            <HistoryIcon className="w-3 h-3" />
            <span>Personal Analysis History</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            {user.name || user.username}'s Code Logs
          </h1>
          <p className="text-slate-300 text-xs mt-0.5">
            Review your past debugging reports, reopen them in the editor, or delete entries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchHistory}
            aria-label="Refresh history"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-2.5 shadow-md">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, error, or explanation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0B0F1A] border border-slate-700/80 text-xs rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 font-sans"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Search
          </button>
        </form>

        {/* Dropdowns */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Language filter */}
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="bg-[#0B0F1A] border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
          >
            <option value="all">All Languages</option>
            <option value="python">Python</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>

          {/* Error type filter */}
          <select
            value={selectedErrorType}
            onChange={(e) => setSelectedErrorType(e.target.value)}
            className="bg-[#0B0F1A] border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">All Error Types</option>
            <option value="Syntax Error">Syntax Error</option>
            <option value="Runtime Error">Runtime Error</option>
            <option value="Logical Error">Logical Error</option>
            <option value="Type Error">Type Error</option>
            <option value="Index Error">Index Error</option>
            <option value="Name Error">Name Error</option>
            <option value="Warning">Warning</option>
            <option value="No Error">No Error</option>
          </select>
        </div>
      </div>

      {/* History Items List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 animate-pulse space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-24 bg-slate-800 rounded" />
                <div className="h-4 w-20 bg-slate-800 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-slate-800 rounded" />
              <div className="h-14 bg-[#0B0F1A] border border-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : historyItems.length === 0 ? (
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-10 text-center space-y-3.5 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">No analyses saved yet</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {search || selectedLang !== 'all' || selectedErrorType !== 'all'
              ? 'No analysis records match your selected filters. Try clearing your search query.'
              : 'Submit any code in the Analyzer to automatically save your debugging logs, scores, and fixes here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => {
            const score = item.qualityScore ?? (item.hasError ? 45 : 95);
            const isHighQuality = score >= 80;
            const isMidQuality = score >= 50 && score < 80;
            
            return (
              <div
                key={item.id}
                className="bg-[#0F172A] border border-slate-800/90 hover:border-slate-700/90 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 transition-all duration-200 group shadow-md"
              >
                {/* Left Details */}
                <div className="space-y-2 flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-[#0B0F1A] text-emerald-400 border border-slate-800">
                      {item.language}
                    </span>

                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        item.hasError
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {item.errorType || (item.hasError ? 'Error Detected' : 'No Error')}
                    </span>

                    {item.line && (
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/60">
                        Line {item.line}
                      </span>
                    )}

                    {/* Quality Score Pill */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isHighQuality
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : isMidQuality
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-red-500/10 text-red-300 border-red-500/30'
                      }`}
                    >
                      Score: {score}/100
                    </span>

                    {item.createdAt && (
                      <span className="text-[11px] text-slate-400 flex items-center space-x-1 sm:ml-auto font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(item.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm truncate">
                    {item.errorMessage || item.explanation || 'Code analysis record'}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {item.explanation}
                  </p>

                  {/* Submitted Code Preview */}
                  <div className="bg-[#0B0F1A] rounded-lg p-2.5 font-mono text-[11px] text-slate-300 border border-slate-800/80 max-h-20 overflow-x-auto">
                    <pre className="leading-relaxed"><code>{item.submittedCode}</code></pre>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-2 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 shrink-0">
                  <button
                    onClick={() => onOpenInEditor(item)}
                    aria-label="Open in Editor"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold border border-emerald-500/30 hover:border-emerald-500 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Editor</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete from history"
                    aria-label="Delete analysis"
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
