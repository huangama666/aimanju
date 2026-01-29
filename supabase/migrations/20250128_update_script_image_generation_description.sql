/*
# 更新剧本分析图片生成配置

1. 说明
- 将"剧本图片生成"改为"剧本分析图片生成"
- 对应剧本分析模块中的图片生成功能
- 按图片数量计费

2. 修改内容
- script_image_generation_cost: 从"剧本图片生成消耗的码分数（每张）"改为"剧本分析图片生成消耗的码分数（每张）"
*/

-- 更新剧本分析图片生成配置的描述
UPDATE system_settings 
SET description = '剧本分析图片生成消耗的码分数（每张）'
WHERE key = 'script_image_generation_cost';
