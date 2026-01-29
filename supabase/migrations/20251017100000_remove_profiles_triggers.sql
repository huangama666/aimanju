/*
# 删除所有引用 profiles 表的触发器和函数

## 问题
- 新用户登录时出现 "relation 'profiles' does not exist" 错误
- Supabase 可能有默认的触发器尝试在 profiles 表中创建记录
- 但我们已经将 profiles 表改名为 users 表

## 解决方案
- 删除所有可能引用 profiles 表的触发器
- 删除所有可能引用 profiles 表的函数
- 确保不会有任何自动操作尝试访问 profiles 表
*/

-- 删除可能存在的 profiles 表相关触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 删除可能存在的 profiles 表相关函数
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_auth_user_new() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_new() CASCADE;

-- 确保 profiles 表不存在
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
