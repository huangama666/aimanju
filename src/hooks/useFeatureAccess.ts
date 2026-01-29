import { useState, useEffect } from 'react';
import { getPromotionSettings } from '@/db/api';
import type { MembershipLevel, PromotionSettings } from '@/types/database';

/**
 * 会员功能访问权限Hook
 * 
 * 用于判断用户是否可以访问会员专属功能
 * 考虑因素：
 * 1. 用户的会员等级
 * 2. 限免活动是否启用
 * 3. 当前时间是否在限免时间范围内
 */

export interface FeatureAccessResult {
  hasAccess: boolean; // 是否有访问权限
  isMember: boolean; // 是否是会员
  isPromotion: boolean; // 是否在限免期间
  isLoading: boolean; // 是否正在加载
  promotionSettings: PromotionSettings | null; // 限免设置
}

/**
 * 检查用户是否有访问会员功能的权限
 * @param membershipLevel 用户的会员等级
 * @returns 访问权限结果
 */
export function useFeatureAccess(membershipLevel: MembershipLevel): FeatureAccessResult {
  const [promotionSettings, setPromotionSettings] = useState<PromotionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载限免设置
  useEffect(() => {
    let mounted = true;

    const loadPromotionSettings = async () => {
      try {
        const settings = await getPromotionSettings();
        if (mounted) {
          setPromotionSettings(settings);
        }
      } catch (error) {
        console.error('加载限免设置失败:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPromotionSettings();

    // 每分钟检查一次限免状态（防止限免时间到期后仍然显示限免）
    const interval = setInterval(loadPromotionSettings, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // 判断是否是会员
  const isMember = membershipLevel !== 'free';

  // 判断是否在限免期间
  const isPromotion = checkIsPromotion(promotionSettings);

  // 判断是否有访问权限（会员或限免期间）
  const hasAccess = isMember || isPromotion;

  return {
    hasAccess,
    isMember,
    isPromotion,
    isLoading,
    promotionSettings,
  };
}

/**
 * 检查当前是否在限免期间
 * @param settings 限免设置
 * @returns 是否在限免期间
 */
export function checkIsPromotion(settings: PromotionSettings | null): boolean {
  if (!settings || !settings.is_enabled) {
    return false;
  }

  const now = new Date();

  // 如果没有设置开始时间和结束时间，则认为一直限免
  if (!settings.start_time && !settings.end_time) {
    return true;
  }

  // 检查开始时间
  if (settings.start_time) {
    const startTime = new Date(settings.start_time);
    if (now < startTime) {
      return false;
    }
  }

  // 检查结束时间
  if (settings.end_time) {
    const endTime = new Date(settings.end_time);
    if (now > endTime) {
      return false;
    }
  }

  return true;
}

/**
 * 获取访问权限提示文本
 * @param result 访问权限结果
 * @returns 提示文本
 */
export function getAccessMessage(result: FeatureAccessResult): string {
  if (result.isLoading) {
    return '正在检查权限...';
  }

  if (result.hasAccess) {
    if (result.isPromotion) {
      return '限免期间，所有用户均可使用';
    }
    return '您是会员，可以使用此功能';
  }

  return '此功能仅限会员使用，请先升级会员';
}

/**
 * 格式化限免时间范围
 * @param settings 限免设置
 * @returns 格式化的时间范围文本
 */
export function formatPromotionTimeRange(settings: PromotionSettings | null): string {
  if (!settings || !settings.is_enabled) {
    return '未启用限免';
  }

  if (!settings.start_time && !settings.end_time) {
    return '长期限免';
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (settings.start_time && settings.end_time) {
    return `${formatDate(settings.start_time)} 至 ${formatDate(settings.end_time)}`;
  }

  if (settings.start_time) {
    return `${formatDate(settings.start_time)} 开始`;
  }

  if (settings.end_time) {
    return `${formatDate(settings.end_time)} 结束`;
  }

  return '未设置时间';
}
