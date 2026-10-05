import React, { useState, useEffect } from 'react';
import { CATEGORIES, type ExpenseCategory, type Expense, type Income } from '../types';
import { X, Trash2 } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  item: (Expense & { isExpense: true }) | (Income & { isExpense: false }) | null;
  onClose: () => void;
  onUpdate: (updatedData: { id: string; amount: number; date: string; memo?: string; category?: ExpenseCategory; isExpense: boolean; is_pending?: boolean }) => void;
  onDelete: (id: string, isExpense: boolean) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, item, onClose, onUpdate, onDelete }) => {
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (item) {
      setAmountStr(String(item.amount));
      setDate(item.date);
      setMemo(item.memo || '');
      if (item.isExpense) {
        setCategory(item.category);
        setIsPending(Boolean(item.is_pending));
      }
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountStr(raw);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr, 10);
    if (!amount || amount <= 0) return;

    onUpdate({
      id: item.id,
      amount,
      date,
      memo: memo.trim() || undefined,
      category: item.isExpense ? category : undefined,
      isExpense: item.isExpense,
      is_pending: item.isExpense ? isPending : undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('정말 이 내역을 삭제하시겠습니까?')) {
      onDelete(item.id, item.isExpense);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div 
        className="w-full sm:max-w-md bg-white border border-slate-200/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${item.isExpense ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
            {item.isExpense ? '지출 내역 수정' : '수입 내역 수정'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">금액</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountStr ? Number(amountStr).toLocaleString() : ''}
                onChange={handleAmountChange}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 text-lg font-bold text-slate-900 focus:outline-none focus:border-slate-400"
              />
              <span className="absolute right-4 top-3.5 text-sm text-slate-400">원</span>
            </div>
          </div>

          {item.isExpense && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">지출 범주</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CATEGORIES) as ExpenseCategory[]).map((catKey) => {
                  const info = CATEGORIES[catKey];
                  const isSelected = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-xs font-semibold ${
                        isSelected
                          ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl mb-0.5">{info.emoji}</span>
                      <span>{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {item.isExpense && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">납부 상태</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPending(false)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    !isPending
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>✓ 납부 완료</span>
                  <span className="text-[10px] font-normal text-emerald-600">(지출 반영)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPending(true)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isPending
                      ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>⏳ 납부 예정</span>
                  <span className="text-[10px] font-normal text-amber-600">(지출 미반영)</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">메모</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 입력"
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl transition flex items-center justify-center"
              title="삭제"
            >
              <Trash2 size={18} />
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition text-sm shadow-md shadow-slate-900/10"
            >
              수정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
