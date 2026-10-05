import { supabase, isSupabaseConfigured } from './supabase';
import type { Income, Expense, FixedExpense, Asset, Settings, AssetAdjustment, MonthlySaving } from '../types';

const STORAGE_KEYS = {
  INCOMES: 'app_incomes',
  EXPENSES: 'app_expenses',
  FIXED_EXPENSES: 'app_fixed_expenses',
  DELETED_FIXED_EXPENSES: 'app_deleted_fixed_expenses',
  ASSETS: 'app_assets',
  SETTINGS: 'app_settings',
  ADJUSTMENTS: 'app_asset_adjustments',
  MONTHLY_SAVINGS: 'app_monthly_savings',
  FIXED_TAGS: 'app_fixed_tags',
};

// 기본 샘플 데이터 (앱 최초 실행 시 즉시 시각적으로 확인할 수 있도록 기본값 제공)
const DEFAULT_SETTINGS: Settings = {
  monthly_discretionary_limit: 1000000,
  monthly_saving_goal: 3000000,
  asset_goal: 50000000,
};

const DEFAULT_ASSETS: Asset[] = [
  { id: '1', name: '은행 예금/통장', amount: 25000000, type: 'asset' },
  { id: '2', name: '투자/적금', amount: 10000000, type: 'asset' },
  { id: '3', name: '카드 결제 예정/부채', amount: 2520000, type: 'debt' },
];

const DEFAULT_FIXED_EXPENSES: FixedExpense[] = [
  { id: '1', name: '통신비 (휴대폰 요금)', amount: 65000, payment_day: 15, auto_add: false, active: true },
  { id: '2', name: '넷플릭스 / 유튜브 프리미엄', amount: 17000, payment_day: 25, auto_add: false, active: true },
  { id: '3', name: '실손 의료 보험료', amount: 48000, payment_day: 10, auto_add: false, active: true },
];

const DEFAULT_FIXED_TAGS: string[] = ['통신비', '월세/관리비', '보험료', '구독료(OTT/음악)', '교통/주유'];

