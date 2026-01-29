/*
# 添加管理员功能和公告系统

## 1. 修改users表
- 添加 `is_admin` (boolean) 字段，标识是否为管理员
- 添加 `registration_order` (integer) 字段，记录注册顺序

## 2. 新建announcements表
- `id` (uuid, primary key): 公告ID
- `title` (text, not null): 公告标题
- `content` (text, not null): 公告内容
- `type` (text): 公告类型（system/activity/rule）
- `is_pinned` (boolean): 是否置顶
- `is_active` (boolean): 是否激活显示
- `start_date` (timestamptz): 生效开始时间
- `end_date` (timestamptz, nullable): 生效结束时间
- `created_by` (uuid, references users): 创建者ID
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

## 3. 安全策略
- users表：添加管理员查看所有用户的策略
- announcements表：
  - 所有人可以查看激活的公告
  - 只有管理员可以创建、更新、删除公告

## 4. 触发器
- 自动设置第一个注册用户为管理员
- 自动更新announcements表的updated_at字段
*/

-- 1. 修改users表，添加管理员相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_order integer;

-- 创建序列用于记录注册顺序
CREATE SEQUENCE IF NOT EXISTS users_registration_order_seq START 1;

-- 为现有用户设置注册顺序（按创建时间）
DO $$
DECLARE
  user_record RECORD;
  order_num INTEGER := 1;
BEGIN
  FOR user_record IN 
    SELECT id FROM users ORDER BY created_at ASC
  LOOP
    UPDATE users SET registration_order = order_num WHERE id = user_record.id;
    order_num := order_num + 1;
  END LOOP;
END $$;

-- 设置第一个注册的用户为管理员
UPDATE users SET is_admin = true WHERE registration_order = 1;

-- 创建触发器函数：自动设置注册顺序和第一个用户为管理员
CREATE OR REPLACE FUNCTION set_user_registration_order()
RETURNS TRIGGER AS $$
BEGIN
  -- 设置注册顺序
  NEW.registration_order := nextval('users_registration_order_seq');
  
  -- 如果是第一个用户，设置为管理员
  IF NEW.registration_order = 1 THEN
    NEW.is_admin := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_set_user_registration_order ON users;
CREATE TRIGGER trigger_set_user_registration_order
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_registration_order();

-- 2. 创建announcements表
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'system' NOT NULL CHECK (type IN ('system', 'activity', 'rule')),
  is_pinned boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  start_date timestamptz DEFAULT now() NOT NULL,
  end_date timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned ON announcements(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);

-- 3. 启用RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 4. 创建管理员检查函数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 添加RLS策略

-- users表：管理员可以查看所有用户
CREATE POLICY "管理员可以查看所有用户" ON users
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- announcements表策略
CREATE POLICY "所有人可以查看激活的公告" ON announcements
  FOR SELECT
  USING (is_active = true AND (start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "管理员可以查看所有公告" ON announcements
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "管理员可以创建公告" ON announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "管理员可以更新公告" ON announcements
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "管理员可以删除公告" ON announcements
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- 6. 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- 7. 为posts表添加管理员策略（如果posts表存在）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    -- 删除旧策略（如果存在）
    DROP POLICY IF EXISTS "管理员可以查看所有帖子" ON posts;
    DROP POLICY IF EXISTS "管理员可以更新所有帖子" ON posts;
    DROP POLICY IF EXISTS "管理员可以删除所有帖子" ON posts;
    
    -- 管理员可以查看所有帖子
    CREATE POLICY "管理员可以查看所有帖子" ON posts
      FOR SELECT
      TO authenticated
      USING (is_admin());
    
    -- 管理员可以更新所有帖子（用于置顶）
    CREATE POLICY "管理员可以更新所有帖子" ON posts
      FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
    
    -- 管理员可以删除所有帖子
    CREATE POLICY "管理员可以删除所有帖子" ON posts
      FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;
