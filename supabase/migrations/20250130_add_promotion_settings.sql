/*
# 添加限免设置表

## 功能说明
创建promotion_settings表用于管理会员功能限免时间设置。
管理员可以设置限免的开始时间、结束时间，以及是否启用限免。
在限免期间，所有用户（包括非会员）都可以使用会员专属功能。

## 表结构
- promotion_settings
  - id (uuid, 主键, 默认: gen_random_uuid())
  - is_enabled (boolean, 是否启用限免, 默认: false)
  - start_time (timestamptz, 限免开始时间)
  - end_time (timestamptz, 限免结束时间)
  - description (text, 限免活动描述)
  - created_at (timestamptz, 创建时间, 默认: now())
  - updated_at (timestamptz, 更新时间, 默认: now())

## 安全策略
- 表为公开读取（所有用户都可以查询限免状态）
- 只有管理员可以修改限免设置

## 初始数据
- 插入一条默认记录，限免功能默认关闭
*/

-- 创建限免设置表
CREATE TABLE IF NOT EXISTS promotion_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_promotion_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promotion_settings_updated_at
  BEFORE UPDATE ON promotion_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_settings_updated_at();

-- 插入默认限免设置（限免功能默认关闭）
INSERT INTO promotion_settings (is_enabled, description)
VALUES (false, '会员功能限免活动')
ON CONFLICT DO NOTHING;

-- 创建检查是否在限免期间的函数
CREATE OR REPLACE FUNCTION is_promotion_active()
RETURNS boolean AS $$
DECLARE
  promotion_record RECORD;
  now_time timestamptz;
BEGIN
  now_time := now();
  
  SELECT * INTO promotion_record
  FROM promotion_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 如果没有记录，返回false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 检查是否启用且在时间范围内
  IF promotion_record.is_enabled 
     AND promotion_record.start_time IS NOT NULL 
     AND promotion_record.end_time IS NOT NULL
     AND now_time >= promotion_record.start_time 
     AND now_time <= promotion_record.end_time THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 设置表为公开读取（不启用RLS，所有人都可以查询）
-- 这样前端可以直接查询限免状态
COMMENT ON TABLE promotion_settings IS '会员功能限免设置表 - 公开读取，管理员可修改';
