/*
# 更新分镜生成消耗配置描述

1. 说明
- 将分镜生成的消耗改为按图片数量计费
- 更新描述文字，明确标注"每张"

2. 修改内容
- comic_generation_cost: 从"分镜生成消耗的码分数"改为"分镜生成消耗的码分数（每张）"
*/

-- 更新分镜生成消耗配置的描述
UPDATE system_settings 
SET description = '分镜生成消耗的码分数（每张）'
WHERE key = 'comic_generation_cost';
