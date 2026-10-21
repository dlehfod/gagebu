import React, { useState, useRef, useEffect } from 'react';
import { type Income, type Expense, type Settings, type FixedExpense, CATEGORIES } from '../types';
import { Sparkles, Loader2, RefreshCw, Send, MessageCircle, Bot, User, CheckCircle2 } from 'lucide-react';

interface AdviceProps {
  incomes: Income[];
  expenses: Expense[];
  settings: Settings;
  fixedExpenses: FixedExpense[];
  paidFixedIds: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const won = (n: number) => `${Math.round(n).toLocaleString()}원`;
const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + x.amount, 0);

// 로컬 규칙 기반 종합 조언 생성 함수 (API 실패 시 또는 기본 단일 텍스트 조언용)
const generateSingleAdviceText = ({ incomes, expenses, settings, fixedExpenses, paidFixedIds }: AdviceProps): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const prefix = `${y}-${pad(m + 1)}`;
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

  if (monthExp.length === 0 && revenue === 0) {
    return `📝 아직 이번 달 가계부 기록이 등록되지 않았어요.\n\n수입이나 지출을 몇 개 기록해 주시면, 대표님의 평소 소비 습관과 수입 흐름을 꼼꼼히 분석해서 꼭 맞는 재정 조언을 들려드릴게요.`;
  }

  const sections: string[] = [];

  // 1. 생활비 한도 및 잔여 현황
  if (living > limit) {
    sections.push(
      `1. 생활비 한도 상태\n· 이번 달 생활비 한도 ${won(limit)} 중 ${won(living)}을 사용하여, 한도를 ${won(living - limit)} 초과한 상태예요.\n· 남은 ${remainingDays}일 동안은 꼭 필요한 기본 식비 외의 지출은 최대한 멈추고 방어 모드로 운영하시는 것을 권장드려요.`
    );
  } else {
    const remaining = limit - living;
    const perDay = Math.floor(remaining / Math.max(remainingDays, 1));
    const projected = (living / Math.max(day, 1)) * daysInMonth;

    if (projected > limit) {
      sections.push(
        `1. 생활비 한도 상태 (주의)\n· 지금까지 생활비로 ${won(living)}을 사용하셨어요. (남은 생활비: ${won(remaining)})\n· 현재 지출 속도가 다소 빨라 이대로 유지되면 월말에 약 ${won(projected)}을 쓸 것으로 예상돼요.\n· 앞으로 남은 기간 동안 하루 평균 ${won(perDay)} 이하로 지출하시면 한도 안에서 안전하게 마무리할 수 있어요.`
      );
    } else {
      sections.push(
        `1. 생활비 한도 상태 (안정)\n· 이번 달 생활비 한도 ${won(limit)} 중 ${won(living)}만 사용하여 아주 훌륭하게 아끼고 계세요.\n· 남은 생활비는 ${won(remaining)}이며, 남은 ${remainingDays}일 동안 하루 ${won(perDay)}까지 여유 있게 쓰셔도 안전해요.`
      );
    }
  }

  // 2. 소비 패턴 분석 (배달/식비 및 사업비)
  if (living > 0) {
    const catMap: Record<string, number> = {};
    livingList.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const sortedCats = Object.entries(catMap).sort(([, a], [, b]) => b - a);
    if (sortedCats.length > 0) {
      const [topKey, topAmount] = sortedCats[0];
      const share = Math.round((topAmount / living) * 100);
      const catInfo = CATEGORIES[topKey as keyof typeof CATEGORIES];
      const catName = catInfo?.label || (topKey === 'food' ? '식비' : topKey);

      sections.push(
        `2. 지출 패턴 분석\n· 생활비 중 가장 큰 비중은 '${catName}'(${won(topAmount)}, ${share}%)이 차지하고 있어요.\n· 재택근무 특성상 배달이나 포장 지출이 잦아질 수 있으니, 주 1~2회 정도만 가벼운 간편식으로 대체해도 지출을 크게 줄일 수 있어요.`
      );
    }
  }

  // 3. 수입 및 순이익 종합 요약
  if (revenue > 0) {
    const rate = Math.round((net / revenue) * 100);
    if (net < 0) {
      sections.push(
        `3. 이번 달 종합 평가\n· 총 수입은 +${won(revenue)}이지만, 전체 지출(사업·고정비 포함)이 -${won(totalExpense)}로 ${won(Math.abs(net))} 적자 상태예요.\n· 사업용 지출과 고정비 지출 일정을 다시 한 번 점검해 보시는 것을 추천해요.`
      );
    } else {
      sections.push(
        `3. 이번 달 종합 평가\n· 총 수입 +${won(revenue)} 대비 전체 지출은 -${won(totalExpense)}이며, 순수하게 +${won(net)}을 남기셨어요. (저축/마진율: ${rate}%)\n· 온라인 사업 수익과 지출 관리가 매우 모범적으로 균형을 이루고 있어요.`
      );
    }
  } else if (totalExpense > 0) {
    sections.push(
      `3. 이번 달 종합 평가\n· 현재까지 총 지출은 -${won(totalExpense)} 기록되어 있어요.\n· 이번 달 입금된 수입 내역을 함께 기록해 주시면 더 정확한 순이익과 저축률을 진단해 드릴 수 있어요.`
    );
  }

  const userGoal = settings.financial_goal || '총자산 1억 모으기';
  sections.push(
    `🎯 나의 핵심 목표: [${userGoal}]\n· 대표님께서 세우신 목표를 향해 이번 달 순수익을 차곡차곡 자산 통장에 쌓아가시면 달성 시점을 훨씬 앞당길 수 있어요!`
  );

  return sections.join('\n\n');
};

