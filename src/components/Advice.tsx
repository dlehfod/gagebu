import React, { useState } from 'react';
import { type Income, type Expense, type Settings, type FixedExpense, CATEGORIES } from '../types';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface AdviceProps {
  incomes: Income[];
  expenses: Expense[];
  settings: Settings;
  fixedExpenses: FixedExpense[];
  paidFixedIds: string[];
}

type Level = 'danger' | 'warn' | 'good' | 'info';

interface AdviceItem {
  level: Level;
  emoji: string;
  title: string;
  body: string;
}

const won = (n: number) => `${Math.round(n).toLocaleString()}원`;
const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + x.amount, 0);

const LEVEL_STYLE: Record<Level, { box: string; title: string }> = {
  danger: { box: 'bg-rose-50 border-rose-200', title: 'text-rose-700' },
  warn: { box: 'bg-amber-50 border-amber-200', title: 'text-amber-700' },
  good: { box: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-700' },
  info: { box: 'bg-slate-50 border-slate-200', title: 'text-slate-700' },
};

const LEVEL_ORDER: Record<Level, number> = { danger: 0, warn: 1, info: 2, good: 3 };

// 가계부 숫자를 보고 규칙 기반으로 조언 목록을 만든다 (외부 AI 호출 없음)
const buildAdvice = ({ incomes, expenses, settings, fixedExpenses, paidFixedIds }: AdviceProps): AdviceItem[] => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const prefix = `${y}-${pad(m + 1)}`;
  const prevDate = new Date(y, m - 1, 1);
  const prevPrefix = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
  const todayStr = `${prefix}-${pad(now.getDate())}`;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const day = now.getDate();
  const remainingDays = daysInMonth - day + 1; // 오늘 포함

  const limit = settings.monthly_discretionary_limit || 1000000;
  const actual = expenses.filter(e => !e.is_pending);
  const isLiving = (e: Expense) => e.category !== 'fixed' && e.category !== 'business';

  const monthExp = actual.filter(e => e.date.startsWith(prefix));
  const livingList = monthExp.filter(isLiving);
  const living = sum(livingList);
  const business = sum(monthExp.filter(e => e.category === 'business'));
  const paidFixedTotal = sum(fixedExpenses.filter(f => paidFixedIds.includes(f.id)));
  const fixedTotal = sum(monthExp.filter(e => e.category === 'fixed')) + paidFixedTotal;
  const totalExpense = living + business + fixedTotal;
  const revenue = sum(incomes.filter(i => i.date.startsWith(prefix)));
  const net = revenue - totalExpense;

  const items: AdviceItem[] = [];

  // 기록이 거의 없을 때
  if (monthExp.length === 0 && revenue === 0) {
    return [
      {
        level: 'info',
        emoji: '📝',
        title: '아직 이번 달 기록이 없어요',
        body: '수입이나 지출을 몇 개 기록하면 그에 맞춰 조언을 드릴게요.',
      },
    ];
  }

  // 1. 생활비 한도
  if (living > limit) {
    items.push({
      level: 'danger',
      emoji: '🚨',
      title: `생활비 한도를 ${won(living - limit)} 넘었어요`,
      body: `한도 ${won(limit)} 중 ${won(living)}을 썼어요. 남은 ${remainingDays}일은 꼭 필요한 지출만 하는 걸 추천해요.`,
    });
  } else {
    const remaining = limit - living;
    const perDay = Math.floor(remaining / Math.max(remainingDays, 1));
    const projected = (living / Math.max(day, 1)) * daysInMonth;
    if (projected > limit) {
      items.push({
        level: 'warn',
        emoji: '⚠️',
        title: '이 속도면 월말에 한도를 넘어요',
        body: `지금까지 ${won(living)} 썼고, 이 속도면 월말에 약 ${won(projected)}이에요. 하루 ${won(perDay)} 이하로 쓰면 한도 안에서 끝낼 수 있어요.`,
      });
    } else {
      items.push({
        level: 'good',
        emoji: '👍',
        title: '생활비를 잘 지키고 있어요',
        body: `한도 ${won(limit)} 중 ${won(living)} 사용, 남은 ${won(remaining)}이에요. 하루 ${won(perDay)}까지 써도 괜찮아요.`,
      });
    }

    // 2. 오늘 지출이 하루 권장액을 넘었는지 (한도 안일 때만)
    const todayLiving = sum(livingList.filter(e => e.date === todayStr));
    if (perDay > 0 && todayLiving > perDay) {
      items.push({
        level: 'warn',
        emoji: '🛒',
        title: '오늘은 평소 권장액보다 많이 썼어요',
        body: `오늘 ${won(todayLiving)} 사용 (하루 권장 ${won(perDay)}). 내일 조금 아끼면 균형이 맞아요.`,
      });
    }
  }

  // 3. 지난달 같은 기간 대비 생활비
  const prevSame = sum(
    actual.filter(e => e.date.startsWith(prevPrefix) && isLiving(e) && parseInt(e.date.slice(8, 10), 10) <= day),
  );
  if (prevSame > 0) {
    const pct = Math.round(((living - prevSame) / prevSame) * 100);
    if (pct >= 20) {
      items.push({
        level: 'warn',
        emoji: '📈',
        title: `지난달 같은 시점보다 생활비가 ${pct}% 늘었어요`,
        body: `지난달 ${day}일까지 ${won(prevSame)}, 이번 달은 ${won(living)}이에요.`,
      });
    } else if (pct <= -20) {
      items.push({
        level: 'good',
        emoji: '📉',
        title: `지난달 같은 시점보다 생활비가 ${Math.abs(pct)}% 줄었어요`,
        body: `지난달 ${day}일까지 ${won(prevSame)}, 이번 달은 ${won(living)}이에요. 잘하고 있어요!`,
      });
    } else {
      items.push({
        level: 'info',
        emoji: '📊',
        title: '지난달과 비슷한 수준으로 쓰고 있어요',
        body: `지난달 같은 시점 ${won(prevSame)} / 이번 달 ${won(living)}`,
      });
    }
  }

  // 4. 생활비 중 가장 큰 항목
  if (living > 0) {
    const catMap: Record<string, number> = {};
    livingList.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const [topKey, topAmount] = Object.entries(catMap).sort(([, a], [, b]) => b - a)[0];
    const share = Math.round((topAmount / living) * 100);
    const info = CATEGORIES[topKey as keyof typeof CATEGORIES];
    items.push({
      level: share >= 50 ? 'warn' : 'info',
      emoji: info?.emoji || '🏷️',
      title: `생활비 중 ${info?.label || topKey}이 ${share}%로 가장 커요`,
      body:
        share >= 50
          ? `${won(topAmount)}이 한 곳에 몰려 있어요. 이 항목만 줄여도 효과가 가장 커요.`
          : `${won(topAmount)} 사용. 줄일 곳을 찾는다면 여기부터 살펴보세요.`,
    });
  }

  // 5. 수입 대비 남긴 돈
  if (revenue > 0) {
    const rate = Math.round((net / revenue) * 100);
    if (net < 0) {
      items.push({
        level: 'danger',
        emoji: '💸',
        title: `번 돈보다 ${won(Math.abs(net))} 더 썼어요`,
        body: `이번 달 수입 ${won(revenue)}, 지출 ${won(totalExpense)} (사업·고정비 포함)이에요.`,
      });
    } else if (rate < 10) {
      items.push({
        level: 'warn',
        emoji: '🪙',
        title: `수입 대비 남긴 돈이 ${rate}%뿐이에요`,
        body: `수입 ${won(revenue)} 중 ${won(net)}만 남았어요. 목표는 최소 10~20%예요.`,
      });
    } else {
      items.push({
        level: rate >= 30 ? 'good' : 'info',
        emoji: '💰',
        title: `수입의 ${rate}%를 남기고 있어요`,
        body: `수입 ${won(revenue)}, 지출 ${won(totalExpense)} → ${won(net)} 남았어요.`,
      });
    }
  } else if (totalExpense > 0) {
    items.push({
      level: 'info',
      emoji: '🧾',
      title: '이번 달 수입 기록이 아직 없어요',
      body: '수입을 기록해야 남긴 돈과 저축률을 정확히 볼 수 있어요.',
    });
  }

  // 6. 사업비 비중
  if (revenue > 0 && business > 0) {
    const bizRate = Math.round((business / revenue) * 100);
    if (bizRate >= 40) {
      items.push({
        level: 'warn',
        emoji: '💼',
        title: `사업비가 수입의 ${bizRate}%예요`,
        body: `수입 ${won(revenue)} 중 ${won(business)}이 사업비로 나갔어요. 효율이 낮은 지출이 없는지 점검해 보세요.`,
      });
    }
  }

  // 7. 아직 안 낸 고정비
  const pendingFixed = fixedExpenses.filter(f => !paidFixedIds.includes(f.id));
  if (pendingFixed.length > 0) {
    const names = pendingFixed.slice(0, 3).map(f => f.name).join(', ');
    items.push({
      level: 'info',
      emoji: '📌',
      title: `아직 안 낸 고정비가 ${pendingFixed.length}개 있어요`,
      body: `${names}${pendingFixed.length > 3 ? ' 등' : ''} · 합계 ${won(sum(pendingFixed))}. 통장 잔고를 미리 확인해 두세요.`,
    });
  }

  return items.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
};