export const storageService = {
  // === INCOMES ===
  async getIncomes(): Promise<Income[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('incomes').select('*').order('date', { ascending: false });
      if (!error && data) {
        if (data.length === 0) {
          const raw = localStorage.getItem(STORAGE_KEYS.INCOMES);
          const localItems: Income[] = raw ? JSON.parse(raw) : [];
          if (localItems.length > 0) {
            await supabase.from('incomes').insert(localItems);
            return localItems;
          }
        }
        return data;
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.INCOMES);
    return raw ? JSON.parse(raw) : [];
  },

  async addIncome(income: Omit<Income, 'id' | 'created_at'>): Promise<Income> {
    const newItem: Income = {
      ...income,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('incomes').insert(newItem).select().single();
      if (!error && data) return data;
    }

    const current = await this.getIncomes();
    const updated = [newItem, ...current];
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(updated));
    return newItem;
  },

  async updateIncome(id: string, updates: Partial<Income>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('incomes').update(updates).eq('id', id);
      return;
    }
    const current = await this.getIncomes();
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(updated));
  },

  async deleteIncome(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('incomes').delete().eq('id', id);
      return;
    }
    const current = await this.getIncomes();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(updated));
  },

  // === EXPENSES ===
  async getExpenses(): Promise<Expense[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (!error && data) {
        if (data.length === 0) {
          const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
          const localItems: Expense[] = raw ? JSON.parse(raw) : [];
          if (localItems.length > 0) {
            await supabase.from('expenses').insert(localItems);
            return localItems;
          }
        }
        return data;
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return raw ? JSON.parse(raw) : [];
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const newItem: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('expenses').insert(newItem).select().single();
      if (!error && data) return data;
    }

    const current = await this.getExpenses();
    const updated = [newItem, ...current];
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
    return newItem;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('expenses').update(updates).eq('id', id);
      return;
    }
    const current = await this.getExpenses();
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
  },

  async deleteExpense(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('expenses').delete().eq('id', id);
      return;
    }
    const current = await this.getExpenses();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
  },

  // === SETTINGS ===
  async getSettings(): Promise<Settings> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('settings').select('*').limit(1).single();
      if (!error && data) return data;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  },

  async updateSettings(settings: Settings): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('settings').upsert(settings);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // === ASSETS ===
  async getAssets(): Promise<Asset[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('assets').select('*');
      if (!error && data) {
        if (data.length === 0) {
          const raw = localStorage.getItem(STORAGE_KEYS.ASSETS);
          const localItems: Asset[] = raw ? JSON.parse(raw) : [];
          if (localItems.length > 0) {
            await supabase.from('assets').insert(localItems);
            return localItems;
          }
        }
        return data;
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ASSETS);
    return raw ? JSON.parse(raw) : DEFAULT_ASSETS;
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('assets').update(updates).eq('id', id);
      return;
    }
    const current = await this.getAssets();
    const updated = current.map(item => item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item);
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(updated));
  },

  async addAsset(asset: Omit<Asset, 'id' | 'updated_at'>): Promise<Asset> {
    const newItem: Asset = {
      ...asset,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('assets').insert(newItem).select().single();
      if (data) return data;
    }
    const current = await this.getAssets();
    const updated = [...current, newItem];
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(updated));
    return newItem;
  },

  // === 고정비 ===
  async getFixedExpenses(): Promise<FixedExpense[]> {
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_FIXED_EXPENSES);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

    let result: FixedExpense[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('fixed_expenses').select('*');
        if (!error && data && data.length > 0) {
          result = data;
        }
      } catch (e) {
        console.error('Failed to get fixed expenses from supabase', e);
      }
    }

    if (result.length === 0) {
      const raw = localStorage.getItem(STORAGE_KEYS.FIXED_EXPENSES);
      if (raw !== null) {
        try {
          result = JSON.parse(raw);
        } catch {
          result = [];
        }
      } else {
        result = DEFAULT_FIXED_EXPENSES;
        localStorage.setItem(STORAGE_KEYS.FIXED_EXPENSES, JSON.stringify(DEFAULT_FIXED_EXPENSES));
      }
    }

    // 삭제된 ID 항목은 Supabase나 로컬 어디서 불러와도 무조건 확실하게 제거
    if (deletedIds.length > 0) {
      result = result.filter(item => !deletedIds.includes(String(item.id)));
    }

    return result;
  },

  async addFixedExpense(item: Omit<FixedExpense, 'id' | 'created_at'>): Promise<FixedExpense> {
    const newItem: FixedExpense = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('fixed_expenses').insert(newItem).select().single();
        if (data) return data;
      } catch (e) {
        console.error('Failed to insert fixed expense to supabase', e);
      }
    }
    const current = await this.getFixedExpenses();
    const updated = [newItem, ...current];
    localStorage.setItem(STORAGE_KEYS.FIXED_EXPENSES, JSON.stringify(updated));
    return newItem;
  },

  async updateFixedExpense(id: string, updates: Partial<FixedExpense>): Promise<void> {
    const strId = String(id);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('fixed_expenses').update(updates).eq('id', id);
      } catch (e) {
        console.error('Failed to update fixed expense in supabase', e);
      }
    }
    const current = await this.getFixedExpenses();
    const updated = current.map(item => String(item.id) === strId ? { ...item, ...updates } : item);
    localStorage.setItem(STORAGE_KEYS.FIXED_EXPENSES, JSON.stringify(updated));
  },

  async deleteFixedExpense(id: string): Promise<void> {
    const strId = String(id);

    // 1. 삭제된 고정비 ID 영구 블랙리스트에 추가 (클라우드 데이터 재로딩 시 되살아나는 버그 원천 차단)
    const deletedRaw = localStorage.getItem(STORAGE_KEYS.DELETED_FIXED_EXPENSES);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(strId)) {
      deletedIds.push(strId);
      localStorage.setItem(STORAGE_KEYS.DELETED_FIXED_EXPENSES, JSON.stringify(deletedIds));
    }

    // 2. 로컬 스토리지 데이터에서 즉시 제거
    const raw = localStorage.getItem(STORAGE_KEYS.FIXED_EXPENSES);
    if (raw) {
      try {
        const current: FixedExpense[] = JSON.parse(raw);
        const filtered = current.filter(item => String(item.id) !== strId);
        localStorage.setItem(STORAGE_KEYS.FIXED_EXPENSES, JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }

    // 3. Supabase 클라우드에서도 삭제
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
        if (error) {
          console.warn('Supabase fixed expense delete error:', error.message);
        }
      } catch (e) {
        console.error('Failed to delete fixed expense from supabase', e);
      }
    }
  },

  // === 자산 보정 기록 ===
  async getAdjustments(): Promise<AssetAdjustment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('asset_adjustments').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        if (data.length === 0) {
          const raw = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
          const localItems: AssetAdjustment[] = raw ? JSON.parse(raw) : [];
          if (localItems.length > 0) {
            await supabase.from('asset_adjustments').insert(localItems);
            return localItems;
          }
        }
        return data;
      }
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    return raw ? JSON.parse(raw) : [];
  },

  async addAdjustment(adj: Omit<AssetAdjustment, 'id' | 'created_at'>): Promise<AssetAdjustment> {
    const newItem: AssetAdjustment = {
      ...adj,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('asset_adjustments').insert(newItem).select().single();
      if (!error && data) return data;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    const current: AssetAdjustment[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify([newItem, ...current]));
    return newItem;
  },

  async deleteAsset(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('assets').delete().eq('id', id);
      return;
    }
    const current = await this.getAssets();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(updated));
  },

  // === 저금한 돈 (월별 저축 기록) ===
  async getMonthlySavings(): Promise<MonthlySaving[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('monthly_savings').select('*').order('month', { ascending: false });
      if (!error && data) return data;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_SAVINGS);
    return raw ? JSON.parse(raw) : [];
  },

  async saveMonthlySaving(month: string, amount: number, memo?: string): Promise<MonthlySaving> {
    const current = await this.getMonthlySavings();
    const existingIndex = current.findIndex(s => s.month === month);

    const savingItem: MonthlySaving = {
      id: existingIndex >= 0 ? current[existingIndex].id : crypto.randomUUID(),
      month,
      amount,
      memo,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('monthly_savings').upsert(savingItem);
    }

    let updated: MonthlySaving[];
    if (existingIndex >= 0) {
      updated = current.map((s, idx) => idx === existingIndex ? savingItem : s);
    } else {
      updated = [savingItem, ...current].sort((a, b) => b.month.localeCompare(a.month));
    }
    localStorage.setItem(STORAGE_KEYS.MONTHLY_SAVINGS, JSON.stringify(updated));
    return savingItem;
  },

  async deleteMonthlySaving(month: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('monthly_savings').delete().eq('month', month);
    }
    const current = await this.getMonthlySavings();
    const updated = current.filter(s => s.month !== month);
    localStorage.setItem(STORAGE_KEYS.MONTHLY_SAVINGS, JSON.stringify(updated));
  },

  // === 고정비 구분 태그 (사용자 직접 생성/삭제) ===
  async getFixedTags(): Promise<string[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.FIXED_TAGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FIXED_TAGS, JSON.stringify(DEFAULT_FIXED_TAGS));
      return DEFAULT_FIXED_TAGS;
    }
    return JSON.parse(raw);
  },

  async addFixedTag(tag: string): Promise<string[]> {
    const current = await this.getFixedTags();
    const cleanTag = tag.trim();
    if (!cleanTag || current.includes(cleanTag)) return current;
    const updated = [...current, cleanTag];
    localStorage.setItem(STORAGE_KEYS.FIXED_TAGS, JSON.stringify(updated));
    return updated;
  },

  async deleteFixedTag(tag: string): Promise<string[]> {
    const current = await this.getFixedTags();
    const updated = current.filter(t => t !== tag);
    localStorage.setItem(STORAGE_KEYS.FIXED_TAGS, JSON.stringify(updated));
    return updated;
  }
};
