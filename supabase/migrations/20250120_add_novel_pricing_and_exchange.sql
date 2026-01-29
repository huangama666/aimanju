/*
# 添加小说收费和码分兑换系统

## 1. 修改novels表
- 添加 `price` (integer, default: 0) - 小说收费码分（0表示免费）

## 2. 新建表

### purchase_records 表（购买记录表）
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, references users.id) - 购买用户ID
- `novel_id` (uuid, references novels.id) - 小说ID
- `price` (integer, not null) - 购买时的价格
- `created_at` (timestamptz, default: now()) - 购买时间

### exchange_records 表（码分兑换现金记录表）
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, references users.id) - 用户ID
- `score_amount` (integer, not null) - 兑换的码分数量
- `cash_amount` (numeric(10,2), not null) - 兑换的现金金额
- `status` (text, default: 'completed') - 兑换状态：completed（已完成）、pending（处理中）、cancelled（已取消）
- `created_at` (timestamptz, default: now()) - 兑换时间

## 3. 安全策略
- 所有表启用RLS
- 用户只能查看自己的记录
- 购买记录和兑换记录不可修改

## 4. 索引
- 为user_id和novel_id创建索引
- 为created_at创建索引以提高查询性能

## 5. 唯一约束
- purchase_records: user_id + novel_id 唯一（一个用户对同一本小说只能购买一次）
*/

-- 1. 修改novels表，添加收费字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS price integer DEFAULT 0 NOT NULL;

-- 2. 创建购买记录表
CREATE TABLE IF NOT EXISTS purchase_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  novel_id uuid REFERENCES novels(id) ON DELETE CASCADE NOT NULL,
  price integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, novel_id)
);

-- 3. 创建码分兑换现金记录表
CREATE TABLE IF NOT EXISTS exchange_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  score_amount integer NOT NULL,
  cash_amount numeric(10,2) NOT NULL,
  status text DEFAULT 'completed' NOT NULL CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_purchase_records_user_id ON purchase_records(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_records_novel_id ON purchase_records(novel_id);
CREATE INDEX IF NOT EXISTS idx_purchase_records_created_at ON purchase_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_records_user_id ON exchange_records(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_records_created_at ON exchange_records(created_at DESC);

-- 5. 启用RLS
ALTER TABLE purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_records ENABLE ROW LEVEL SECURITY;

-- 6. 创建RLS策略 - purchase_records
CREATE POLICY "用户可以查看自己的购买记录" ON purchase_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的购买记录" ON purchase_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. 创建RLS策略 - exchange_records
CREATE POLICY "用户可以查看自己的兑换记录" ON exchange_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的兑换记录" ON exchange_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
