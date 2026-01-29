/*
# 添加充值功能

1. 新增功能
  - 创建充值函数 `recharge_credits`
    - 接受用户ID、充值金额（元）作为参数
    - 自动计算码分数量（1元=100码分）
    - 更新用户码分余额
    - 记录交易类型为'recharge'
    - 返回充值结果

2. 函数说明
  - 充值金额最低1元，最高10000元
  - 充值的码分立即到账
  - 交易记录中包含充值金额信息

3. 变更说明
  - 删除旧的recharge_credits函数（基于套餐的充值）
  - 创建新的recharge_credits函数（基于金额的充值）
*/

-- 删除旧的充值函数（如果存在）
DROP FUNCTION IF EXISTS recharge_credits(uuid, text);

-- 创建新的充值函数
CREATE OR REPLACE FUNCTION recharge_credits(
  p_user_id uuid,
  p_amount_yuan numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits integer;
  v_credits_to_add integer;
  v_new_balance integer;
BEGIN
  -- 验证充值金额
  IF p_amount_yuan < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', '充值金额最低为1元');
  END IF;

  IF p_amount_yuan > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', '单次充值金额不能超过10000元');
  END IF;

  -- 计算码分数量（1元=100码分）
  v_credits_to_add := FLOOR(p_amount_yuan * 100);

  -- 获取当前码分余额
  SELECT credits INTO v_current_credits
  FROM users
  WHERE id = p_user_id;

  IF v_current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- 增加码分
  v_new_balance := v_current_credits + v_credits_to_add;
  
  UPDATE users
  SET credits = v_new_balance,
      updated_at = now()
  WHERE id = p_user_id;

  -- 记录交易（类型为recharge）
  INSERT INTO credit_transactions (
    user_id, 
    amount, 
    transaction_type, 
    feature_name, 
    description, 
    balance_after
  )
  VALUES (
    p_user_id, 
    v_credits_to_add, 
    'recharge'::transaction_type, 
    '码分充值', 
    '充值 ¥' || p_amount_yuan::text, 
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true, 
    'balance', v_new_balance,
    'recharged', v_credits_to_add,
    'amount_yuan', p_amount_yuan
  );
END;
$$;
