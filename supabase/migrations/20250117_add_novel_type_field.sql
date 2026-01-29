/*
# 添加小说类型字段

## 1. 修改说明
为novels表添加novel_type字段，用于存储小说的类型分类

## 2. 新增字段
### novels 表
- `novel_type` (text, nullable) - 小说类型（如玄幻、都市、历史、言情、科幻等）

## 3. 索引优化
- 为novel_type创建索引以提高按类型筛选的查询性能

## 4. 注意事项
- 字段允许为空，以兼容已有数据
- 新创建的小说应该填写此字段
*/

-- 为novels表添加novel_type字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS novel_type text;

-- 为novel_type创建索引
CREATE INDEX IF NOT EXISTS idx_novels_type ON novels(novel_type);

-- 添加注释
COMMENT ON COLUMN novels.novel_type IS '小说类型（如玄幻、都市、历史、言情、科幻等）';
