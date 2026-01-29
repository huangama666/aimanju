/*
# 创建会员套餐管理表

## 说明
创建membership_packages表用于存储和管理会员套餐配置信息，支持动态调整会员套餐的各项参数。

## 表结构
- `membership_packages` 表
  - `id` (uuid, 主键, 默认: gen_random_uuid())
  - `level` (text, 会员等级标识, 唯一, 非空)
  - `name` (text, 套餐名称, 非空)
  - `monthly_credits` (integer, 每月码分, 非空, 默认: 0)
  - `color` (text, 主题颜色, 非空)
  - `price` (numeric(10,2), 价格, 非空, 默认: 0)
  - `original_price` (numeric(10,2), 原价, 非空, 默认: 0)
  - `benefits` (jsonb, 权益列表, 非空, 默认: '[]')
  - `is_active` (boolean, 是否启用, 非空, 默认: true)
  - `sort_order` (integer, 排序顺序, 非空, 默认: 0)
  - `created_at` (timestamptz, 创建时间, 默认: now())
  - `updated_at` (timestamptz, 更新时间, 默认: now())

## 安全策略
- 表为公开读取，所有用户都可以查看会员套餐信息
- 不启用RLS，因为这是公开配置信息

## 初始数据
插入四个默认会员套餐：免费会员、初级会员、中级会员、高级会员
*/

-- 创建会员套餐表
CREATE TABLE IF NOT EXISTS membership_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text UNIQUE NOT NULL,
  name text NOT NULL,
  monthly_credits integer NOT NULL DEFAULT 0,
  color text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  original_price numeric(10,2) NOT NULL DEFAULT 0,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_membership_packages_level ON membership_packages(level);
CREATE INDEX IF NOT EXISTS idx_membership_packages_sort_order ON membership_packages(sort_order);
CREATE INDEX IF NOT EXISTS idx_membership_packages_is_active ON membership_packages(is_active);

-- 插入默认会员套餐数据
INSERT INTO membership_packages (level, name, monthly_credits, color, price, original_price, benefits, sort_order) VALUES
('free', '免费会员', 100, '#9CA3AF', 0, 0, '["每月100码分", "基础小说创作", "基础角色生成", "社区广场免费访问"]'::jsonb, 1),
('basic', '初级会员', 500, '#3B82F6', 4.9, 24.9, '["每月500码分", "高级小说创作", "高级角色生成", "分镜创作功能", "剧本创作功能", "优先客服支持"]'::jsonb, 2),
('intermediate', '中级会员', 1000, '#8B5CF6', 19.9, 59.9, '["每月1000码分", "所有基础功能", "批量生成功能", "高清图片导出", "专属客服支持", "会员专属模板"]'::jsonb, 3),
('premium', '高级会员', 2000, '#F59E0B', 99.9, 199.9, '["每月2000码分", "所有功能无限制", "AI优先处理", "超高清图片导出", "1对1专属客服", "会员专属模板", "优先体验新功能", "专属会员标识"]'::jsonb, 4)
ON CONFLICT (level) DO NOTHING;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_membership_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_membership_packages_updated_at
  BEFORE UPDATE ON membership_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_packages_updated_at();
