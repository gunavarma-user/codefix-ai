import React from 'react';
import { 
  Terminal, 
  ArrowRight, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  MessageSquareCode, 
  History as HistoryIcon, 
  BarChart3, 
  Lightbulb, 
  ShieldCheck, 
  Zap,
  Code2
} from 'lucide-react';
import { SupportedLanguage } from '../types';

interface LandingPageProps {
  onStartAnalyzing: (sampleLanguage?: SupportedLanguage) => void;
  onTryDemo: () => void;
  onExploreExamples: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartAnalyzing,
  onTryDemo,
  onExploreExamples
}) => {
  const languages: { id: SupportedLanguage; name: string; ext: string; color: string; sample: string }[] = [
    {
      id: 'python',
      name: 'Python',
      ext: '.py',
      color: 'from-blue-500/20 to-yellow-500/20 text-yellow-400 border-yellow-500/30',
      sample: 'if score >= 60:\n    print("Passed!")'
    },
    {
      id: 'c',
      name: 'C',
      ext: '.c',
      color: 'from-blue-600/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
      sample: 'printf("Hello %s\\n", name);'
    },
    {
      id: 'cpp',
      name: 'C++',
      ext: '.cpp',
      color: 'from-blue-700/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30',
      sample: 'std::vector<int> nums = {1, 2, 3};'
    },
    {
      id: 'java',
      name: 'Java',
      ext: '.java',
      color: 'from-red-500/20 to-orange-500/20 text-orange-400 border-orange-500/30',
      sample: 'System.out.println("Result: " + val);'
    },
    {
      id: 'javascript',
      name: 'JavaScript',
      ext: '.js',
      color: 'from-yellow-500/20 to-amber-500/20 text-amber-300 border-amber-500/30',
      sample: 'const result = items.map(x => x * 2);'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Paste your code',
      desc: 'Drop in your code directly into our full-featured dark mode code editor.'
    },
    {
      number: '2',
      title: 'Select language',
      desc: 'Pick Python, C, C++, Java, or JavaScript with custom syntax highlighting.'
    },
    {
      number: '3',
      title: 'Analyze the code',
      desc: 'Our safe AST pre-parser and Gemini AI scan for syntax, logic, and runtime errors.'
    },
    {
      number: '4',
      title: 'Understand the error',
      desc: 'Get friendly explanations of what went wrong and why, with no confusing jargon.'
    },
    {
      number: '5',
      title: 'Fix your code',
      desc: 'Inspect full corrected code and apply the fix with a single click.'
    }
  ];

  const features = [
    {
      icon: Lightbulb,
      title: 'Beginner-Friendly Explanations',
      desc: 'Clear analogies and gentle language that explain concepts without overwhelming technical jargon.'
    },
    {
      icon: ShieldCheck,
      title: 'Multi-Stage Error Detection',
      desc: 'Combines safe static AST checks with Gemini AI for pinpoint accuracy on lines and root causes.'
    },
    {
      icon: Zap,
      title: 'Visual Error Highlighting',
      desc: 'Highlights offending lines directly in the editor gutter and code canvas for instant recognition.'
    },
    {
      icon: CheckCircle2,
      title: 'Instant Corrected Code',
      desc: 'Receive complete, properly indented, working code with a 1-click "Fix Code" button.'
    },
    {
      icon: MessageSquareCode,
      title: 'Interactive AI Follow-up Chat',
      desc: 'Ask follow-up questions like "Explain this step by step" or "Can you show another solution?".'
    },
    {
      icon: HistoryIcon,
      title: 'Analysis History Log',
      desc: 'Save and review previous debugging sessions, filter by language, and inspect progress over time.'
    },
    {
      icon: BarChart3,
      title: 'Student Progress Dashboard',
      desc: 'Track total fixes, common error types, and language distribution metrics with clean visualizations.'
    }
  ];

  return (
    <div className="space-y-12 pb-14 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-5xl mx-auto px-3 sm:px-4">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3 h-3" />
          <span>AI-Powered Code Error Analyzer for Students</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight sm:leading-tight mb-4">
          Understand Your Code. <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Fix Errors Faster.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed mb-6">
          CodeFix AI analyzes your code, explains errors in simple language, and helps you fix them step by step.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            id="hero-btn-analyze"
            onClick={() => onStartAnalyzing()}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            <span>Analyze Code</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            id="hero-btn-demo"
            onClick={onTryDemo}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/80 transition-all duration-200 hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Try Demo</span>
          </button>

          <button
            id="hero-btn-examples"
            onClick={onExploreExamples}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 hover:border-slate-700 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Example Gallery</span>
          </button>
        </div>

        {/* Live Preview Card Mockup */}
        <div className="mt-8 max-w-3xl mx-auto rounded-2xl bg-[#0F172A] border border-slate-800/90 p-2 shadow-2xl overflow-hidden text-left">
          <div className="bg-[#0B0F1A] rounded-xl border border-slate-800/80 p-3 sm:p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-2.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-slate-400 text-[11px] ml-1.5 font-mono">check_score.py</span>
              </div>
              <span className="text-emerald-400 text-[10px] font-mono font-semibold">Python 3.10 • Static AST + Gemini</span>
            </div>
            <div className="space-y-1 text-xs overflow-x-auto">
              <div className="text-slate-500">1  def check_score(score):</div>
              <div className="bg-red-500/10 border-l-2 border-red-500 px-2 py-0.5 text-red-300 rounded-r">
                2      if score &gt;= 75 <span className="text-red-400 text-[10px] ml-2 sm:ml-4 font-sans font-semibold"># 🔴 Missing colon ':' after condition</span>
              </div>
              <div className="text-slate-400">3          print("Distinction grade!")</div>
              <div className="text-slate-400">4      else:</div>
              <div className="text-slate-400">5          print("Good job!")</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4" id="section-how-it-works">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1.5">How It Works</h2>
          <p className="text-slate-300 text-xs sm:text-sm">Five simple steps from error confusion to clean, working code.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 relative hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center mb-3 text-xs font-mono">
                {step.number}
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 text-xs sm:text-sm">{step.title}</h3>
              <p className="text-slate-300 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Languages Section */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4" id="section-supported-languages">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1.5">Supported Languages</h2>
          <p className="text-slate-300 text-xs sm:text-sm">Built with an extensible shared configuration supporting major beginner languages.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {languages.map((lang) => (
            <div 
              key={lang.id}
              onClick={() => onStartAnalyzing(lang.id)}
              className="bg-[#0F172A] border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-100 text-xs group-hover:text-emerald-400 transition-colors">{lang.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{lang.ext}</span>
              </div>
              <div className="bg-[#0B0F1A] rounded-lg p-2.5 font-mono text-[10px] text-slate-300 mb-3 overflow-hidden">
                <pre className="overflow-x-auto">{lang.sample}</pre>
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                <span>Start in {lang.name}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why CodeFix AI? Section */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4" id="section-why-codefix">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1.5">Why CodeFix AI?</h2>
          <p className="text-slate-300 text-xs sm:text-sm">Designed specifically to teach programming concepts rather than just fixing bugs silently.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className="bg-[#0F172A] border border-slate-800/90 rounded-xl p-4 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-1">{feat.title}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-[#0F172A] border border-emerald-500/30 p-6 sm:p-8 text-center relative overflow-hidden shadow-lg">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 mb-2">
              Ready to debug with confidence?
            </h2>
            <p className="text-slate-300 max-w-lg mx-auto mb-5 text-xs sm:text-sm leading-relaxed">
              Paste your first broken script and experience clear, simple explanations in seconds.
            </p>
            <button
              onClick={() => onStartAnalyzing('python')}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            >
              Open Code Analyzer Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
