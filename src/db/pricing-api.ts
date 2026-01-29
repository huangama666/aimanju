// 小说收费和码分兑换API

import { supabase } from './supabase';
import { getUserScore } from './score-api';
import type { PurchaseRecord, ExchangeRecord } from '@/types/database';

// ==================== 小说收费设置 ====================

/**
 * 设置小说收费
 */
export async function setNovelPrice(
  novelId: string,
  price: number
): Promise<void> {
  console.log('💰 设置小说收费:', novelId, price);

  try {
    const { error } = await supabase
      .from('novels')
      .update({ price })
      .eq('id', novelId);

    if (error) throw error;

    console.log('✅ 设置小说收费成功:', price);
  } catch (error) {
    console.error('❌ 设置小说收费失败:', error);
    throw error;
  }
}

/**
 * 获取小说价格
 */
export async function getNovelPrice(novelId: string): Promise<number> {
  console.log('💰 获取小说价格:', novelId);

  try {
    const { data, error } = await supabase
      .from('novels')
      .select('price')
      .eq('id', novelId)
      .maybeSingle();

    if (error) throw error;

    const price = data?.price || 0;
    console.log('✅ 获取小说价格成功:', price);
    return price;
  } catch (error) {
    console.error('❌ 获取小说价格失败:', error);
    throw error;
  }
}

// ==================== 购买小说功能 ====================

/**
 * 检查用户是否已购买小说
 */
export async function checkNovelPurchased(
  userId: string,
  novelId: string
): Promise<boolean> {
  console.log('🔍 检查小说购买状态:', userId, novelId);

  try {
    const { data, error } = await supabase
      .from('purchase_records')
      .select('id')
      .eq('user_id', userId)
      .eq('novel_id', novelId)
      .maybeSingle();

    if (error) throw error;

    const hasPurchased = !!data;
    console.log(hasPurchased ? '✅ 已购买' : '📝 未购买');
    return hasPurchased;
  } catch (error) {
    console.error('❌ 检查购买状态失败:', error);
    throw error;
  }
}

/**
 * 购买小说
 */
export async function purchaseNovel(
  userId: string,
  novelId: string
): Promise<{ success: boolean; newScore: number }> {
  console.log('💳 购买小说:', userId, novelId);

  try {
    // 1. 检查是否已购买
    const hasPurchased = await checkNovelPurchased(userId, novelId);
    if (hasPurchased) {
      console.log('⚠️ 已购买过该小说');
      throw new Error('您已购买过该小说');
    }

    // 2. 获取小说价格
    const price = await getNovelPrice(novelId);
    if (price === 0) {
      console.log('⚠️ 该小说免费，无需购买');
      throw new Error('该小说免费，无需购买');
    }

    // 3. 获取用户当前码分
    const currentScore = await getUserScore(userId);
    if (currentScore < price) {
      console.log('⚠️ 码分不足，无法购买');
      throw new Error('码分不足');
    }

    // 4. 扣除码分
    const newScore = currentScore - price;
    const { error: updateScoreError } = await supabase
      .from('users')
      .update({ score: newScore })
      .eq('id', userId);

    if (updateScoreError) throw updateScoreError;

    // 5. 创建购买记录
    const { error: purchaseError } = await supabase
      .from('purchase_records')
      .insert({
        user_id: userId,
        novel_id: novelId,
        price,
      });

    if (purchaseError) throw purchaseError;

    // 6. 创建码分变动记录
    const { error: scoreRecordError } = await supabase
      .from('score_records')
      .insert({
        user_id: userId,
        score_change: -price,
        action_type: 'post', // 使用post类型，因为没有purchase类型
        related_id: novelId,
        description: `购买小说《${novelId}》扣除${price}码分`,
      });

    if (scoreRecordError) throw scoreRecordError;

    console.log('✅ 购买小说成功！扣除码分:', price, '剩余码分:', newScore);

    return { success: true, newScore };
  } catch (error) {
    console.error('❌ 购买小说失败:', error);
    throw error;
  }
}

/**
 * 获取用户购买记录
 */
