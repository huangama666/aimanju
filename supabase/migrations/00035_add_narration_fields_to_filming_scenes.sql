
-- 添加解说内容和配音网址字段到filming_scenes表
ALTER TABLE filming_scenes
ADD COLUMN IF NOT EXISTS narration_text TEXT,
ADD COLUMN IF NOT EXISTS narration_audio_url TEXT;

-- 添加注释
COMMENT ON COLUMN filming_scenes.narration_text IS '场景解说文本内容（20-42字）';
COMMENT ON COLUMN filming_scenes.narration_audio_url IS '解说配音音频文件URL';
