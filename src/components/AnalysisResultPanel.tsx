import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Wand2, 
  HelpCircle, 
  Flame, 
  Lightbulb, 
  Sparkles, 
  Info, 
  Terminal, 
  ArrowDown, 
  Code2, 
  FileSearch, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  ShieldAlert, 
  GraduationCap,
  Play
} from 'lucide-react';
import { AnalysisResult, CodeIssue, ErrorType, IssueSeverity } from '../types';

interface AnalysisResultPanelProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onFixCode: (code: string) => void;
  onSwitchToChat: () => void;
  onErrorLineClick?: (line: number) => void;
  selectedIssueLine?: number | null;
}

export const AnalysisResultPanel: React.FC<AnalysisResultPanelProps> = ({
  analysis,
  isLoading,
  error,
  onRetry,
  onFixCode,
  onSwitchToChat,
  onErrorLineClick,
  selectedIssueLine
}) => {
  const [copiedFix, setCopiedFix] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [activeIssueIndex, setActiveIssueIndex] = useState<number>(0);

  const handleCopyFix = () => {
    if (!analysis?.correctedCode) return;
    navigator.clipboard.writeText(analysis.correctedCode);
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  const handleCopySnippet = (snippet: string) => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="h-full bg-[#0B0F1A] border border-slate-800/90 rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-lg space-y-4">
        {/* Header Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Analyzing Code...
              </span>
            </div>
            <div className="h-6 w-20 bg-slate-800/80 rounded-lg animate-pulse" />
          </div>

          <div className="bg-[#0E1526] border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-slate-800 rounded animate-pulse" />
              <div className="h-6 w-24 bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="flex space-x-3">
              <div className="h-8 w-12 bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-8 w-12 bg-slate-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Body Blocks Skeleton */}
        <div className="space-y-3 flex-1">
          <div className="h-24 bg-[#0E1526] border border-slate-800/80 rounded-xl p-3 space-y-2 animate-pulse">
            <div className="h-4 w-1/3 bg-slate-800 rounded" />
            <div className="h-3 w-full bg-slate-800/60 rounded" />
            <div className="h-3 w-4/5 bg-slate-800/60 rounded" />
          </div>
          <div className="h-20 bg-[#0E1526] border border-slate-800/80 rounded-xl p-3 space-y-2 animate-pulse">
            <div className="h-4 w-1/4 bg-slate-800 rounded" />
            <div className="h-3 w-3/4 bg-slate-800/60 rounded" />
          </div>
        </div>

        {/* Progress Bar Skeleton */}
        <div className="pt-2">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-[shimmer_1.5s_infinite]" />
          </div>
          <p className="text-[10px] text-slate-400 text-center font-mono mt-2">
            Running AST syntax verification & AI explanation synthesis
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error && !analysis) {
    const isApiKeyError = error.includes('GEMINI_API_KEY') || error.includes('not configured') || error.includes('invalid');

    return (
      <div className="h-full bg-[#0B0F1A] border border-red-500/30 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4 shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <XCircle className="w-6 h-6" />
        </div>
        <div className="max-w-sm space-y-2">
          <h3 className="text-sm font-bold text-red-200">Analysis Request Failed</h3>
          <p className="text-xs text-slate-300 font-mono bg-red-950/40 border border-red-500/30 rounded-lg p-2.5 text-left break-words">
            {error}
          </p>
          {isApiKeyError && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-left">
              💡 <strong>Configuration Tip:</strong> Ensure your <code>GEMINI_API_KEY</code> is correctly set in your environment or workspace Settings.
            </p>
          )}
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try Analysis Again</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (!analysis) {
    return (
      <div className="h-full bg-[#0B0F1A] border border-slate-800/90 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4 shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-[#0F172A] border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
          <FileSearch className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="max-w-xs space-y-2">
          <h3 className="text-sm font-bold text-slate-100">Ready for Code Analysis</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Paste your code in the editor on the left and click <strong className="text-emerald-400 font-semibold">Analyze Code</strong> to view detailed error breakdowns, quality scores, and fixes.
          </p>
          <div className="inline-flex items-center space-x-1.5 text-[10px] text-slate-400 bg-[#0F172A] px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Python • C • C++ • Java • JavaScript</span>
          </div>
        </div>
      </div>
    );
  }

  // Helper for Severity Badges
  const renderSeverityBadge = (severity?: IssueSeverity | string, errorType?: string) => {
    const s = (severity || '').toLowerCase();
    if (s === 'critical' || s === 'error') {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
          <span>🔴</span>
          <span>Critical</span>
        </span>
      );
    }
    if (s === 'warning') {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span>🟠</span>
          <span>Warning</span>
        </span>
      );
    }
    if (s === 'suggestion') {
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
          <span>🔵</span>
          <span>Suggestion</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <span>🟢</span>
        <span>Good</span>
      </span>
    );
  };

  // Score styling calculation
  const score = typeof analysis.qualityScore === 'number' ? analysis.qualityScore : (analysis.hasError ? 35 : 92);
  const getScoreColor = (sc: number) => {
    if (sc >= 85) return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', label: 'Excellent' };
    if (sc >= 70) return { text: 'text-teal-300', bg: 'bg-teal-500', border: 'border-teal-500/30', label: 'Good' };
    if (sc >= 50) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', label: 'Needs Attention' };
    return { text: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30', label: 'Critical Issues' };
  };
  const scoreMeta = getScoreColor(score);

  // Issues list handling
  const issuesList: CodeIssue[] = (analysis.issues && analysis.issues.length > 0)
    ? analysis.issues
    : (analysis.hasError
        ? [{
            issueNumber: 1,
            title: analysis.errorType,
            errorType: analysis.errorType,
            severity: 'critical',
            line: analysis.line,
            errorMessage: analysis.errorMessage,
            offendingCode: analysis.offendingCode,
            explanation: analysis.explanation,
            whyItHappened: analysis.whyItHappened,
            howToFix: analysis.howToFix
          }]
        : []);

  const totalErrors = analysis.summary?.errors ?? (analysis.hasError ? Math.max(1, issuesList.filter(i => i.severity === 'critical').length) : 0);
  const totalWarnings = analysis.summary?.warnings ?? issuesList.filter(i => i.severity === 'warning').length;
  const totalSuggestions = analysis.summary?.suggestions ?? (analysis.suggestions?.length || issuesList.filter(i => i.severity === 'suggestion').length || 2);

  const activeIssue = issuesList[activeIssueIndex] || issuesList[0] || null;

  // Before & After comparison snippet
  const originalSnippet = analysis.beforeAfterSnippet?.original || analysis.offendingCode || '';
  const correctedSnippet = analysis.beforeAfterSnippet?.corrected || '';

  return (
    <div className="h-full flex flex-col bg-[#0B0F1A] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg">
      {/* 1. Top Bar: Analysis Summary & Score Banner */}
      <div className="p-3 sm:p-3.5 bg-gradient-to-b from-[#0F172A] to-[#0B0F1A] border-b border-slate-800/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Analysis Complete
            </h2>
          </div>

          <button
            id="btn-switch-to-chat"
            onClick={onSwitchToChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Tutor</span>
          </button>
        </div>

        {/* Score & Summary Grid */}
        <div className="grid grid-cols-12 gap-2 bg-[#0E1526] border border-slate-800/90 rounded-xl p-3 items-center">
          {/* Quality Score Meter */}
          <div className="col-span-5 sm:col-span-4 flex items-center space-x-2.5 border-r border-slate-800 pr-2">
            <div className="relative flex flex-col">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Quality</span>
              <div className="flex items-baseline space-x-1">
                <span className={`text-xl font-extrabold font-mono ${scoreMeta.text}`}>
                  {score}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">/100</span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col flex-1">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                <div 
                  className={`h-full ${scoreMeta.bg} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.max(8, score)}%` }}
                />
              </div>
              <span className={`text-[9px] font-semibold ${scoreMeta.text}`}>
                {scoreMeta.label}
              </span>
            </div>
          </div>

          {/* Counts: Errors, Warnings, Suggestions */}
          <div className="col-span-7 sm:col-span-8 flex items-center justify-around sm:justify-start sm:gap-5 pl-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs">🔴</span>
              <div>
                <div className="text-[9px] text-slate-400 font-mono">Errors</div>
                <div className="text-xs font-bold text-red-300 font-mono">{totalErrors}</div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-xs">🟠</span>
              <div>
                <div className="text-[9px] text-slate-400 font-mono">Warnings</div>
                <div className="text-xs font-bold text-amber-300 font-mono">{totalWarnings}</div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-xs">🔵</span>
              <div>
                <div className="text-[9px] text-slate-400 font-mono">Tips</div>
                <div className="text-xs font-bold text-sky-300 font-mono">{totalSuggestions}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Body: Scrollable Results */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3.5">
        {/* Static AST Parser Note if available */}
        {analysis.staticAnalysisNote && (
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-2.5 text-xs flex items-center space-x-2 text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] text-slate-300">{analysis.staticAnalysisNote}</span>
          </div>
        )}

        {/* 3. MULTIPLE ERRORS / ISSUES SECTION */}
        {issuesList.length > 0 && analysis.hasError ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Errors Found: {issuesList.length}
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                Click line to jump in editor
              </span>
            </div>

            {/* List of issues */}
            <div className="space-y-2">
              {issuesList.map((issue, idx) => {
                const isSelected = activeIssueIndex === idx;
                return (
                  <div
                    key={issue.id || idx}
                    onClick={() => {
                      setActiveIssueIndex(idx);
                      if (issue.line && onErrorLineClick) {
                        onErrorLineClick(issue.line);
                      }
                    }}
                    className={`rounded-xl border transition-all cursor-pointer p-3.5 ${
                      isSelected 
                        ? 'bg-[#111A2E] border-slate-700 shadow-md ring-1 ring-emerald-500/20' 
                        : 'bg-[#0E1526] border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold font-mono text-slate-300">
                          Error {issue.issueNumber || idx + 1}
                        </span>
                        {issue.line && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (issue.line && onErrorLineClick) onErrorLineClick(issue.line);
                            }}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                          >
                            Line {issue.line}
                          </button>
                        )}
                        <span className="text-[11px] font-semibold text-slate-200 truncate">
                          {issue.errorType}
                        </span>
                      </div>

                      <div>{renderSeverityBadge(issue.severity, issue.errorType)}</div>
                    </div>

                    {/* Issue Explanation */}
                    <p className="text-xs text-slate-200 font-sans leading-relaxed mb-2">
                      {issue.explanation || issue.errorMessage}
                    </p>

                    {/* Offending code snippet */}
                    {issue.offendingCode && (
                      <div className="bg-[#0B0F1A] rounded-lg p-2 border border-red-500/20 font-mono text-[11px] text-red-300 flex items-center justify-between overflow-x-auto">
                        <div>
                          <span className="text-slate-500 mr-2 select-none">
                            {issue.line ? `line ${issue.line}:` : 'code:'}
                          </span>
                          <code>{issue.offendingCode}</code>
                        </div>
                      </div>
                    )}

                    {/* Expanded details when selected */}
                    {isSelected && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800 space-y-2 text-xs">
                        {issue.whyItHappened && (
                          <div className="flex items-start space-x-1.5 text-slate-200">
                            <Flame className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                            <div>
                              <strong className="text-slate-100">Why it happened:</strong> {issue.whyItHappened}
                            </div>
                          </div>
                        )}
                        {issue.howToFix && (
                          <div className="flex items-start space-x-1.5 text-slate-200">
                            <Lightbulb className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                              <strong className="text-slate-100">How to fix:</strong> {issue.howToFix}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Valid Code Card */
          <div className="bg-[#0E1526] border border-emerald-500/30 rounded-xl p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-300">
                  ✓ No major errors detected
                </h3>
              </div>
              {renderSeverityBadge('good')}
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {analysis.explanation || 'Your code successfully passed syntax and structure validation. It runs cleanly without fatal errors.'}
            </p>
          </div>
        )}

        {/* 4. "💡 BEGINNER TIP" SECTION */}
        {analysis.beginnerTip && (
          <div className="bg-gradient-to-r from-amber-950/20 via-[#0F172A] to-emerald-950/20 border border-amber-500/30 rounded-xl p-3 shadow-xs">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono font-bold text-amber-300 mb-1">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>💡 Beginner Tip</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {analysis.beginnerTip}
            </p>
          </div>
        )}

        {/* 5. BEFORE / AFTER VIEW */}
        {analysis.hasError && (originalSnippet || correctedSnippet) && (
          <div className="bg-[#0E1526] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-teal-400" />
                <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Before / After View
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Highlighting the fix</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {/* Original */}
              <div className="bg-[#0B0F1A] border border-red-500/30 rounded-lg p-2.5 text-red-300">
                <div className="text-[9px] font-mono uppercase text-red-400 font-bold mb-0.5">
                  Original Code
                </div>
                <pre className="overflow-x-auto"><code>{originalSnippet || activeIssue?.offendingCode || 'Original line'}</code></pre>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-slate-500 py-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
              </div>

              {/* Corrected */}
              <div className="bg-[#0B0F1A] border border-emerald-500/30 rounded-lg p-2.5 text-emerald-300">
                <div className="text-[9px] font-mono uppercase text-emerald-400 font-bold mb-0.5">
                  Corrected Code
                </div>
                <pre className="overflow-x-auto"><code>{correctedSnippet || (analysis.correctedCode ? analysis.correctedCode.split('\n')[0] : '')}</code></pre>
              </div>
            </div>
          </div>
        )}

        {/* 6. FULL CORRECTED CODE PANEL & FIX BUTTON */}
        {analysis.correctedCode && (
          <div className="bg-[#0B0F1A] border border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-3 py-2 bg-[#0F172A] border-b border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 font-mono">
                  {analysis.hasError ? 'Complete Corrected Code' : 'Clean Reference Code'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  id="btn-copy-corrected-code"
                  onClick={handleCopyFix}
                  aria-label="Copy corrected code"
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {copiedFix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFix ? 'Copied' : 'Copy'}</span>
                </button>

                {analysis.hasError && (
                  <button
                    id="btn-apply-corrected-code"
                    onClick={() => onFixCode(analysis.correctedCode)}
                    aria-label="Apply fix into code editor"
                    className="flex items-center space-x-1 px-3 py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Fix Code</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 font-mono text-xs text-emerald-300 overflow-x-auto max-h-56 bg-[#0B0F1A]">
              <pre><code>{analysis.correctedCode}</code></pre>
            </div>
          </div>
        )}

        {/* 7. CODE QUALITY SUGGESTIONS */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div className="bg-[#0E1526] border border-slate-800/80 rounded-xl p-3.5 shadow-xs">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Suggestions & Best Practices</span>
            </h4>
            <ul className="space-y-1.5">
              {analysis.suggestions.map((sug, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{sug}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 8. Ask Tutor Quick Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-900 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-100 truncate">Have questions about this code?</h4>
              <p className="text-[11px] text-slate-400 truncate">Ask the AI Tutor for step-by-step guidance or alternative fixes.</p>
            </div>
          </div>

          <button
            onClick={onSwitchToChat}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Chat with Tutor
          </button>
        </div>
      </div>
    </div>
  );
};
