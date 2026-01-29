/*
# 修复拍戏表结构

## 修改内容

1. **filming_scenes表**
   - 将`user_prompt`重命名为`prompt`
   - 将`background_image_url`列删除（不再需要）
   - 将`elements`重命名为`scene_elements`

2. **filming_composite_images表**
   - 添加`image_url`列（存储Storage URL）
   - 添加`storage_path`列（存储路径）
   - 添加`prompt`列（场景提示词）
   - 删除`task_id`、`task_status`、`retry_count`列（不再需要）

3. **filming_videos表**
   - 添加`storage_path`列（存储路径）
   - 删除`task_id`、`task_status`、`retry_count`列（不再需要）

4. **filming_final_videos表**
   - 添加`storage_path`列（存储路径）
   - 添加`duration`列（视频时长）
   - 将`scene_ids`重命名为`source_video_ids`（源视频ID列表）
*/

-- 1. 修改filming_scenes表
ALTER TABLE filming_scenes 
  RENAME COLUMN user_prompt TO prompt;

ALTER TABLE filming_scenes 
  RENAME COLUMN elements TO scene_elements;

ALTER TABLE filming_scenes 
  DROP COLUMN IF EXISTS background_image_url;

-- 2. 修改filming_composite_images表
ALTER TABLE filming_composite_images 
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE filming_composite_images 
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE filming_composite_images 
  ADD COLUMN IF NOT EXISTS prompt text;

ALTER TABLE filming_composite_images 
  RENAME COLUMN composite_image_url TO image_url_old;

ALTER TABLE filming_composite_images 
  DROP COLUMN IF EXISTS image_url_old;

ALTER TABLE filming_composite_images 
  DROP COLUMN IF EXISTS task_id;

ALTER TABLE filming_composite_images 
  DROP COLUMN IF EXISTS task_status;

ALTER TABLE filming_composite_images 
  DROP COLUMN IF EXISTS retry_count;

-- 3. 修改filming_videos表
ALTER TABLE filming_videos 
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE filming_videos 
  DROP COLUMN IF EXISTS task_id;

ALTER TABLE filming_videos 
  DROP COLUMN IF EXISTS task_status;

ALTER TABLE filming_videos 
  DROP COLUMN IF EXISTS retry_count;

-- 4. 修改filming_final_videos表
ALTER TABLE filming_final_videos 
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE filming_final_videos 
  ADD COLUMN IF NOT EXISTS duration integer;

ALTER TABLE filming_final_videos 
  RENAME COLUMN scene_ids TO source_video_ids;
