/*
# 创建封面图片Storage Bucket

## 说明
为小说封面创建Storage bucket，用于存储小说封面图片

## Buckets列表
- `cover-images`: 小说封面图片

## 安全策略
Bucket设置为公开访问，便于前端直接使用URL
*/

-- 创建封面图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cover-images',
  'cover-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 设置Storage策略：允许所有人上传和读取
CREATE POLICY "Allow public upload for cover images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'cover-images');

CREATE POLICY "Allow public read for cover images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cover-images');

CREATE POLICY "Allow public update for cover images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'cover-images');

CREATE POLICY "Allow public delete for cover images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'cover-images');