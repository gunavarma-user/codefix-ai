import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  RefreshCw, 
  RotateCcw,
  Copy,
  Check,
  Code2,
  HelpCircle,
  Lightbulb,
  ArrowLeft
} from 'lucide-react';
import { ChatMessage, AnalysisResult, SupportedLanguage } from '../types';
import { safeApiFetch } from '../lib/api';

interface AiChatPanelProps {
  language: SupportedLanguage;
  code: string;
  analysis: AnalysisResult | null;
  onBackToAnalysis?: () => void;
}

const STARTER_MESSAGE = "Hi! I'm your CodeFix Tutor. Ask me anything about your code or the error.";

const QUICK_QUESTIONS = [
  "Explain this error",
  "Explain like I'm a beginner",
  "Why did this happen?",
  "Why did you change this line?",
  "Show another solution",
  "How can I avoid this error?",
  "Explain this code step by step"
];

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  language,
  code,
  analysis,
  onBackToAnalysis
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: STARTER_MESSAGE,
      createdAt: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevContextRef = useRef<string>('');

  // Handle analysis/code change: Reset or load fresh context
  useEffect(() => {
    const currentContextKey = `${analysis?.id || ''}-${language}-${code.trim().substring(0, 100)}`;
    
    if (prevContextRef.current && prevContextRef.current !== currentContextKey) {
      // Different code or new analysis -> Start fresh tutor conversation
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content: STARTER_MESSAGE,
          createdAt: new Date().toISOString()
        }
      ]);
    }

    prevContextRef.current = currentContextKey;

    // If this analysis has an ID, try fetching stored chat history
    if (analysis?.id) {
      safeApiFetch<ChatMessage[]>(`/api/chat?analysis_id=${analysis.id}`)
        .then((savedChats) => {
          if (Array.isArray(savedChats) && savedChats.length > 0) {
            setMessages(savedChats);
          }
        })
        .catch(() => {
          // Keep local in-memory session if fetch fails
        });
    }
  }, [analysis?.id, language, code]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleClearConversation = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: STARTER_MESSAGE,
        createdAt: new Date().toISOString()
      }
    ]);
    setInput('');
  };

  const handleCopySnippet = (snippet: string, snippetId: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedCodeId(snippetId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString()
    };

    const currentHistory = [...messages, userMsg];
    setMessages(currentHistory);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const data = await safeApiFetch<{ reply: string; id?: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: messageText,
          language,
          code,
          analysis,
          analysisId: analysis?.id,
          chatHistory: currentHistory.map((m) => ({ role: m.role, content: m.content }))
        })
      });

      const botMsg: ChatMessage = {
        id: data.id || 'bot-' + Date.now(),
        role: 'assistant',
        content: data.reply || "I've reviewed your code. Let me know if you have any follow-up questions!",
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `⚠️ Sorry, I ran into an issue answering your question: ${err.message || 'Network error'}. Please try asking again!`,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0B0F1A] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg">
      {/* 1. Chat Header */}
      <div className="p-3 bg-gradient-to-r from-[#0F172A] to-[#0D1322] border-b border-slate-800/90 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-bold text-slate-100">CodeFix Tutor</h3>
              <span className="text-[9px] font-mono uppercase bg-[#0B0F1A] border border-slate-800 px-1.5 py-0.2 rounded text-emerald-400 font-bold">
                {language}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {analysis?.errorType ? `Active context: ${analysis.errorType}` : 'Ready for questions about your code'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleClearConversation}
            title="Clear conversation"
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 transition-colors border border-slate-700/60"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {onBackToAnalysis && (
            <button
              onClick={onBackToAnalysis}
              className="flex items-center space-x-1 text-[11px] text-emerald-300 hover:text-emerald-200 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/30"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Analysis</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Quick Question Action Chips */}
      <div className="px-3 py-2 bg-[#0E1526] border-b border-slate-800/80">
        <div className="flex items-center space-x-1 mb-1.5">
          <Sparkles className="w-3 h-3 text-teal-400" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Quick Questions:
          </span>
        </div>
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-[#0B0F1A] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-slate-700/70 hover:border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-xl p-3 text-xs leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                  : 'bg-[#0F172A] border border-slate-800/90 text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="prose prose-invert prose-xs max-w-none space-y-2">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const codeString = String(children).replace(/\n$/, '');
                        const snippetId = `snippet-${msg.id}-${Math.random().toString(36).substring(2, 6)}`;
                        
                        if (inline) {
                          return (
                            <code className="bg-[#0B0F1A] text-emerald-300 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-800 font-semibold" {...props}>
                              {children}
                            </code>
                          );
                        }

                        return (
                          <div className="relative my-2 rounded-lg bg-[#0B0F1A] border border-slate-800 overflow-hidden font-mono">
                            <div className="flex items-center justify-between px-2.5 py-1 bg-[#090D17] border-b border-slate-800/80 text-[10px] text-slate-400">
                              <span className="uppercase text-emerald-400 font-bold">{language}</span>
                              <button
                                type="button"
                                onClick={() => handleCopySnippet(codeString, snippetId)}
                                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                {copiedCodeId === snippetId ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400 text-[10px]">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span className="text-[10px]">Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-2.5 text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
                              <code>{children}</code>
                            </pre>
                          </div>
                        );
                      },
                      p({ children }) {
                        return <p className="mb-1.5 last:mb-0 text-slate-200 leading-relaxed">{children}</p>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-4 space-y-1 my-1.5 text-slate-300">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-4 space-y-1 my-1.5 text-slate-300">{children}</ol>;
                      },
                      h3({ children }) {
                        return <h3 className="font-bold text-slate-100 text-xs mt-2 mb-1">{children}</h3>;
                      },
                      strong({ children }) {
                        return <strong className="font-bold text-slate-100">{children}</strong>;
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-[#0F172A] p-2.5 rounded-xl border border-slate-800 max-w-xs shadow-sm">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Tutor is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Message Input Box */}
      <div className="p-2.5 bg-[#0F172A] border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your code, error, or logic..."
            disabled={isLoading}
            className="flex-1 bg-[#0B0F1A] border border-slate-700/80 text-slate-200 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 font-sans shadow-inner disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Send Message"
            className={`p-2.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              !input.trim() || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
