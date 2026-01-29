/*
# 添加会员系统

## 1. 新增字段到 users 表
- `membership_level` (text): 会员等级 (free, basic, intermediate, premium)
- `credits` (integer): 当前码分余额
- `last_credit_grant_date` (date): 上次发放码分的日期

## 2. 新增表
- `credit_transactions`: 码分消费记录表
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `amount` (integer): 码分变动数量（正数为增加，负数为扣减）
  - `transaction_type` (text): 交易类型 (grant, consume, upgrade)
  - `feature_name` (text): 功能名称
  - `description` (text): 描述
  - `created_at` (timestamptz)

- `feature_prices`: 功能价格配置表
  - `id` (uuid, primary key)
  - `feature_key` (text, unique): 功能标识
  - `feature_name` (text): 功能名称
  - `price` (integer): 价格（码分）
  - `description` (text): 描述
  - `is_active` (boolean): 是否启用
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

## 3. 会员等级配置
- free: 免费会员，100码分/月
- basic: 初级会员，500码分/月
- intermediate: 中级会员，1000码分/月
- premium: 高级会员，2000码分/月

## 4. 安全策略
- users 表：用户可以查看和更新自己的会员信息
- credit_transactions 表：用户只能查看自己的交易记录
- feature_prices 表：所有人可读，无需认证

## 5. 初始功能价格数据
- novel_creation: 小说创作，10码分
- character_creation: 角色创作，1码分
- panel_creation: 分镜创作，10码分
- script_creation: 剧本创作，10码分
- script_image_generation: 剧本图片生成，1码分
- novel_recreation: 小说二次创作，5码分
*/

-- 创建会员等级枚举类型
CREATE TYPE membership_level AS ENUM ('free', 'basic', 'intermediate', 'premium');

-- 创建交易类型枚举
CREATE TYPE transaction_type AS ENUM ('grant', 'consume', 'upgrade', 'refund');

-- 添加会员相关字段到 users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS membership_level membership_level DEFAULT 'free'::membership_level NOT NULL,
ADD COLUMN IF NOT EXISTS credits integer DEFAULT 100 NOT NULL,
ADD COLUMN IF NOT EXISTS last_credit_grant_date date DEFAULT CURRENT_DATE NOT NULL;

-- 创建码分交易记录表
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type transaction_type NOT NULL,
  feature_name text,
  description text,
  balance_after integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 创建功能价格配置表
CREATE TABLE IF NOT EXISTS feature_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  price integer NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_prices_feature_key ON feature_prices(feature_key);

-- 启用 RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_prices ENABLE ROW LEVEL SECURITY;

-- credit_transactions 策略：用户只能查看自己的交易记录
CREATE POLICY "用户可以查看自己的交易记录" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- feature_prices 策略：所有人可读
CREATE POLICY "所有人可以查看功能价格" ON feature_prices
  FOR SELECT USING (true);

-- 插入初始功能价格数据
INSERT INTO feature_prices (feature_key, feature_name, price, description) VALUES
  ('novel_creation', '小说创作', 10, '创建一部新小说'),
  ('character_creation', '角色创作', 1, '创建一个角色形象'),
  ('panel_creation', '分镜创作', 10, '创建漫画分镜'),
  ('script_creation', '剧本创作', 10, '创建剧本内容'),
  ('script_image_generation', '剧本图片生成', 1, '生成剧本配图'),
  ('novel_recreation', '小说二次创作', 5, '对现有小说进行二次创作')
ON CONFLICT (feature_key) DO NOTHING;

-- 创建函数：扣减码分
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_feature_key text,
  p_amount integer,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits integer;
  v_new_balance integer;
  v_feature_name text;
BEGIN
  -- 获取当前码分余额
  SELECT credits INTO v_current_credits
  FROM users
  WHERE id = p_user_id;

  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 检查余额是否足够
  IF v_current_credits < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', '码分余额不足');
  END IF;

  -- 获取功能名称
  SELECT feature_name INTO v_feature_name
  FROM feature_prices
  WHERE feature_key = p_feature_key;

  -- 扣减码分
  v_new_balance := v_current_credits - p_amount;
  
  UPDATE users
  SET credits = v_new_balance,
      updated_at = now()
  WHERE id = p_user_id;

  -- 记录交易
  INSERT INTO credit_transactions (user_id, amount, transaction_type, feature_name, description, balance_after)
  VALUES (p_user_id, -p_amount, 'consume'::transaction_type, v_feature_name, p_description, v_new_balance);

  RETURN jsonb_build_object(
    'success', true, 
    'balance', v_new_balance,
    'deducted', p_amount
  );
