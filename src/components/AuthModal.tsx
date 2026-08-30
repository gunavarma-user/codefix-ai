import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { safeApiFetch } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { username_or_email: username || email, password }
        : { name: name || username, username, email, password };

      const data = await safeApiFetch<{ access_token: string; user: User }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      localStorage.setItem('codefix_token', data.access_token);
      onSuccess(data.user, data.access_token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await safeApiFetch<{ access_token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username_or_email: 'demo_student', password: 'demo1234' })
      });
      localStorage.setItem('codefix_token', data.access_token);
      onSuccess(data.user, data.access_token);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="bg-[#0F172A] border border-slate-800/90 rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2.5 text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <h2 id="auth-modal-title" className="text-base font-bold text-slate-100">
            {mode === 'login' ? 'Welcome Back to CodeFix AI' : 'Create Student Account'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {mode === 'login'
              ? 'Log in to access your analysis history and progress stats'
              : 'Sign up to keep your code debugging history organized'}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full bg-[#0B0F1A] border border-slate-700/80 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 font-sans"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. codenewbie"
                    className="w-full bg-[#0B0F1A] border border-slate-700/80 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 font-sans"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {mode === 'login' ? 'Username or Email' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type={mode === 'register' ? 'email' : 'text'}
                required
                value={mode === 'login' ? (username || email) : email}
                onChange={(e) => {
                  if (mode === 'login') {
                    setUsername(e.target.value);
                    setEmail(e.target.value);
                  } else {
                    setEmail(e.target.value);
                  }
                }}
                placeholder={mode === 'login' ? 'student@codefix.ai or username' : 'student@codefix.ai'}
                className="w-full bg-[#0B0F1A] border border-slate-700/80 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0B0F1A] border border-slate-700/80 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm shadow-emerald-500/20 disabled:opacity-50 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
          >
            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Mode switcher & Demo Account */}
        <div className="mt-4 pt-3 border-t border-slate-800/90 text-center space-y-2.5">
          <p className="text-xs text-slate-400">
            {mode === 'login' ? "Don't have an account yet?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 ml-1"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-2 rounded-xl bg-[#0B0F1A] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700/70 transition-colors flex items-center justify-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Use Demo Account (1-Click)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
