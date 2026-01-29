/*
# 创建最终拼接视频Storage Bucket

## 说明
为码上拍戏功能创建最终拼接视频的Storage bucket

## Bucket
- `filming-final-videos`: 最终拼接视频文件

## 安全策略
设置为公开访问，便于前端直接使用URL
*/

-- 创建最终拼接视频bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filming-final-videos',
  'filming-final-videos',
  true,
  524288000, -- 500MB（拼接后的视频可能较大）
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 设置Storage策略：允许所有人上传和读取
CREATE POLICY "Allow public upload for final videos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'filming-final-videos');

CREATE POLICY "Allow public read for final videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'filming-final-videos');

CREATE POLICY "Allow public update for final videos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'filming-final-videos');

CREATE POLICY "Allow public delete for final videos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'filming-final-videos');
