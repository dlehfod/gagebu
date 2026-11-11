import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// 본인 전용 로그인 화면 (Supabase Auth 이메일 + 비밀번호)
export const Login: React.FC = () => {
  // 마지막으로 로그인한 이메일을 이 기기에 기억 (코드에 이메일을 적지 않음)
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('app_login_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError('이메일 또는 비밀번호가 맞지 않아요.');
    } else {
      try {
        localStorage.setItem('app_login_email', email.trim());
      } catch {
        // 저장 실패해도 로그인은 그대로 진행
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4"
      >
        <div className="text-center">
          <div className="text-3xl">🐰</div>
          <h1 className="mt-2 text-lg font-black text-slate-900">가계부 로그인</h1>
        </div>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="이메일"
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl transition"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
};
