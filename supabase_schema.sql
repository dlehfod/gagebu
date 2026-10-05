-- ==========================================
-- 개인 자산관리 가계부 Supabase 테이블 스키마
-- ==========================================

-- 1. 수입 테이블 (incomes)
CREATE TABLE IF NOT EXISTS incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 지출 테이블 (expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL CHECK (category IN ('food', 'entertainment', 'shopping', 'fixed', 'business', 'other')),
    memo TEXT,
    is_pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 고정비 마스터 테이블 (fixed_expenses)
CREATE TABLE IF NOT EXISTS fixed_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    payment_day INT NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
    auto_add BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 자산/부채 테이블 (assets)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('asset', 'debt')),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 사용자 설정 테이블 (settings)
CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY DEFAULT 'default_user',
    monthly_discretionary_limit BIGINT DEFAULT 1000000,
    monthly_saving_goal BIGINT DEFAULT 3000000,
    asset_goal BIGINT DEFAULT 50000000,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 자산 보정 기록 테이블 (asset_adjustments)
CREATE TABLE IF NOT EXISTS asset_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    system_net_worth BIGINT NOT NULL,
    actual_net_worth BIGINT NOT NULL,
    asset_net_at_adjust BIGINT NOT NULL,
    diff BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 월별 저축 기록 테이블 (monthly_savings)
CREATE TABLE IF NOT EXISTS monthly_savings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    month TEXT NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    memo TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 권한 및 보안 설정 (개인용 가계부 클라이언트 접속 허용)
-- ==========================================
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_savings ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (기존 정책이 있어도 충돌 방지)
DROP POLICY IF EXISTS "Allow all for incomes" ON incomes;
CREATE POLICY "Allow all for incomes" ON incomes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for expenses" ON expenses;
CREATE POLICY "Allow all for expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for fixed_expenses" ON fixed_expenses;
CREATE POLICY "Allow all for fixed_expenses" ON fixed_expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for assets" ON assets;
CREATE POLICY "Allow all for assets" ON assets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for settings" ON settings;
CREATE POLICY "Allow all for settings" ON settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for asset_adjustments" ON asset_adjustments;
CREATE POLICY "Allow all for asset_adjustments" ON asset_adjustments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for monthly_savings" ON monthly_savings;
CREATE POLICY "Allow all for monthly_savings" ON monthly_savings FOR ALL USING (true) WITH CHECK (true);
