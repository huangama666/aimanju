import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VipBadge } from '@/components/ui/vip-badge';
import { useNavigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Crown, Sparkles, Info } from 'lucide-react';
import type { MembershipLevel } from '@/types/database';

interface FeatureAccessGuardProps {
  membershipLevel: MembershipLevel;
  featureName: string;
  children: ReactNode;
  showPromotionBanner?: boolean; // 是否显示限免横幅
}

/**
 * 功能访问权限守卫组件
 * 
 * 用于包裹会员专属功能，自动判断用户是否有访问权限
 * 如果没有权限，显示升级会员提示
 * 如果在限免期间，显示限免提示
 */
export function FeatureAccessGuard({
  membershipLevel,
  featureName,
  children,
  showPromotionBanner = true,
}: FeatureAccessGuardProps) {
  const navigate = useNavigate();
  const { hasAccess, isMember, isPromotion, isLoading, promotionSettings } = useFeatureAccess(membershipLevel);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">正在检查权限...</div>
      </div>
    );
  }

  // 有访问权限
  if (hasAccess) {
    return (
      <>
        {/* 限免提示横幅（仅在限免期间且非会员时显示） */}
        {showPromotionBanner && isPromotion && !isMember && (
          <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <AlertDescription className="text-orange-700 dark:text-orange-400">
              <strong>限免活动进行中！</strong>
              {promotionSettings?.description && ` ${promotionSettings.description}`}
              {' '}所有用户均可免费使用会员专属功能。
            </AlertDescription>
          </Alert>
        )}
        {children}
      </>
    );
  }

  // 无访问权限，显示升级提示
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* VIP图标 */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10">
            <Crown className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold flex items-center justify-center gap-2">
            {featureName}
            <VipBadge size="sm" />
          </h3>
          <p className="text-muted-foreground">
            此功能为会员专属功能，升级会员后即可使用
          </p>
        </div>

        {/* 会员权益说明 */}
        <div className="p-4 rounded-lg bg-card border space-y-3 text-left">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-primary" />
            会员专属权益
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>AI智能生成：随机生成情节、优化描述</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>智能写作辅助：扩写、润色、改写</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>角色生成：从章节中自动提取角色</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>音频生成：将章节转换为语音</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>更多AI功能持续更新中...</span>
            </li>
          </ul>
        </div>

        {/* 升级按钮 */}
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate('/membership')}
        >
          <Crown className="w-5 h-5 mr-2" />
          立即升级会员
        </Button>

        {/* 提示信息 */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-left">
            升级会员后，您将解锁所有AI智能功能，享受更高效的创作体验。
            会员等级越高，每月赠送的码分越多。
          </p>
        </div>
      </div>
    </div>
  );
}
