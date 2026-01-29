// 签到和码分系统API

import { supabase } from './supabase';
import type {
  CheckinRecord,
  ScoreRecord,
  DailyPostRecord,
  NovelShareRecord,
} from '@/types/database';

// ==================== 签到功能 ====================

/**
 * 检查用户今天是否已签到
 */
export async function checkTodayCheckin(userId: string): Promise<boolean> {
  console.log('🔍 检查今日签到状态:', userId);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式

  const { data, error } = await supabase
    .from('checkin_records')
    .select('id')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle();

  if (error) {
    console.error('❌ 检查签到状态失败:', error);
    throw error;
  }

  const hasCheckedIn = !!data;
  console.log(hasCheckedIn ? '✅ 今日已签到' : '📝 今日未签到');
  return hasCheckedIn;
}

/**
 * 用户签到
 */
export async function userCheckin(userId: string): Promise<{
  success: boolean;
  score: number;
  consecutiveDays: number;
}> {
  console.log('📝 用户签到:', userId);

  try {
    // 1. 检查今天是否已签到
    const hasCheckedIn = await checkTodayCheckin(userId);
    if (hasCheckedIn) {
      console.log('⚠️ 今日已签到，无需重复签到');
      throw new Error('今日已签到');
    }

    const today = new Date().toISOString().split('T')[0];

    // 2. 获取用户当前信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits, consecutive_checkin_days, last_checkin_date')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;

    const currentScore = userData?.credits || 0;
    const lastCheckinDate = userData?.last_checkin_date;
    let consecutiveDays = userData?.consecutive_checkin_days || 0;

    // 3. 计算连续签到天数
    if (lastCheckinDate) {
      const lastDate = new Date(lastCheckinDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        // 连续签到
        consecutiveDays += 1;
      } else if (diffDays > 1) {
        // 中断了，重新开始
        consecutiveDays = 1;
      }
    } else {
      // 第一次签到
      consecutiveDays = 1;
    }

    const scoreEarned = 1; // 签到获得1码分
    const newScore = currentScore + scoreEarned;

    // 4. 创建签到记录
    const { error: checkinError } = await supabase
      .from('checkin_records')
      .insert({
        user_id: userId,
        checkin_date: today,
        score_earned: scoreEarned,
      });

    if (checkinError) throw checkinError;

    // 5. 创建码分变动记录
    const { error: scoreRecordError } = await supabase
      .from('score_records')
      .insert({
        user_id: userId,
        score_change: scoreEarned,
        action_type: 'checkin',
        description: `签到获得${scoreEarned}码分`,
      });

    if (scoreRecordError) throw scoreRecordError;

    // 6. 更新用户信息
    const { error: updateError } = await supabase
      .from('users')
      .update({
        credits: newScore,
        consecutive_checkin_days: consecutiveDays,
        last_checkin_date: today,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log('✅ 签到成功！获得码分:', scoreEarned, '总码分:', newScore, '连续签到:', consecutiveDays);

    return {
      success: true,
      score: newScore,
      consecutiveDays,
    };
  } catch (error) {
    console.error('❌ 签到失败:', error);
    throw error;
  }
}

/**
 * 获取用户签到历史
 */
export async function getUserCheckinHistory(
  userId: string,
  limit: number = 30
): Promise<CheckinRecord[]> {
  console.log('📚 获取签到历史:', userId);

  const { data, error } = await supabase
    .from('checkin_records')
    .select('*')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ 获取签到历史失败:', error);
    throw error;
  }

  console.log('✅ 获取签到历史成功:', data?.length);
  return data || [];
}

// ==================== 码分功能 ====================

/**
 * 获取用户当前码分
 */
export async function getUserScore(userId: string): Promise<number> {
  console.log('💰 获取用户码分:', userId);

  const { data, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ 获取用户码分失败:', error);
    throw error;
  }

  const score = data?.credits || 0;
  console.log('✅ 用户当前码分:', score);
  return score;
}

/**
 * 获取用户码分变动记录
 */
export async function getUserScoreRecords(
  userId: string,
  limit: number = 50
): Promise<ScoreRecord[]> {
  console.log('📊 获取码分变动记录:', userId);

  const { data, error } = await supabase
    .from('score_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ 获取码分变动记录失败:', error);
    throw error;
  }

  console.log('✅ 获取码分变动记录成功:', data?.length);
  return data || [];
}

