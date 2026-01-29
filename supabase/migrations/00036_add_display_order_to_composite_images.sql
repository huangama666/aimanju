-- 添加display_order字段到filming_composite_images表
ALTER TABLE filming_composite_images
ADD COLUMN display_order INTEGER DEFAULT 0;

-- 为现有记录设置display_order（按created_at排序）
WITH ordered_images AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY scene_id ORDER BY created_at) as row_num
  FROM filming_composite_images
)
UPDATE filming_composite_images
SET display_order = ordered_images.row_num
FROM ordered_images
WHERE filming_composite_images.id = ordered_images.id;

-- 添加注释
COMMENT ON COLUMN filming_composite_images.display_order IS '图片显示顺序，数字越小越靠前';