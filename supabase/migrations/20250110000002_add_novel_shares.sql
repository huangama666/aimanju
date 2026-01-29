/*
# 添加小说分享功能

## 说明
为社区广场添加小说分享功能，用户可以将自己的小说分享到社区的小说区域。

## 新增表

### novel_shares 表
- `id` (uuid, primary key): 分享记录ID
- `novel_id` (uuid, references novels): 小说ID
- `user_id` (uuid, references users): 分享用户ID
- `share_description` (text): 分享描述（可选）
- `is_featured` (boolean): 是否精选
- `views_count` (integer): 浏览次数
- `likes_count` (integer): 点赞数
- `created_at` (timestamptz): 创建时间
- `updated_at` (timestamptz): 更新时间

## 安全策略
- 所有人可以查看分享的小说
- 登录用户可以分享小说
- 用户只能删除自己的分享

## 索引
- novel_id, user_id, created_at 字段添加索引以提高查询性能
*/

-- 创建小说分享表
CREATE TABLE IF NOT EXISTS novel_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid REFERENCES novels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  share_description text,
  is_featured boolean DEFAULT false NOT NULL,
  views_count integer DEFAULT 0 NOT NULL,
  likes_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(novel_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_novel_shares_novel_id ON novel_shares(novel_id);
CREATE INDEX IF NOT EXISTS idx_novel_shares_user_id ON novel_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_novel_shares_created_at ON novel_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_novel_shares_is_featured ON novel_shares(is_featured) WHERE is_featured = true;

-- 启用RLS
ALTER TABLE novel_shares ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看分享的小说
CREATE POLICY "Anyone can view novel shares"
  ON novel_shares FOR SELECT
  USING (true);

-- 登录用户可以分享小说
CREATE POLICY "Authenticated users can share novels"
  ON novel_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的分享
CREATE POLICY "Users can update own shares"
  ON novel_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的分享
CREATE POLICY "Users can delete own shares"
  ON novel_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_novel_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_novel_shares_updated_at
  BEFORE UPDATE ON novel_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_novel_shares_updated_at();