// ==================== 发帖码分功能 ====================

/**
 * 检查今天是否已获得发帖码分
 */
export async function checkTodayPostScore(userId: string): Promise<boolean> {
  console.log('🔍 检查今日发帖码分状态:', userId);

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_post_records')
    .select('score_earned')
    .eq('user_id', userId)
    .eq('post_date', today)
    .maybeSingle();

  if (error) {
    console.error('❌ 检查发帖码分状态失败:', error);
    throw error;
  }

  const hasEarned = data?.score_earned || false;
  console.log(hasEarned ? '✅ 今日已获得发帖码分' : '📝 今日未获得发帖码分');
  return hasEarned;
}

/**
 * 发帖时处理码分（每天第一次发帖获得1码分）
 */
export async function handlePostScore(
  userId: string,
  postId: string
): Promise<{ scoreEarned: boolean; newScore: number }> {
  console.log('📝 处理发帖码分:', userId, postId);

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. 检查今天是否已获得发帖码分
    const hasEarned = await checkTodayPostScore(userId);
    if (hasEarned) {
      console.log('⚠️ 今日已获得发帖码分，不再重复获得');
      const currentScore = await getUserScore(userId);
      return { scoreEarned: false, newScore: currentScore };
    }

    // 2. 获取用户当前码分
    const currentScore = await getUserScore(userId);
    const scoreChange = 1;
    const newScore = currentScore + scoreChange;

    // 3. 创建或更新每日发帖记录
    const { error: recordError } = await supabase.from('daily_post_records').upsert(
      {
        user_id: userId,
        post_date: today,
        first_post_id: postId,
        score_earned: true,
      },
      {
        onConflict: 'user_id,post_date',
      }
    );

    if (recordError) throw recordError;

    // 4. 创建码分变动记录
    const { error: scoreRecordError } = await supabase.from('score_records').insert({
      user_id: userId,
      score_change: scoreChange,
      action_type: 'post',
      related_id: postId,
      description: `今日首次发帖获得${scoreChange}码分`,
    });

    if (scoreRecordError) throw scoreRecordError;

    // 5. 更新用户码分
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newScore })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log('✅ 发帖码分处理成功！获得码分:', scoreChange, '总码分:', newScore);

    return { scoreEarned: true, newScore };
  } catch (error) {
    console.error('❌ 处理发帖码分失败:', error);
    throw error;
  }
}

/**
 * 删除帖子时扣除码分
 */
export async function handleDeletePostScore(
  userId: string,
  postId: string
): Promise<{ scoreDeducted: boolean; newScore: number }> {
  console.log('🗑️ 处理删除帖子码分:', userId, postId);

  try {
    // 1. 查找该帖子是否获得过码分
    const { data: postRecord, error: recordError } = await supabase
      .from('daily_post_records')
      .select('*')
      .eq('user_id', userId)
      .eq('first_post_id', postId)
      .eq('score_earned', true)
      .maybeSingle();

    if (recordError) throw recordError;

    if (!postRecord) {
      console.log('⚠️ 该帖子未获得过码分，无需扣除');
      const currentScore = await getUserScore(userId);
      return { scoreDeducted: false, newScore: currentScore };
    }

    // 2. 获取用户当前码分
    const currentScore = await getUserScore(userId);
    const scoreChange = -1;
    const newScore = Math.max(0, currentScore + scoreChange); // 确保码分不为负数

    // 3. 创建码分变动记录
    const { error: scoreRecordError } = await supabase.from('score_records').insert({
      user_id: userId,
      score_change: scoreChange,
      action_type: 'delete_post',
      related_id: postId,
      description: `删除帖子扣除${Math.abs(scoreChange)}码分`,
    });

    if (scoreRecordError) throw scoreRecordError;

    // 4. 更新用户码分
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newScore })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 5. 更新发帖记录状态
    const { error: updateRecordError } = await supabase
      .from('daily_post_records')
      .update({ score_earned: false })
      .eq('id', postRecord.id);

    if (updateRecordError) throw updateRecordError;

    console.log('✅ 删除帖子码分处理成功！扣除码分:', Math.abs(scoreChange), '总码分:', newScore);

    return { scoreDeducted: true, newScore };
  } catch (error) {
    console.error('❌ 处理删除帖子码分失败:', error);
    throw error;
  }
}

