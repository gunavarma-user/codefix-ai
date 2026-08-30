import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  Flame, 
  ExternalLink, 
  RefreshCw,
  Award,
  Terminal,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { DashboardStats, AnalysisResult, User } from '../types';
import { safeApiFetch } from '../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardViewProps {
  user: User | null;
  onOpenAnalysis: (item: AnalysisResult) => void;
  onRequireAuth: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onOpenAnalysis,
  onRequireAuth
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await safeApiFetch<DashboardStats>('/api/dashboard');
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <BarChart3 className="w-7 h-7" />
          </div>
          
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
              Personal Learning Dashboard
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sign in to track your debugging proficiency, error category frequencies, code quality trends, and multi-language learning progress.
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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5 space-y-5">
        {/* Header Skeleton */}
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-5 animate-pulse space-y-2">
          <div className="h-4 w-28 bg-slate-800 rounded" />
          <div className="h-6 w-56 bg-slate-800 rounded" />
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 animate-pulse space-y-2">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-7 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-5 animate-pulse h-64 flex items-center justify-center">
          <div className="text-slate-500 text-xs font-mono flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  const langData = stats?.languageDistribution || {
    python: 0,
    c: 0,
    cpp: 0,
    java: 0,
    javascript: 0
  };

  const totalAnalyses = stats?.totalAnalyses || 0;

  const chartData = {
    labels: ['Python', 'C', 'C++', 'Java', 'JavaScript'],
    datasets: [
      {
        label: 'Analyses Count',
        data: [
          langData.python || 0,
          langData.c || 0,
          langData.cpp || 0,
          langData.java || 0,
          langData.javascript || 0
        ],
        backgroundColor: [
          'rgba(234, 179, 8, 0.75)',  // Python yellow
          'rgba(59, 130, 246, 0.75)',  // C blue
          'rgba(99, 102, 241, 0.75)',  // C++ indigo
          'rgba(249, 115, 22, 0.75)',  // Java orange
          'rgba(16, 185, 129, 0.75)'   // JS green
        ],
        borderColor: [
          '#eab308',
          '#3b82f6',
          '#6366f1',
          '#f97316',
          '#10b981'
        ],
        borderWidth: 1.5,
        borderRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8', stepSize: 1 }
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 shadow-md">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold uppercase mb-1">
            <BarChart3 className="w-3 h-3" />
            <span>Progress & Metrics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            {user.name || user.username}'s Learning Dashboard
          </h1>
          <p className="text-slate-300 text-xs mt-0.5">
            Track errors fixed, language frequency, and debugging progress in real-time.
          </p>
        </div>

        <button
          onClick={fetchStats}
          aria-label="Refresh dashboard metrics"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Analyses */}
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Total Analyses
            </p>
            <h3 className="text-2xl font-extrabold text-slate-100 font-mono">
              {totalAnalyses}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Terminal className="w-5 h-5" />
          </div>
        </div>

        {/* Errors Detected */}
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Errors Detected
            </p>
            <h3 className="text-2xl font-extrabold text-red-400 font-mono">
              {stats?.errorsDetected || 0}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Errors Fixed */}
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Errors Fixed
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-400 font-mono">
              {stats?.errorsFixed || 0}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Most-Used Language */}
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Top Language
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold text-teal-300 uppercase font-mono truncate">
              {stats?.mostUsedLanguage || (totalAnalyses > 0 ? 'Python' : 'None yet')}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {totalAnalyses === 0 ? (
        <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-10 text-center space-y-3.5 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">No debugging data yet</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Run your first code analysis in the CodeFix AI Analyzer. Your error resolution rate, language breakdown, and quality scores will automatically populate here!
          </p>
        </div>
      ) : (
        <>
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* Language Distribution Bar Chart */}
            <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Language Distribution</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Frequency by Language</span>
              </div>

              <div className="h-56 w-full">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Error Types Breakdown */}
            <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 space-y-3 flex flex-col justify-between shadow-md">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Error Type Breakdown</span>
                </h3>

                <div className="space-y-2">
                  {Object.entries(stats?.errorTypeDistribution || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-medium">{type}</span>
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-[#0B0F1A] text-slate-200 rounded border border-slate-800">
                        {count}
                      </span>
                    </div>
                  ))}

                  {(!stats?.errorTypeDistribution || Object.keys(stats.errorTypeDistribution).length === 0) && (
                    <p className="text-xs text-slate-400">No error patterns recorded yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-[#0B0F1A] rounded-lg p-2.5 border border-slate-800 text-[11px] text-slate-300">
                <span className="text-emerald-400 font-semibold">Pro Tip:</span> Consistent practice and analyzing errors systematically builds fast debugging intuition.
              </div>
            </div>
          </div>

          {/* 5 Most Recent Analyses */}
          <div className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recent 5 Analyses</span>
              </h3>
            </div>

            {stats?.recentAnalyses && stats.recentAnalyses.length > 0 ? (
              <div className="divide-y divide-slate-800/80 overflow-x-auto">
                {stats.recentAnalyses.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#0B0F1A] text-emerald-400 border border-slate-800">
                          {item.language}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                            item.hasError
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {item.errorType}
                        </span>
                        {item.line && (
                          <span className="text-[11px] text-slate-400 font-mono">Line {item.line}</span>
                        )}
                        {item.qualityScore !== undefined && (
                          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Score: {item.qualityScore}/100
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 truncate max-w-md font-medium">
                        {item.errorMessage || item.explanation}
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenAnalysis(item)}
                      aria-label="Inspect analysis in Editor"
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-colors shrink-0 border border-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Inspect in Editor</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">
                No recent analyses found. Run your first code check to populate the dashboard!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
