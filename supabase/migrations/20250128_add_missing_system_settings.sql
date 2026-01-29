/*
# 添加缺失的系统设置配置项

1. 说明
- 为剧本生成、分析剧本、平行世界创作功能添加积分消耗配置
- 确保所有功能都有对应的积分消耗设置

2. 配置项
- script_generation_cost: 剧本生成消耗的码分数（10码分）
- filming_analysis_cost: 分析剧本消耗的码分数（5码分）
- parallel_world_cost: 平行世界创作消耗的码分数（8码分）
*/

-- 插入缺失的系统设置配置项
INSERT INTO system_settings (key, value, description) VALUES
  ('script_generation_cost', '10', '剧本生成消耗的码分数'),
  ('filming_analysis_cost', '5', '分析剧本消耗的码分数'),
  ('parallel_world_cost', '8', '平行世界创作消耗的码分数')
ON CONFLICT (key) DO NOTHING;
