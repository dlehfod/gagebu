import React, { useState } from 'react';
import type { Settings } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { Database, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  settings: Settings;
  onSave: (updated: Settings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave }) => {
  const [limitStr, setLimitStr] = useState(String(settings.monthly_discretionary_limit || 1000000));
  const [assetGoalStr, setAssetGoalStr] = useState(String(settings.asset_goal || 0));
  const [isSaved, setIsSaved] = useState(false);

  // settings props가 변경되거나 로드되었을 때 상태 동기화
  React.useEffect(() => {
    setLimitStr(String(settings.monthly_discretionary_limit || 1000000));
    setAssetGoalStr(String(settings.asset_goal || 0));
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = (str: string, fallback: number) => {
      const parsed = parseInt(str.replace(/[^0-9]/g, ''), 10);
      return isNaN(parsed) ? fallback : parsed;
    };

    onSave({
      monthly_discretionary_limit: cleanNum(limitStr, 1000000),
      monthly_saving_goal: settings.monthly_saving_goal || 0,
      asset_goal: cleanNum(assetGoalStr, 50000000),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 데이터베이스 연결 상태 */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Database size={16} className={isSupabaseConfigured ? 'text-emerald-500' : 'text-amber-500'} />
          <span>데이터베이스 상태:</span>
          {isSupabaseConfigured ? (
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
              Supabase 클라우드 연동됨
            </span>
          ) : (
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full text-[11px] border border-amber-200">
              로컬 스토리지 (브라우저 저장 중)
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
          {isSupabaseConfigured 
            ? '데이터가 Supabase 클라우드에 안전하게 실시간 동기화되고 있습니다.' 
            : '.env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정하시면 자동으로 Supabase와 연동됩니다. 현재는 브라우저 내부 저장소에 안전하게 유지됩니다.'}
        </p>
      </div>

      {/* 목표 및 한도 설정 */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          예산 및 목표 설정
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            한 달 행복 소비 한도 (쇼핑·카페·문화)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={limitStr ? Number(limitStr.replace(/[^0-9]/g, '')).toLocaleString() : ''}
              onChange={(e) => setLimitStr(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400"
            />
            <span className="absolute right-4 top-3 text-xs text-slate-400">원</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            내가 꿈꾸는 1차 순자산 목표
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={assetGoalStr ? Number(assetGoalStr.replace(/[^0-9]/g, '')).toLocaleString() : ''}
              onChange={(e) => setAssetGoalStr(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400"
            />
            <span className="absolute right-4 top-3 text-xs text-slate-400">원</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20"
        >
          {isSaved ? '✓ 설정이 안전하게 저장되었습니다' : '설정 저장하기'}
        </button>
      </form>
    </div>
  );
};
