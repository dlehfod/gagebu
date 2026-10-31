import React, { useState } from 'react';
import { getLocalDateString, type Income, type Expense, type Asset, type Settings, type FixedExpense, CATEGORIES } from '../types';
import { 
  Plus, 
  Minus,
  Trash2, 
  Calendar, 
  Wallet, 
  CheckCircle2, 
  Circle,
  Edit2,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Download
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
  onOpenExpense: (category?: any, date?: string) => void;
  onOpenIncome: (date?: string) => void;
  onNavigateHistory?: () => void;
  onUpdateItem?: (data: any) => void;
  onDeleteItem?: (id: string, isExpense: boolean) => void;
  onUpdateSettings?: (newSettings: Settings) => void;
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
  onUpdateSettings,
}) => {
  // 목표 수정 모달 상태
  const [isGoalEditOpen, setIsGoalEditOpen] = useState(false);
  const [editGoalText, setEditGoalText] = useState(settings.financial_goal || '총자산 1억 모으기');

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
  const todayNetProfit = todayRevenue - todaySpent;

  // 3. 고정비 계산 (이번 달)
  const paidFixedStrSet = new Set(paidFixedIds.map(String));
  const pendingFixedList = fixedExpenses.filter(f => !paidFixedStrSet.has(String(f.id)));
  const paidFixedList = fixedExpenses.filter(f => paidFixedStrSet.has(String(f.id)));
  const totalFixedAmount = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
  const paidFixedTotal = paidFixedList.reduce((sum, f) => sum + f.amount, 0);
  const pendingFixedTotal = pendingFixedList.reduce((sum, f) => sum + f.amount, 0);

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

  // 이번 달 총 지출 (실제 지출 + 낸 고정비 합산)
  const targetMonthTotalExpense = targetMonthExpenses.reduce((sum, e) => sum + e.amount, 0) + (isCurrentMonth ? paidFixedTotal : 0);

  // 이번 달 카테고리별 지출 집계
  const monthCategoryTotals: Record<string, number> = {};
  targetMonthExpenses.forEach(e => {
    monthCategoryTotals[e.category] = (monthCategoryTotals[e.category] || 0) + e.amount;
  });
  // 이번 달 낸 고정비 금액을 고정비('fixed') 카테고리에 합산
  if (isCurrentMonth && paidFixedTotal > 0) {
    monthCategoryTotals['fixed'] = (monthCategoryTotals['fixed'] || 0) + paidFixedTotal;
  }

  const categoryOrder: (keyof typeof CATEGORIES)[] = ['business', 'food', 'shopping', 'entertainment', 'fixed'];
  const monthCategoryList = categoryOrder.map(catKey => {
    const catInfo = CATEGORIES[catKey];
    const amount = monthCategoryTotals[catKey] || 0;
    const percent = targetMonthTotalExpense > 0 ? Math.round((amount / targetMonthTotalExpense) * 100) : 0;
    return {
      key: catKey,
      label: catKey === 'food' ? '식비' : catInfo?.label || catKey,
      emoji: catInfo?.emoji || '🏷️',
      amount,
      percent,
    };
  });

  // 5. 날짜별 내역 (오늘 포함 선택된 달의 기록)
  const pastHistory = [
    ...expenses.filter(e => (isCurrentMonth ? true : e.date.startsWith(selectedMonth))).map(e => ({ ...e, isExpense: true })),
    ...incomes.filter(i => (isCurrentMonth ? true : i.date.startsWith(selectedMonth))).map(i => ({ ...i, isExpense: false })),
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

  // 선택된 특정 날짜 상태 (기본값: 오늘 현재 날짜)
  const [selectedPastDate, setSelectedPastDate] = useState<string>(todayStr);

  // 하루 전으로 넘기기 (<)
  const handlePrevDay = () => {
    const cur = new Date(selectedPastDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedPastDate(getLocalDateString(cur));
  };

  // 하루 뒤로 넘기기 (>)
  const handleNextDay = () => {
    const cur = new Date(selectedPastDate);
    cur.setDate(cur.getDate() + 1);
    const nextStr = getLocalDateString(cur);
    if (nextStr <= todayStr) {
      setSelectedPastDate(nextStr);
    }
  };

  // 선택된 특정 날짜의 내역 계산 및 수입/지출 분리
  const selectedDateItems = pastHistory.filter(it => it.date === selectedPastDate);
  const selectedDateIncomes = selectedDateItems.filter((it): it is (Income & { isExpense: false }) => !it.isExpense);
  const selectedDateExpenses = selectedDateItems.filter((it): it is (Expense & { isExpense: true }) => it.isExpense);
  const selectedDateIncome = selectedDateIncomes.reduce((s, it) => s + it.amount, 0);
  const selectedDateExpense = selectedDateExpenses.filter(it => !it.is_pending).reduce((s, it) => s + it.amount, 0);

  // 과거 날짜 큰 범주별(수입, 음식, 물건, 유흥, 사업비 등) 합계 계산
  const categorySummaryList = React.useMemo(() => {
    const list: Array<{
      key: string;
      label: string;
      emoji: string;
      amount: number;
      count: number;
      isExpense: boolean;
    }> = [];

    // 1) 수입 범주
    if (selectedDateIncomes.length > 0) {
      list.push({
        key: 'income',
        label: '수입',
        emoji: '💰',
        amount: selectedDateIncome,
        count: selectedDateIncomes.length,
        isExpense: false,
      });
    }

    // 2) 지출 범주별 그룹화
    const expGrouped: Record<string, { amount: number; count: number }> = {};
    for (const exp of selectedDateExpenses) {
      const cat = exp.category === ('other' as any) ? 'entertainment' : exp.category;
      if (!expGrouped[cat]) expGrouped[cat] = { amount: 0, count: 0 };
      expGrouped[cat].amount += exp.amount;
      expGrouped[cat].count += 1;
    }

    // 카테고리 순서 (음식, 물건, 유흥, 사업비, 고정비)
    const expOrder = ['food', 'shopping', 'entertainment', 'business', 'fixed'] as const;
    for (const catKey of expOrder) {
      if (expGrouped[catKey] && expGrouped[catKey].amount > 0) {
        const catInfo = CATEGORIES[catKey];
        list.push({
          key: catKey,
          label: catInfo?.label || catKey,
          emoji: catInfo?.emoji || '🏷️',
          amount: expGrouped[catKey].amount,
          count: expGrouped[catKey].count,
          isExpense: true,
        });
      }
    }

    return list;
  }, [selectedDateIncomes, selectedDateExpenses, selectedDateIncome]);


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

  // 내 목표 수정 저장
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editGoalText.trim();
    if (trimmed && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        financial_goal: trimmed,
      });
    }
    setIsGoalEditOpen(false);
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


  // 내상황, 꿈/목표, 자산, 고정비, 전체 상세 내역이 포함된 AI 분석용 텍스트(.txt) 다운로드 함수
  const handleDownloadAllHistoryTxt = () => {
    const allItems: Array<{
      id: string;
      date: string;
      isExpense: boolean;
      amount: number;
      category?: string;
      memo?: string;
      is_pending?: boolean;
    }> = [
      ...incomes.map(i => ({
        id: i.id,
        date: i.date,
        isExpense: false,
        amount: i.amount,
        memo: i.memo,
      })),
      ...expenses.map(e => ({
        id: e.id,
        date: e.date,
        isExpense: true,
        amount: e.amount,
        category: e.category,
        memo: e.memo,
        is_pending: e.is_pending,
      })),
    ];

    if (allItems.length === 0 && assets.length === 0 && fixedExpenses.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // 날짜별 내림차순 정렬 (최신 날짜 우선)
    allItems.sort((a, b) => b.date.localeCompare(a.date));

    // 날짜별 그룹화
    const grouped: { [date: string]: typeof allItems } = {};
    for (const item of allItems) {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(item);
    }

    // 1. 재정 목표 및 설정
    const dreamGoal = settings.financial_goal || '총자산 1억 모으기';
    const assetGoal = settings.asset_goal || 50000000;
    const monthlyLimit = settings.monthly_discretionary_limit || 1000000;
    const savingGoal = settings.monthly_saving_goal || 0;

    // 2. 자산 및 부채 현황
    const assetItems = assets.filter(a => a.type === 'asset');
    const debtItems = assets.filter(a => a.type === 'debt');
    const totalAssets = assetItems.reduce((s, a) => s + a.amount, 0);
    const totalDebt = debtItems.reduce((s, a) => s + a.amount, 0);
    const netWorth = totalAssets - totalDebt;
    const goalAchievementRate = assetGoal > 0 ? ((netWorth / assetGoal) * 100).toFixed(1) : '0';

    // 3. 고정 지출 현황
    const activeFixed = fixedExpenses.filter(f => f.active);
    const totalFixedMonthly = activeFixed.reduce((s, f) => s + f.amount, 0);
    const paidFixedList = activeFixed.filter(f => paidFixedIds.map(String).includes(String(f.id)));
    const pendingFixedList = activeFixed.filter(f => !paidFixedIds.map(String).includes(String(f.id)));
    const paidFixedAmount = paidFixedList.reduce((s, f) => s + f.amount, 0);
    const pendingFixedAmount = pendingFixedList.reduce((s, f) => s + f.amount, 0);

    // 4. 전체 수입 및 지출 합계
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const actualExpenses = expenses.filter(e => !e.is_pending);
    const totalExpense = actualExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalIncome - totalExpense;

    // 카테고리별 누적 지출 집계
    const catMap: Record<string, number> = {};
    actualExpenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    let txt = `================================================================================\n`;
    txt += `[AI 재정 분석 및 자산 컨설팅 요청서]\n`;
    txt += `※ 이 문서는 개인 가계부 및 자산 관리 앱에서 추출한 종합 금융 데이터입니다.\n`;
    txt += `※ AI 역할: 1:1 맞춤형 전문 재무 컨설턴트 및 자산 관리 코치\n`;
    txt += `※ AI 지시사항:\n`;
    txt += `  1. 아래 제공된 사용자의 꿈/목표, 자산 현황, 고정 지출, 상세 거래 내역을 종합 분석해 주세요.\n`;
    txt += `  2. [현재 재정 상태 진단] - 순자산, 흑자/적자 흐름, 불필요한 누수 지출을 짚어주세요.\n`;
    txt += `  3. [꿈과 목표 달성 플랜] - 사용자의 핵심 목표 달성을 위한 구체적인 저축 및 소비 가이드라인을 제시해 주세요.\n`;
    txt += `  4. [지출 최적화 팁] - 배달/외식, 구독료, 고정비 등 실천 가능한 절약 포인트를 알려주세요.\n`;
    txt += `  5. 친절하고 명확하며 동기부여가 되는 어조로 피드백을 작성해 주세요.\n`;
    txt += `================================================================================\n\n`;

    txt += `■ [1. 내 상황 및 꿈 / 재정 목표]\n`;
    txt += `  • 나의 꿈 / 핵심 목표: "${dreamGoal}"\n`;
    txt += `  • 1차 순자산 달성 목표: ${assetGoal.toLocaleString()}원 (현재 달성률: ${goalAchievementRate}%)\n`;
    txt += `  • 월 한 달 행복 소비(생활비) 한도: ${monthlyLimit.toLocaleString()}원\n`;
    if (savingGoal > 0) {
      txt += `  • 월 목표 저축액: ${savingGoal.toLocaleString()}원\n`;
    }
    txt += `  • 리포트 추출 기준일: ${getLocalDateString()}\n\n`;

    txt += `■ [2. 현재 자산 및 부채 현황]\n`;
    txt += `  • 총 자산: ${totalAssets.toLocaleString()}원\n`;
    txt += `  • 총 부채(빚): ${totalDebt.toLocaleString()}원\n`;
    txt += `  • 현재 순자산 (자산 - 부채): ${netWorth.toLocaleString()}원\n`;
    if (assetItems.length > 0) {
      txt += `  [보유 자산 세부내역]\n`;
      assetItems.forEach(a => {
        txt += `    - ${a.name}: +${a.amount.toLocaleString()}원\n`;
      });
    }
    if (debtItems.length > 0) {
      txt += `  [보유 부채 세부내역]\n`;
      debtItems.forEach(d => {
        txt += `    - ${d.name}: -${d.amount.toLocaleString()}원\n`;
      });
    }
    txt += `\n`;

    txt += `■ [3. 매월 나가는 정기 고정비 현황]\n`;
    txt += `  • 월 고정 지출 총액: ${totalFixedMonthly.toLocaleString()}원\n`;
    txt += `  • 이번 달 납부 완료: ${paidFixedAmount.toLocaleString()}원 (${paidFixedList.length}건)\n`;
    txt += `  • 이번 달 납부 예정(미납): ${pendingFixedAmount.toLocaleString()}원 (${pendingFixedList.length}건)\n`;
    if (activeFixed.length > 0) {
      txt += `  [고정비 세부 목록]\n`;
      activeFixed.forEach(f => {
        const isPaid = paidFixedIds.map(String).includes(String(f.id));
        txt += `    - ${f.name}: ${f.amount.toLocaleString()}원 (매월 ${f.payment_day}일) [${isPaid ? '이번달 납부완료' : '납부예정'}]\n`;
      });
    }
    txt += `\n`;

    txt += `■ [4. 전체 수입 및 지출 누적 통계]\n`;
    txt += `  • 총 기록 건수: ${allItems.length}건 (수입 ${incomes.length}건, 지출 ${expenses.length}건)\n`;
    txt += `  • 총 수입: +${totalIncome.toLocaleString()}원\n`;
    txt += `  • 총 지출: -${totalExpense.toLocaleString()}원 (실제 결제 완료 기준)\n`;
    txt += `  • 누적 순수익: ${netProfit >= 0 ? '+' : '-'}${Math.abs(netProfit).toLocaleString()}원\n`;
    if (totalExpense > 0) {
      txt += `  [카테고리별 누적 지출 및 비중]\n`;
      Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .forEach(([catKey, amt]) => {
          const catInfo = CATEGORIES[catKey as keyof typeof CATEGORIES];
          const label = catInfo ? `${catInfo.emoji} ${catInfo.label}` : catKey;
          const pct = ((amt / totalExpense) * 100).toFixed(1);
          txt += `    - ${label}: ${amt.toLocaleString()}원 (${pct}%)\n`;
        });
    }
    txt += `\n`;

    txt += `■ [5. 일자별 상세 거래 내역 (최신순 전체 기록)]\n`;
    txt += `--------------------------------------------------------------------------------\n`;
    for (const [dateStr, items] of Object.entries(grouped)) {
      const dayIncome = items.filter(it => !it.isExpense).reduce((s, it) => s + it.amount, 0);
      const dayExpense = items.filter(it => it.isExpense && !it.is_pending).reduce((s, it) => s + it.amount, 0);
      const dayNet = dayIncome - dayExpense;

      txt += `[${dateStr}]\n`;
      for (const item of items) {
        if (item.isExpense) {
          const catInfo = item.category ? CATEGORIES[item.category as keyof typeof CATEGORIES] : null;
          const catName = item.category === 'business' ? '💼 사업비' : catInfo ? `${catInfo.emoji} ${catInfo.label}` : '지출';
          const memoText = item.memo ? ` (${item.memo})` : '';
          const pendingText = item.is_pending ? ' [납부예정]' : '';
          txt += `  - [지출] ${catName}${memoText}: -${item.amount.toLocaleString()}원${pendingText}\n`;
        } else {
          txt += `  + [수입] ${item.memo || '수입'}: +${item.amount.toLocaleString()}원\n`;
        }
      }
      txt += `  ▶ 당일합계: 수입 +${dayIncome.toLocaleString()}원 | 지출 -${dayExpense.toLocaleString()}원 | 순수익 ${dayNet >= 0 ? '+' : '-'}${Math.abs(dayNet).toLocaleString()}원\n\n`;
    }
    txt += `================================================================================\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `이도영_가계부_AI분석용_종합데이터_${getLocalDateString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 md:space-y-5 pb-24 md:pb-12 max-w-2xl mx-auto">
      {/* 0. 월 이동 네비게이터 (모바일/PC 완벽 반응형 정렬) */}
      <div className="bg-white p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* 월 선택 컨트롤 (< 이전달 | 📅 2026년 10월 | 다음달 >) */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition shrink-0"
              title="이전 달 내역 보기 (과거로 이동)"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1.5 px-2 whitespace-nowrap">
              <Calendar size={16} className="text-emerald-600 shrink-0" />
              <span className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight whitespace-nowrap">
                {selectedMonthLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition shrink-0"
              title="다음 달 내역 보기"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 모바일 화면에서만 우측에 표시되는 이번달 뱃지/버튼 */}
          <div className="sm:hidden">
            {!isCurrentMonth ? (
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-95 px-2.5 py-1 rounded-xl transition border border-emerald-200 whitespace-nowrap"
              >
                이번 달로
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl whitespace-nowrap">
                이번 달
              </span>
            )}
          </div>
        </div>

        {/* 액션 버튼 그룹: PC에서는 우측 나열, 모바일에서는 하단에 안정감 있게 배치 */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* AI 분석용 전체 내역 다운받기 버튼 */}
          <button
            type="button"
            onClick={handleDownloadAllHistoryTxt}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-1.5 rounded-xl transition border border-slate-200/80 shadow-2xs whitespace-nowrap"
            title="내 상황, 목표/꿈, 자산, 고정비, 전체 거래내역이 포함된 AI 분석용 텍스트 파일 다운로드"
          >
            <Download size={13} className="text-emerald-600 shrink-0" />
            <span>AI 분석용 내역 받기</span>
          </button>

          {/* PC에서만 표시되는 이번달 뱃지/버튼 */}
          <div className="hidden sm:block">
            {!isCurrentMonth ? (
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-95 px-3 py-1 rounded-xl transition border border-emerald-200 whitespace-nowrap"
              >
                이번 달로
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl whitespace-nowrap">
                이번 달
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1. 내 전재산 카드 (목표 달성률 및 게이지 그래프 포함) */}
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
            className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 active:scale-95 transition text-white px-3 py-1.5 rounded-full font-medium backdrop-blur-xs shrink-0"
          >
            <Edit2 size={12} />
            <span>수정</span>
          </button>
        </div>

        <div className="mt-3 flex items-baseline">
          <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight tabular-nums">
            {netWorth.toLocaleString()}
          </span>
          <span className="ml-1.5 text-lg md:text-xl font-medium text-emerald-200">원</span>
        </div>

        {/* 내 목표 표시 및 수정 (클릭 시 직접 변경 가능) */}
        <div className="mt-4 pt-3 border-t border-emerald-500/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm">🎯</span>
            <span className="text-emerald-100 font-medium shrink-0">내 목표:</span>
            <span className="font-extrabold text-white truncate">
              {settings.financial_goal || '총자산 1억 모으기'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditGoalText(settings.financial_goal || '총자산 1억 모으기');
              setIsGoalEditOpen(true);
            }}
            className="text-[11px] bg-white/15 hover:bg-white/25 active:scale-95 px-2.5 py-1 rounded-lg text-emerald-100 hover:text-white font-semibold transition shrink-0 ml-2"
          >
            목표 변경
          </button>
        </div>
      </section>

      {/* 2. 이번달 핵심 한눈에 보기 (총수입 / 총지출 / 남은 생활비) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-300/80 shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center items-center">
          {/* 1. 총수입 */}
          <div className="px-1.5 sm:px-3">
            <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-slate-500 mb-1">
              <span>💰</span>
              <span>총수입</span>
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black text-emerald-600 tabular-nums truncate">
              +{monthRevenue.toLocaleString()}
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 ml-0.5">원</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {targetMonthIncomes.length}건 누적
            </div>
          </div>

          {/* 2. 총지출 */}
          <div className="px-1.5 sm:px-3">
            <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-slate-500 mb-1">
              <span>🛒</span>
              <span>총지출</span>
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black text-rose-500 tabular-nums truncate">
              {targetMonthTotalExpense > 0 ? `-${targetMonthTotalExpense.toLocaleString()}` : '0'}
              <span className="text-[10px] sm:text-xs font-bold text-rose-600 ml-0.5">원</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              고정비 포함
            </div>
          </div>

          {/* 3. 남은 생활비 */}
          <div className="px-1.5 sm:px-3">
            <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-slate-500 mb-1">
              <span>💳</span>
              <span>남은 생활비</span>
            </div>
            <div className={`text-sm sm:text-base md:text-lg font-black tabular-nums truncate ${remainingAllowance >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
              {remainingAllowance >= 0 ? remainingAllowance.toLocaleString() : `-${Math.abs(remainingAllowance).toLocaleString()}`}
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 ml-0.5">원</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              100만 한도
            </div>
          </div>
        </div>

        {/* 이번달 총수입 (수입 - 지출 = 실제 남은 순수익) - 최우선 핵심 지표 강조 카드 */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50/50 border border-emerald-300/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-base font-black shadow-xs shrink-0">
                ₩
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight block">
                  {isCurrentMonth ? '이번달' : `${sMonth}월`} 총순수익
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate mt-0.5">
                  (내가 실제로 손에 쥔 알짜 돈)
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 pl-2">
              <span
                className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight block ${
                  monthRevenue - targetMonthTotalExpense >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {monthRevenue - targetMonthTotalExpense >= 0 ? '+' : '-'}
                {Math.abs(monthRevenue - targetMonthTotalExpense).toLocaleString()}
                <span className="text-xs sm:text-sm font-bold ml-0.5">원</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 수입 / 지출 초간편 입력 버튼 */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onOpenExpense('food')}
          className="h-11 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 border border-rose-200/90 font-bold text-sm rounded-2xl transition shadow-2xs flex items-center justify-center gap-1.5"
        >
          <Minus size={16} className="text-rose-600" />
          <span>지출</span>
        </button>
        <button
          onClick={() => onOpenIncome()}
          className="h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-2xl transition shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-1.5"
        >
          <Plus size={16} />
          <span>수입</span>
        </button>
      </div>

      {/* 4. ⭐⭐⭐ [가장 중요] 오늘의 지출 & 오늘의 수입 내역 쭉 보이기 ⭐⭐⭐ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 4-1. 오늘의 지출 내역 (식비, 머시기 등) */}
        <section className="bg-white rounded-3xl p-4 md:p-5 border border-slate-300/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between -mx-1 px-3 py-3 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl">🛒</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-rose-900">
                    오늘의 쓴돈 <span className="text-[10px] font-semibold text-rose-500">({todayExpenses.length}건)</span>
                  </h3>
                  <span className="block text-2xl font-black text-rose-500 tabular-nums leading-tight">
                    {todaySpent > 0 ? `-${todaySpent.toLocaleString()}` : '0'}원
                  </span>
                </div>
              </div>
              <button
                onClick={() => onOpenExpense('food')}
                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl transition flex items-center gap-1 active:scale-95"
              >
                <Plus size={13} />
                <span>추가</span>
              </button>
            </div>

            {/* 지출 항목 리스트 (식비, 뭐시기 등 쭉 나열) */}
            <div className="mt-2.5 space-y-1.5 min-h-[100px]">
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
                            {item.category === 'business' ? '사업비' : item.category === 'food' ? (catInfo?.label || '음식') : (item.memo || catInfo?.label || '지출')}
                          </span>
                          <span className={`text-[10px] ${
                            item.category === 'business' && item.memo
                              ? 'text-blue-600 font-medium'
                              : item.category === 'food' && item.memo
                                ? 'text-amber-600 font-medium'
                                : 'text-slate-400'
                          }`}>
                            {item.category === 'business' && item.memo
                              ? `(${item.memo})`
                              : item.category === 'food' && item.memo
                                ? `(${item.memo})`
                                : (catInfo?.label || '기타')}
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

        {/* 4-2. 오늘의 수입 내역 (사주, 타로 등) */}
        <section className="bg-white rounded-3xl p-4 md:p-5 border border-slate-300/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between -mx-1 px-3 py-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl">💰</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-emerald-900">
                    오늘 번돈 (수입) <span className="text-[10px] font-semibold text-emerald-600">({todayIncomes.length}건)</span>
                  </h3>
                  <span className="block text-2xl font-black text-emerald-600 tabular-nums leading-tight">
                    {todayRevenue > 0 ? `+${todayRevenue.toLocaleString()}` : '0'}원
                  </span>
                </div>
              </div>
              <button
                onClick={() => onOpenIncome()}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl transition flex items-center gap-1 active:scale-95"
              >
                <Plus size={13} />
                <span>추가</span>
              </button>
            </div>

            {/* 수입 항목 리스트 */}
            <div className="mt-2.5 space-y-1.5 min-h-[100px]">
              {todayIncomes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400">
                  <span>오늘 수입 내역이 없습니다.</span>
                </div>
              ) : (
                todayIncomes.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition group"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm shrink-0">💰</span>
                      <div className="min-w-0">
                        <span className="text-xs md:text-sm font-bold text-slate-800 truncate block">
                          {item.memo || '수입'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          수입
                        </span>
                      </div>
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

          {/* 오늘 순수익 (수입 - 지출) 한줄 표시 */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">오늘의 순수익 (수입 - 지출)</span>
            <span className={`font-black tabular-nums ${todayNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {todayNetProfit > 0 ? `+${todayNetProfit.toLocaleString()}` : `${todayNetProfit.toLocaleString()}`}원
            </span>
          </div>
        </section>
      </div>

      {/* 4-3. 이번달 지출 분류 (사업비, 식비 등) & 총지출 카드 */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-400/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900">
                {isCurrentMonth ? '이번달' : `${sMonth}월`} 지출 분류
              </h3>
            </div>
          </div>
          {onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              <span>상세내역</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>

        {/* 카테고리별 그리드 카드 (사업비, 식비, 물건 등) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[...monthCategoryList]
            .sort((a, b) => {
              const aEx = a.key === 'business' || a.key === 'fixed' ? 1 : 0;
              const bEx = b.key === 'business' || b.key === 'fixed' ? 1 : 0;
              return aEx - bEx;
            })
            .map(({ key, label, emoji, amount, percent }) => {
            const hasSpent = amount > 0;
            // 사업비·고정비는 생활비(용돈 한도) 계산에서 제외되는 항목
            const isExcluded = key === 'business' || key === 'fixed';
            return (
              <div
                key={key}
                onClick={() => onOpenExpense(key as any)}
                className={`relative overflow-hidden p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between hover:border-emerald-400 active:scale-[0.99] ${
                  isExcluded
                    ? 'bg-slate-100/60 border-dashed border-slate-200 opacity-50 grayscale hover:opacity-80'
                    : hasSpent
                    ? 'bg-slate-50/90 border-slate-200/80'
                    : 'bg-white border-slate-100 opacity-60 hover:opacity-100'
                }`}
                title={isExcluded ? '생활비 계산에서 제외되는 항목 (클릭 시 이 카테고리로 지출 입력)' : '클릭 시 이 카테고리로 지출 입력'}
              >
                {isExcluded && (
                  <X
                    size={64}
                    strokeWidth={1.5}
                    className="absolute -right-2 -bottom-3 text-slate-300/60 pointer-events-none"
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{emoji}</span>
                    <span className="text-xs font-bold text-slate-700">{label}</span>
                  </div>
                  {isExcluded ? (
                    <span className="text-[9px] font-semibold text-slate-400 bg-white/80 border border-slate-200 px-1.5 py-0.5 rounded-md">
                      제외
                    </span>
                  ) : (
                    hasSpent && (
                      <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                        {percent}%
                      </span>
                    )
                  )}
                </div>
                <div className="relative mt-2 text-right">
                  <span
                    className={`text-xs sm:text-sm font-black tabular-nums ${
                      isExcluded
                        ? 'text-slate-400 line-through decoration-slate-300'
                        : hasSpent
                        ? 'text-slate-900'
                        : 'text-slate-300'
                    }`}
                  >
                    {amount.toLocaleString()}원
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 심플 요약: 총지출 & 남은 생활비 + 슬림 게이지바 */}
        <div className="pt-3.5 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            {/* 좌측: 생활비 지출 (사업비·고정비 제외) */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  {isCurrentMonth ? '이번달' : `${sMonth}월`} 생활비 지출
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md font-medium">
                  사업·고정비 제외
                </span>
              </div>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black tabular-nums text-rose-500">
                  {monthUsedAllowance > 0 ? `-${monthUsedAllowance.toLocaleString()}` : '0'}
                </span>
                <span className="text-xs font-bold text-slate-400">원</span>
              </div>
            </div>

            {/* 우측: 남은 생활 용돈 */}
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 block">
                남은 생활비 <span className="text-[10px] font-normal text-slate-400">(한도 100만)</span>
              </span>
              <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
                <span className={`text-xl sm:text-2xl font-black tabular-nums ${remainingAllowance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {remainingAllowance >= 0 ? remainingAllowance.toLocaleString() : `-${Math.abs(remainingAllowance).toLocaleString()}`}
                </span>
                <span className="text-xs font-bold text-slate-400">원</span>
              </div>
            </div>
          </div>

          {/* 깔끔한 1줄 게이지바 */}
          <div className="space-y-1">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${energyBarColor} transition-all duration-500`}
                style={{ width: `${energyPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{rawPercent}% 사용</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 매달 나갈 고정비 체크리스트 (하단, 날짜별 위) */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-400/70 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
              <span>📌 매달 고정비</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                {fixedExpenses.length}개
              </span>
            </h3>
            <span className="text-xs md:text-sm font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
              총 {totalFixedAmount.toLocaleString()}원
            </span>
          </div>
          <button
            onClick={() => setIsAddFixedOpen(true)}
            className="shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition"
          >
            <Plus size={13} />
            <span>추가</span>
          </button>
        </div>

        {/* 고정비 납부 요약 바 */}
        {fixedExpenses.length > 0 && (
          <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">고정비 총합</span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-black tabular-nums text-slate-900">
                  {totalFixedAmount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">원</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">납부 완료 ({paidFixedList.length})</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 tabular-nums">
                  {paidFixedTotal.toLocaleString()}원
                </span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200 shrink-0" />
              <div>
                <span className="text-[10px] font-medium text-slate-400 block">남은 고정비 ({pendingFixedList.length})</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 tabular-nums">
                  {pendingFixedTotal.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        )}

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

      {/* 6. 과거 날짜별 내역 (큰 범주만 표시 — 물건 얼마, 유흥 얼마 등) */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-400/70 shadow-sm">
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
            {/* 날짜 넘기기 컨트롤러 (< 이전 날 | 📅 달력 | 다음 날 >) */}
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

              {/* 과거 해당 날짜에 지출/수입 직접 추가하는 버튼 */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => onOpenExpense(undefined, selectedPastDate)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition text-xs font-bold flex items-center gap-1 active:scale-95 shadow-2xs"
                  title={`${selectedPastDate} 지출 기록`}
                >
                  <Plus size={13} />
                  <span>이날 지출</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenIncome(selectedPastDate)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition text-xs font-bold flex items-center gap-1 active:scale-95 shadow-2xs"
                  title={`${selectedPastDate} 수입 기록`}
                >
                  <Plus size={13} />
                  <span>이날 수입</span>
                </button>
              </div>
            </div>

            {/* 과거 날짜 내역: 사용자의 요청대로 큰 범주(카테고리 요약)만 표시 */}
            <div className="space-y-3">
              {/* 하루 요약: 날짜 + 총수입 / 총지출 / 순수익 */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/70 px-4 py-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-slate-800 text-sm">{selectedPastDate}</span>
                  <span>총 {selectedDateItems.length}건</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedPastDate === todayStr ? '오늘의 순수익' : '이날의 순수익'}
                  </span>
                  <span
                    className={`text-xl font-black tabular-nums ${
                      selectedDateIncome - selectedDateExpense >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedDateIncome - selectedDateExpense >= 0 ? '+' : '-'}
                    {Math.abs(selectedDateIncome - selectedDateExpense).toLocaleString()}원
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-3 text-[11px] tabular-nums text-slate-500">
                  <span>수입 <b className="text-emerald-600">+{selectedDateIncome.toLocaleString()}</b></span>
                  <span>지출 <b className="text-slate-700">-{selectedDateExpense.toLocaleString()}</b></span>
                </div>
              </div>

              {/* 큰 범주별 요약 목록 (물건 얼마, 유흥 얼마, 음식 얼마, 수입 얼마 등) */}
              {categorySummaryList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  기록된 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {categorySummaryList.map((cat) => (
                    <div
                      key={cat.key}
                      className="flex items-center justify-between p-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{cat.emoji}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {cat.label}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ({cat.count}건)
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-sm md:text-base font-extrabold tabular-nums ${
                          cat.isExpense ? 'text-slate-800' : 'text-emerald-600'
                        }`}
                      >
                        {cat.isExpense ? `-${cat.amount.toLocaleString()}원` : `+${cat.amount.toLocaleString()}원`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>



      {/* 모달 0: 내 목표 수정 모달 */}
      {isGoalEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>🎯 나의 재무 목표 설정</span>
              </h4>
              <button onClick={() => setIsGoalEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  이루고 싶은 핵심 목표 (자유롭게 입력)
                </label>
                <input
                  type="text"
                  value={editGoalText}
                  onChange={e => setEditGoalText(e.target.value)}
                  placeholder="예: 총자산 1억 모으기"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  이 목표는 가계부 메인에 표시되며, AI 조언 시 핵심 목표로 자동 인식됩니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGoalEditOpen(false)}
                  className="h-11 rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs transition hover:bg-slate-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-emerald-600 text-white font-bold text-xs transition hover:bg-emerald-700 shadow-sm"
                >
                  목표 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
