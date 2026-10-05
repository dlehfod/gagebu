import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getLocalDateString } from '../types';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; memo?: string; date: string }) => void;
}

export const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [amountStr, setAmountStr] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(() => getLocalDateString());

  React.useEffect(() => {
    if (isOpen) {
      setDate(getLocalDateString());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountStr(raw);
  };

  const addAmount = (addVal: number) => {
    const current = parseInt(amountStr || '0', 10);
    setAmountStr(String(current + addVal));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr, 10);
    if (!amount || amount <= 0) return;

    onSubmit({
      amount,
      memo: memo.trim() || undefined,
      date,
    });

    setAmountStr('');
    setMemo('');
    onClose();
  };

  const formatKoreanWon = (num: number): string => {
    if (!num || num <= 0) return '';
    const man = Math.floor(num / 10000);
    const remainder = num % 10000;
    if (man > 0 && remainder > 0) {
      return `${man.toLocaleString()}만 ${remainder.toLocaleString()}원`;
    }
    if (man > 0) {
      return `${man.toLocaleString()}만원`;
    }
    return `${remainder.toLocaleString()}원`;
  };

  const koreanWonText = amountStr ? formatKoreanWon(Number(amountStr)) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div 
        className="w-full sm:max-w-md bg-white border border-slate-200/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            수입 빠른 기록 💰
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 text-center">
            <label htmlFor="income-amount-input" className="text-xs text-slate-500 font-medium block mb-1">
              얼마가 들어왔나요?
            </label>
            <div className="relative flex items-center justify-center">
              <input
                id="income-amount-input"
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={amountStr ? Number(amountStr).toLocaleString() : ''}
                onChange={handleAmountChange}
                className="w-full text-center text-3xl md:text-4xl font-black text-emerald-600 bg-transparent outline-none tracking-tight pr-7 tabular-nums"
              />
              <span className="absolute right-3 sm:right-6 text-lg font-normal text-slate-400 pointer-events-none">
                원
              </span>
            </div>

            {/* 실시간 한글 금액 읽기 보조 */}
            <div className="h-5 mt-1 text-xs font-semibold text-emerald-600">
              {koreanWonText}
            </div>

            {/* 금액 퀵 버튼 (+5만, +10만, +50만, +100만) */}
            <div className="flex justify-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60">
              {[
                { label: '+5만', val: 50000 },
                { label: '+10만', val: 100000 },
                { label: '+50만', val: 500000 },
                { label: '+100만', val: 1000000 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addAmount(val)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200/80 shadow-xs transition"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="px-2 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200/60 transition"
              >
                지우기
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">출처 / 메모 (선택)</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 월급, 부업 정산, 용돈"
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!amountStr || parseInt(amountStr, 10) <= 0}
            className="w-full py-3.5 bg-[#10B981] hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 text-base"
          >
            수입 기록 완료하기
          </button>
        </form>
      </div>
    </div>
  );
};
