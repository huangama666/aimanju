import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { upgradeMembershipNextMonth, upgradeMembershipImmediately } from '@/db/api';
import { Crown, Loader2, CheckCircle2, Smartphone } from 'lucide-react';
import { MEMBERSHIP_CONFIGS } from '@/config/membership';
import { MembershipBadge } from './MembershipBadge';
import type { MembershipLevel } from '@/types/database';

interface MembershipUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentLevel: MembershipLevel; // 当前会员等级
  targetLevel: MembershipLevel;
  onSuccess?: () => void;
}

export function MembershipUpgradeDialog({ 
  open, 
  onOpenChange, 
  userId,
  currentLevel,
  targetLevel,
  onSuccess 
}: MembershipUpgradeDialogProps) {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'confirm' | 'paying' | 'success'>('confirm');

  const config = MEMBERSHIP_CONFIGS[targetLevel];
  
  // 判断是否立即生效：尝鲜版（free）升级到任何会员
  const isImmediateUpgrade = currentLevel === 'free';

  // 重置状态
  const resetState = () => {
    setPaymentStep('confirm');
    setUpgrading(false);
  };

  // 处理对话框关闭
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  // 模拟微信支付流程并升级会员
  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      
      // 步骤1: 显示支付中状态
      setPaymentStep('paying');
      
      // 模拟微信支付延迟（1.5秒）
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 步骤2: 根据当前等级选择升级方式
      let result;
      if (isImmediateUpgrade) {
        // 尝鲜版升级：立即生效
        result = await upgradeMembershipImmediately(userId, targetLevel);
      } else {
        // 其他会员升级：次月生效
        result = await upgradeMembershipNextMonth(userId, targetLevel);
      }
      
      if (result.success) {
        // 步骤3: 显示支付成功
        setPaymentStep('success');
        
        // 根据升级方式显示不同的提示
        let description = '';
        if (isImmediateUpgrade) {
          // 立即生效
          const grantedCredits = (result as any).granted_credits || 0;
          description = `您的${config.name}已立即生效，已发放${grantedCredits}码分！`;
        } else {
          // 次月生效
          const effectiveDate = (result as any).effective_date 
            ? new Date((result as any).effective_date).toLocaleDateString('zh-CN') 
            : '下月1号';
          description = `您的${config.name}将于${effectiveDate}生效`;
        }
        
        // 1.5秒后关闭对话框并刷新
        setTimeout(() => {
          toast({
            title: '升级成功',
            description,
          });
          onSuccess?.();
          handleOpenChange(false);
        }, 1500);
      } else {
        throw new Error(result.error || '升级失败');
      }
    } catch (error) {
      console.error('升级会员失败:', error);
      toast({
        title: '升级失败',
        description: error instanceof Error ? error.message : '升级过程中出现错误，请稍后重试',
        variant: 'destructive'
      });
      setPaymentStep('confirm');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-[#F59E0B]" />
            升级会员
          </DialogTitle>
          <DialogDescription>
            {isImmediateUpgrade ? '升级后立即生效' : '升级后将于下月1号生效'}
          </DialogDescription>
        </DialogHeader>

        {/* 确认支付阶段 */}
        {paymentStep === 'confirm' && (
          <div className="space-y-6 py-4">
            {/* 会员信息卡片 */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MembershipBadge level={targetLevel} size="md" />
                  <div>
                    <h3 className="text-xl font-bold">{config.name}</h3>
                    <p className="text-sm text-muted-foreground">每月{config.monthlyCredits}码分</p>
                  </div>
                </div>
              </div>

              {/* 价格信息 */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-[#FF5724]">¥{config.price}</span>
                <span className="text-lg text-gray-400 line-through">¥{config.originalPrice}</span>
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded">
                  限时优惠
                </span>
              </div>

              {/* 会员权益 */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">会员权益：</p>
                <ul className="space-y-1">
                  {config.benefits.slice(0, 4).map((benefit, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 支付说明 */}
            <div className="text-sm text-gray-500 space-y-1 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              {isImmediateUpgrade ? (
                <>
                  <p>• 升级后立即生效</p>
                  <p>• 立即发放当月会员码分</p>
                  <p>• 会员权益每月自动续期</p>
                </>
              ) : (
                <>
                  <p>• 升级后将于下月1号生效</p>
                  <p>• 生效后立即发放当月会员码分</p>
                  <p>• 会员权益每月自动续期</p>
                </>
              )}
            </div>

            {/* 支付按钮 */}
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full bg-gradient-to-r from-[#09BB07] to-[#07A803] hover:from-[#07A803] hover:to-[#09BB07] text-white h-12 text-lg"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              微信支付 ¥{config.price}
            </Button>
          </div>
        )}

        {/* 支付中阶段 */}
        {paymentStep === 'paying' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-16 w-16 text-[#09BB07] animate-spin" />
              <Smartphone className="h-8 w-8 text-[#09BB07] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">正在支付中...</p>
              <p className="text-sm text-gray-500">请在微信中完成支付</p>
            </div>
          </div>
        )}

        {/* 支付成功阶段 */}
        {paymentStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-green-600">支付成功！</p>
              <p className="text-sm text-gray-500">会员升级成功，下月1号生效</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
