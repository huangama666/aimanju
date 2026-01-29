/*
# 添加会员升级次月生效和码分充值功能

## 1. 新增字段到 users 表
- `pending_membership_level` (membership_level): 待生效的会员等级（次月生效）
- `pending_membership_effective_date` (date): 待生效会员等级的生效日期

## 2. 新增交易类型
- `recharge`: 充值

## 3. 新增表
- `recharge_packages`: 充值套餐表
  - `id` (uuid, primary key)
  - `package_name` (text): 套餐名称
  - `credits_amount` (integer): 码分数量
  - `price` (numeric): 价格（元）
  - `bonus_credits` (integer): 赠送码分
  - `is_active` (boolean): 是否启用
  - `sort_order` (integer): 排序
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

## 4. 业务逻辑
- 会员升级后，等级在次月1号生效
- 充值立即到账
- 每月1号自动检查并应用待生效的会员等级

## 5. 安全策略
- recharge_packages 表：所有人可读
*/

-- 添加待生效会员等级字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pending_membership_level membership_level,
ADD COLUMN IF NOT EXISTS pending_membership_effective_date date;

-- 添加充值交易类型
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'recharge';

-- 创建充值套餐表
CREATE TABLE IF NOT EXISTS recharge_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  credits_amount integer NOT NULL,
  price numeric(10, 2) NOT NULL,
  bonus_credits integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_recharge_packages_sort_order ON recharge_packages(sort_order);

-- 启用 RLS
ALTER TABLE recharge_packages ENABLE ROW LEVEL SECURITY;

-- recharge_packages 策略：所有人可读
CREATE POLICY "所有人可以查看充值套餐" ON recharge_packages
  FOR SELECT USING (is_active = true);

-- 插入初始充值套餐数据
INSERT INTO recharge_packages (package_name, credits_amount, price, bonus_credits, sort_order) VALUES
  ('体验套餐', 100, 10.00, 0, 1),
  ('基础套餐', 500, 45.00, 50, 2),
  ('进阶套餐', 1000, 85.00, 150, 3),
  ('专业套餐', 2000, 160.00, 400, 4),
  ('豪华套餐', 5000, 380.00, 1200, 5),
  ('至尊套餐', 10000, 700.00, 3000, 6)
ON CONFLICT DO NOTHING;

-- 创建函数：充值码分
CREATE OR REPLACE FUNCTION recharge_credits(
  p_user_id uuid,
  p_package_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits_amount integer;
  v_bonus_credits integer;
  v_total_credits integer;
  v_current_credits integer;
  v_new_balance integer;
  v_package_name text;
BEGIN
  -- 获取套餐信息
  SELECT credits_amount, bonus_credits, package_name
  INTO v_credits_amount, v_bonus_credits, v_package_name
  FROM recharge_packages
  WHERE id = p_package_id AND is_active = true;

  IF v_credits_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '充值套餐不存在或已下架');
  END IF;

  -- 计算总码分
  v_total_credits := v_credits_amount + v_bonus_credits;

  -- 获取当前码分余额
  SELECT credits INTO v_current_credits
  FROM users
  WHERE id = p_user_id;

  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 增加码分
  v_new_balance := v_current_credits + v_total_credits;
  
  UPDATE users
  SET credits = v_new_balance,
      updated_at = now()
  WHERE id = p_user_id;

  -- 记录交易
  INSERT INTO credit_transactions (user_id, amount, transaction_type, feature_name, description, balance_after)
  VALUES (
    p_user_id, 
    v_total_credits, 
    'recharge'::transaction_type, 
    v_package_name, 
    format('充值 %s 码分，赠送 %s 码分', v_credits_amount, v_bonus_credits),
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true, 
    'balance', v_new_balance,
    'recharged', v_total_credits,
    'base_credits', v_credits_amount,
    'bonus_credits', v_bonus_credits
  );
END;
$$;

-- 创建函数：升级会员（次月生效）
CREATE OR REPLACE FUNCTION upgrade_membership_next_month(
  p_user_id uuid,
  p_new_level membership_level
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_level membership_level;
  v_effective_date date;
BEGIN
  -- 获取当前会员等级
  SELECT membership_level INTO v_current_level
  FROM users
  WHERE id = p_user_id;

  IF v_current_level IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 计算生效日期（下个月1号）
  v_effective_date := date_trunc('month', CURRENT_DATE + interval '1 month')::date;

  -- 更新待生效会员等级
  UPDATE users
  SET pending_membership_level = p_new_level,
      pending_membership_effective_date = v_effective_date,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'current_level', v_current_level,
    'pending_level', p_new_level,
    'effective_date', v_effective_date
  );
END;
$$;

-- 创建函数：应用待生效的会员等级
CREATE OR REPLACE FUNCTION apply_pending_membership(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_level membership_level;
  v_effective_date date;
  v_grant_amount integer;
  v_current_credits integer;
  v_new_balance integer;
BEGIN
  -- 获取待生效的会员等级信息
  SELECT pending_membership_level, pending_membership_effective_date, credits
  INTO v_pending_level, v_effective_date, v_current_credits
  FROM users
  WHERE id = p_user_id;

  IF v_pending_level IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '没有待生效的会员等级');
  END IF;

  -- 检查是否到了生效日期
  IF v_effective_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', '尚未到生效日期');
  END IF;

  -- 根据新等级确定发放的码分数量
  CASE v_pending_level
    WHEN 'free'::membership_level THEN v_grant_amount := 100;
    WHEN 'basic'::membership_level THEN v_grant_amount := 500;
    WHEN 'intermediate'::membership_level THEN v_grant_amount := 1000;
    WHEN 'premium'::membership_level THEN v_grant_amount := 2000;
    ELSE v_grant_amount := 100;
  END CASE;

  -- 计算新余额
  v_new_balance := v_current_credits + v_grant_amount;

  -- 应用会员等级并发放码分
  UPDATE users
  SET membership_level = v_pending_level,
      credits = v_new_balance,
      last_credit_grant_date = CURRENT_DATE,
      pending_membership_level = NULL,
      pending_membership_effective_date = NULL,
      updated_at = now()
  WHERE id = p_user_id;

  -- 记录交易
  INSERT INTO credit_transactions (user_id, amount, transaction_type, feature_name, description, balance_after)
  VALUES (
    p_user_id, 
    v_grant_amount, 
    'upgrade'::transaction_type, 
    '会员升级', 
    '升级到 ' || v_pending_level || ' 会员（次月生效）',
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true, 
    'new_level', v_pending_level,
    'granted', v_grant_amount,
    'balance', v_new_balance
  );
END;
$$;

-- 创建函数：检查并应用所有待生效的会员等级（定时任务用）
CREATE OR REPLACE FUNCTION check_and_apply_all_pending_memberships()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_applied_count integer := 0;
BEGIN
  -- 查找所有需要应用的待生效会员等级
  FOR v_user_record IN 
    SELECT id 
    FROM users 
    WHERE pending_membership_level IS NOT NULL 
      AND pending_membership_effective_date <= CURRENT_DATE
  LOOP
    -- 应用待生效的会员等级
    PERFORM apply_pending_membership(v_user_record.id);
    v_applied_count := v_applied_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'applied_count', v_applied_count
  );
END;
$$;
