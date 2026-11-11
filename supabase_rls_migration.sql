-- ============================================================
-- 가계부 RLS 마이그레이션 (본인 계정만 데이터 읽기/쓰기)
-- Supabase 대시보드 > SQL Editor 에서 한 번만 실행
--
-- 실행 전 조건
--   1) Authentication > Users 에 본인 계정이 "정확히 1개" 있어야 함
--   2) 로그인 화면이 들어간 새 버전 앱이 배포돼 있어야 함
--
-- 되돌리기: 맨 아래 [ROLLBACK] 블록의 주석을 풀고 실행하면 RLS가 꺼짐
-- ============================================================

-- 1. 기존 데이터에 본인 계정 ID 붙이기
do $$
declare
  uid uuid;
  n int;
begin
  select count(*) into n from auth.users;
  if n <> 1 then
    raise exception '사용자가 정확히 1명이어야 합니다 (현재 %명). Authentication > Users 를 확인하세요.', n;
  end if;
  select id into uid from auth.users limit 1;

  update public.incomes           set user_id = uid where user_id is null;
  update public.expenses          set user_id = uid where user_id is null;
  update public.fixed_expenses    set user_id = uid where user_id is null;
  update public.assets            set user_id = uid where user_id is null;
  update public.asset_adjustments set user_id = uid where user_id is null;
  update public.monthly_savings   set user_id = uid where user_id is null;

  -- settings 는 user_id 가 TEXT 기본키 ('default_user')
  if exists (select 1 from public.settings where user_id = uid::text) then
    delete from public.settings where user_id <> uid::text;
  else
    update public.settings set user_id = uid::text where user_id = 'default_user';
  end if;
end $$;

-- 2. 앞으로 새로 저장되는 데이터는 자동으로 로그인한 본인 ID
alter table public.incomes           alter column user_id set default auth.uid();
alter table public.expenses          alter column user_id set default auth.uid();
alter table public.fixed_expenses    alter column user_id set default auth.uid();
alter table public.assets            alter column user_id set default auth.uid();
alter table public.asset_adjustments alter column user_id set default auth.uid();
alter table public.monthly_savings   alter column user_id set default auth.uid();
alter table public.settings          alter column user_id set default (auth.uid())::text;

-- 3. RLS 켜기 + 본인 데이터만 허용
alter table public.incomes           enable row level security;
alter table public.expenses          enable row level security;
alter table public.fixed_expenses    enable row level security;
alter table public.assets            enable row level security;
alter table public.asset_adjustments enable row level security;
alter table public.monthly_savings   enable row level security;
alter table public.settings          enable row level security;

drop policy if exists "owner_only" on public.incomes;
drop policy if exists "owner_only" on public.expenses;
drop policy if exists "owner_only" on public.fixed_expenses;
drop policy if exists "owner_only" on public.assets;
drop policy if exists "owner_only" on public.asset_adjustments;
drop policy if exists "owner_only" on public.monthly_savings;
drop policy if exists "owner_only" on public.settings;

create policy "owner_only" on public.incomes           for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_only" on public.expenses          for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_only" on public.fixed_expenses    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_only" on public.assets            for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_only" on public.asset_adjustments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_only" on public.monthly_savings   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_only" on public.settings          for all to authenticated using (user_id = (auth.uid())::text) with check (user_id = (auth.uid())::text);

-- ============================================================
-- [ROLLBACK] 문제가 생기면 아래 주석(--)을 지우고 실행 → RLS 꺼짐 (데이터는 그대로)
-- ============================================================
-- alter table public.incomes           disable row level security;
-- alter table public.expenses          disable row level security;
-- alter table public.fixed_expenses    disable row level security;
-- alter table public.assets            disable row level security;
-- alter table public.asset_adjustments disable row level security;
-- alter table public.monthly_savings   disable row level security;
-- alter table public.settings          disable row level security;
