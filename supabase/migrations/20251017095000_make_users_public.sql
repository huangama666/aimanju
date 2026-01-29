/*
# 使用户信息公开可见

## 修改内容
- 删除 users 表的"用户可以查看自己的信息"策略
- 创建新的"所有人可以查看用户基本信息"策略

## 说明
- 社区广场需要显示其他用户的昵称和头像
- 用户仍然只能修改自己的信息
*/

-- 删除旧的查看策略
DROP POLICY IF EXISTS "用户可以查看自己的信息" ON users;

-- 创建新的公开查看策略
CREATE POLICY "所有人可以查看用户基本信息" ON users
  FOR SELECT USING (true);
