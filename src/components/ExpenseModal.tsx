import React, { useState } from 'react';
import { CATEGORIES, getLocalDateString, type ExpenseCategory } from '../types';
import { storageService } from '../lib/storage';
import { X, Plus } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; category: ExpenseCategory; memo?: string; date: string; is_pending?: boolean }) => void;
  defaultCategory?: ExpenseCategory;
  defaultDate?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSubmit, defaultCategory = 'food', defaultDate }) => {
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(defaultCategory);
  const [memo, setMemo] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [date, setDate] = useState(() => defaultDate || getLocalDateString());

  // 고정비 상태 (납부 예정 vs 납부 완료)
  const [isPending, setIsPending] = useState(true);

  // 고정비 구분 태그 상태
  const [fixedTags, setFixedTags] = useState<string[]>(['통신비', '월세/관리비', '보험료', '구독료(OTT/음악)', '교통/주유']);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // 사업비 구분 태그 상태
  const [businessTags, setBusinessTags] = useState<string[]>(['광고비', '바이브코딩', '세금', '기타']);
  const [isAddingBusinessTag, setIsAddingBusinessTag] = useState(false);
  const [newBusinessTagInput, setNewBusinessTagInput] = useState('');

  // 생활필수 구분 태그 상태
  const [foodTags, setFoodTags] = useState<string[]>(['한끼', '장보기', '생필품', '기타']);
  const [isAddingFoodTag, setIsAddingFoodTag] = useState(false);
  const [newFoodTagInput, setNewFoodTagInput] = useState('');

  // 나쁜짓 구분 태그 상태
  const [entertainmentTags, setEntertainmentTags] = useState<string[]>(['나이트', '차비', '여자만남', '어플', '군것질', '술값', '기타']);
  const [isAddingEntertainmentTag, setIsAddingEntertainmentTag] = useState(false);
  const [newEntertainmentTagInput, setNewEntertainmentTagInput] = useState('');

  // 물건 구분 태그 상태 (옷, 기타물건)
  const [shoppingTags, setShoppingTags] = useState<string[]>(['옷', '기타물건']);
  const [isAddingShoppingTag, setIsAddingShoppingTag] = useState(false);
  const [newShoppingTagInput, setNewShoppingTagInput] = useState('');

  const modalRef = React.useRef<HTMLDivElement>(null);
  const businessSectionRef = React.useRef<HTMLDivElement>(null);
  const foodSectionRef = React.useRef<HTMLDivElement>(null);
  const fixedSectionRef = React.useRef<HTMLDivElement>(null);
  const entertainmentSectionRef = React.useRef<HTMLDivElement>(null);
  const shoppingSectionRef = React.useRef<HTMLDivElement>(null);

  const handleCategorySelect = (catKey: ExpenseCategory) => {
    setCategory(catKey);
    if (catKey === 'business') {
      setTimeout(() => {
        businessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } else if (catKey === 'food') {
      setTimeout(() => {
        foodSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } else if (catKey === 'entertainment') {
      setTimeout(() => {
        entertainmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } else if (catKey === 'shopping') {
      setTimeout(() => {
        shoppingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } else if (catKey === 'fixed') {
      setTimeout(() => {
        fixedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };

  const loadTags = async () => {
    const fTags = await storageService.getFixedTags();
    if (fTags && fTags.length > 0) setFixedTags(fTags);
    const bTags = await storageService.getBusinessTags();
    if (bTags && bTags.length > 0) setBusinessTags(bTags);
    const foTags = await storageService.getFoodTags();
    if (foTags && foTags.length > 0) setFoodTags(foTags);
    const eTags = await storageService.getEntertainmentTags();
    if (eTags && eTags.length > 0) setEntertainmentTags(eTags);
    const sTags = await storageService.getShoppingTags();
    if (sTags && sTags.length > 0) setShoppingTags(sTags);
  };

  React.useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setDate(defaultDate || getLocalDateString());
      setShowMemo(Boolean(defaultDate && defaultDate !== getLocalDateString()));
      loadTags();
      document.body.style.overflow = 'hidden';
      if (modalRef.current) {
        modalRef.current.scrollTop = 0;
      }
      if (defaultCategory === 'business') {
        setTimeout(() => {
          businessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      } else if (defaultCategory === 'food') {
        setTimeout(() => {
          foodSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      } else if (defaultCategory === 'entertainment') {
        setTimeout(() => {
          entertainmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      } else if (defaultCategory === 'shopping') {
        setTimeout(() => {
          shoppingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultCategory, defaultDate]);

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const updated = await storageService.addFixedTag(newTagInput.trim());
    setFixedTags(updated);
    setMemo(newTagInput.trim());
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleAddBusinessTag = async () => {
    if (!newBusinessTagInput.trim()) return;
    const updated = await storageService.addBusinessTag(newBusinessTagInput.trim());
    setBusinessTags(updated);
    setMemo(newBusinessTagInput.trim());
    setNewBusinessTagInput('');
    setIsAddingBusinessTag(false);
  };

  const handleAddFoodTag = async () => {
    if (!newFoodTagInput.trim()) return;
    const updated = await storageService.addFoodTag(newFoodTagInput.trim());
    setFoodTags(updated);
    setMemo(newFoodTagInput.trim());
    setNewFoodTagInput('');
    setIsAddingFoodTag(false);
  };

  const handleAddEntertainmentTag = async () => {
    if (!newEntertainmentTagInput.trim()) return;
    const updated = await storageService.addEntertainmentTag(newEntertainmentTagInput.trim());
    setEntertainmentTags(updated);
    setMemo(newEntertainmentTagInput.trim());
    setNewEntertainmentTagInput('');
    setIsAddingEntertainmentTag(false);
  };

  const handleAddShoppingTag = async () => {
    if (!newShoppingTagInput.trim()) return;
    const updated = await storageService.addShoppingTag(newShoppingTagInput.trim());
    setShoppingTags(updated);
    setMemo(newShoppingTagInput.trim());
    setNewShoppingTagInput('');
    setIsAddingShoppingTag(false);
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
        ref={modalRef}
        className="w-full sm:max-w-md max-h-[85dvh] overflow-y-auto overscroll-contain bg-white border border-slate-200/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200"
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

                let selectedStyle = 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm';
                if (isSelected) {
                  if (catKey === 'business') {
                    selectedStyle = 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-2 ring-blue-400/30';
                  } else if (catKey === 'food') {
                    selectedStyle = 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-400/30';
                  } else if (catKey === 'fixed') {
                    selectedStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-2 ring-emerald-400/30';
                  }
                }

                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => handleCategorySelect(catKey)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition text-sm font-semibold ${
                      isSelected
                        ? selectedStyle
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

          {/* 생활필수 세부 구분 칩 및 직접 추가 기능 */}
          {category === 'food' && (
            <div ref={foodSectionRef} className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>🍚</span>
                  <span>생활필수 세부 구분 (터치하여 선택)</span>
                </span>
                {!isAddingFoodTag && (
                  <button
                    type="button"
                    onClick={() => setIsAddingFoodTag(true)}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-white border border-amber-200/80 px-2 py-0.5 rounded-lg transition shadow-xs flex items-center gap-0.5"
                  >
                    <Plus size={11} />
                    <span>새 구분 만들기</span>
                  </button>
                )}
              </div>

              {/* 새 생활필수 구분 직접 만들기 폼 */}
              {isAddingFoodTag && (
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="새 구분 이름 (예: 한끼, 식대, 생필품)"
                    value={newFoodTagInput}
                    onChange={(e) => setNewFoodTagInput(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-amber-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFoodTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFoodTag}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingFoodTag(false); setNewFoodTagInput(''); }}
                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded-xl text-xs"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 생활필수 태그 칩 목록 */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {foodTags.map((tag) => {
                  const isSelected = memo === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setMemo(isSelected ? '' : tag);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200/70 hover:bg-amber-50/80'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 나쁜짓 세부 구분 칩 (나이트, 차비, 여자만남, 어플, 군것질, 술값 등) */}
          {category === 'entertainment' && (
            <div ref={entertainmentSectionRef} className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="font-bold text-purple-950 flex items-center gap-1.5">
                  <span>😈</span>
                  <span>나쁜짓 세부 구분 (터치하여 선택)</span>
                </span>
                {!isAddingEntertainmentTag && (
                  <button
                    type="button"
                    onClick={() => setIsAddingEntertainmentTag(true)}
                    className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-white border border-purple-200/80 px-2 py-0.5 rounded-lg transition shadow-xs flex items-center gap-0.5"
                  >
                    <Plus size={11} />
                    <span>새 구분 만들기</span>
                  </button>
                )}
              </div>

              {/* 새 나쁜짓 구분 직접 만들기 폼 */}
              {isAddingEntertainmentTag && (
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="새 구분 이름 (예: 나이트, 술값, 군것질)"
                    value={newEntertainmentTagInput}
                    onChange={(e) => setNewEntertainmentTagInput(e.target.value)}
                    className="flex-1 bg-white border border-purple-300 rounded-xl px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-purple-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEntertainmentTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddEntertainmentTag}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingEntertainmentTag(false); setNewEntertainmentTagInput(''); }}
                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded-xl text-xs"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 나쁜짓 태그 칩 목록 */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {entertainmentTags.map((tag) => {
                  const isSelected = memo === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setMemo(isSelected ? '' : tag);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 border-purple-200/70 hover:bg-purple-50/80'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 물건 세부 구분 칩 (옷사기, 기타 등) */}
          {category === 'shopping' && (
            <div ref={shoppingSectionRef} className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="font-bold text-rose-950 flex items-center gap-1.5">
                  <span>🛍</span>
                  <span>물건 세부 구분 (터치하여 선택)</span>
                </span>
                {!isAddingShoppingTag && (
                  <button
                    type="button"
                    onClick={() => setIsAddingShoppingTag(true)}
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-white border border-rose-200/80 px-2 py-0.5 rounded-lg transition shadow-xs flex items-center gap-0.5"
                  >
                    <Plus size={11} />
                    <span>새 구분 만들기</span>
                  </button>
                )}
              </div>

              {/* 새 물건 구분 직접 만들기 폼 */}
              {isAddingShoppingTag && (
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="새 구분 이름 (예: 생필품, 전자기기)"
                    value={newShoppingTagInput}
                    onChange={(e) => setNewShoppingTagInput(e.target.value)}
                    className="flex-1 bg-white border border-rose-300 rounded-xl px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-rose-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddShoppingTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddShoppingTag}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingShoppingTag(false); setNewShoppingTagInput(''); }}
                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded-xl text-xs"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 물건 태그 칩 목록 (옷사기, 기타) */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {shoppingTags.map((tag) => {
                  const isSelected = memo === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setMemo(isSelected ? '' : tag);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-rose-200/70 hover:bg-rose-50/80'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 고정비 세부 구분 칩 및 직접 추가 기능 */}
          {category === 'fixed' && (
            <div ref={fixedSectionRef} className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
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
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setMemo(tag);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-emerald-200/70 hover:bg-emerald-50/80'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 사업비 세부 구분 칩 및 직접 추가 기능 */}
          {category === 'business' && (
            <div ref={businessSectionRef} className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <span>💼</span>
                  <span>사업비 세부 항목 (터치하여 선택)</span>
                </span>
                {!isAddingBusinessTag && (
                  <button
                    type="button"
                    onClick={() => setIsAddingBusinessTag(true)}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200/80 px-2 py-0.5 rounded-lg transition shadow-xs flex items-center gap-0.5"
                  >
                    <Plus size={11} />
                    <span>새 항목 만들기</span>
                  </button>
                )}
              </div>

              {/* 새 사업비 구분 직접 만들기 폼 */}
              {isAddingBusinessTag && (
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="새 항목 이름 (예: 서버비, 식대, 비품)"
                    value={newBusinessTagInput}
                    onChange={(e) => setNewBusinessTagInput(e.target.value)}
                    className="flex-1 bg-white border border-blue-300 rounded-xl px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBusinessTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddBusinessTag}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingBusinessTag(false); setNewBusinessTagInput(''); }}
                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded-xl text-xs"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 사업비 태그 칩 목록 */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {businessTags.map((tag) => {
                  const isSelected = memo === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setMemo(isSelected ? '' : tag);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-blue-200/70 hover:bg-blue-50/80'
                      }`}
                    >
                      {tag}
                    </button>
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
