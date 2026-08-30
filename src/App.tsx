import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { CodeEditorPanel } from './components/CodeEditorPanel';
import { AnalysisResultPanel } from './components/AnalysisResultPanel';
import { AiChatPanel } from './components/AiChatPanel';
import { ExamplesGallery } from './components/ExamplesGallery';
import { HistoryView } from './components/HistoryView';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/AuthModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CODE_EXAMPLES } from './data/examples';
import { SupportedLanguage, AnalysisResult, User, CodeExample } from './types';
import { safeApiFetch } from './lib/api';
import { Sparkles, Bot, Code2, AlertCircle } from 'lucide-react';

const DEFAULT_PYTHON_SAMPLE = `def calculate_average(grades):
    total = 0
    for grade in grades
        total += grade
    return total / len(grades)

print(calculate_average([85, 92, 78]))`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'analyze' | 'examples' | 'history' | 'dashboard'>('landing');
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(DEFAULT_PYTHON_SAMPLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [analyzerSubTab, setAnalyzerSubTab] = useState<'result' | 'chat'>('result');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // User and Auth
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check current user on mount
  useEffect(() => {
    const token = localStorage.getItem('codefix_token');
    if (token) {
      safeApiFetch<User>('/api/auth/me')
        .then((userData) => {
          if (userData) setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('codefix_token');
        });
    }
  }, []);

  // Update editor sample when changing language if editor is empty or on load
  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setErrorLine(null);
    setAnalysisError(null);
    const matchedEx = CODE_EXAMPLES.find((ex) => ex.language === newLang);
    if (matchedEx) {
      setCode(matchedEx.code);
    }
  };

  // Load sample for currently selected language
  const handleLoadSample = () => {
    const matched = CODE_EXAMPLES.filter((ex) => ex.language === language);
    if (matched.length > 0) {
      const randomSample = matched[Math.floor(Math.random() * matched.length)];
      setCode(randomSample.code);
      setErrorLine(null);
      setAnalysis(null);
      setAnalysisError(null);
      addToast('info', `Loaded ${randomSample.title} (${language})`);
    }
  };

  // Perform Analysis
  const handleAnalyze = async () => {
    if (!code || !code.trim()) {
      addToast('error', 'No code found. Paste some code into the editor and try again.');
      return;
    }

    if (code.length > 20000) {
      addToast('error', 'Your code is too large. Please keep it below 20,000 characters.');
      return;
    }

    console.log(`[CodeFix Client] Starting analysis for ${language} (${code.length} characters)...`);
    setIsLoading(true);
    setAnalyzerSubTab('result');
    setErrorLine(null);
    setAnalysisError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const data = await safeApiFetch<AnalysisResult>('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ code, language }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('[CodeFix Client] Analysis completed successfully:', data);

      setAnalysis(data);
      setAnalysisError(null);

      if (data.line && data.line > 0) {
        setErrorLine(data.line);
      } else {
        setErrorLine(null);
      }

      if (data.hasError) {
        const errCount = data.summary?.errors || (data.issues ? data.issues.filter(i => i.severity === 'critical').length : 1);
        addToast('info', `Analysis complete: ${errCount} error${errCount > 1 ? 's' : ''} detected. Score: ${data.qualityScore ?? 'N/A'}/100`);
      } else {
        addToast('success', `Clean code! No major errors detected. Score: ${data.qualityScore ?? 95}/100`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[CodeFix Client] Analysis failed:', err);

      let message = err.message || 'AI analysis is temporarily unavailable.';
      if (err.name === 'AbortError') {
        message = 'The analysis request timed out. Please check your network and try again.';
      }

      setAnalysisError(message);
      addToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply Corrected Code to Editor
  const handleApplyFix = (correctedCode?: string) => {
    const codeToApply = correctedCode || analysis?.correctedCode;
    if (!codeToApply) return;

    setCode(codeToApply);
    setErrorLine(null);
    setAnalysisError(null);
    addToast('success', 'Code updated with the suggested fix.');
  };

  // Select example from gallery
  const handleSelectExample = (ex: CodeExample) => {
    setLanguage(ex.language);
    setCode(ex.code);
    setErrorLine(null);
    setAnalysis(null);
    setAnalysisError(null);
    setActiveTab('analyze');
    addToast('info', `Loaded example: ${ex.title}`);
  };

  // Open item from History or Dashboard
  const handleOpenFromLog = (item: AnalysisResult) => {
    setLanguage(item.language as SupportedLanguage);
    setCode(item.submittedCode);
    setAnalysis(item);
    setAnalysisError(null);
    if (item.line) setErrorLine(item.line);
    setActiveTab('analyze');
    setAnalyzerSubTab('result');
    addToast('info', `Loaded historical analysis (${item.language})`);
  };

  // Try demo student from landing page
  const handleTryDemo = () => {
    setLanguage('python');
    setCode(DEFAULT_PYTHON_SAMPLE);
    setAnalysisError(null);
    setActiveTab('analyze');
    addToast('info', 'Loaded demo Python code. Click Analyze Code to test!');
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('codefix_token');
    setUser(null);
    addToast('info', 'You have been logged out.');
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            onStartAnalyzing={(sampleLang) => {
              if (sampleLang) handleLanguageChange(sampleLang);
              setActiveTab('analyze');
            }}
            onTryDemo={handleTryDemo}
            onExploreExamples={() => setActiveTab('examples')}
          />
        )}

        {activeTab === 'analyze' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-3">
            {/* Analyzer Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>AI Code Error Analyzer</span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Paste your code, select the language, and get step-by-step beginner-friendly guidance.
                </p>
              </div>

              {/* Toggle Subtabs for Right Pane (Result vs Tutor Chat) */}
              <div className="flex items-center space-x-1 bg-[#0F172A] border border-slate-800/80 p-0.5 rounded-lg self-start sm:self-auto shadow-inner">
                <button
                  onClick={() => setAnalyzerSubTab('result')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    analyzerSubTab === 'result'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analysis Breakdown</span>
                </button>
                <button
                  onClick={() => setAnalyzerSubTab('chat')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    analyzerSubTab === 'chat'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Tutor Chat</span>
                </button>
              </div>
            </div>

            {/* Split Screen Grid: Left Editor + Right Analysis/Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[580px]">
              {/* Left Column: Monaco Code Editor (7 cols) */}
              <div className="lg:col-span-7 flex flex-col">
                <CodeEditorPanel
                  code={code}
                  onChange={setCode}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                  onClear={() => {
                    setCode('');
                    setErrorLine(null);
                    setAnalysis(null);
                    setAnalysisError(null);
                  }}
                  onLoadSample={handleLoadSample}
                  errorLine={errorLine}
                  errorMessage={analysis?.errorMessage}
                  issues={analysis?.issues}
                  activeIssueLine={errorLine}
                  hasCorrectedCode={Boolean(analysis?.correctedCode && analysis.hasError)}
                  onApplyFix={() => handleApplyFix()}
                />
              </div>

              {/* Right Column: Analysis Results or Tutor Chat (5 cols) */}
              <div className="lg:col-span-5 flex flex-col">
                {analyzerSubTab === 'result' ? (
                  <AnalysisResultPanel
                    analysis={analysis}
                    isLoading={isLoading}
                    error={analysisError}
                    onRetry={() => handleAnalyze()}
                    onFixCode={handleApplyFix}
                    onSwitchToChat={() => setAnalyzerSubTab('chat')}
                    onErrorLineClick={(line) => setErrorLine(line)}
                  />
                ) : (
                  <AiChatPanel
                    language={language}
                    code={code}
                    analysis={analysis}
                    onBackToAnalysis={() => setAnalyzerSubTab('result')}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'examples' && (
          <ExamplesGallery onSelectExample={handleSelectExample} />
        )}

        {activeTab === 'history' && (
          <HistoryView
            user={user}
            onOpenInEditor={handleOpenFromLog}
            onRequireAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            onOpenAnalysis={handleOpenFromLog}
            onRequireAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0A0E17] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 CodeFix AI — AI-Powered Code Error Analyzer for Students.</p>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>Gemini AI Tutor</span>
            <span>•</span>
            <span>Safe AST Static Analysis</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          addToast('success', `Welcome back, ${newUser.username}!`);
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
