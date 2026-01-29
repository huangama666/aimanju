import { ReactNode } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Crown, Sparkles } from 'lucide-react';
import type { MembershipLevel } from '@/types/database';

interface MemberFeatureButtonProps extends Omit<ButtonProps, 'onClick'> {
  membershipLevel: MembershipLevel;
  featureName: string;
  onClick?: () => void;
  children: ReactNode;
  showPromotionHint?: boolean; // 是否在限免期间显示限免提示
}

/**
 * 会员功能按钮组件
 * 
 * 自动判断用户是否有访问权限
 * - 如果有权限：正常显示按钮，可以点击
 * - 如果无权限：禁用按钮，鼠标悬停显示升级提示
 * - 如果在限免期间：显示限免标识
 */
export function MemberFeatureButton({
  membershipLevel,
  featureName,
  onClick,
  children,
  showPromotionHint = true,
  disabled,
  ...props
}: MemberFeatureButtonProps) {
  const navigate = useNavigate();
  const { hasAccess, isMember, isPromotion, isLoading } = useFeatureAccess(membershipLevel);

  // 按钮是否应该被禁用
  const isDisabled = disabled || !hasAccess;

  // 处理点击事件
  const handleClick = () => {
    if (hasAccess && onClick) {
      onClick();
    } else if (!hasAccess) {
      // 跳转到会员中心
      navigate('/membership');
    }
  };

  // 获取提示文本
  const getTooltipContent = () => {
    if (disabled) {
      return null; // 如果是其他原因禁用，不显示提示
    }

    if (hasAccess) {
      if (isPromotion && !isMember && showPromotionHint) {
        return (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>限免期间免费使用</span>
          </div>
        );
      }
      return null;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Crown className="w-4 h-4" />
          <span>会员专属功能</span>
        </div>
        <p className="text-xs">
          {featureName}为会员专属功能
          <br />
          点击升级会员后即可使用
        </p>
      </div>
    );
  };

  const tooltipContent = getTooltipContent();

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <Button {...props} disabled>
        {children}
      </Button>
    );
  }

  // 如果不需要提示，直接返回按钮
  if (!tooltipContent) {
    return (
      <Button
        {...props}
        disabled={isDisabled}
        onClick={handleClick}
      >
        {children}
      </Button>
    );
  }

  // 返回带提示的按钮
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            {...props}
            disabled={isDisabled}
            onClick={handleClick}
          >
            {children}
            {!hasAccess && <Crown className="w-4 h-4 ml-2" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
