import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '@/weaver/signals/lib/auth/supabaseClient';
import { FcGoogle } from 'react-icons/fc';
import Logo from '../TopNav/Logo.jsx';

const LOCAL_REDIRECT = 'http://localhost:8888';
const ENV_SITE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SITE_URL) ||
  LOCAL_REDIRECT;

const FRONTEND_URL =
  typeof window !== 'undefined' && window.location?.origin?.includes('localhost')
    ? LOCAL_REDIRECT
    : ENV_SITE_URL;

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (profile: { email: string; role: string }) => void;
}) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setEmail('');
      setCode('');
      setMsg(null);
      setLoading(false);
    }
  }, [isOpen]);

  async function handleGoogle() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${FRONTEND_URL}`,
      },
    });
    setLoading(false);
    if (error) setMsg({ text: error.message, type: 'error' });
  }

  async function sendOtp() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      setMsg({ text: error.message, type: 'error' });
    } else {
      setMsg({ text: 'Check your inbox for the OTP code.', type: 'success' });
      setStep('code');
    }
  }

  async function verifyCode() {
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setMsg({ text: error.message, type: 'error' });
    } else if (data.session) {
      setMsg({ text: 'Login successful!', type: 'success' });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (step === 'email') {
      if (!email) return;
      sendOtp();
    } else {
      if (!code) return;
      verifyCode();
    }
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-white/75 backdrop-blur-[1px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className={`login-panel relative mx-auto w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-white/95 to-emerald-50/70 shadow-[0_45px_140px_rgba(15,118,110,0.22)] transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_65%),_radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_60%)]" />
          <div className="relative p-10 md:p-12 bg-white/90 backdrop-blur-sm">
              <div className="flex flex-col items-center mb-8 text-center space-y-3">
                <Logo />
                <h2 className="text-[1.9rem] font-semibold text-gray-900">Welcome back to InspiraGraph</h2>
                <p className="text-gray-500 max-w-sm">
                  Generate story points, curate slides, and export decks with one harmonious workflow.
                </p>
              </div>

              {msg && (
                <div className="mb-6 rounded-2xl border bg-white/95 shadow-sm px-4 py-3 w-full text-sm font-medium text-center">
                  <span className={msg.type === 'error' ? 'text-red-700' : 'text-emerald-700'}>{msg.text}</span>
                </div>
              )}

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="login-btn w-full flex items-center justify-center mb-6 border border-gray-200 shadow-md rounded-2xl px-4 py-3 hover:bg-gray-50 disabled:opacity-60"
              >
                <FcGoogle className="w-5 h-5 mr-2" />
                Continue with Google
              </button>

              <div className="relative text-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dashed border-gray-200" />
                </div>
                <span className="relative bg-white px-3 text-gray-400 text-xs tracking-[0.2em]">OR</span>
              </div>

              {step === 'email' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="you@example.com"
                    autoFocus
                    className="login-input w-full rounded-2xl border border-gray-200 bg-white/85 shadow-inner px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
                  />
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="login-primary-btn w-full py-3 rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-60"
                  >
                    {loading ? 'Sending…' : 'Send OTP Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-center text-sm text-gray-500">Enter the 6-digit code from your email</p>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    required
                    disabled={loading}
                    placeholder="123456"
                    autoFocus
                    inputMode="numeric"
                    className="login-input w-full rounded-2xl border border-gray-200 bg-white/85 shadow-inner px-4 py-3 tracking-[0.5em] text-center text-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
                  />
                  <button
                    type="submit"
                    disabled={loading || !code}
                    className="login-primary-btn w-full py-3 rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-60"
                  >
                    {loading ? 'Verifying…' : 'Verify & Login'}
                  </button>
                </form>
              )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