// AI에게 보낼 이번 달 가계부 요약 (숫자 위주, 개인 식별 정보 없음)
const buildSummary = ({ incomes, expenses, settings, fixedExpenses, paidFixedIds }: AdviceProps) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const prefix = `${y}-${pad(m + 1)}`;
  const prevDate = new Date(y, m - 1, 1);
  const prevPrefix = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
  const todayStr = `${prefix}-${pad(now.getDate())}`;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const day = now.getDate();

  const actual = expenses.filter(e => !e.is_pending);
  const isLiving = (e: Expense) => e.category !== 'fixed' && e.category !== 'business';
  const monthExp = actual.filter(e => e.date.startsWith(prefix));
  const livingList = monthExp.filter(isLiving);
  const living = sum(livingList);
  const business = sum(monthExp.filter(e => e.category === 'business'));
  const fixedPaid = sum(fixedExpenses.filter(f => paidFixedIds.includes(f.id)));
  const fixedTotal = sum(monthExp.filter(e => e.category === 'fixed')) + fixedPaid;
  const monthIncomes = incomes.filter(i => i.date.startsWith(prefix));
  const revenue = sum(monthIncomes);

  const byCategory: Record<string, number> = {};
  monthExp.forEach(e => {
    const label = CATEGORIES[e.category]?.label || e.category;
    byCategory[label] = (byCategory[label] || 0) + e.amount;
  });

  return {
    오늘날짜: todayStr,
    경과일수: day,
    남은일수_오늘포함: daysInMonth - day + 1,
    이번달총일수: daysInMonth,
    이번달수입합계: revenue,
    이번달생활비합계_사업비고정비제외: living,
    생활비한도: settings.monthly_discretionary_limit || 1000000,
    이번달사업비합계: business,
    이번달고정비합계: fixedTotal,
    이번달총지출: living + business + fixedTotal,
    이번달남긴돈: revenue - (living + business + fixedTotal),
    오늘생활비: sum(livingList.filter(e => e.date === todayStr)),
    지난달같은시점생활비: sum(
      actual.filter(e => e.date.startsWith(prevPrefix) && isLiving(e) && parseInt(e.date.slice(8, 10), 10) <= day),
    ),
    분류별지출: byCategory,
    아직안낸고정비: fixedExpenses
      .filter(f => !paidFixedIds.includes(f.id))
      .map(f => ({ 이름: f.name, 금액: f.amount, 결제일: f.payment_day })),
    큰지출내역: [...monthExp]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15)
      .map(e => ({ 날짜: e.date, 분류: CATEGORIES[e.category]?.label || e.category, 금액: e.amount, 메모: e.memo || '' })),
    수입내역: [...monthIncomes]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(i => ({ 날짜: i.date, 금액: i.amount, 메모: i.memo || '' })),
  };
};

