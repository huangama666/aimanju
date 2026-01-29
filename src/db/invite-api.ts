import { supabase } from './supabase';
import { DbUser } from '@/types/database';

/**
 * 邀请系统API
 */

// 生成用户邀请码（如果还没有）
export async function generateInviteCode(userId: string): Promise<string | null> {
  try {
    console.log('[邀请系统] 为用户生成邀请码:', userId);
    
    // 先查询用户是否已有邀请码
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('invite_code')
      .eq('id', userId)
      .maybeSingle();
    
    if (queryError) {
      console.error('[邀请系统] 查询用户邀请码失败:', queryError);
      return null;
    }
    
    if (user?.invite_code) {
      console.log('[邀请系统] 用户已有邀请码:', user.invite_code);
      return user.invite_code;
    }
    
    // 生成新的邀请码（8位大写字母+数字）
    const inviteCode = generateRandomCode();
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ invite_code: inviteCode })
      .eq('id', userId);
    
    if (updateError) {
      console.error('[邀请系统] 更新用户邀请码失败:', updateError);
      return null;
    }
    
    console.log('[邀请系统] 成功生成邀请码:', inviteCode);
    return inviteCode;
  } catch (error) {
    console.error('[邀请系统] 生成邀请码异常:', error);
    return null;
  }
}

// 生成随机邀请码
function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 验证邀请码是否有效
export async function validateInviteCode(inviteCode: string): Promise<DbUser | null> {
  try {
    console.log('[邀请系统] 验证邀请码:', inviteCode);
    
    const { data: inviter, error } = await supabase
      .from('users')
      .select('*')
      .eq('invite_code', inviteCode)
      .maybeSingle();
    
    if (error) {
      console.error('[邀请系统] 验证邀请码失败:', error);
      return null;
    }
    
    if (!inviter) {
      console.log('[邀请系统] 邀请码无效');
      return null;
    }
    
    console.log('[邀请系统] 邀请码有效，邀请人:', inviter.nickname);
    return inviter;
  } catch (error) {
    console.error('[邀请系统] 验证邀请码异常:', error);
    return null;
  }
}

