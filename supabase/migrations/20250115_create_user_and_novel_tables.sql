/*
# 创建用户表和小说表

## 1. 删除所有旧表
- 删除所有现有的表结构

## 2. 新建表
### users 表
- `id` (uuid, primary key, references auth.users)
- `phone` (text, unique) - 手机号
- `nickname` (text) - 用户昵称
- `avatar_url` (text, nullable) - 头像URL
- `created_at` (timestamptz, default: now()) - 创建时间
- `updated_at` (timestamptz, default: now()) - 更新时间

### novels 表
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, references users.id) - 用户ID
- `novel_title` (text, not null) - 小说标题
- `novel_content` (text) - 小说简介
- `novel_thumb` (text) - 小说封面URL
- `chapters_data` (jsonb, default: '[]') - 优化后的章节详细内容（JSON数组）
- `characters_data` (jsonb, default: '[]') - 角色信息（JSON数组）
- `panels_data` (jsonb, default: '[]') - 分镜内容（JSON数组）
- `created_at` (timestamptz, default: now()) - 创建时间
- `updated_at` (timestamptz, default: now()) - 更新时间

## 3. 安全策略
- 启用RLS（Row Level Security）
- users表：用户只能查看和更新自己的信息
- novels表：用户只能查看、创建、更新和删除自己的小说

## 4. 索引
- 为user_id创建索引以提高查询性能
- 为created_at创建索引以支持按时间排序

## 5. 触发器
- 自动更新updated_at字段
*/

-- 删除所有旧表（如果存在）
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS novels CASCADE;

-- 创建users表
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text UNIQUE,
  nickname text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建novels表
CREATE TABLE novels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  novel_title text NOT NULL,
  novel_content text,
  novel_thumb text,
  chapters_data jsonb DEFAULT '[]'::jsonb NOT NULL,
  characters_data jsonb DEFAULT '[]'::jsonb NOT NULL,
  panels_data jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX idx_novels_user_id ON novels(user_id);
CREATE INDEX idx_novels_created_at ON novels(created_at DESC);
CREATE INDEX idx_users_phone ON users(phone);

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;

-- users表的RLS策略
CREATE POLICY "用户可以查看自己的信息" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的信息" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的信息" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- novels表的RLS策略
CREATE POLICY "用户可以查看自己的小说" ON novels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的小说" ON novels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的小说" ON novels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的小说" ON novels
  FOR DELETE USING (auth.uid() = user_id);

-- 创建更新updated_at的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为users表创建触发器
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为novels表创建触发器
CREATE TRIGGER update_novels_updated_at
  BEFORE UPDATE ON novels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
