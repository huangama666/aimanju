/*
# 添加平行世界相关字段

## 1. 新增字段
### novels 表新增字段
- `simple_context` (jsonb, default: '[]') - 章节简介，区分每个章节
  - 格式：[{ chapter_number: 1, title: "章节标题", summary: "章节简介" }]
- `parallel_source_id` (uuid, nullable) - 平行世界源小说ID（NULL表示原创小说）
- `parallel_start_chapter` (integer, nullable) - 平行世界起始章节（记录从源小说的哪个章节开始二创）

## 2. 索引
- 为parallel_source_id创建索引以提高查询性能

## 3. 外键约束
- parallel_source_id引用novels表的id字段

## 4. 说明
- simple_context用于保存每个章节的简介，用于平行世界二创时的内容生成
- parallel_source_id为NULL表示这是原创小说
- parallel_source_id不为NULL表示这是平行世界二创小说
- parallel_start_chapter记录从源小说的哪个章节开始进行二创
*/

-- 添加simple_context字段
ALTER TABLE novels 
ADD COLUMN IF NOT EXISTS simple_context jsonb DEFAULT '[]'::jsonb NOT NULL;

-- 添加parallel_source_id字段
ALTER TABLE novels 
ADD COLUMN IF NOT EXISTS parallel_source_id uuid REFERENCES novels(id) ON DELETE SET NULL;

-- 添加parallel_start_chapter字段
ALTER TABLE novels 
ADD COLUMN IF NOT EXISTS parallel_start_chapter integer;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_novels_parallel_source_id ON novels(parallel_source_id);

-- 添加注释
COMMENT ON COLUMN novels.simple_context IS '章节简介JSON数组，格式：[{ chapter_number: 1, title: "标题", summary: "简介" }]';
COMMENT ON COLUMN novels.parallel_source_id IS '平行世界源小说ID，NULL表示原创小说';
COMMENT ON COLUMN novels.parallel_start_chapter IS '平行世界起始章节号，记录从源小说的哪个章节开始二创';
