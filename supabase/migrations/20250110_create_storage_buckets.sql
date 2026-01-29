/*
# 创建Storage Buckets用于存储拍戏相关图片

## 说明
为码上准备和码上拍戏功能创建必要的Storage buckets，用于存储：
1. 服装分析图片
2. 化妆分析图片
3. 道具分析图片
4. 布景分析图片
5. 虚拟试穿图片
6. 拍戏场景图片
7. 合成图片
8. 视频文件

## Buckets列表
- `filming-costume-images`: 服装分析图片
- `filming-makeup-images`: 化妆分析图片
- `filming-props-images`: 道具分析图片
- `filming-scene-images`: 布景分析图片
- `filming-try-on-images`: 虚拟试穿图片
- `filming-composite-images`: 合成图片
- `filming-videos`: 视频文件

## 安全策略
所有buckets设置为公开访问，便于前端直接使用URL
*/

-- 创建服装分析图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-costume-images',
  'filming-costume-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 创建化妆分析图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-makeup-images',
  'filming-makeup-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 创建道具分析图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-props-images',
  'filming-props-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 创建布景分析图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-scene-images',
  'filming-scene-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 创建虚拟试穿图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-try-on-images',
  'filming-try-on-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 创建合成图片bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-composite-images',
  'filming-composite-images',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 创建视频bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-videos',
  'filming-videos',
  true,
  104857600, -- 100MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 设置Storage策略：允许所有人上传和读取
-- 服装图片
CREATE POLICY "Allow public upload for costume images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-costume-images');

CREATE POLICY "Allow public read for costume images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-costume-images');

-- 化妆图片
CREATE POLICY "Allow public upload for makeup images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-makeup-images');

CREATE POLICY "Allow public read for makeup images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-makeup-images');

-- 道具图片
CREATE POLICY "Allow public upload for props images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-props-images');

CREATE POLICY "Allow public read for props images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-props-images');

-- 布景图片
CREATE POLICY "Allow public upload for scene images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-scene-images');

CREATE POLICY "Allow public read for scene images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-scene-images');

-- 虚拟试穿图片
CREATE POLICY "Allow public upload for try-on images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-try-on-images');

CREATE POLICY "Allow public read for try-on images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-try-on-images');

-- 合成图片
CREATE POLICY "Allow public upload for composite images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-composite-images');

CREATE POLICY "Allow public read for composite images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-composite-images');

-- 视频
CREATE POLICY "Allow public upload for videos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-videos');

CREATE POLICY "Allow public read for videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-videos');