// 处理用户注册（发放注册奖励和邀请奖励）
export async function handleUserRegistration(userId: string, inviteCode?: string): Promise<boolean> {
  try {
    console.log('[邀请系统] 处理用户注册:', userId, '邀请码:', inviteCode);
    
    // 1. 检查是否已发放注册奖励
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('registration_reward_given, score')
      .eq('id', userId)
      .maybeSingle();
    
    if (queryError) {
      console.error('[邀请系统] 查询用户信息失败:', queryError);
      return false;
    }
    
    if (user?.registration_reward_given) {
      console.log('[邀请系统] 用户已领取注册奖励');
      return true;
    }
    
    // 2. 发放注册奖励（100码分）
    const currentScore = user?.score || 0;
    const newScore = currentScore + 100;
    
    const { error: updateScoreError } = await supabase
      .from('users')
      .update({ 
        score: newScore,
        registration_reward_given: true
      })
      .eq('id', userId);
    
    if (updateScoreError) {
      console.error('[邀请系统] 发放注册奖励失败:', updateScoreError);
      return false;
    }
    
    // 3. 记录注册奖励
    const { error: recordError } = await supabase
      .from('score_record')
      .insert({
        user_id: userId,
        score_change: 100,
        operation_type: '注册奖励',
        description: '新用户注册奖励'
      });
    
    if (recordError) {
      console.error('[邀请系统] 记录注册奖励失败:', recordError);
    }
    
    console.log('[邀请系统] 成功发放注册奖励100码分');
    
    // 4. 处理邀请奖励
    if (inviteCode) {
      const inviter = await validateInviteCode(inviteCode);
      if (inviter && inviter.id !== userId) {
        await processInviteReward(inviter.id, userId);
        
        // 更新被邀请人的invited_by字段
        await supabase
          .from('users')
          .update({ invited_by: inviter.id })
          .eq('id', userId);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[邀请系统] 处理用户注册异常:', error);
    return false;
  }
}

// 处理邀请奖励
async function processInviteReward(inviterId: string, inviteeId: string): Promise<boolean> {
  try {
    console.log('[邀请系统] 处理邀请奖励，邀请人:', inviterId, '被邀请人:', inviteeId);
    
    // 1. 检查是否已发放过邀请奖励
    const { data: existingRecord } = await supabase
      .from('invite_records')
      .select('*')
      .eq('inviter_id', inviterId)
      .eq('invitee_id', inviteeId)
      .maybeSingle();
    
    if (existingRecord) {
      console.log('[邀请系统] 已存在邀请记录，跳过');
      return true;
    }
    
    // 2. 创建邀请记录
    const { error: recordError } = await supabase
      .from('invite_records')
      .insert({
        inviter_id: inviterId,
        invitee_id: inviteeId,
        reward_given: true
      });
    
    if (recordError) {
      console.error('[邀请系统] 创建邀请记录失败:', recordError);
      return false;
    }
    
    // 3. 给邀请人增加50码分
    const { data: inviter, error: queryError } = await supabase
      .from('users')
      .select('score')
      .eq('id', inviterId)
      .maybeSingle();
    
    if (queryError) {
      console.error('[邀请系统] 查询邀请人积分失败:', queryError);
      return false;
    }
    
    const currentScore = inviter?.score || 0;
    const newScore = currentScore + 50;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ score: newScore })
      .eq('id', inviterId);
    
    if (updateError) {
      console.error('[邀请系统] 更新邀请人积分失败:', updateError);
      return false;
    }
    
    // 4. 记录邀请奖励
    const { error: scoreRecordError } = await supabase
      .from('score_record')
      .insert({
        user_id: inviterId,
        score_change: 50,
        operation_type: '邀请奖励',
        description: '成功邀请新用户注册'
      });
    
    if (scoreRecordError) {
      console.error('[邀请系统] 记录邀请奖励失败:', scoreRecordError);
    }
    
    console.log('[邀请系统] 成功发放邀请奖励50码分');
    return true;
  } catch (error) {
    console.error('[邀请系统] 处理邀请奖励异常:', error);
    return false;
  }
}

// 获取用户的邀请统计
export async function getInviteStats(userId: string) {
  try {
    console.log('[邀请系统] 获取用户邀请统计:', userId);
    
    // 获取邀请记录
    const { data: inviteRecords, error } = await supabase
      .from('invite_records')
      .select(`
        *,
        invitee:invitee_id (
          id,
          nickname,
          avatar_url,
          created_at
        )
      `)
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[邀请系统] 获取邀请记录失败:', error);
      return {
        totalInvites: 0,
        totalRewards: 0,
        inviteRecords: []
      };
    }
    
    const totalInvites = inviteRecords?.length || 0;
    const totalRewards = totalInvites * 50;
    
    console.log('[邀请系统] 邀请统计 - 总邀请人数:', totalInvites, '总奖励:', totalRewards);
    
    return {
      totalInvites,
      totalRewards,
      inviteRecords: inviteRecords || []
    };
  } catch (error) {
    console.error('[邀请系统] 获取邀请统计异常:', error);
    return {
      totalInvites: 0,
      totalRewards: 0,
      inviteRecords: []
    };
  }
}

// 获取用户邀请码
export async function getUserInviteCode(userId: string): Promise<string | null> {
  try {
    console.log('[邀请系统] 获取用户邀请码:', userId);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('invite_code')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[邀请系统] 获取用户邀请码失败:', error);
      return null;
    }
    
    if (!user?.invite_code) {
      // 如果没有邀请码，生成一个
      return await generateInviteCode(userId);
    }
    
    return user.invite_code;
  } catch (error) {
    console.error('[邀请系统] 获取用户邀请码异常:', error);
    return null;
  }
}