// ==================== 分享小说码分功能 ====================

/**
 * 检查小说是否已分享过
 */
export async function checkNovelShared(
  userId: string,
  novelId: string
): Promise<boolean> {
  console.log('🔍 检查小说分享状态:', userId, novelId);

  const { data, error } = await supabase
    .from('novel_share_records')
    .select('score_earned')
    .eq('user_id', userId)
    .eq('novel_id', novelId)
    .maybeSingle();

  if (error) {
    console.error('❌ 检查小说分享状态失败:', error);
    throw error;
  }

  const hasShared = data?.score_earned || false;
  console.log(hasShared ? '✅ 该小说已分享过' : '📝 该小说未分享过');
  return hasShared;
}

/**
 * 分享小说时处理码分（每个小说只能获得一次码分）
 */
export async function handleShareNovelScore(
  userId: string,
  novelId: string,
  shareId: string
): Promise<{ scoreEarned: boolean; newScore: number }> {
  console.log('📤 处理分享小说码分:', userId, novelId, shareId);

  try {
    // 1. 检查该小说是否已分享过
    const hasShared = await checkNovelShared(userId, novelId);
    if (hasShared) {
      console.log('⚠️ 该小说已分享过，不再重复获得码分');
      const currentScore = await getUserScore(userId);
      return { scoreEarned: false, newScore: currentScore };
    }

    // 2. 获取用户当前码分
    const currentScore = await getUserScore(userId);
    const scoreChange = 1;
    const newScore = currentScore + scoreChange;

    // 3. 创建小说分享记录
    const { error: recordError } = await supabase.from('novel_share_records').insert({
      user_id: userId,
      novel_id: novelId,
      share_id: shareId,
      score_earned: true,
    });

    if (recordError) throw recordError;

    // 4. 创建码分变动记录
    const { error: scoreRecordError } = await supabase.from('score_records').insert({
      user_id: userId,
      score_change: scoreChange,
      action_type: 'share_novel',
      related_id: shareId,
      description: `分享小说获得${scoreChange}码分`,
    });

    if (scoreRecordError) throw scoreRecordError;

    // 5. 更新用户码分
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newScore })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log('✅ 分享小说码分处理成功！获得码分:', scoreChange, '总码分:', newScore);

    return { scoreEarned: true, newScore };
  } catch (error) {
    console.error('❌ 处理分享小说码分失败:', error);
    throw error;
  }
}

/**
 * 删除分享时扣除码分
 */
export async function handleDeleteShareScore(
  userId: string,
  shareId: string
): Promise<{ scoreDeducted: boolean; newScore: number }> {
  console.log('🗑️ 处理删除分享码分:', userId, shareId);

  try {
    // 1. 查找该分享是否获得过码分
    const { data: shareRecord, error: recordError } = await supabase
      .from('novel_share_records')
      .select('*')
      .eq('user_id', userId)
      .eq('share_id', shareId)
      .eq('score_earned', true)
      .maybeSingle();

    if (recordError) throw recordError;

    if (!shareRecord) {
      console.log('⚠️ 该分享未获得过码分，无需扣除');
      const currentScore = await getUserScore(userId);
      return { scoreDeducted: false, newScore: currentScore };
    }

    // 2. 获取用户当前码分
    const currentScore = await getUserScore(userId);
    const scoreChange = -1;
    const newScore = Math.max(0, currentScore + scoreChange);

    // 3. 创建码分变动记录
    const { error: scoreRecordError } = await supabase.from('score_records').insert({
      user_id: userId,
      score_change: scoreChange,
      action_type: 'delete_share',
      related_id: shareId,
      description: `删除分享扣除${Math.abs(scoreChange)}码分`,
    });

    if (scoreRecordError) throw scoreRecordError;

    // 4. 更新用户码分
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newScore })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 5. 删除分享记录
    const { error: deleteRecordError } = await supabase
      .from('novel_share_records')
      .delete()
      .eq('id', shareRecord.id);

    if (deleteRecordError) throw deleteRecordError;

    console.log('✅ 删除分享码分处理成功！扣除码分:', Math.abs(scoreChange), '总码分:', newScore);

    return { scoreDeducted: true, newScore };
  } catch (error) {
    console.error('❌ 处理删除分享码分失败:', error);
    throw error;
  }
}
