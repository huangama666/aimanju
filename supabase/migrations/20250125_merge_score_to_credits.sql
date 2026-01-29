/*
# 合并 score 和 credits 字段

## 背景
系统中存在两个独立的积分字段：
- `score`: 社区积分（签到、分享、发帖获得）
- `credits`: 消费码分（AI功能消费）

这导致用户看到的码分余额不一致，需要统一为一个字段。

## 变更内容
1. 将所有用户的 `score` 值合并到 `credits` 中
2. 将 `score` 字段重置为 0（保留字段以兼容现有代码）
3. 更新所有相关函数和触发器，使用 `credits` 字段

## 注意事项
- 此迁移会将现有的 score 值加到 credits 上
- 不会删除 score 字段，以保持向后兼容
- 后续所有积分操作都将使用 credits 字段
*/

-- 1. 将所有用户的 score 合并到 credits
UPDATE users 
SET credits = credits + score
WHERE score > 0;

-- 2. 将 score 重置为 0
UPDATE users 
SET score = 0;

-- 3. 更新签到函数，使用 credits 而不是 score
-- 注意：这里我们不修改数据库函数，而是在应用层修改

-- 4. 添加注释说明 score 字段已废弃
COMMENT ON COLUMN users.score IS '已废弃：请使用 credits 字段。此字段保留仅为向后兼容。';
COMMENT ON COLUMN users.credits IS '用户码分余额：包含所有获得的码分（签到、分享、发帖等）和消费的码分（AI功能）';
