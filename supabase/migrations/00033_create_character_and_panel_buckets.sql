/*
# 创建角色和分镜图片Storage Buckets

## 说明
为小说创作功能创建必要的Storage buckets，用于存储：
1. 角色形象图片
2. 漫画分镜图片

## Buckets列表
- `character-images`: 角色形象图片
- `panel-images`: 漫画分镜图片

## 安全策略
所有buckets设置为公开访问，便于前端直接使用URL
*/

-- 创建角色形象图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'character-images',
  'character-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 创建漫画分镜图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'panel-images',
  'panel-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 设置Storage策略：允许所有人上传和读取
-- 角色图片
CREATE POLICY "Allow public upload for character images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'character-images');

CREATE POLICY "Allow public read for character images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'character-images');

CREATE POLICY "Allow public update for character images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'character-images');

CREATE POLICY "Allow public delete for character images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'character-images');

-- 分镜图片
CREATE POLICY "Allow public upload for panel images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'panel-images');

CREATE POLICY "Allow public read for panel images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'panel-images');

CREATE POLICY "Allow public update for panel images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'panel-images');

CREATE POLICY "Allow public delete for panel images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'panel-images');
