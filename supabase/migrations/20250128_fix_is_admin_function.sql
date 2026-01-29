/*
# 修复is_admin函数 - 删除引用profiles表的旧函数

1. 问题说明
- 存在两个is_admin函数：
  - is_admin() - 无参数，引用users表（正确）
  - is_admin(uuid) - 有参数，引用profiles表（错误，profiles表已删除）
- system_settings表的RLS策略引用了is_admin(uuid)函数
- 需要删除旧函数并重新创建策略

2. 修复步骤
- 删除system_settings表的RLS策略
- 删除is_admin(uuid)函数
- 重新创建RLS策略，使用is_admin()函数
*/

-- 删除system_settings表的RLS策略
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON system_settings;

-- 删除引用profiles表的is_admin函数
DROP FUNCTION IF EXISTS is_admin(uuid);

-- 重新创建RLS策略，使用is_admin()函数
CREATE POLICY "Admins can update system settings" ON system_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can insert system settings" ON system_settings
  FOR INSERT WITH CHECK (is_admin());