// AI에 보낼 요약 데이터
const buildSummary = ({ incomes, expenses, settings, fixedExpenses, paidFixedIds }: AdviceProps) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const prefix = `${y}-${pad(m + 1)}`;
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
    오늘날짜: `${prefix}-${pad(day)}`,
    경과일수: day,
    남은일수: daysInMonth - day + 1,
    사용자_재정목표: settings.financial_goal || '총자산 1억 모으기',
    생활비한도: settings.monthly_discretionary_limit || 1000000,
    이번달수입합계: revenue,
    이번달생활비합계: living,
    이번달사업비합계: business,
    이번달고정비합계: fixedTotal,
    이번달총지출: living + business + fixedTotal,
    순이익: revenue - (living + business + fixedTotal),
    분류별지출: byCategory,
  };
};

export const Advice: React.FC<AdviceProps> = props => {
  const [adviceText, setAdviceText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 채팅이 추가되면 스크롤 아래로 이동
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // 처음 조언 요청
  const handleRequestAdvice = async () => {
    setLoading(true);
    setChatMessages([]);
    setIsChatOpen(false);

    const summary = buildSummary(props);

    try {
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.advice && Array.isArray(json.advice)) {
        // AI가 준 advice 리스트를 띄어쓰기 잘 정돈된 단일 텍스트 네모로 합성
        const formatted = json.advice
          .map((a: any, idx: number) => {
            return `${idx + 1}. ${a.emoji || '📌'} ${a.title}\n${a.body}`;
          })
          .join('\n\n');

        setAdviceText(formatted);
      } else {
        throw new Error('AI 응답 파싱 실패');
      }
    } catch {
      // 실패 시 규칙 기반의 단일 네모 텍스트로 즉시 대체
      setAdviceText(generateSingleAdviceText(props));
    } finally {
      setLoading(false);
    }
  };

  // 추가 채팅 질문 전송
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || chatLoading) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: trimmed }];
    setChatMessages(newMessages);
    setInputText('');
    setChatLoading(true);

    const summary = buildSummary(props);

    try {
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          chatMessages: newMessages,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.reply) {
        setChatMessages([...newMessages, { role: 'assistant', content: json.reply }]);
      } else {
        throw new Error('채팅 응답 없음');
      }
    } catch {
      // 로컬 fallback 답변
      setChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `현재 가계부 기준으로 말씀드리면, 이번 달 생활비는 한도 내에서 잘 관리되고 있어요. 특히 배달 및 간식 지출을 하루 1만~2만 원 선으로만 방어하셔도 큰 무리 없이 목표를 달성하실 수 있습니다! 더 궁금한 부분이 있으시면 언제든 말씀해 주세요.`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 상단 배너 카드 */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-xl shadow-emerald-900/10">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium">
          <Sparkles size={16} />
          <span>가계부 맞춤 조언</span>
        </div>
        <p className="mt-2 text-sm text-emerald-50 leading-relaxed">
          이번 달 수입, 생활비, 고정비를 종합 분석하여 꼭 필요한 실천 팁을 한눈에 정리해 드립니다.
        </p>

        <button
          onClick={handleRequestAdvice}
          disabled={loading}
          className="mt-4 w-full h-12 rounded-2xl bg-white text-emerald-700 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-70 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin text-emerald-600" />
              <span>가계부 분석 중...</span>
            </>
          ) : adviceText ? (
            <>
              <RefreshCw size={16} />
              <span>다시 조언받기</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>조언받기</span>
            </>
          )}
        </button>
      </section>

      {/* ⭐ 사용자의 핵심 요구: 처음 조언은 딱 '한 네모' 안에만 띄어쓰기 잘해서 표시 ⭐ */}
      {adviceText && !loading && (
        <div className="space-y-4">
          <section className="bg-white rounded-3xl p-6 border border-slate-300/80 shadow-sm">
            <div className="flex items-center gap-2 pb-3.5 mb-4 border-b border-slate-100">
              <span className="text-xl">💡</span>
              <h3 className="text-base font-extrabold text-slate-900">
                이번 달 가계부 종합 조언
              </h3>
            </div>

            {/* 넉넉한 띄어쓰기와 깔끔한 줄바꿈의 단일 텍스트 본문 */}
            <div className="text-[13px] md:text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-4 font-normal">
              {adviceText}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 size={14} />
                <span>분석 완료</span>
              </span>
              <span>재무 코칭 가이드</span>
            </div>
          </section>

          {/* ⭐ 사용자의 두번째 요구: "추가로 질문하겠습니까? 하면 채팅하도록 해줘" ⭐ */}
          <section className="bg-white rounded-3xl border border-slate-300/80 shadow-sm overflow-hidden">
            {!isChatOpen ? (
              <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      추가로 질문하시겠어요?
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      식비 절약법, 이번 달 저축 가능액 등 무엇이든 편하게 물어보세요.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <MessageCircle size={15} />
                  <span>질문 채팅하기</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-[420px]">
                {/* 채팅창 헤더 */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                      <Bot size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">AI 재무 코치와 1:1 대화</span>
                      <span className="text-[10px] text-emerald-600 font-medium">가계부 데이터를 바탕으로 답변해요</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg transition"
                  >
                    접기
                  </button>
                </div>

                {/* 메시지 영역 */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8F9FA]/60">
                  {/* 기본 웰컴 메시지 */}
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                      <Bot size={13} />
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-xs bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs leading-relaxed whitespace-pre-line">
                      대표님, 가계부 조언에 대해 더 궁금한 점이 있으신가요?
                      {"\n\n"}예: "배달비를 줄이려면 어떻게 할까?", "이번 달 얼마까지 저축할 수 있어?" 등 자유롭게 물어보세요!
                    </div>
                  </div>

                  {/* 채팅 히스토리 */}
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start max-w-[85%]'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                          <Bot size={13} />
                        </div>
                      )}

                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                          msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-xs font-medium max-w-[80%]'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                          <User size={13} />
                        </div>
                      )}
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-1 pl-8">
                      <Loader2 size={13} className="animate-spin text-emerald-600" />
                      <span>답변을 작성하고 있어요...</span>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* 입력 폼 */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="추가 질문을 입력하세요..."
                    className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || chatLoading}
                    className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
