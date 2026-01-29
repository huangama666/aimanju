/*
# 添加签到和码分系统

## 1. 修改users表
- 添加 `score` (integer, default: 0) - 用户码分总数
- 添加 `consecutive_checkin_days` (integer, default: 0) - 连续签到天数
- 添加 `last_checkin_date` (date, nullable) - 最后签到日期

## 2. 新建表

### checkin_records 表（签到记录表）
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, references users.id) - 用户ID
- `checkin_date` (date, not null) - 签到日期
- `score_earned` (integer, default: 1) - 获得的码分
- `created_at` (timestamptz, default: now()) - 创建时间

### score_records 表（码分变动记录表）
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, references users.id) - 用户ID
- `score_change` (integer, not null) - 码分变动（正数为增加，负数为减少）
- `action_type` (text, not null) - 操作类型：checkin（签到）、share_novel（分享小说）、post（发帖）、delete_post（删除帖子）、delete_share（删除分享）
- `related_id` (uuid, nullable) - 关联ID（帖子ID或分享ID）
- `description` (text) - 描述
- `created_at` (timestamptz, default: now()) - 创建时间

### daily_post_records 表（每日发帖记录表）
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, references users.id) - 用户ID
- `post_date` (date, not null) - 发帖日期
- `first_post_id` (uuid, nullable) - 第一次发帖的帖子ID
- `score_earned` (boolean, default: false) - 是否已获得码分
- `created_at` (timestamptz, default: now()) - 创建时间

### novel_share_records 表（小说分享记录表）
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, references users.id) - 用户ID
- `novel_id` (uuid, not null) - 小说ID
- `share_id` (uuid, nullable) - 分享记录ID
- `score_earned` (boolean, default: false) - 是否已获得码分
- `created_at` (timestamptz, default: now()) - 创建时间

## 3. 安全策略
- 所有表启用RLS
- 用户只能查看自己的记录
- 系统自动管理码分变动

## 4. 索引
- 为user_id创建索引
- 为日期字段创建索引以提高查询性能

## 5. 唯一约束
- checkin_records: user_id + checkin_date 唯一
- daily_post_records: user_id + post_date 唯一
- novel_share_records: user_id + novel_id 唯一
*/

-- 1. 修改users表，添加码分和签到相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS score integer DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consecutive_checkin_days integer DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_checkin_date date;

-- 2. 创建签到记录表
CREATE TABLE IF NOT EXISTS checkin_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  checkin_date date NOT NULL,
  score_earned integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, checkin_date)
);

-- 3. 创建码分变动记录表
CREATE TABLE IF NOT EXISTS score_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  score_change integer NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('checkin', 'share_novel', 'post', 'delete_post', 'delete_share')),
  related_id uuid,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. 创建每日发帖记录表
CREATE TABLE IF NOT EXISTS daily_post_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_date date NOT NULL,
  first_post_id uuid,
  score_earned boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, post_date)
);

-- 5. 创建小说分享记录表
CREATE TABLE IF NOT EXISTS novel_share_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  novel_id uuid NOT NULL,
  share_id uuid,
  score_earned boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, novel_id)
);

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_checkin_records_user_id ON checkin_records(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_records_date ON checkin_records(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_score_records_user_id ON score_records(user_id);
CREATE INDEX IF NOT EXISTS idx_score_records_created_at ON score_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_post_records_user_id ON daily_post_records(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_post_records_date ON daily_post_records(post_date DESC);
CREATE INDEX IF NOT EXISTS idx_novel_share_records_user_id ON novel_share_records(user_id);
CREATE INDEX IF NOT EXISTS idx_novel_share_records_novel_id ON novel_share_records(novel_id);

-- 7. 启用RLS
ALTER TABLE checkin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_post_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_share_records ENABLE ROW LEVEL SECURITY;

-- 8. 创建RLS策略 - checkin_records
CREATE POLICY "用户可以查看自己的签到记录" ON checkin_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的签到记录" ON checkin_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. 创建RLS策略 - score_records
CREATE POLICY "用户可以查看自己的码分记录" ON score_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的码分记录" ON score_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. 创建RLS策略 - daily_post_records
CREATE POLICY "用户可以查看自己的发帖记录" ON daily_post_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的发帖记录" ON daily_post_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的发帖记录" ON daily_post_records
  FOR UPDATE USING (auth.uid() = user_id);

-- 11. 创建RLS策略 - novel_share_records
CREATE POLICY "用户可以查看自己的分享记录" ON novel_share_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的分享记录" ON novel_share_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的分享记录" ON novel_share_records
  FOR DELETE USING (auth.uid() = user_id);
