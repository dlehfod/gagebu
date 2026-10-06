import React, { useState } from 'react';
import { getLocalDateString, type Income, type Expense, type Asset, type Settings, type FixedExpense, CATEGORIES } from '../types';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Wallet, 
  ArrowUpRight, 
  CheckCircle2, 
  Circle,
  Edit2,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { EditModal } from './EditModal';

interface DashboardProps {
  incomes: Income[];
  expenses: Expense[];
  assets: Asset[];
  settings: Settings;
  fixedExpenses: FixedExpense[];
  paidFixedIds: string[];
  onToggleFixedPaid: (id: string, willBePaid: boolean) => void;
  onAddFixedExpense?: (item: Omit<FixedExpense, 'id' | 'created_at'>) => void;
  onDeleteFixedExpense?: (id: string) => void;
  onDirectUpdateNetWorth: (newAmount: number) => void;
  onOpenExpense: (category?: any) => void;
  onOpenIncome: () => void;
  onNavigateHistory?: () => void;
  onUpdateItem?: (data: any) => void;
  onDeleteItem?: (id: string, isExpense: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  incomes,
  expenses,
  assets,
  settings,
  fixedExpenses,
  paidFixedIds,
  onToggleFixedPaid,
  onAddFixedExpense,
  onDeleteFixedExpense,
  onDirectUpdateNetWorth,
  onOpenExpense,
  onOpenIncome,
  onNavigateHistory,
  onUpdateItem,
  onDeleteItem,
}) => {
  // 전재산 수정 모달 상태
  const [isAssetEditOpen, setIsAssetEditOpen] = useState(false);
  const [editAssetAmount, setEditAssetAmount] = useState('');

  // 고정비 추가 모달 상태
  const [isAddFixedOpen, setIsAddFixedOpen] = useState(false);
  const [fixedName, setFixedName] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [fixedDay, setFixedDay] = useState('10');

  // 내역 수정 모달 상태
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  // 과거 내역 접기/펼치기 상태 (기본: 접힘)
  const [isPastHistoryOpen, setIsPastHistoryOpen] = useState(false);


  // 날짜 계산 (오늘 및 선택된 달 기준)
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // 과거/미래 월 탐색 상태 (기본값: 이번 달)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const isCurrentMonth = selectedMonth === currentMonthStr;

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
  };

  const [sYear, sMonth] = selectedMonth.split('-').map(Number);
  const selectedMonthLabel = `${sYear}년 ${sMonth}월`;

  // 1. 단순 전재산 (순자산)
  const totalAssets = assets
    .filter(a => a.type === 'asset')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalDebt = assets
    .filter(a => a.type === 'debt')
    .reduce((sum, a) => sum + a.amount, 0);
  const netWorth = totalAssets - totalDebt;

  // 2. 오늘 데이터 (오늘 수입, 오늘 지출)
  const todayIncomes = incomes
    .filter(i => i.date === todayStr)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const todayExpenses = expenses
    .filter(e => e.date === todayStr && !e.is_pending)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  const todayRevenue = todayIncomes.reduce((sum, i) => sum + i.amount, 0);
  const todaySpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 3. 고정비 계산 (이번 달)
  const pendingFixedList = fixedExpenses.filter(f => !paidFixedIds.includes(f.id));
  const paidFixedList = fixedExpenses.filter(f => paidFixedIds.includes(f.id));

  // 4. 선택된 달의 쓸 용돈 (고정비, 사업비 제외한 순수 생활 용돈 한도 100만원)
  const monthlyAllowanceLimit = settings.monthly_discretionary_limit || 1000000;

  // 선택된 달에 사용한 순수 생활 용돈 (고정비, 사업비 제외)
  const targetMonthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth) && !e.is_pending);
  const monthUsedAllowance = targetMonthExpenses
    .filter(e => e.category !== 'fixed' && e.category !== 'business')
    .reduce((sum, e) => sum + e.amount, 0);

  // 선택된 달 남은 용돈 (100만원 - 쓴 생활비)
  const remainingAllowance = monthlyAllowanceLimit - monthUsedAllowance;

  // 에너지바 사용률(%) 계산
  const rawPercent = Math.round((monthUsedAllowance / monthlyAllowanceLimit) * 100);
  const energyPercent = Math.min(Math.max(rawPercent, 0), 100);
  const energyBarColor = 
    rawPercent >= 100 
      ? 'from-rose-500 to-red-600' 
      : rawPercent >= 75 
      ? 'from-amber-400 to-orange-500' 
      : 'from-emerald-400 to-teal-500';

  // 5. 과거 날짜별 내역 (선택된 달의 지난 날짜 기록)
  const pastHistory = [
    ...expenses.filter(e => e.date !== todayStr && (isCurrentMonth ? true : e.date.startsWith(selectedMonth))).map(e => ({ ...e, isExpense: true })),
    ...incomes.filter(i => i.date !== todayStr && (isCurrentMonth ? true : i.date.startsWith(selectedMonth))).map(i => ({ ...i, isExpense: false })),
  ].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  const groupedPastByDate: Record<string, typeof pastHistory> = {};
  pastHistory.forEach(item => {
    if (!groupedPastByDate[item.date]) {
      groupedPastByDate[item.date] = [];
    }
    groupedPastByDate[item.date].push(item);
  });

  // 어제 날짜 구하기
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // 과거 내역에서 기록된 날짜 목록 (최신순)
  const pastDates = Object.keys(groupedPastByDate);
  
  // 선택된 특정 과거 날짜 상태 (기본: 최근 기록 날짜 또는 어제)
  const [selectedPastDate, setSelectedPastDate] = useState<string>(
    pastDates.length > 0 ? pastDates[0] : yesterdayStr
  );
  // 전체 날짜 한 번에 보기 vs 특정 날짜 넘겨보기 모드
  const [viewAllPastDates, setViewAllPastDates] = useState(false);

  // 하루 전으로 넘기기 (<)
  const handlePrevDay = () => {
    const cur = new Date(selectedPastDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedPastDate(getLocalDateString(cur));
    setViewAllPastDates(false);
  };

  // 하루 뒤로 넘기기 (>)
  const handleNextDay = () => {
    const cur = new Date(selectedPastDate);
    cur.setDate(cur.getDate() + 1);
    const nextStr = getLocalDateString(cur);
    if (nextStr <= todayStr) {
      setSelectedPastDate(nextStr);
      setViewAllPastDates(false);
    }
  };

  // 선택된 특정 과거 날짜의 내역 계산
  const selectedDateItems = pastHistory.filter(it => it.date === selectedPastDate);
  const selectedDateIncome = selectedDateItems.filter(it => !it.isExpense).reduce((s, it) => s + it.amount, 0);
  const selectedDateExpense = selectedDateItems.filter(it => it.isExpense && !(it as any).is_pending).reduce((s, it) => s + it.amount, 0);

  // 선택된 달 번 돈 (수입 합계)
  const targetMonthIncomes = incomes.filter(i => i.date.startsWith(selectedMonth));
  const monthRevenue = targetMonthIncomes.reduce((sum, i) => sum + i.amount, 0);

  // 전재산 수정 저장
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(editAssetAmount.replace(/,/g, ''), 10);
    if (!isNaN(parsed)) {
      onDirectUpdateNetWorth(parsed);
      setIsAssetEditOpen(false);
    }
  };

  // 새 고정비 추가 저장
  const handleSaveFixed = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(fixedAmount.replace(/,/g, ''), 10);
    const dayNum = parseInt(fixedDay, 10) || 1;
    if (fixedName.trim() && !isNaN(amountNum) && amountNum > 0) {
      onAddFixedExpense?.({
        name: fixedName.trim(),
        amount: amountNum,
        payment_day: dayNum,
        auto_add: false,
        active: true,
      });
      setFixedName('');
      setFixedAmount('');
      setFixedDay('10');
      setIsAddFixedOpen(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-5 pb-24 md:pb-12 max-w-2xl mx-auto">
      {/* 0. 월 이동 네비게이터 (과거 달 / 다음 달 이동 화살표 & 달력) */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition"
            title="이전 달 내역 보기 (과거로 이동)"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar size={16} className="text-emerald-600 shrink-0" />
            <span className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight">
              {selectedMonthLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition"
            title="다음 달 내역 보기"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {!isCurrentMonth ? (
          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-95 px-3 py-1 rounded-full transition border border-emerald-200"
          >
            이번 달로
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
            이번 달
          </span>
        )}
      </div>

      {/* 1. 내 전재산 카드 (숫자만 큼직하게) */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-emerald-900/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-100 text-xs md:text-sm font-medium">
            <Wallet size={16} />
            <span>단순 전재산</span>
          </div>
          <button
            onClick={() => {
              setEditAssetAmount(netWorth.toString());
              setIsAssetEditOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 active:scale-95 transition text-white px-3 py-1.5 rounded-full font-medium backdrop-blur-xs"
          >
            <Edit2 size={12} />
            <span>수정</span>
          </button>
        </div>

        <div className="mt-4 flex items-baseline">
          <span className="text-4xl md:text-5xl font-black tracking-tight tabular-nums">
            {netWorth.toLocaleString()}
          </span>
          <span className="ml-2 text-lg md:text-xl font-medium text-emerald-200">원</span>
        </div>
        <p className="mt-2 text-xs text-emerald-100/80">
          통장 잔고와 자산을 합친 실제 내 돈입니다.
        </p>
      </section>

      {/* 2. 요약 카드: 번 돈 & 쓸 용돈 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {/* 번 돈 */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
              <h3 className="text-sm md:text-base font-extrabold text-slate-900">
                {isCurrentMonth ? '이번달 번 돈' : `${sMonth}월 번 돈`}
              </h3>
              <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
                {isCurrentMonth ? `${now.getMonth() + 1}월 누적` : `${sMonth}월 전체`}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium mt-1">
              총 매출 (수입 합계)
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl md:text-3xl font-black text-emerald-600 tabular-nums">
                +{monthRevenue.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-slate-400">원</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <ArrowUpRight size={13} className="text-emerald-600" />
              <span>{isCurrentMonth ? '오늘 번 돈' : `${sMonth}월 수입 건수`}: <strong className="text-slate-800">{isCurrentMonth ? `+${todayRevenue.toLocaleString()}원` : `${targetMonthIncomes.length}건`}</strong></span>
            </div>
            <div className="text-[11px] text-slate-400">
              총 {targetMonthIncomes.length}건
            </div>
          </div>
        </div>

        {/* 쓸 용돈 카드 (남은 용돈 중심 & 에너지바) */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm md:text-base font-extrabold text-slate-900">
                {isCurrentMonth ? '이번달 쓸 용돈' : `${sMonth}월 쓴 용돈`}
              </h3>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                한도 {monthlyAllowanceLimit.toLocaleString()}원
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium mt-1">
              {isCurrentMonth ? '남은 용돈 (고정·사업비 제외)' : `${sMonth}월 잔여 예산`}
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className={`text-2xl md:text-3xl font-black tabular-nums ${remainingAllowance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {remainingAllowance >= 0 ? remainingAllowance.toLocaleString() : `-${Math.abs(remainingAllowance).toLocaleString()}`}
              </span>
              <span className="text-sm font-medium text-slate-400">원</span>
            </div>

            {/* 에너지바 (게이지 차는 그래픽) */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">사용률</span>
                <span className="font-bold tabular-nums text-slate-700">
                  {rawPercent}% 사용 ({monthUsedAllowance.toLocaleString()}원 씀)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${energyBarColor} transition-all duration-500 shadow-xs`}
                  style={{ width: `${energyPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>고정비와 사업비는 제외된 순수 생활비입니다.</span>
          </div>
        </div>
      </div>

      {/* 3. 수입 / 지출 초간편 입력 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenIncome}
          className="h-13 bg-white hover:bg-slate-50 active:scale-[0.98] text-emerald-600 border-2 border-emerald-500/40 hover:border-emerald-500 font-bold text-sm md:text-base rounded-2xl transition shadow-xs flex items-center justify-center gap-2"
        >
          <Plus size={18} className="text-emerald-600" />
          <span>+ 수입 입력</span>
        </button>
        <button
          onClick={() => onOpenExpense('food')}
          className="h-13 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm md:text-base rounded-2xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>- 지출 입력</span>
        </button>
      </div>

      {/* 4. ⭐⭐⭐ [가장 중요] 오늘의 수입 & 오늘의 지출 내역 쭉 보이기 ⭐⭐⭐ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 4-1. 오늘의 수입 내역 (사주, 타로 등) */}
        <section className="bg-white rounded-3xl p-5 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-slate-900">
                    오늘의 수입
                  </h3>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    총 {todayIncomes.length}건 · +{todayRevenue.toLocaleString()}원
                  </div>
                </div>
              </div>
              <button
                onClick={onOpenIncome}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl transition flex items-center gap-1"
              >
                <Plus size={13} />
                <span>추가</span>
              </button>
            </div>

            {/* 수입 항목 리스트 (사주, 타로 등 쭉 나열) */}
            <div className="mt-3 space-y-1.5 min-h-[120px]">
              {todayIncomes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400">
                  <span>오늘 수입 내역이 없습니다.</span>
                </div>
              ) : (
                todayIncomes.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/70 transition group"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm">✨</span>
                      <span className="text-xs md:text-sm font-bold text-slate-800 truncate">
                        {item.memo || '수입'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs md:text-sm font-extrabold text-emerald-600 tabular-nums">
                        +{item.amount.toLocaleString()}원
                      </span>
                      <button
                        onClick={() => setSelectedHistoryItem({ ...item, isExpense: false })}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                        title="수정"
                      >
                        <Edit2 size={12} />
                      </button>
                      {onDeleteItem && (
                        <button
                          onClick={() => onDeleteItem(item.id, false)}
                          className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition"
                          title="삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 4-2. 오늘의 지출 내역 (식비, 머시기 등) */}
        <section className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-slate-900">
                    오늘의 지출
                  </h3>
                  <div className="text-[11px] text-rose-500 font-semibold">
                    총 {todayExpenses.length}건 · -{todaySpent.toLocaleString()}원
                  </div>
                </div>
              </div>
              <button
                onClick={() => onOpenExpense('food')}
                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl transition flex items-center gap-1"
              >
                <Plus size={13} />
                <span>추가</span>
              </button>
            </div>

            {/* 지출 항목 리스트 (식비, 뭐시기 등 쭉 나열) */}
            <div className="mt-3 space-y-1.5 min-h-[120px]">
              {todayExpenses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400">
                  <span>오늘 지출 내역이 없습니다.</span>
                </div>
              ) : (
                todayExpenses.map(item => {
                  const catInfo = item.category ? CATEGORIES[item.category as keyof typeof CATEGORIES] : null;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition group"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-sm shrink-0">
                          {catInfo?.emoji || '🏷️'}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs md:text-sm font-bold text-slate-800 truncate block">
                            {item.memo || catInfo?.label || '지출'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {catInfo?.label || '기타'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs md:text-sm font-extrabold text-slate-800 tabular-nums">
                          -{item.amount.toLocaleString()}원
                        </span>
                        <button
                          onClick={() => setSelectedHistoryItem({ ...item, isExpense: true })}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                          title="수정"
                        >
                          <Edit2 size={12} />
                        </button>
                        {onDeleteItem && (
                          <button
                            onClick={() => onDeleteItem(item.id, true)}
                            className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition"
                            title="삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 5. 매달 나갈 고정비 체크리스트 (하단, 날짜별 위) */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
              <span>📌 매달 고정비</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                {fixedExpenses.length}개
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              체크 시 납부 완료 처리됩니다.
            </p>
          </div>
          <button
            onClick={() => setIsAddFixedOpen(true)}
            className="shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition"
          >
            <Plus size={13} />
            <span>추가</span>
          </button>
        </div>

        {/* 고정비 목록 */}
        <div className="mt-3.5 space-y-2">
          {fixedExpenses.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
              등록된 고정비가 없습니다.
            </div>
          ) : (
            <>
              {/* 1) 아직 안 낸 고정비 */}
              {pendingFixedList.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition group"
                >
                  <button
                    onClick={() => onToggleFixedPaid(item.id, true)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <Circle size={20} className="text-slate-400 hover:text-emerald-500 shrink-0 transition" />
                    <div className="min-w-0">
                      <div className="text-xs md:text-sm font-bold text-slate-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        매달 {item.payment_day}일 납부 예정
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm font-black text-slate-900 tabular-nums">
                      {item.amount.toLocaleString()}원
                    </span>
                    <button
                      onClick={() => onToggleFixedPaid(item.id, true)}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/70 px-2.5 py-1 rounded-lg transition"
                    >
                      냈다
                    </button>
                    {onDeleteFixedExpense && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFixedExpense(item.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 active:text-rose-700 p-2 rounded-lg hover:bg-rose-50 active:bg-rose-100 transition shrink-0 ml-0.5"
                        title="고정비 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* 2) 이미 낸 고정비 (완료 목록) */}
              {paidFixedList.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100/70 transition group"
                >
                  <button
                    onClick={() => onToggleFixedPaid(item.id, false)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                    title="클릭 시 납부 취소"
                  >
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs md:text-sm font-semibold text-slate-500 line-through truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-medium">
                        이번 달 납부 완료됨 ✓
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm font-bold text-slate-400 tabular-nums line-through">
                      {item.amount.toLocaleString()}원
                    </span>
                    <button
                      onClick={() => onToggleFixedPaid(item.id, false)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg transition"
                    >
                      취소
                    </button>
                    {onDeleteFixedExpense && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFixedExpense(item.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 active:text-rose-700 p-2 rounded-lg hover:bg-rose-50 active:bg-rose-100 transition shrink-0 ml-0.5"
                        title="고정비 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* 6. 과거 날짜별 지출/수입 내역 (오늘 제외 순수 과거 기록 — 기본 접힘, 클릭 시 펼침) */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div 
          onClick={() => setIsPastHistoryOpen(!isPastHistoryOpen)}
          className="flex items-center justify-between cursor-pointer select-none gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={17} className="text-slate-500 shrink-0" />
            <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
              <span>{isCurrentMonth ? '날짜별 내역' : `${sMonth}월 내역`}</span>
              <span className="text-[11px] text-slate-400 font-normal shrink-0">
                ({Object.keys(groupedPastByDate).length}일)
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <button
              type="button"
              className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition flex items-center gap-1"
            >
              <span>{isPastHistoryOpen ? '접기' : '펼치기'}</span>
              {isPastHistoryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {onNavigateHistory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateHistory();
                }}
                className="shrink-0 whitespace-nowrap text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 ml-0.5"
                title="전체 내역 탭으로 이동"
              >
                <span>전체보기</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 펼쳤을 때만 내용 표시 */}
        {isPastHistoryOpen && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-4">
            {/* ★ 핵심: 과거 날짜 넘기기 컨트롤러 (< 이전 날 | 📅 달력 | 다음 날 >) ★ */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shadow-2xs active:scale-95 flex items-center gap-1 text-xs font-bold"
                  title="하루 전 날짜로 이동"
                >
                  <ChevronLeft size={16} />
                  <span>이전 날</span>
                </button>

                {/* 달력 날짜 선택 피커 */}
                <label className="relative flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl cursor-pointer transition shadow-2xs">
                  <Calendar size={15} className="text-emerald-600 shrink-0" />
                  <span className="text-xs md:text-sm font-extrabold text-slate-800 tabular-nums">
                    {selectedPastDate}
                  </span>
                  <input
                    type="date"
                    max={todayStr}
                    value={selectedPastDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedPastDate(e.target.value);
                        setViewAllPastDates(false);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="달력에서 날짜 직접 선택"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleNextDay}
                  disabled={selectedPastDate >= todayStr}
                  className={`px-2.5 py-1.5 rounded-xl border transition shadow-2xs flex items-center gap-1 text-xs font-bold ${
                    selectedPastDate >= todayStr
                      ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 active:scale-95'
                  }`}
                  title="하루 뒤 날짜로 이동"
                >
                  <span>다음 날</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* 전체 날짜 모아보기 / 특정 날짜 모드 토글 */}
              <button
                type="button"
                onClick={() => setViewAllPastDates(!viewAllPastDates)}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold transition border ${
                  viewAllPastDates
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {viewAllPastDates ? '선택한 날짜만 보기' : '모든 과거날짜 펼쳐보기'}
              </button>
            </div>

            {/* 1) 특정 날짜 넘겨보기 모드 (!viewAllPastDates) */}
            {!viewAllPastDates ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs px-1 pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-sm md:text-base">
                      {selectedPastDate}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({selectedDateItems.length}건)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs tabular-nums">
                    <span className="text-slate-600 font-medium">
                      총수입 <strong className="text-emerald-600 font-bold">+{selectedDateIncome.toLocaleString()}원</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-medium">
                      총지출 <strong className="text-slate-900 font-bold">{selectedDateExpense > 0 ? `-${selectedDateExpense.toLocaleString()}원` : '0원'}</strong>
                    </span>
                  </div>
                </div>

                {selectedDateItems.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                    <Calendar size={20} className="mx-auto mb-1.5 text-slate-300" />
                    <span>{selectedPastDate} 에는 기록된 내역이 없습니다.</span>
                  </div>
                ) : (
                  <div className="space-y-1 pt-0.5">
                    {selectedDateItems.map(item => {
                      const catInfo = item.isExpense && (item as any).category 
                        ? CATEGORIES[(item as any).category as keyof typeof CATEGORIES] 
                        : null;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm shrink-0">
                              {item.isExpense ? (catInfo?.emoji || '🏷️') : '💰'}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {item.memo || (item.isExpense ? catInfo?.label || '지출' : '수입')}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.isExpense ? (catInfo?.label || '기타') : '수입'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs md:text-sm font-bold tabular-nums ${
                                item.isExpense ? 'text-slate-800' : 'text-emerald-600'
                              }`}
                            >
                              {item.isExpense ? '-' : '+'}
                              {item.amount.toLocaleString()}원
                            </span>
                            <button
                              onClick={() => setSelectedHistoryItem(item)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded transition"
                              title="수정"
                            >
                              <Edit2 size={12} />
                            </button>
                            {onDeleteItem && (
                              <button
                                onClick={() => onDeleteItem(item.id, item.isExpense)}
                                className="text-[11px] text-slate-300 hover:text-rose-500 px-1 py-0.5 rounded transition"
                                title="삭제"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* 2) 모든 과거 날짜 펼쳐보기 모드 (viewAllPastDates) */
              Object.keys(groupedPastByDate).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  {isCurrentMonth ? '과거 내역이 아직 없습니다.' : `${sMonth}월 내역이 아직 없습니다.`}
                </div>
              ) : (
                Object.entries(groupedPastByDate).map(([dateStr, items]) => {
                  const dayIncome = items.filter(it => !it.isExpense).reduce((s, it) => s + it.amount, 0);
                  const dayExpense = items.filter(it => it.isExpense && !(it as any).is_pending).reduce((s, it) => s + it.amount, 0);

                  return (
                    <div key={dateStr} className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs px-1 pb-1 border-b border-slate-100">
                        <span className="font-extrabold text-slate-800 text-xs md:text-sm">
                          {dateStr}
                        </span>
                        <div className="flex items-center gap-2 text-xs tabular-nums">
                          <span className="text-slate-600 font-medium">
                            총수입 <strong className="text-emerald-600 font-bold">+{dayIncome.toLocaleString()}원</strong>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-600 font-medium">
                            총지출 <strong className="text-slate-900 font-bold">{dayExpense > 0 ? `-${dayExpense.toLocaleString()}원` : '0원'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 pt-0.5">
                        {items.map(item => {
                          const catInfo = item.isExpense && (item as any).category 
                            ? CATEGORIES[(item as any).category as keyof typeof CATEGORIES] 
                            : null;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-sm shrink-0">
                                  {item.isExpense ? (catInfo?.emoji || '🏷️') : '💰'}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-800 truncate">
                                    {item.memo || (item.isExpense ? catInfo?.label || '지출' : '수입')}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {item.isExpense ? (catInfo?.label || '기타') : '수입'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-xs md:text-sm font-bold tabular-nums ${
                                    item.isExpense ? 'text-slate-800' : 'text-emerald-600'
                                  }`}
                                >
                                  {item.isExpense ? '-' : '+'}
                                  {item.amount.toLocaleString()}원
                                </span>
                                <button
                                  onClick={() => setSelectedHistoryItem(item)}
                                  className="text-[11px] text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded transition"
                                  title="수정"
                                >
                                  <Edit2 size={12} />
                                </button>
                                {onDeleteItem && (
                                  <button
                                    onClick={() => onDeleteItem(item.id, item.isExpense)}
                                    className="text-[11px] text-slate-300 hover:text-rose-500 px-1 py-0.5 rounded transition"
                                    title="삭제"
                                  >
                                    <Trash2 size={12} />
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
              )
            )}
          </div>
        )}
      </section>



      {/* 모달 1: 전재산 수정 모달 */}
      {isAssetEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Wallet size={18} className="text-emerald-600" />
                <span>단순 전재산 수정</span>
              </h4>
              <button onClick={() => setIsAssetEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  현재 실제 전재산 (숫자만 입력)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={editAssetAmount}
                    onChange={e => setEditAssetAmount(e.target.value)}
                    placeholder="예: 15000000"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    autoFocus
                    required
                  />
                  <span className="absolute right-4 top-3 text-slate-400 font-medium">원</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  통장 잔고 등 현재 가진 총자산 숫자를 적어주시면 즉시 반영됩니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssetEditOpen(false)}
                  className="h-11 rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs transition hover:bg-slate-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-emerald-600 text-white font-bold text-xs transition hover:bg-emerald-700 shadow-sm"
                >
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 2: 고정비 추가 모달 */}
      {isAddFixedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>📌 매달 나갈 고정비 추가</span>
              </h4>
              <button onClick={() => setIsAddFixedOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveFixed} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  고정비 이름
                </label>
                <input
                  type="text"
                  value={fixedName}
                  onChange={e => setFixedName(e.target.value)}
                  placeholder="예: 월세, 통신비, 넷플릭스"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  매달 나갈 금액
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={fixedAmount}
                    onChange={e => setFixedAmount(e.target.value)}
                    placeholder="예: 500000"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-slate-400">원</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  매달 결제일 (1일 ~ 31일)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={fixedDay}
                    onChange={e => setFixedDay(e.target.value)}
                    placeholder="10"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-slate-400">일</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFixedOpen(false)}
                  className="h-11 rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs transition hover:bg-slate-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-emerald-600 text-white font-bold text-xs transition hover:bg-emerald-700 shadow-sm"
                >
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 3: 내역 수정 모달 */}
      {selectedHistoryItem && onUpdateItem && (
        <EditModal
          isOpen={true}
          onClose={() => setSelectedHistoryItem(null)}
          item={selectedHistoryItem}
          onUpdate={(updated: any) => {
            onUpdateItem(updated);
            setSelectedHistoryItem(null);
          }}
          onDelete={(id, isExp) => {
            onDeleteItem?.(id, isExp);
            setSelectedHistoryItem(null);
          }}
        />
      )}
    </div>
  );
};
