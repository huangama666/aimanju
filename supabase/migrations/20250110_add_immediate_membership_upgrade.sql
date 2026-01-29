/*
# 添加立即生效的会员升级功能

## 业务逻辑
- 尝鲜版（free）升级到任何会员等级：立即生效
- 其他会员之间的升级：次月生效（使用原有的 upgrade_membership_next_month 函数）

## 新增函数
- `upgrade_membership_immediately`: 立即升级会员等级并发放码分
*/

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS upgrade_membership_immediately(uuid, membership_level);

-- 创建函数：立即升级会员等级
CREATE OR REPLACE FUNCTION upgrade_membership_immediately(
  p_user_id uuid,
  p_new_level membership_level
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_level membership_level;
  v_grant_amount integer;
  v_current_credits integer;
  v_new_credits integer;
BEGIN
  -- 获取当前会员等级和码分
  SELECT membership_level, credits INTO v_current_level, v_current_credits
  FROM users
  WHERE id = p_user_id;

  IF v_current_level IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 获取新等级的每月码分数量（显式类型转换）
  SELECT monthly_credits INTO v_grant_amount
  FROM membership_packages
  WHERE level = p_new_level::text;

  IF v_grant_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '会员等级配置不存在');
  END IF;

  -- 计算新的码分余额
  v_new_credits := v_current_credits + v_grant_amount;

  -- 立即更新会员等级和码分
  UPDATE users
  SET membership_level = p_new_level,
      credits = v_new_credits,
      updated_at = now()
  WHERE id = p_user_id;

  -- 记录交易（发放码分）- 使用正确的字段名 transaction_type
  INSERT INTO credit_transactions (user_id, transaction_type, amount, description, balance_after)
  VALUES (
    p_user_id,
    'grant'::transaction_type,
    v_grant_amount,
    format('升级到%s，发放当月码分', p_new_level::text),
    v_new_credits
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_level', v_current_level,
    'new_level', p_new_level,
    'granted_credits', v_grant_amount,
    'total_credits', v_new_credits,
    'effective_date', CURRENT_DATE
  );
END;
$$;
