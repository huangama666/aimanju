-- 允许超级管理员更新任何小说
-- 删除旧的更新策略
DROP POLICY IF EXISTS "用户可以更新自己的小说" ON novels;

-- 创建新的更新策略：用户可以更新自己的小说，或者超级管理员可以更新任何小说
CREATE POLICY "用户可以更新自己的小说或管理员可以更新任何小说" ON novels
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- 同样更新删除策略，允许超级管理员删除任何小说
DROP POLICY IF EXISTS "用户可以删除自己的小说" ON novels;

CREATE POLICY "用户可以删除自己的小说或管理员可以删除任何小说" ON novels
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );
