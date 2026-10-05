import React, { useState } from 'react';
import { type Expense, type Income, CATEGORIES } from '../types';
import { EditModal } from './EditModal';
import { PieChart, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface HistoryListProps {
  incomes: Income[];
  expenses: Expense[];
  onUpdateItem: (data: { id: string; amount: number; date: string; memo?: string; category?: any; isExpense: boolean; is_pending?: boolean }) => void;
  onDeleteItem: (id: string, isExpense: boolean) => void;
  onToggleExpensePending?: (id: string, is_pending: boolean) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  incomes,
  expenses,
  onUpdateItem,
  onDeleteItem,
  onToggleExpensePending,
}) => {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryBreakdownOpen, setIsCategoryBreakdownOpen] = useState(true);

  // 이번 달 기준 계산
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // 현재 선택된 년-월 (기본값: 이번 달)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [isAllTime, setIsAllTime] = useState(false); // 전체 기간 보기 모드

  // 월 이동 핸들러
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
    setSelectedCategory(null);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
    setSelectedCategory(null);
  };

  const [selectedYear, selectedMonthNum] = selectedMonth.split('-');
  const isCurrentMonth = selectedMonth === currentMonthStr;

  // 선택된 달의 데이터 필터링 (전체 기간 모드일 땐 전체)
  const targetExpenses = isAllTime ? expenses : expenses.filter(e => e.date.startsWith(selectedMonth));
  const targetIncomes = isAllTime ? incomes : incomes.filter(i => i.date.startsWith(selectedMonth));

  // 실제 지출(납부 완료) vs 납부 예정 분리
  const actualExpenses = targetExpenses.filter(e => !e.is_pending);
  const pendingExpenses = targetExpenses.filter(e => e.is_pending);

  const totalExpense = actualExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPendingExpense = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = targetIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalSaved = totalIncome - totalExpense;

  // 카테고리별 합계 계산 (실제 지출 기준)
  const categoryMap: Record<string, number> = {};
  actualExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .map(([catKey, amount]) => {
      const catInfo = CATEGORIES[catKey as keyof typeof CATEGORIES];
      const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        key: catKey,
        label: catInfo?.label || catKey,
        emoji: catInfo?.emoji || '🏷️',
        amount,
        percent,
      };
    });

  // 데이터 합치기 및 날짜 최신순 정렬
  const allItems = [
    ...targetExpenses.map(e => ({ ...e, isExpense: true as const })),
    ...targetIncomes.map(i => ({ ...i, isExpense: false as const })),
  ].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  const filteredItems = allItems.filter(item => {
    if (filterType === 'expense' && !item.isExpense) return false;
    if (filterType === 'income' && item.isExpense) return false;
    if (selectedCategory) {
      if (!item.isExpense) return false;
      if (item.category !== selectedCategory) return false;
    }
    return true;
  });

  // 날짜별 그룹핑
  const groupedByDate: Record<string, typeof filteredItems> = {};
  filteredItems.forEach(item => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = [];
    }
    groupedByDate[item.date].push(item);
  });

  // 최신 날짜가 맨 위로 오도록 내림차순 정렬
  const dates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const formatDateTitle = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const targetDate = new Date(`${dateStr}T00:00:00`);
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = days[targetDate.getDay()] || '';

      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;

      return {
        label: `${m}월 ${d}일 (${dayName})`,
        isToday,
      };
    } catch {
      return { label: dateStr, isToday: false };
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. 상단 년/월 네비게이터 & 요약 배너 */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            disabled={isAllTime}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="이전 달"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center">
            {isAllTime ? (
              <span className="text-base md:text-lg font-bold text-slate-800">전체 기간 내역</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {selectedYear}년 {parseInt(selectedMonthNum, 10)}월
                </span>
                {isCurrentMonth ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full border border-emerald-200/60">
                    이번 달
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedMonth(currentMonthStr)}
                    className="text-[10px] bg-slate-100 text-slate-600 hover:text-slate-900 font-medium px-2 py-0.5 rounded-full transition"
                  >
                    이번 달로
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setIsAllTime(!isAllTime)}
              className="text-[11px] text-slate-400 hover:text-slate-600 mt-0.5 underline transition"
            >
              {isAllTime ? '월별로 보기' : '전체 기간 모아보기'}
            </button>
          </div>

          <button
            onClick={handleNextMonth}
            disabled={isAllTime}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="다음 달"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 해당 월의 3대 요약 지표 */}
        <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
          <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 block">수입</span>
            <span className="text-xs md:text-sm font-bold text-emerald-600 tabular-nums">
              +{totalIncome.toLocaleString()}원
            </span>
          </div>
          <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 block">실제 지출</span>
            <span className="text-xs md:text-sm font-bold text-slate-800 tabular-nums">
              {totalExpense > 0 ? '-' : ''}{totalExpense.toLocaleString()}원
            </span>
          </div>
          <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 block">남긴 돈</span>
            <span className={`text-xs md:text-sm font-extrabold tabular-nums ${totalSaved >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {totalSaved > 0 ? '+' : ''}{totalSaved.toLocaleString()}원
            </span>
          </div>
        </div>

        {totalPendingExpense > 0 && (
          <div className="mt-3 py-2 px-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="font-semibold">납부 예정 고정비</span>
              <span className="text-[10px] text-amber-600">(지출 합계 미포함)</span>
            </div>
            <span className="font-bold text-amber-900 tabular-nums">
              {totalPendingExpense.toLocaleString()}원
            </span>
          </div>
        )}
      </section>

      {/* 2. 카테고리별 지출 분석 카드 */}
      {totalExpense > 0 && filterType !== 'income' && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart size={16} className="text-emerald-500" />
              <h3 className="text-xs md:text-sm font-bold text-slate-900">
                {isAllTime ? '전체' : `${parseInt(selectedMonthNum, 10)}월`} 지출 분류
              </h3>
              <span className="text-[11px] text-slate-400 tabular-nums">
                총 {totalExpense.toLocaleString()}원
              </span>
            </div>
            <button
              onClick={() => setIsCategoryBreakdownOpen(!isCategoryBreakdownOpen)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
            >
              {isCategoryBreakdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {isCategoryBreakdownOpen && (
            <div className="mt-3.5 space-y-2.5">
              <div className="text-[11px] text-slate-500 mb-1">
                카테고리를 누르면 해당 항목 지출만 모아볼 수 있습니다.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryBreakdown.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(isSelected ? null : cat.key)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400'
                          : 'bg-slate-50/80 border-slate-200/60 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{cat.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {cat.label}
                          </div>
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            {cat.percent}%
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-900 tabular-nums text-right">
                        {cat.amount.toLocaleString()}원
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 선택된 카테고리 필터 해제 배너 */}
      {selectedCategory && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 px-3 flex items-center justify-between text-xs">
          <span className="text-emerald-800 font-medium">
            <strong>{CATEGORIES[selectedCategory as keyof typeof CATEGORIES]?.emoji} {CATEGORIES[selectedCategory as keyof typeof CATEGORIES]?.label}</strong> 지출만 모아보는 중
          </span>
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200/80 px-2 py-0.5 rounded-md transition shadow-xs"
          >
            <span>전체보기</span>
            <X size={12} />
          </button>
        </div>
      )}

      {/* 상단 필터 탭 */}
      <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
        {(['all', 'expense', 'income'] as const).map(type => (
          <button
            key={type}
            onClick={() => {
              setFilterType(type);
              if (type === 'income') setSelectedCategory(null);
            }}
            className={`flex-1 py-2 rounded-xl transition ${
              filterType === type 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {type === 'all' ? '전체' : type === 'expense' ? '지출' : '수입'}
          </button>
        ))}
      </div>

      {dates.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-slate-400 text-xs leading-relaxed shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {isAllTime ? '아직 기록된 내역이 없습니다.' : `${selectedYear}년 ${parseInt(selectedMonthNum, 10)}월에는 기록된 내역이 없습니다.`}
          <br />하단의 + 버튼을 눌러 지출이나 수입을 기록해보세요!
        </div>
      ) : (
        dates.map(date => {
          const items = groupedByDate[date];
          const { label, isToday } = formatDateTitle(date);
          const daySpent = items.filter(i => i.isExpense && !i.is_pending).reduce((sum, i) => sum + i.amount, 0);
          const dayPending = items.filter(i => i.isExpense && i.is_pending).reduce((sum, i) => sum + i.amount, 0);
          const dayIncome = items.filter(i => !i.isExpense).reduce((sum, i) => sum + i.amount, 0);

          return (
            <div key={date} className="space-y-2">
              <div className="text-xs font-bold text-slate-500 px-1 flex flex-wrap items-center justify-between gap-1 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-800 font-extrabold text-xs md:text-sm">{label}</span>
                  {isToday && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                      오늘
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="text-slate-600 font-medium">
                    총수입 <strong className="text-emerald-600 font-bold">+{dayIncome.toLocaleString()}원</strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-medium">
                    총지출 <strong className="text-slate-900 font-bold">{daySpent > 0 ? `-${daySpent.toLocaleString()}원` : '0원'}</strong>
                  </span>
                  {dayPending > 0 && (
                    <span className="text-amber-600 text-[11px] font-medium">
                      (예정 {dayPending.toLocaleString()}원)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                {items.map(item => {
                  const isExp = item.isExpense;
                  const isPending = isExp && Boolean(item.is_pending);
                  const catInfo = isExp ? CATEGORIES[item.category] : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                          !isExp
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : isPending
                              ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isExp ? catInfo?.emoji : '💰'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{item.memo || (isExp ? catInfo?.label : '수입')}</span>
                            {isPending && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold border border-amber-300 shrink-0">
                                납부 예정
                              </span>
                            )}
                            {isExp && !isPending && item.category === 'fixed' && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold border border-emerald-200/80 shrink-0">
                                납부 완료 ✓
                              </span>
                            )}
                            {isExp && catInfo?.isDiscretionary && (
                              <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-medium border border-amber-200/60 shrink-0">
                                자유소비
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{isExp ? catInfo?.label : '수입'}</span>
                            {isPending && (
                              <span className="text-amber-600 font-medium">· 지출 미차감</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                        <div className={`text-sm font-bold tabular-nums ${
                          !isExp
                            ? 'text-emerald-600'
                            : isPending
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-900'
                        }`}>
                          {!isExp
                            ? `+${item.amount.toLocaleString()}원`
                            : isPending
                              ? `${item.amount.toLocaleString()}원`
                              : `-${item.amount.toLocaleString()}원`}
                        </div>
                        {isExp && item.category === 'fixed' && onToggleExpensePending && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleExpensePending(item.id, !isPending);
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${
                              isPending
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                            }`}
                            title="클릭 시 납부 예정 / 납부 완료 상태를 즉시 전환합니다"
                          >
                            {isPending ? '납부완료 처리' : '예정으로 변경'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* 수정 및 삭제 모달 */}
      <EditModal
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={onUpdateItem}
        onDelete={onDeleteItem}
      />
    </div>
  );
};
