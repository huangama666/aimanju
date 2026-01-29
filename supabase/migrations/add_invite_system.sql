/*
# 添加邀请系统和注册奖励功能

## 1. 更新users表
- 添加 `invite_code` 字段：用户专属邀请码（唯一）
- 添加 `invited_by` 字段：邀请人ID（外键关联users表）
- 添加 `registration_reward_given` 字段：标记是否已发放注册奖励

## 2. 新建invite_records表
- `id`：主键
- `inviter_id`：邀请人ID
- `invitee_id`：被邀请人ID
- `reward_given`：是否已发放邀请奖励
- `created_at`：邀请时间

## 3. 说明
- 注册奖励：新用户注册成功后自动获得100码分
- 邀请奖励：被邀请用户完成注册后，邀请人自动获得50码分
- 防刷机制：通过invite_records表记录邀请关系，防止重复奖励
*/

-- 更新users表，添加邀请相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_reward_given BOOLEAN DEFAULT FALSE;

-- 创建邀请记录表
CREATE TABLE IF NOT EXISTS invite_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_given BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inviter_id, invitee_id)
);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_invite_records_inviter ON invite_records(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invite_records_invitee ON invite_records(invitee_id);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by);

-- 为现有用户生成邀请码的函数
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- 生成8位随机邀请码（大写字母+数字）
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- 检查是否已存在
    SELECT EXISTS(SELECT 1 FROM users WHERE invite_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 为现有用户生成邀请码
UPDATE users 
SET invite_code = generate_invite_code() 
WHERE invite_code IS NULL;

-- 创建触发器：新用户注册时自动生成邀请码
CREATE OR REPLACE FUNCTION auto_generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_invite_code
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION auto_generate_invite_code();

-- 启用RLS
ALTER TABLE invite_records ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己作为邀请人的记录
CREATE POLICY "Users can view their own invite records as inviter"
ON invite_records FOR SELECT
USING (inviter_id = auth.uid());

-- 用户可以查看自己作为被邀请人的记录
CREATE POLICY "Users can view their own invite records as invitee"
ON invite_records FOR SELECT
USING (invitee_id = auth.uid());

-- 系统可以插入邀请记录（通过服务端逻辑）
CREATE POLICY "System can insert invite records"
ON invite_records FOR INSERT
WITH CHECK (true);