export async function getUserPurchaseRecords(
  userId: string,
  limit: number = 50
): Promise<PurchaseRecord[]> {
  console.log('📚 获取购买记录:', userId);

  try {
    const { data, error } = await supabase
      .from('purchase_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    console.log('✅ 获取购买记录成功:', data?.length);
    return data || [];
  } catch (error) {
    console.error('❌ 获取购买记录失败:', error);
    throw error;
  }
}

/**
 * 检查用户是否可以访问小说
 * （免费小说或已购买的收费小说）
 */
export async function checkNovelAccess(
  userId: string,
  novelId: string
): Promise<{ canAccess: boolean; price: number; hasPurchased: boolean }> {
  console.log('🔐 检查小说访问权限:', userId, novelId);

  try {
    // 1. 获取小说价格
    const price = await getNovelPrice(novelId);

    // 2. 如果免费，直接返回可访问
    if (price === 0) {
      console.log('✅ 免费小说，可以访问');
      return { canAccess: true, price: 0, hasPurchased: false };
    }

    // 3. 检查是否已购买
    const hasPurchased = await checkNovelPurchased(userId, novelId);

    console.log(
      hasPurchased ? '✅ 已购买，可以访问' : '⚠️ 未购买，需要购买'
    );

    return { canAccess: hasPurchased, price, hasPurchased };
  } catch (error) {
    console.error('❌ 检查访问权限失败:', error);
    throw error;
  }
}

// ==================== 码分兑换现金功能 ====================

/**
 * 码分兑换现金
 * 兑换比例：100码分=1元
 */
export async function exchangeScoreToCash(
  userId: string,
  scoreAmount: number
): Promise<{ success: boolean; cashAmount: number; newScore: number }> {
  console.log('💵 码分兑换现金:', userId, scoreAmount);

  try {
    // 1. 验证兑换数量
    if (scoreAmount <= 0 || scoreAmount % 100 !== 0) {
      console.log('⚠️ 兑换数量必须是100的倍数');
      throw new Error('兑换数量必须是100的倍数');
    }

    // 2. 获取用户当前码分
    const currentScore = await getUserScore(userId);
    if (currentScore < scoreAmount) {
      console.log('⚠️ 码分不足，无法兑换');
      throw new Error('码分不足');
    }

    // 3. 计算兑换金额（100码分=1元）
    const cashAmount = scoreAmount / 100;

    // 4. 扣除码分
    const newScore = currentScore - scoreAmount;
    const { error: updateScoreError } = await supabase
      .from('users')
      .update({ score: newScore })
      .eq('id', userId);

    if (updateScoreError) throw updateScoreError;

    // 5. 创建兑换记录
    const { error: exchangeError } = await supabase
      .from('exchange_records')
      .insert({
        user_id: userId,
        score_amount: scoreAmount,
        cash_amount: cashAmount,
        status: 'completed',
      });

    if (exchangeError) throw exchangeError;

    // 6. 创建码分变动记录
    const { error: scoreRecordError } = await supabase
      .from('score_records')
      .insert({
        user_id: userId,
        score_change: -scoreAmount,
        action_type: 'post', // 使用post类型，因为没有exchange类型
        related_id: null,
        description: `兑换现金扣除${scoreAmount}码分，获得${cashAmount}元`,
      });

    if (scoreRecordError) throw scoreRecordError;

    console.log(
      '✅ 兑换成功！扣除码分:',
      scoreAmount,
      '获得现金:',
      cashAmount,
      '剩余码分:',
      newScore
    );

    return { success: true, cashAmount, newScore };
  } catch (error) {
    console.error('❌ 兑换失败:', error);
    throw error;
  }
}

/**
 * 获取用户兑换记录
 */
export async function getUserExchangeRecords(
  userId: string,
  limit: number = 50
): Promise<ExchangeRecord[]> {
  console.log('📊 获取兑换记录:', userId);

  try {
    const { data, error } = await supabase
      .from('exchange_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    console.log('✅ 获取兑换记录成功:', data?.length);
    return data || [];
  } catch (error) {
    console.error('❌ 获取兑换记录失败:', error);
    throw error;
  }
}
