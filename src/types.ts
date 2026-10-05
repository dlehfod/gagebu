export type ExpenseCategory = 
  | 'food'
  | 'entertainment'
  | 'shopping'
  | 'fixed'
  | 'business'
  | 'other';

export interface CategoryInfo {
  label: string;
  emoji: string;
  description: string;
  isDiscretionary?: boolean;
}

export const CATEGORIES: Record<ExpenseCategory, CategoryInfo> = {
  food: { label: '음식', emoji: '🍚', description: '식사, 배달, 카페, 간식, 편의점', isDiscretionary: true },
  entertainment: { label: '유흥', emoji: '🎮', description: '술자리, 모임, 게임, 여행, 취미', isDiscretionary: true },
  shopping: { label: '물건', emoji: '🛍', description: '쿠팡, 의류, 전자기기, 잡화', isDiscretionary: true },
  fixed: { label: '고정비', emoji: '🏠', description: '월세, 통신비, 보험, 연금' },
  business: { label: '사업비', emoji: '💼', description: '광고비, 서버비, 툴 구독, 외주' },
  other: { label: '기타', emoji: '🚕', description: '교통, 병원, 약, 미용, 수리', isDiscretionary: true },
};

export interface Income {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  memo?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  memo?: string;
  is_pending?: boolean; // true: 납부 예정 고정비, false/undefined: 납부 완료 고정비
  created_at?: string;
}

export interface FixedExpense {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  payment_day: number;
  auto_add: boolean;
  active: boolean;
  created_at?: string;
}

export interface Asset {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  type: 'asset' | 'debt';
  is_default?: boolean;
  updated_at?: string;
}

export interface AssetSnapshot {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM
  total_assets: number;
  total_debt: number;
  net_worth: number;
  created_at?: string;
}

export interface Settings {
  user_id?: string;
  monthly_discretionary_limit: number; // 월 자유소비 한도 (기본 1,000,000)
  monthly_saving_goal: number; // 월 저축/남길돈 목표 (기본 3,000,000)
  asset_goal: number; // 1차 순자산 목표 (기본 50,000,000)
}

export interface AssetAdjustment {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  system_net_worth: number; // 보정 직전 시스템 계산 순자산
  actual_net_worth: number; // 사용자가 입력한 실제 순자산
  asset_net_at_adjust: number; // 보정 시점의 자산 탭 순자산 (이후 자산 탭 수정분 반영용)
  diff: number; // actual - system
  created_at: string;
}

export interface MonthlySaving {
  id: string;
  user_id?: string;
  month: string; // YYYY-MM
  amount: number;
  memo?: string;
  updated_at?: string;
}

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
