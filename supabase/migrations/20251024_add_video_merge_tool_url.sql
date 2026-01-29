-- 添加视频合成工具网址配置
-- 在system_settings表中插入新的配置项

INSERT INTO system_settings (key, value, description)
VALUES (
  'video_merge_tool_url',
  'https://download.csdn.net/download/TiaoZhanJi_Xian/92573198',
  '视频合成工具网址'
)
ON CONFLICT (key) DO UPDATE
SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();
