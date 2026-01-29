/*
# 创建系统设置表

1. 新建表
- `system_settings`
  - `id` (uuid, 主键, 默认: gen_random_uuid())
  - `key` (text, 唯一, 非空) - 设置项的键名
  - `value` (text, 非空) - 设置项的值（JSON格式）
  - `description` (text) - 设置项的描述
  - `updated_at` (timestamptz, 默认: now()) - 更新时间
  - `updated_by` (uuid, 外键关联 users.id) - 更新者ID

2. 安全策略
- 启用 RLS
- 所有用户可以读取系统设置
- 只有管理员可以更新系统设置

3. 初始数据
- 插入默认的积分消耗配置
  - novel_generation_cost: 小说生成消耗10码分
  - character_generation_cost: 角色生成消耗1码分
  - comic_generation_cost: 分镜生成消耗10码分
  - script_generation_cost: 剧本生成消耗10码分
  - filming_analysis_cost: 分析剧本消耗5码分
  - parallel_world_cost: 平行世界创作消耗8码分
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 所有用户可以读取系统设置
CREATE POLICY "Anyone can view system settings" ON system_settings
  FOR SELECT USING (true);

-- 只有管理员可以更新系统设置
CREATE POLICY "Admins can update system settings" ON system_settings
  FOR UPDATE USING (is_admin(auth.uid()));

-- 只有管理员可以插入系统设置
CREATE POLICY "Admins can insert system settings" ON system_settings
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- 插入默认配置
INSERT INTO system_settings (key, value, description) VALUES
  ('novel_generation_cost', '10', '小说生成消耗的码分数'),
  ('character_generation_cost', '1', '角色生成消耗的码分数'),
  ('comic_generation_cost', '10', '分镜生成消耗的码分数'),
  ('script_generation_cost', '10', '剧本生成消耗的码分数'),
  ('filming_analysis_cost', '5', '分析剧本消耗的码分数'),
  ('parallel_world_cost', '8', '平行世界创作消耗的码分数')
ON CONFLICT (key) DO NOTHING;
