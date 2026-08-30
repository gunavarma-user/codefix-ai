import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { 
  Copy, 
  Trash2, 
  Sparkles, 
  Play, 
  Check, 
  AlertCircle, 
  FileCode2, 
  RefreshCw,
  Wand2
} from 'lucide-react';
import { SupportedLanguage, CodeIssue } from '../types';

interface CodeEditorPanelProps {
  code: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  onClear: () => void;
  onLoadSample: () => void;
  errorLine?: number | null;
  errorMessage?: string;
  issues?: CodeIssue[];
  activeIssueLine?: number | null;
  hasCorrectedCode: boolean;
  onApplyFix: () => void;
}

const LANGUAGE_MAP: Record<SupportedLanguage, { label: string; monacoLang: string; sample: string }> = {
  python: {
    label: 'Python',
    monacoLang: 'python',
    sample: `def check_grade(score):
    if score >= 60
        print("Student passed!")
    else:
        print("Student needs retest.")

check_grade(75)`
  },
  c: {
    label: 'C',
    monacoLang: 'c',
    sample: `#include <stdio.h>

int main() {
    int count = 10;
    int multiplier = 5
    int result = count * multiplier;
    
    printf("Result is: %d\\n", result);
    return 0;
}`
  },
  cpp: {
    label: 'C++',
    monacoLang: 'cpp',
    sample: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers;
    // Missing push_back or resize
    numbers[0] = 42;
    std::cout << numbers[0] << std::endl;
    return 0;
}`
  },
  java: {
    label: 'Java',
    monacoLang: 'java',
    sample: `public class Main {
    public static void main(String[] args) {
        String greeting = "Hello CodeFix AI"
        System.out.println(greeting);
    }
}`
  },
  javascript: {
    label: 'JavaScript',
    monacoLang: 'javascript',
    sample: `function calculateTotal(price, tax) {
    const total = prce + tax; // Typo in prce
    return total;
}

console.log(calculateTotal(100, 15));`
  }
};

const MAX_CHARS = 20000;

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  code,
  onChange,
  language,
  onLanguageChange,
  onAnalyze,
  isLoading,
  onClear,
  onLoadSample,
  errorLine,
  errorMessage,
  issues,
  activeIssueLine,
  hasCorrectedCode,
  onApplyFix
}) => {
  const [copied, setCopied] = React.useState(false);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure custom dark theme for Monaco
    monaco.editor.defineTheme('codefix-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'type', foreground: '818cf8' },
      ],
      colors: {
        'editor.background': '#0B0F1A',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#1e293b40',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#38bdf8',
        'editorGutter.background': '#0B0F1A',
        'editorCursor.foreground': '#10b981',
      }
    });
    monaco.editor.setTheme('codefix-dark');
  };

  // Update line error decorations whenever issues or errorLine changes
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    const newDecorations: any[] = [];

    if (issues && issues.length > 0) {
      const validIssues = issues.filter(iss => typeof iss.line === 'number' && iss.line > 0 && iss.severity !== 'good');
      
      validIssues.forEach((iss) => {
        const lineNum = iss.line!;
        let className = 'line-error-highlight';
        let glyphClassName = 'text-red-500 font-bold';
        let rulerColor = '#ef4444';

        if (iss.severity === 'warning') {
          className = 'line-warning-highlight';
          glyphClassName = 'text-amber-500 font-bold';
          rulerColor = '#f59e0b';
        } else if (iss.severity === 'suggestion') {
          className = 'line-suggestion-highlight';
          glyphClassName = 'text-sky-400 font-bold';
          rulerColor = '#38bdf8';
        }

        newDecorations.push({
          range: {
            startLineNumber: lineNum,
            startColumn: 1,
            endLineNumber: lineNum,
            endColumn: 1000
          },
          options: {
            isWholeLine: true,
            className: className,
            glyphMarginClassName: glyphClassName,
            hoverMessage: { value: `**${iss.errorType || 'Issue'}**: ${iss.errorMessage || iss.explanation || ''}` },
            overviewRuler: {
              color: rulerColor,
              position: 4
            }
          }
        });
      });
    } else if (errorLine && errorLine > 0) {
      newDecorations.push({
        range: {
          startLineNumber: errorLine,
          startColumn: 1,
          endLineNumber: errorLine,
          endColumn: 1000
        },
        options: {
          isWholeLine: true,
          className: 'line-error-highlight',
          glyphMarginClassName: 'text-red-500 font-bold',
          hoverMessage: { value: errorMessage ? `**Error on Line ${errorLine}**: ${errorMessage}` : `Error on line ${errorLine}` },
          overviewRuler: {
            color: '#ef4444',
            position: 4
          }
        }
      });
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    if (errorLine && errorLine > 0) {
      editor.revealLineInCenter(errorLine);
    }
  }, [errorLine, errorMessage, issues, activeIssueLine]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const charCount = code.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="h-full flex flex-col bg-[#0B0F1A] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg">
      {/* Editor Header Toolbar */}
      <div className="p-2.5 sm:p-3 bg-[#0F172A] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Language Selector */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            <label htmlFor="language-select" className="sr-only">Programming Language</label>
          </div>
          <select
            id="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            className="bg-[#0B0F1A] border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-mono shadow-xs transition-colors"
          >
            {(Object.keys(LANGUAGE_MAP) as SupportedLanguage[]).map((langKey) => (
              <option key={langKey} value={langKey}>
                {LANGUAGE_MAP[langKey].label}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            id="btn-load-sample"
            onClick={onLoadSample}
            title="Load sample code for selected language"
            aria-label="Load sample code"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample</span>
          </button>

          {hasCorrectedCode && (
            <button
              id="btn-quick-fix"
              onClick={onApplyFix}
              title="Apply AI suggested code fix"
              aria-label="Apply AI suggested code fix"
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fix</span>
            </button>
          )}

          <button
            id="btn-copy-editor-code"
            onClick={handleCopy}
            title="Copy editor code"
            aria-label="Copy editor code"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="btn-clear-editor"
            onClick={onClear}
            title="Clear editor code"
            aria-label="Clear editor code"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 text-slate-400 rounded-lg transition-colors border border-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[480px] bg-[#0B0F1A] overflow-hidden">
        <Editor
          height="100%"
          language={LANGUAGE_MAP[language].monacoLang}
          value={code}
          theme="vs-dark"
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 20,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            padding: { top: 10, bottom: 10 }
          }}
          loading={
            <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">
              Loading code editor...
            </div>
          }
        />

        {/* Error warning badge if line error is highlighted */}
        {errorLine && (
          <div className="absolute top-2 right-3 bg-red-500/20 border border-red-500/40 text-red-300 px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center space-x-1.5 shadow-md backdrop-blur-md">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Line {errorLine} Highlighted</span>
          </div>
        )}
      </div>

      {/* Character Limit Warning Banner */}
      {isOverLimit && (
        <div className="px-3 py-2 bg-red-500/20 border-t border-red-500/40 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Your code is too large. Please keep it below 20,000 characters.</span>
          </div>
          <span className="font-mono font-bold text-red-400">{charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
        </div>
      )}

      {/* Editor Footer with Character Count & Prominent Analyze Button */}
      <div className="px-3 py-2.5 bg-[#0F172A] border-t border-slate-800/90 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span className={`font-mono ${isOverLimit ? 'text-red-400 font-bold' : ''}`}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline font-mono">UTF-8</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline font-mono text-slate-300">{LANGUAGE_MAP[language].label}</span>
        </div>

        {/* Prominent Analyze Button */}
        <button
          id="btn-analyze-code"
          onClick={onAnalyze}
          disabled={isLoading || isOverLimit}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all duration-150 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer ${
            isLoading || isOverLimit
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze Code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
