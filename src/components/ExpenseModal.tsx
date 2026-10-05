import React, { useState } from 'react';
import { CATEGORIES, getLocalDateString, type ExpenseCategory } from '../types';
import { storageService } from '../lib/storage';
import { X, Plus } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; category: ExpenseCategory; memo?: string; date: string; is_pending?: boolean }) => void;
  defaultCategory?: ExpenseCategory;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSubmit, defaultCategory = 'food' }) => {
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(defaultCategory);
  const [memo, setMemo] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [date, setDate] = useState(() => getLocalDateString());

  // 고정비 상태 (납부 예정 vs 납부 완료)
  const [isPending, setIsPending] = useState(true);

  // 고정비 구분 태그 상태
  const [fixedTags, setFixedTags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const loadTags = async () => {
    const tags = await storageService.getFixedTags();
    setFixedTags(tags);
  };

  React.useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setDate(getLocalDateString());
      loadTags();
    }
  }, [isOpen, defaultCategory]);

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const updated = await storageService.addFixedTag(newTagInput.trim());
    setFixedTags(updated);
    setMemo(newTagInput.trim());
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    const updated = await storageService.deleteFixedTag(tagToDelete);
    setFixedTags(updated);
    if (memo === tagToDelete) setMemo('');
  };

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
      category,
      memo: memo.trim() || undefined,
      date,
      is_pending: category === 'fixed' ? isPending : false,
    });

    // 초기화
    setAmountStr('');
    setMemo('');
    setShowMemo(false);
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
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            지출 빠른 기록 💸
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {/* 직접 터치하고 타이핑하는 금액 입력창 */}
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/60 text-center">
            <label htmlFor="expense-amount-input" className="text-xs text-slate-500 font-medium block mb-1">
              얼마를 썼나요?
            </label>
            
            <div className="relative flex items-center justify-center">
              <input
                id="expense-amount-input"
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={amountStr ? Number(amountStr).toLocaleString() : ''}
                onChange={handleAmountChange}
                className="w-full text-center text-3xl md:text-4xl font-black text-slate-900 bg-transparent outline-none tracking-tight pr-7 tabular-nums"
              />
              <span className="absolute right-3 sm:right-6 text-lg font-normal text-slate-400 pointer-events-none">
                원
              </span>
            </div>

            {/* 실시간 한글 금액 읽기 보조 (예: 4만 5,000원) */}
            <div className="h-5 mt-1 text-xs font-semibold text-rose-500">
              {koreanWonText}
            </div>

            {/* 금액 퀵 버튼 (+1천, +1만, +5만, +10만) */}
            <div className="flex justify-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60">
              {[
                { label: '+1천', val: 1000 },
                { label: '+1만', val: 10000 },
                { label: '+5만', val: 50000 },
                { label: '+10만', val: 100000 },
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

          {/* 범주 선택 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">어디에 썼나요?</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORIES) as ExpenseCategory[]).map((catKey) => {
                const info = CATEGORIES[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition text-sm font-semibold ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-2xl mb-1">{info.emoji}</span>
                    <span>{info.label}</span>
                    {info.isDiscretionary && (
                      <span className="text-[10px] text-amber-600 font-semibold mt-0.5">자유소비</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 고정비 세부 구분 칩 및 직접 추가 기능 */}
          {category === 'fixed' && (
            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
              {/* 납부 예정 vs 납부 완료 토글 */}
              <div className="flex bg-emerald-100/60 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsPending(true)}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    isPending
                      ? 'bg-white text-emerald-900 shadow-xs font-bold'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  📅 납부 예정 (앞으로 나갈 돈)
                </button>
                <button
                  type="button"
                  onClick={() => setIsPending(false)}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    !isPending
                      ? 'bg-white text-rose-600 shadow-xs font-bold'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  ✓ 납부 완료 (실제 출금됨)
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>🏠</span>
                  <span>고정비 구분 (터치하여 선택)</span>
                </span>
                {!isAddingTag && (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200/80 px-2 py-0.5 rounded-lg transition shadow-xs flex items-center gap-0.5"
                  >
                    <Plus size={11} />
                    <span>새 구분 만들기</span>
                  </button>
                )}
              </div>

              {/* 새 태그 직접 만들기 폼 */}
              {isAddingTag && (
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="새 구분 이름 (예: 헬스장, 청약통장)"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="flex-1 bg-white border border-emerald-300 rounded-xl px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingTag(false); setNewTagInput(''); }}
                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded-xl text-xs"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 고정비 태그 칩 목록 */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {fixedTags.map((tag) => {
                  const isSelected = memo === tag;
                  return (
                    <div
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-emerald-200/70 hover:bg-emerald-50/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMemo(tag);
                        }}
                        className="truncate"
                      >
                        {tag}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`'${tag}' 구분을 목록에서 삭제하시겠습니까?`)) {
                            handleDeleteTag(tag);
                          }
                        }}
                        className={`text-[11px] px-1 rounded-full hover:bg-black/10 transition ${
                          isSelected ? 'text-white' : 'text-slate-400 hover:text-rose-500'
                        }`}
                        title="구분 삭제"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 메모 토글 */}
          <div>
            {!showMemo ? (
              <button
                type="button"
                onClick={() => setShowMemo(true)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium transition"
              >
                + 메모 및 날짜 수정 (선택)
              </button>
            ) : (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-400"
                />
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모 입력 (예: 친구와 점심, 올리브영)"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-400"
                />
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          <button
            type="submit"
            disabled={!amountStr || parseInt(amountStr, 10) <= 0}
            className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition shadow-lg shadow-rose-500/20 text-base"
          >
            기록 완료하기
          </button>
        </form>
      </div>
    </div>
  );
};
