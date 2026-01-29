/*
# 添加码上拍戏相关功能表

## 1. 新增表

### 1.1 try_on_images - 虚拟试穿图片表
存储角色的虚拟试穿图片
- `id` (uuid, primary key)
- `novel_id` (uuid, foreign key -> novels.id)
- `character_name` (text) - 角色名称
- `costume_description` (text) - 服装描述
- `original_character_image_url` (text) - 原始角色图片URL
- `costume_image_url` (text) - 服装图片URL
- `try_on_image_url` (text) - 试穿后的图片URL
- `task_id` (text) - API任务ID
- `task_status` (text) - 任务状态
- `retry_count` (integer) - 重试次数
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 1.2 filming_scenes - 拍戏场景表
存储每个章节的拍戏场景配置
- `id` (uuid, primary key)
- `novel_id` (uuid, foreign key -> novels.id)
- `chapter_number` (integer) - 章节号
- `scene_name` (text) - 场景名称
- `background_image_url` (text) - 布景图片URL
- `elements` (jsonb) - 场景元素（角色、道具的位置信息）
- `user_prompt` (text) - 用户输入的提示词
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 1.3 filming_composite_images - 拍戏合成图片表
存储合成后的图片
- `id` (uuid, primary key)
- `scene_id` (uuid, foreign key -> filming_scenes.id)
- `composite_image_url` (text) - 合成图片URL
- `task_id` (text) - API任务ID
- `task_status` (text) - 任务状态
- `retry_count` (integer) - 重试次数
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 1.4 filming_videos - 拍戏视频表
存储生成的视频
- `id` (uuid, primary key)
- `composite_image_id` (uuid, foreign key -> filming_composite_images.id)
- `video_url` (text) - 视频URL
- `duration` (text) - 视频时长
- `task_id` (text) - API任务ID
- `task_status` (text) - 任务状态
- `retry_count` (integer) - 重试次数
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 1.5 filming_final_videos - 最终拼接视频表
存储拼接后的最终视频
- `id` (uuid, primary key)
- `novel_id` (uuid, foreign key -> novels.id)
- `chapter_number` (integer) - 章节号
- `video_url` (text) - 最终视频URL
- `scene_ids` (jsonb) - 包含的场景ID列表
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## 2. 安全策略
所有表都不启用RLS，因为这是公开数据
*/

-- 1. 虚拟试穿图片表
CREATE TABLE IF NOT EXISTS try_on_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid REFERENCES novels(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  costume_description text,
  original_character_image_url text,
  costume_image_url text,
  try_on_image_url text,
  task_id text,
  task_status text DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 拍戏场景表
CREATE TABLE IF NOT EXISTS filming_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  scene_name text NOT NULL,
  background_image_url text,
  elements jsonb DEFAULT '[]'::jsonb,
  user_prompt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. 拍戏合成图片表
CREATE TABLE IF NOT EXISTS filming_composite_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid REFERENCES filming_scenes(id) ON DELETE CASCADE,
  composite_image_url text,
  task_id text,
  task_status text DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. 拍戏视频表
CREATE TABLE IF NOT EXISTS filming_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_image_id uuid REFERENCES filming_composite_images(id) ON DELETE CASCADE,
  video_url text,
  duration text,
  task_id text,
  task_status text DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. 最终拼接视频表
CREATE TABLE IF NOT EXISTS filming_final_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  video_url text,
  scene_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_try_on_images_novel_id ON try_on_images(novel_id);
CREATE INDEX IF NOT EXISTS idx_try_on_images_character_name ON try_on_images(character_name);
CREATE INDEX IF NOT EXISTS idx_filming_scenes_novel_id ON filming_scenes(novel_id);
CREATE INDEX IF NOT EXISTS idx_filming_scenes_chapter_number ON filming_scenes(chapter_number);
CREATE INDEX IF NOT EXISTS idx_filming_composite_images_scene_id ON filming_composite_images(scene_id);
CREATE INDEX IF NOT EXISTS idx_filming_videos_composite_image_id ON filming_videos(composite_image_id);
CREATE INDEX IF NOT EXISTS idx_filming_final_videos_novel_id ON filming_final_videos(novel_id);
CREATE INDEX IF NOT EXISTS idx_filming_final_videos_chapter_number ON filming_final_videos(chapter_number);