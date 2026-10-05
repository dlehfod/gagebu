import React, { useState } from 'react';
import type { Asset } from '../types';
import { Plus, Trash2, ShieldCheck, CreditCard } from 'lucide-react';

interface AssetManagerProps {
  assets: Asset[];
  defaultAssetId?: string;
  systemNetWorth?: number;
  onAddAsset: (asset: Omit<Asset, 'id' | 'updated_at'>) => void;
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onDeleteAsset: (id: string) => void;
  onSetDefaultAsset?: (id: string) => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({
  assets,
  defaultAssetId,
  systemNetWorth,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onSetDefaultAsset,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<'asset' | 'debt'>('asset');

  const defaultAsset = (defaultAssetId && assets.find(a => a.id === defaultAssetId && a.type === 'asset'))
    || assets.find(a => a.type === 'asset');
  const activeDefaultId = defaultAsset?.id;

  const totalAssets = assets
    .filter(a => a.type === 'asset')
    .reduce((sum, a) => sum + a.amount, 0);

  const totalDebt = assets
    .filter(a => a.type === 'debt')
    .reduce((sum, a) => sum + a.amount, 0);

  const calculatedNetWorth = totalAssets - totalDebt;
  // 등록된 개별 항목이 있으면 개별 항목 합계, 없으면 홈 화면의 실제 순자산 표시
  const netWorth = assets.length > 0 ? calculatedNetWorth : (systemNetWorth ?? 0);
  const displayTotalAssets = assets.length > 0 ? totalAssets : (systemNetWorth && systemNetWorth > 0 ? systemNetWorth : 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr, 10);
    if (!name.trim() || isNaN(amount)) return;

    onAddAsset({
      name: name.trim(),
      amount,
      type,
    });

    setName('');
    setAmountStr('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 순자산 카드 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold">내 총 순자산</div>
          {assets.length === 0 && systemNetWorth !== undefined && systemNetWorth !== 0 && (
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full font-medium">
              홈 화면 자산 보정 동기화됨
            </span>
          )}
        </div>
        <div className="text-3xl font-black text-slate-900 mt-1">
          {netWorth.toLocaleString()} <span className="text-lg font-normal text-slate-400">원</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-200/60">
            <div className="text-slate-500 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>총 자산</span>
            </div>
            <div className="font-bold text-emerald-600 text-sm mt-0.5">
              +{displayTotalAssets.toLocaleString()}원
            </div>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-200/60">
            <div className="text-slate-500 flex items-center gap-1">
              <CreditCard size={14} className="text-rose-500" />
              <span>총 부채</span>
            </div>
            <div className="font-bold text-rose-500 text-sm mt-0.5">
              -{totalDebt.toLocaleString()}원
            </div>
          </div>
        </div>
      </div>

      {/* 기본 지출 통장 안내 배너 */}
      {defaultAsset && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 px-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-950">
            <span className="text-base">💳</span>
            <div>
              <span className="font-bold">기본 지출 통장: </span>
              <span className="font-extrabold text-emerald-700">{defaultAsset.name}</span>
              <span className="text-[11px] text-emerald-600 block sm:inline sm:ml-1">
                (가계부 지출 시 이 통장에서 자동 차감됩니다)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 개별 항목이 아직 없고 보정된 순자산이 있을 때 편의 등록 제공 */}
      {assets.length === 0 && systemNetWorth !== undefined && systemNetWorth > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-2">
          <div className="font-bold text-emerald-950 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
            <span>홈 화면에서 보정한 내 순자산({systemNetWorth.toLocaleString()}원)이 연동되어 있습니다</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            아래 폼에서 통장별(예: 보통예금, 적금, 주식)로 상세히 나누어 등록하시거나, 버튼 한 번으로 보정된 자산을 기본 통장으로 등록하실 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => onAddAsset({ name: '보통예금 (자산 보정)', amount: systemNetWorth, type: 'asset' })}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs text-xs flex items-center justify-center gap-1"
          >
            <span>+ 이 금액({systemNetWorth.toLocaleString()}원)을 기본 통장 항목으로 등록하기</span>
          </button>
        </div>
      )}

      {/* 자산 목록 헤더 및 추가 버튼 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-500">보유 자산 및 부채 항목</span>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl transition"
        >
          <Plus size={14} />
          <span>항목 추가</span>
        </button>
      </div>

      {/* 새 항목 추가 폼 */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('asset')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                type === 'asset'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              + 자산 (통장/적금/현금)
            </button>
            <button
              type="button"
              onClick={() => setType('debt')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                type === 'debt'
                  ? 'bg-rose-50 border-rose-400 text-rose-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              - 부채 (대출/카드값)
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="항목명 (예: 국민은행 보통예금, 카카오뱅크 비상금)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="현재 잔액 (원)"
              value={amountStr ? Number(amountStr).toLocaleString() : ''}
              onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
            >
              추가하기
            </button>
          </div>
        </form>
      )}

      {/* 자산 목록 */}
      <div className="space-y-2">
        {assets.map(item => {
          const isAssetType = item.type === 'asset';
          const isDefault = isAssetType && item.id === activeDefaultId;

          return (
            <div
              key={item.id}
              className={`bg-white border p-3.5 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition ${
                isDefault ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200/80'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'asset' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="truncate">{item.name}</span>
                  {isDefault && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200/80 shrink-0">
                      ⭐ 기본 지출 통장
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 ml-3.5">
                  <span className="text-[10px] text-slate-400">
                    {item.type === 'asset' ? '자산' : '부채'}
                  </span>
                  {isAssetType && !isDefault && onSetDefaultAsset && (
                    <button
                      type="button"
                      onClick={() => onSetDefaultAsset(item.id)}
                      className="text-[10px] text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-slate-200 hover:border-emerald-200 transition"
                      title="가계부 지출 시 이 통장에서 돈이 빠져나가도록 기본 통장으로 설정합니다"
                    >
                      기본 통장으로 변경
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  defaultValue={item.amount.toLocaleString()}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(val) && val !== item.amount) {
                      onUpdateAsset(item.id, { amount: val });
                    }
                  }}
                  className="w-28 text-right bg-[#F8FAFC] border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                />
                <button
                  onClick={() => {
                    if (window.confirm(`${item.name} 항목을 삭제하시겠습니까?`)) {
                      onDeleteAsset(item.id);
                    }
                  }}
                  className="text-slate-400 hover:text-rose-500 p-1 transition"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