interface QA {
  q: string;
  a: string;
}

export const Advice: React.FC<AdviceProps> = props => {
  const [items, setItems] = useState<AdviceItem[] | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [history, setHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedAI, setUsedAI] = useState(false);
  const [notice, setNotice] = useState('');

  // AI(Gemini)에게 조언 요청. 서버리스 API 우선, 실패 시 클라이언트 키 직접 호출 백업
  const requestAdvice = async (qa: QA[]) => {
    setLoading(true);
    setNotice('');
    const summary = buildSummary(props);

    try {
      let data: any = null;

      // 서버리스 함수 /api/advice 호출 (API 키는 서버에서만 사용)
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, qa }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.advice) {
        throw new Error(json?.error || `서버 응답 오류 (${res.status})`);
      }
      data = json;

      const advice: AdviceItem[] = (Array.isArray(data?.advice) ? data.advice : []).map((a: AdviceItem) => ({
        ...a,
        level: a.level in LEVEL_STYLE ? a.level : 'info',
      }));
      if (advice.length === 0) throw new Error('조언 내용이 비어있습니다.');
      const qs: string[] = Array.isArray(data.questions) ? data.questions.slice(0, 3) : [];
      setItems(advice);
      setQuestions(qs);
      setAnswers(qs.map(() => ''));
      setUsedAI(true);
    } catch (e: any) {
      console.error('AI 조언 실패, 기본 분석으로 대체', e);
      setItems(buildAdvice(props));
      setQuestions([]);
      setAnswers([]);
      setUsedAI(false);
      setNotice(`AI 연결에 실패하여 기본 분석으로 표시 중입니다. (${e?.message || '알 수 없는 오류'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    setHistory([]);
    requestAdvice([]);
  };

  // 사용자가 AI 질문에 답한 뒤, 답변을 반영한 더 자세한 풀이를 다시 요청
  const handleSendAnswers = () => {
    const newQa: QA[] = questions
      .map((q, i) => ({ q, a: (answers[i] || '').trim() }))
      .filter(x => x.a.length > 0);
    if (newQa.length === 0) return;
    const all = [...history, ...newQa];
    setHistory(all);
    requestAdvice(all);
  };

  return (
    <div className="space-y-4 pb-24">
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-xl shadow-emerald-900/10">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium">
          <Sparkles size={16} />
          <span>내 가계부 조언</span>
        </div>
        <p className="mt-2 text-sm text-emerald-50 leading-relaxed">
          AI가 이번 달 수입·지출·생활비 한도를 보고 지금 상태와 해야 할 일을 알려드려요. 더 알아야 할 게 있으면 질문도 해요.
        </p>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="mt-4 w-full h-12 rounded-2xl bg-white text-emerald-700 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>AI가 가계부 분석 중...</span>
            </>
          ) : items ? (
            <>
              <RefreshCw size={16} />
              <span>처음부터 다시 조언받기</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>조언받기</span>
            </>
          )}
        </button>
      </section>

      {items && !loading && (
        <div className="space-y-2.5">
          {items.map((it, idx) => (
            <div key={idx} className={`rounded-2xl border p-4 ${LEVEL_STYLE[it.level].box}`}>
              <div className={`flex items-start gap-2 text-sm font-extrabold ${LEVEL_STYLE[it.level].title}`}>
                <span className="text-base leading-snug">{it.emoji}</span>
                <span className="leading-snug">{it.title}</span>
              </div>
              <p className="mt-1.5 pl-7 text-xs text-slate-600 leading-relaxed whitespace-pre-line">{it.body}</p>
            </div>
          ))}

          {/* AI가 더 정확한 풀이를 위해 사용자에게 던지는 질문 */}
          {usedAI && questions.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <div className="text-sm font-extrabold text-indigo-700">🤔 더 정확히 풀이하려고 물어볼게요</div>
              {questions.map((q, i) => (
                <div key={i} className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">{q}</label>
                  <input
                    type="text"
                    value={answers[i] || ''}
                    onChange={e => setAnswers(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                    placeholder="간단히 적어주세요 (모르면 비워두세요)"
                    className="w-full h-10 px-3 rounded-xl border border-indigo-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              ))}
              <button
                onClick={handleSendAnswers}
                disabled={loading || answers.every(a => !a.trim())}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                답변 보내고 더 자세한 풀이 받기
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center pt-1">
            {usedAI
              ? '※ Gemini AI가 기록된 숫자를 보고 만든 조언이에요. 참고용으로 활용하세요.'
              : `※ ${notice || '기록된 숫자를 기준으로 한 자동 분석이에요.'}`}
          </p>
        </div>
      )}
    </div>
  );
};
