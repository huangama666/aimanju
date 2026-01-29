/*
# 添加剧本数据字段

## 1. 修改内容
- 在 novels 表中添加 scripts_data 字段

## 2. 字段说明
### scripts_data 字段
- 类型：jsonb
- 默认值：'[]'::jsonb
- 非空：NOT NULL
- 说明：存储剧本数据的JSON数组，每个剧本包含章节号、章节标题、剧本内容和生成时间

## 3. 数据结构示例
```json
[
  {
    "chapter_number": 1,
    "chapter_title": "第一章标题",
    "script_content": "剧本内容...",
    "generated_at": "2025-01-18T10:00:00.000Z"
  }
]
```

## 4. 注意事项
- 该字段用于存储用户生成的剧本内容
- 剧本按章节号组织，支持多章节剧本存储
- 使用JSON格式便于灵活扩展和查询
*/

-- 添加 scripts_data 字段到 novels 表
ALTER TABLE novels 
ADD COLUMN IF NOT EXISTS scripts_data jsonb DEFAULT '[]'::jsonb NOT NULL;

-- 为 scripts_data 字段添加注释
COMMENT ON COLUMN novels.scripts_data IS '剧本数据（JSON数组），包含章节号、章节标题、剧本内容和生成时间';
