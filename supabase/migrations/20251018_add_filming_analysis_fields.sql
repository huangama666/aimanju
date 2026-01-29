/*
# 添加拍戏分析字段

1. 新增字段
  - `costume_data` (jsonb) - 服装分析数据，包含角色服装的详细描述和设计要求
  - `makeup_data` (jsonb) - 化妆分析数据，包含角色化妆的详细描述和效果要求
  - `props_data` (jsonb) - 道具分析数据，包含场景道具的详细描述和功能要求
  - `scene_data` (jsonb) - 布景分析数据，包含场景布置的详细描述和氛围要求
  - `styling_logic_data` (jsonb) - 造型逻辑分析数据，说明视觉元素如何反映角色和剧情
  - `overall_analysis_data` (jsonb) - 综合分析数据，整体制作建议和协调统一要求

2. 说明
  - 所有字段均为jsonb类型，支持灵活的数据结构
  - 所有字段默认为null，允许为空
  - 这些字段用于存储AI分析剧本后生成的拍戏制作指导信息
*/

-- 添加服装分析字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS costume_data jsonb DEFAULT NULL;

-- 添加化妆分析字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS makeup_data jsonb DEFAULT NULL;

-- 添加道具分析字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS props_data jsonb DEFAULT NULL;

-- 添加布景分析字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS scene_data jsonb DEFAULT NULL;

-- 添加造型逻辑分析字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS styling_logic_data jsonb DEFAULT NULL;

-- 添加综合分析字段
ALTER TABLE novels ADD COLUMN IF NOT EXISTS overall_analysis_data jsonb DEFAULT NULL;
