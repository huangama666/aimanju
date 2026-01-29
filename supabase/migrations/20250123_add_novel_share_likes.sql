/*
# 添加小说分享点赞记录表

## 功能说明
为小说分享功能添加点赞记录表，用于记录用户对分享小说的点赞行为。

## 新增表

### novel_share_likes
记录用户对分享小说的点赞行为

**字段说明：**
- `id` (uuid): 主键，自动生成
- `novel_share_id` (uuid): 小说分享ID，外键关联 novel_shares 表
- `user_id` (uuid): 用户ID，外键关联 users 表
- `created_at` (timestamptz): 点赞时间

**索引：**
- 唯一索引：(novel_share_id, user_id) - 确保同一用户对同一小说分享只能点赞一次
- 索引：novel_share_id - 优化查询某个小说分享的所有点赞
- 索引：user_id - 优化查询某个用户的所有点赞

## 安全策略
- 表为公开表，不启用 RLS
- 所有用户都可以查看点赞记录
- 所有用户都可以添加和删除自己的点赞记录
*/

-- 创建小说分享点赞记录表
CREATE TABLE IF NOT EXISTS novel_share_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_share_id uuid NOT NULL REFERENCES novel_shares(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(novel_share_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_novel_share_likes_novel_share_id ON novel_share_likes(novel_share_id);
CREATE INDEX IF NOT EXISTS idx_novel_share_likes_user_id ON novel_share_likes(user_id);

-- 添加注释
COMMENT ON TABLE novel_share_likes IS '小说分享点赞记录表';
COMMENT ON COLUMN novel_share_likes.id IS '主键';
COMMENT ON COLUMN novel_share_likes.novel_share_id IS '小说分享ID';
COMMENT ON COLUMN novel_share_likes.user_id IS '用户ID';
COMMENT ON COLUMN novel_share_likes.created_at IS '点赞时间';
