import { useState, useEffect } from 'react';
import { checkMembershipAccess, isPromotionActive } from '@/db/api';
import type { MembershipLevel } from '@/types/database';

/**
 * 会员权限检查Hook
 * @param userLevel 用户会员等级
 * @param requiredLevel 所需会员等级（默认为basic）
 * @returns { hasAccess: 是否有权限, isPromotion: 是否在限免期间, loading: 是否加载中 }
 */
export function useMembershipAccess(
  userLevel: MembershipLevel | undefined,
  requiredLevel: MembershipLevel = 'basic'
) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isPromotion, setIsPromotion] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!userLevel) {
        setHasAccess(false);
        setIsPromotion(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 检查是否在限免期间
        const promotionActive = await isPromotionActive();
        setIsPromotion(promotionActive);

        // 检查用户权限
        const access = await checkMembershipAccess(userLevel, requiredLevel);
        setHasAccess(access);
      } catch (error) {
        console.error('检查会员权限失败:', error);
        setHasAccess(false);
        setIsPromotion(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [userLevel, requiredLevel]);

  return { hasAccess, isPromotion, loading };
}
