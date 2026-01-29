/*
# 创建用户头像存储桶

## 1. 存储桶配置
- 桶名称：`app-6r71zzjmv5kx_avatars_images`
- 用途：存储用户头像图片
- 文件大小限制：1 MB
- 支持格式：JPEG, PNG, GIF, WEBP, AVIF

## 2. 安全策略
- 所有已认证用户可以上传头像
- 所有用户（包括未认证）可以查看头像
- 用户只能删除自己的头像

## 3. 文件命名规则
- 格式：`{user_id}/{timestamp}.{ext}`
- 仅包含英文字母和数字
*/

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-6r71zzjmv5kx_avatars_images',
  'app-6r71zzjmv5kx_avatars_images',
  true,
  1048576, -- 1 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
);

-- 允许所有已认证用户上传头像
CREATE POLICY "已认证用户可以上传头像" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-6r71zzjmv5kx_avatars_images');

-- 允许所有用户查看头像（公开访问）
CREATE POLICY "所有用户可以查看头像" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'app-6r71zzjmv5kx_avatars_images');

-- 允许用户删除自己的头像
CREATE POLICY "用户可以删除自己的头像" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'app-6r71zzjmv5kx_avatars_images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许用户更新自己的头像
CREATE POLICY "用户可以更新自己的头像" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'app-6r71zzjmv5kx_avatars_images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