END;
$$;

-- 创建函数：发放码分
CREATE OR REPLACE FUNCTION grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT '每月会员码分发放'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits integer;
  v_new_balance integer;
BEGIN
  -- 获取当前码分余额
  SELECT credits INTO v_current_credits
  FROM users
  WHERE id = p_user_id;

  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 增加码分
  v_new_balance := v_current_credits + p_amount;
  
  UPDATE users
  SET credits = v_new_balance,
      last_credit_grant_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_user_id;

  -- 记录交易
  INSERT INTO credit_transactions (user_id, amount, transaction_type, feature_name, description, balance_after)
  VALUES (p_user_id, p_amount, 'grant'::transaction_type, '系统发放', p_description, v_new_balance);

  RETURN jsonb_build_object(
    'success', true, 
    'balance', v_new_balance,
    'granted', p_amount
  );
END;
$$;

-- 创建函数：升级会员
CREATE OR REPLACE FUNCTION upgrade_membership(
  p_user_id uuid,
  p_new_level membership_level
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_level membership_level;
  v_grant_amount integer;
BEGIN
  -- 获取当前会员等级
  SELECT membership_level INTO v_current_level
  FROM users
  WHERE id = p_user_id;

  IF v_current_level IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 根据新等级确定发放的码分数量
  CASE p_new_level
    WHEN 'free'::membership_level THEN v_grant_amount := 100;
    WHEN 'basic'::membership_level THEN v_grant_amount := 500;
    WHEN 'intermediate'::membership_level THEN v_grant_amount := 1000;
    WHEN 'premium'::membership_level THEN v_grant_amount := 2000;
    ELSE v_grant_amount := 100;
  END CASE;

  -- 更新会员等级并发放码分
  UPDATE users
  SET membership_level = p_new_level,
      credits = credits + v_grant_amount,
      last_credit_grant_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_user_id;

  -- 记录交易
  INSERT INTO credit_transactions (user_id, amount, transaction_type, feature_name, description, balance_after)
  VALUES (
    p_user_id, 
    v_grant_amount, 
    'upgrade'::transaction_type, 
    '会员升级', 
    '升级到 ' || p_new_level || ' 会员',
    (SELECT credits FROM users WHERE id = p_user_id)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'new_level', p_new_level,
    'granted', v_grant_amount
  );
END;
$$;

-- 创建函数：检查并发放每月码分
CREATE OR REPLACE FUNCTION check_and_grant_monthly_credits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_grant_date date;
  v_membership_level membership_level;
  v_grant_amount integer;
  v_current_month text;
  v_last_grant_month text;
BEGIN
  -- 获取用户信息
  SELECT last_credit_grant_date, membership_level
  INTO v_last_grant_date, v_membership_level
  FROM users
  WHERE id = p_user_id;

  IF v_last_grant_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 检查是否需要发放（不同月份）
  v_current_month := to_char(CURRENT_DATE, 'YYYY-MM');
  v_last_grant_month := to_char(v_last_grant_date, 'YYYY-MM');

  IF v_current_month = v_last_grant_month THEN
    RETURN jsonb_build_object('success', false, 'error', '本月已发放');
  END IF;

  -- 根据会员等级确定发放数量
  CASE v_membership_level
    WHEN 'free'::membership_level THEN v_grant_amount := 100;
    WHEN 'basic'::membership_level THEN v_grant_amount := 500;
    WHEN 'intermediate'::membership_level THEN v_grant_amount := 1000;
    WHEN 'premium'::membership_level THEN v_grant_amount := 2000;
    ELSE v_grant_amount := 100;
  END CASE;

  -- 发放码分
  RETURN grant_credits(p_user_id, v_grant_amount, '每月会员码分发放');
END;
$$;
