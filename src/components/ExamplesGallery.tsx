import React, { useState } from 'react';
import { BookOpen, ArrowRight, Play, CheckCircle, AlertCircle, Sparkles, Filter, Code2 } from 'lucide-react';
import { CODE_EXAMPLES } from '../data/examples';
import { CodeExample, SupportedLanguage } from '../types';

interface ExamplesGalleryProps {
  onSelectExample: (example: CodeExample) => void;
}

export const ExamplesGallery: React.FC<ExamplesGalleryProps> = ({ onSelectExample }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const languages: { id: SupportedLanguage | 'all'; label: string }[] = [
    { id: 'all', label: 'All Languages' },
    { id: 'python', label: 'Python (5)' },
    { id: 'c', label: 'C (3)' },
    { id: 'cpp', label: 'C++ (3)' },
    { id: 'java', label: 'Java (3)' },
    { id: 'javascript', label: 'JavaScript (3)' }
  ];

  const filteredExamples = CODE_EXAMPLES.filter((ex) => {
    const matchesLang = selectedLanguage === 'all' || ex.language === selectedLanguage;
    const matchesSearch =
      searchQuery === '' ||
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLang && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5 space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold uppercase">
          <BookOpen className="w-3 h-3" />
          <span>Interactive Example Gallery</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
          Learn Common Programming Mistakes
        </h1>
        <p className="text-slate-300 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
          Select any real-world broken code sample to load it directly into the CodeFix AI analyzer and see how our AI tutor explains the fix.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0F172A] p-2.5 rounded-xl border border-slate-800/90 shadow-md">
        {/* Language Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLanguage(lang.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                selectedLanguage === lang.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-60">
          <input
            type="text"
            placeholder="Search examples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0F1A] border border-slate-700/80 text-xs rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 font-sans"
          />
        </div>
      </div>

      {/* Examples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredExamples.map((ex) => (
          <div
            key={ex.id}
            className="bg-[#0F172A] border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between group transition-all duration-200 hover:shadow-md shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#0B0F1A] text-emerald-400 border border-slate-800">
                  {ex.language}
                </span>
                <span className="text-[11px] font-medium text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{ex.category}</span>
                </span>
              </div>

              <h3 className="font-bold text-slate-100 text-sm mb-1 group-hover:text-emerald-400 transition-colors">
                {ex.title}
              </h3>
              <p className="text-slate-300 text-xs mb-3 line-clamp-2 leading-relaxed">
                {ex.description}
              </p>

              {/* Code Snippet Box with horizontal scroll */}
              <div className="bg-[#0B0F1A] rounded-lg p-2.5 border border-slate-800/90 font-mono text-[11px] text-slate-300 mb-3 max-h-32 overflow-hidden relative">
                <pre className="overflow-x-auto">
                  <code>{ex.code}</code>
                </pre>
                <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#0B0F1A] to-transparent pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => onSelectExample(ex)}
              aria-label={`Load ${ex.title} into Analyzer`}
              className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-slate-800/90 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold text-xs border border-slate-700/60 hover:border-emerald-500 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer shadow-xs"
            >
              <Play className="w-3 h-3" />
              <span>Load into Analyzer</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
