import { useState, useEffect } from 'react';
import { storageService } from './lib/storage';
import { getLocalDateString, type Income, type Expense, type Asset, type Settings, type AssetAdjustment, type FixedExpense } from './types';
import { Dashboard } from './components/Dashboard';
import { HistoryList } from './components/HistoryList';
import { AssetManager } from './components/AssetManager';
import { SettingsModal } from './components/SettingsModal';
import { ExpenseModal } from './components/ExpenseModal';
import { IncomeModal } from './components/IncomeModal';
import { Home, ReceiptText, PlusCircle, Landmark, Settings as SettingsIcon } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'assets' | 'settings'>('home');
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [adjustments, setAdjustments] = useState<AssetAdjustment[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [settings, setSettings] = useState<Settings>({
    monthly_discretionary_limit: 1000000,
    monthly_saving_goal: 3000000,
    asset_goal: 50000000,
  });

  const [defaultAssetId, setDefaultAssetId] = useState<string>(() => {
    return localStorage.getItem('app_default_asset_id') || '';
  });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDefaultCategory, setExpenseDefaultCategory] = useState<any>('food');
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  // 이번 달 고정비 납부 상태 관리
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [paidFixedIds, setPaidFixedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`app_paid_fixed_${currentMonthStr}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });


  // 데이터 로드
  const loadData = async () => {
    try {
      let [loadedIncomes, loadedExpenses, loadedAssets, loadedSettings, loadedAdjustments, loadedFixed] = await Promise.all([
        storageService.getIncomes(),
        storageService.getExpenses(),
        storageService.getAssets(),
        storageService.getSettings(),
        storageService.getAdjustments(),
        storageService.getFixedExpenses(),
      ]);

      // 과거 시차(UTC) 버그로 인해 2026-10-04로 저장된 오늘 발생 내역을 오늘 날짜로 자동 보정
      const todayStr = getLocalDateString();
      const needsExpenseMigration = loadedExpenses.filter(e => e.date === '2026-10-04');
      if (needsExpenseMigration.length > 0) {
        for (const item of needsExpenseMigration) {
          await storageService.updateExpense(item.id, { date: todayStr });
        }
        loadedExpenses = await storageService.getExpenses();
      }

      const needsIncomeMigration = loadedIncomes.filter(i => i.date === '2026-10-04');
      if (needsIncomeMigration.length > 0) {
        for (const item of needsIncomeMigration) {
          await storageService.updateIncome(item.id, { date: todayStr });
        }
        loadedIncomes = await storageService.getIncomes();
      }

      setAdjustments(loadedAdjustments);
      setFixedExpenses(loadedFixed);
      setIncomes(loadedIncomes);
      setExpenses(loadedExpenses);
      setAssets(loadedAssets);
      setSettings(loadedSettings);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 기본 지출 통장 찾기 (지정된 기본 통장 우선, 없으면 첫 번째 자산 통장)
  const getDefaultAsset = (currentAssets: Asset[]) => {
    if (defaultAssetId) {
      const found = currentAssets.find(a => a.id === defaultAssetId && a.type === 'asset');
      if (found) return found;
    }
    return currentAssets.find(a => a.type === 'asset');
  };

  // 지출 추가
  const handleAddExpense = async (data: any) => {
    await storageService.addExpense(data);

    // [방식 1] 실제 지출(납부 완료)인 경우 기본 지출 통장에서 즉시 차감
    if (!data.is_pending) {
      const targetAsset = getDefaultAsset(assets);
      if (targetAsset) {
        await storageService.updateAsset(targetAsset.id, {
          amount: targetAsset.amount - data.amount,
        });
      }
    }
    await loadData();
  };

  // 수입 추가
  const handleAddIncome = async (data: any) => {
    await storageService.addIncome(data);

    // [방식 1] 수입 추가 시 기본 지출 통장에 즉시 가산
    const targetAsset = getDefaultAsset(assets);
    if (targetAsset) {
      await storageService.updateAsset(targetAsset.id, {
        amount: targetAsset.amount + data.amount,
      });
    }
    await loadData();
  };

  // 내역 수정
  const handleUpdateItem = async (data: any) => {
    const targetAsset = getDefaultAsset(assets);
    if (data.isExpense) {
      const oldExp = expenses.find(e => e.id === data.id);
      if (oldExp && targetAsset) {
        const oldActual = oldExp.is_pending ? 0 : oldExp.amount;
        const newActual = data.is_pending ? 0 : data.amount;
        const delta = newActual - oldActual;
        if (delta !== 0) {
          await storageService.updateAsset(targetAsset.id, {
            amount: targetAsset.amount - delta,
          });
        }
      }
      await storageService.updateExpense(data.id, {
        amount: data.amount,
        date: data.date,
        memo: data.memo,
        category: data.category,
        is_pending: data.is_pending,
      });
    } else {
      const oldInc = incomes.find(i => i.id === data.id);
      if (oldInc && targetAsset) {
        const delta = data.amount - oldInc.amount;
        if (delta !== 0) {
          await storageService.updateAsset(targetAsset.id, {
            amount: targetAsset.amount + delta,
          });
        }
      }
      await storageService.updateIncome(data.id, {
        amount: data.amount,
        date: data.date,
        memo: data.memo,
      });
    }
    await loadData();
  };

  // 내역 삭제
  const handleDeleteItem = async (id: string, isExpense: boolean) => {
    const targetAsset = getDefaultAsset(assets);
    if (isExpense) {
      const exp = expenses.find(e => e.id === id);
      if (exp && !exp.is_pending && targetAsset) {
        await storageService.updateAsset(targetAsset.id, {
          amount: targetAsset.amount + exp.amount,
        });
      }
      await storageService.deleteExpense(id);
    } else {
      const inc = incomes.find(i => i.id === id);
      if (inc && targetAsset) {
        await storageService.updateAsset(targetAsset.id, {
          amount: targetAsset.amount - inc.amount,
        });
      }
      await storageService.deleteIncome(id);
    }
    await loadData();
  };

  // 자산 추가/수정/삭제
  const handleAddAsset = async (asset: any) => {
    await storageService.addAsset(asset);
    await loadData();
  };

  const handleUpdateAsset = async (id: string, updates: any) => {
    await storageService.updateAsset(id, updates);
    await loadData();
  };

  const handleDeleteAsset = async (id: string) => {
    await storageService.deleteAsset(id);
    await loadData();
  };

  // 기본 출금 통장 지정
  const handleSetDefaultAsset = (id: string) => {
    setDefaultAssetId(id);
    localStorage.setItem('app_default_asset_id', id);
  };

  // 설정 저장
  const handleSaveSettings = async (updated: Settings) => {
    await storageService.updateSettings(updated);
    setSettings(updated);
  };

  // 고정비 추가 / 삭제 / 일괄 지출 등록
  const handleAddFixedExpense = async (item: any) => {
    await storageService.addFixedExpense(item);
    await loadData();
  };

  const handleDeleteFixedExpense = async (id: string) => {
    const strId = String(id);

    // 1) 화면 UI에서 즉시 제거
    setFixedExpenses(prev => prev.filter(f => String(f.id) !== strId));

    // 2) 이미 낸 상태인 고정비를 삭제하는 경우, 차감되었던 금액을 전재산에 즉시 환원하고 납부목록에서 제외
    if (paidFixedIds.includes(strId)) {
      const targetFixed = fixedExpenses.find(f => String(f.id) === strId);
      const targetAsset = getDefaultAsset(assets);
      if (targetFixed && targetAsset) {
        const nextAmount = targetAsset.amount + targetFixed.amount;
        setAssets(prev => prev.map(a => a.id === targetAsset.id ? { ...a, amount: nextAmount } : a));
        await storageService.updateAsset(targetAsset.id, {
          amount: nextAmount,
        });
      }
      const nextPaid = paidFixedIds.filter(pId => String(pId) !== strId);
      setPaidFixedIds(nextPaid);
      localStorage.setItem(`app_paid_fixed_${currentMonthStr}`, JSON.stringify(nextPaid));
    }

    // 3) 스토리지에서 삭제
    try {
      await storageService.deleteFixedExpense(strId);
    } catch (e) {
      console.error('고정비 삭제 실패:', e);
    }
    await loadData();
  };

  // 고정비 체크/해제 ("냈다!" 처리 -> 전재산에서만 차감/복원)
  const handleToggleFixedPaid = async (id: string, willBePaid: boolean) => {
    const targetFixed = fixedExpenses.find(f => f.id === id);
    if (!targetFixed) return;

    const targetAsset = getDefaultAsset(assets);
    if (targetAsset) {
      if (willBePaid) {
        // 냈다: 전재산에서만 차감
        await storageService.updateAsset(targetAsset.id, {
          amount: targetAsset.amount - targetFixed.amount,
        });
      } else {
        // 취소: 전재산 복원
        await storageService.updateAsset(targetAsset.id, {
          amount: targetAsset.amount + targetFixed.amount,
        });
      }
    }

    const nextPaid = willBePaid 
      ? [...paidFixedIds, id] 
      : paidFixedIds.filter(pId => pId !== id);
    
    setPaidFixedIds(nextPaid);
    localStorage.setItem(`app_paid_fixed_${currentMonthStr}`, JSON.stringify(nextPaid));
    await loadData();
  };

  // 단순 전재산 직접 수정
  const handleDirectUpdateNetWorth = async (newAmount: number) => {
    const targetAsset = getDefaultAsset(assets);
    if (targetAsset) {
      await storageService.updateAsset(targetAsset.id, { amount: newAmount });
    } else {
      await storageService.addAsset({
        name: '내 전재산',
        amount: newAmount,
        type: 'asset',
      });
    }
    await loadData();
  };


  const handleToggleExpensePending = async (id: string, is_pending: boolean) => {
    const exp = expenses.find(e => e.id === id);
    if (exp) {
      const targetAsset = getDefaultAsset(assets);
      if (targetAsset) {
        if (exp.is_pending && !is_pending) {
          // 납부 예정 -> 납부 완료: 통장 잔고 차감
          await storageService.updateAsset(targetAsset.id, {
            amount: targetAsset.amount - exp.amount,
          });
        } else if (!exp.is_pending && is_pending) {
          // 납부 완료 -> 납부 예정으로 취소: 통장 잔고 환원
          await storageService.updateAsset(targetAsset.id, {
            amount: targetAsset.amount + exp.amount,
          });
        }
      }
    }
    await storageService.updateExpense(id, { is_pending });
    await loadData();
  };

  // 상단 헤더 오늘 날짜
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const todayHeaderLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${daysOfWeek[now.getDay()]}요일`;

  // 전체 순자산 계산 (자산 탭 및 홈 화면 동기화)
  const totalAssets = assets
    .filter(a => a.type === 'asset')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalDebt = assets
    .filter(a => a.type === 'debt')
    .reduce((sum, a) => sum + a.amount, 0);
  const assetNet = totalAssets - totalDebt;

  const sortedAdjustments = [...adjustments].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latestAdjustment = sortedAdjustments[0];
  let currentNetWorth = assetNet;
  if (assets.length > 0) {
    currentNetWorth = assetNet;
  } else if (latestAdjustment) {
    const since = latestAdjustment.created_at;
    const incomeSince = incomes
      .filter(i => i.created_at && i.created_at > since)
      .reduce((sum, i) => sum + i.amount, 0);
    const expenseSince = expenses
      .filter(e => e.created_at && e.created_at > since && !e.is_pending)
      .reduce((sum, e) => sum + e.amount, 0);
    currentNetWorth = latestAdjustment.actual_net_worth + (incomeSince - expenseSince);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#191F28] font-sans flex justify-center selection:bg-emerald-400 selection:text-white">
      {/* PC: 최대 1000px 가운데 정렬 / 모바일: 전체 폭 */}
      <div className="w-full max-w-[1000px] min-h-screen flex flex-col bg-[#F8F9FA] px-5 md:px-8 pt-6 md:pt-10 relative">
        
        {/* 상단 헤더 (PC에서는 프리미엄 캡슐형 세그먼트 탭 포함) */}
        <header className="flex items-center justify-between pb-6 md:pb-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-lg md:text-xl shadow-xs select-none hover:rotate-12 transition-transform cursor-default" title="가계부 마스코트 토끼">
              🐰
            </div>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 min-w-0">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900">
                이도영 43세(빠른) 미혼
              </h1>
              <span className="text-[11px] md:text-xs text-slate-600 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full font-medium shadow-xs shrink-0">
                {todayHeaderLabel}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200/70 p-1 rounded-full shadow-xs">
            <nav className="flex items-center gap-0.5">
              {([
                ['home', '홈'],
                ['history', '내역'],
                ['assets', '자산'],
                ['settings', '설정'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === key
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
            <button
              onClick={() => setIsQuickActionOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#10B981] hover:bg-[#059669] text-white transition shadow-xs"
            >
              + 입력
            </button>
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className="md:hidden p-2 rounded-full text-slate-600 hover:text-slate-900 bg-white border border-slate-200/70 shadow-xs transition"
            title="설정"
          >
            <SettingsIcon size={17} />
          </button>
        </header>

        {/* 메인 탭 컨텐츠 */}
        <main className={`flex-1 ${activeTab === 'home' ? '' : 'w-full max-w-xl mx-auto'}`}>
          {activeTab === 'home' && (
            <Dashboard
              incomes={incomes}
              expenses={expenses}
              assets={assets}
              settings={settings}
              fixedExpenses={fixedExpenses}
              paidFixedIds={paidFixedIds}
              onToggleFixedPaid={handleToggleFixedPaid}
              onAddFixedExpense={handleAddFixedExpense}
              onDeleteFixedExpense={handleDeleteFixedExpense}
              onDirectUpdateNetWorth={handleDirectUpdateNetWorth}
              onOpenExpense={(cat?: any) => {
                setExpenseDefaultCategory(cat || 'food');
                setIsExpenseModalOpen(true);
              }}
              onOpenIncome={() => setIsIncomeModalOpen(true)}
              onNavigateHistory={() => setActiveTab('history')}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {activeTab === 'history' && (
            <HistoryList
              incomes={incomes}
              expenses={expenses}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onToggleExpensePending={handleToggleExpensePending}
            />
          )}

          {activeTab === 'assets' && (
            <AssetManager
              assets={assets}
              defaultAssetId={defaultAssetId}
              systemNetWorth={currentNetWorth}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
              onSetDefaultAsset={handleSetDefaultAsset}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsModal
              settings={settings}
              onSave={handleSaveSettings}
            />
          )}
        </main>

        {/* 퀵 액션 (+ 입력) */}
        {isQuickActionOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end md:items-center justify-center pb-24 md:pb-0"
            onClick={() => setIsQuickActionOpen(false)}
          >
            <div 
              className="bg-white border border-slate-100 p-4 rounded-3xl w-72 space-y-2.5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-semibold text-slate-500 text-center pb-1">
                빠른 기록
              </div>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  setIsExpenseModalOpen(true);
                }}
                className="w-full h-11 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl text-xs md:text-sm transition shadow-sm"
              >
                + 지출 기록하기
              </button>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  setIsIncomeModalOpen(true);
                }}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/60 font-semibold rounded-2xl text-xs md:text-sm transition"
              >
                + 수입 기록하기
              </button>
            </div>
          </div>
        )}

        {/* 모바일 하단 네비게이션 (PC에서는 상단 탭 사용) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200/70 shadow-lg">
          <div className="w-full flex items-center justify-around py-2 px-3">
            {([
              ['home', '홈', Home],
              ['history', '내역', ReceiptText],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-1 w-14 transition ${
                  activeTab === key ? 'text-[#10B981] font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={19} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}

            {/* 중앙 + 입력 */}
            <button
              onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
              className="flex flex-col items-center gap-0.5 w-14 transition"
              aria-label="입력"
            >
              <div className="w-10 h-10 -mt-3 rounded-full bg-[#10B981] flex items-center justify-center text-white transition active:scale-95 shadow-md shadow-emerald-500/25">
                <PlusCircle size={22} />
              </div>
              <span className="text-[10px] font-semibold text-[#10B981]">입력</span>
            </button>

            {([
              ['assets', '자산', Landmark],
              ['settings', '설정', SettingsIcon],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-1 w-14 transition ${
                  activeTab === key ? 'text-[#10B981] font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={19} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* 지출 모달 */}
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSubmit={handleAddExpense}
          defaultCategory={expenseDefaultCategory}
        />

        {/* 수입 모달 */}
        <IncomeModal
          isOpen={isIncomeModalOpen}
          onClose={() => setIsIncomeModalOpen(false)}
          onSubmit={handleAddIncome}
        />
      </div>
    </div>
  );
}

export default App;
