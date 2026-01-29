import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deductCredits, deductCreditsByQuantity, getFeaturePrice } from '@/db/api';
import { useNavigate } from 'react-router-dom';

/**
 * 码分管理 Hook
 * 提供码分扣减和余额检查功能
 */
export function useCredits() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeducting, setIsDeducting] = useState(false);

  /**
   * 扣减码分
   * @param userId 用户ID
   * @param featureKey 功能键名
   * @param description 交易描述（可选）
   * @returns 扣减是否成功
   */
  const deduct = useCallback(async (
    userId: string, 
    featureKey: string,
    description?: string
  ): Promise<boolean> => {
    console.log('🎯 [useCredits.deduct] 开始扣减码分');
    console.log('📋 [useCredits.deduct] userId:', userId);
    console.log('📋 [useCredits.deduct] featureKey:', featureKey);
    console.log('📋 [useCredits.deduct] description:', description);
    
    try {
      setIsDeducting(true);

      // 获取功能价格
      console.log('💰 [useCredits.deduct] 获取功能价格...');
      const price = await getFeaturePrice(featureKey);
      console.log('✅ [useCredits.deduct] 功能价格:', price);
      
      if (price === 0) {
        // 功能免费，直接返回成功
        console.log('✅ [useCredits.deduct] 功能免费，无需扣减');
        return true;
      }

      // 扣减码分
      console.log('💳 [useCredits.deduct] 调用 deductCredits...');
      const result = await deductCredits(
        userId, 
        featureKey, 
        description || '功能使用'
      );
      console.log('📊 [useCredits.deduct] deductCredits 返回结果:', result);

      if (result.success) {
        console.log('✅ [useCredits.deduct] 扣减成功');
        toast({
          title: '操作成功',
          description: `已扣除 ${price} 码分，剩余 ${result.balance || 0} 码分`,
          variant: 'default'
        });
        return true;
      } else {
        // 码分不足
        console.warn('⚠️ [useCredits.deduct] 码分不足:', result.error);
        toast({
          title: '码分不足',
          description: result.error || '您的码分不足，请升级会员或充值',
          variant: 'destructive'
        });
        // 延迟跳转到会员页面
        setTimeout(() => {
          navigate('/membership');
        }, 2000);
        return false;
      }
    } catch (error) {
      console.error('❌ [useCredits.deduct] 扣减码分失败:', error);
      console.error('❌ [useCredits.deduct] 错误详情:', error instanceof Error ? error.message : String(error));
      console.error('❌ [useCredits.deduct] 错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息');
      toast({
        title: '操作失败',
        description: '扣减码分失败，请稍后重试',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsDeducting(false);
      console.log('🏁 [useCredits.deduct] 完成');
    }
  }, [toast, navigate]);

  /**
   * 按数量扣减码分（用于分镜生成、剧本图片生成等按张数计费的功能）
   * @param userId 用户ID
   * @param featureKey 功能键名
   * @param quantity 数量
   * @param description 交易描述（可选）
   * @returns 扣减是否成功
   */
  const deductByQuantity = useCallback(async (
    userId: string,
    featureKey: string,
    quantity: number,
    description?: string
  ): Promise<boolean> => {
    try {
      setIsDeducting(true);

      // 获取单价
      const unitPrice = await getFeaturePrice(featureKey);
      if (unitPrice === 0) {
        // 功能免费，直接返回成功
        return true;
      }

      const totalPrice = unitPrice * quantity;

      // 扣减码分
      const result = await deductCreditsByQuantity(
        userId,
        featureKey,
        quantity,
        description || '功能使用'
      );

      if (result.success) {
        toast({
          title: '操作成功',
          description: `已扣除 ${totalPrice} 码分（${quantity}张 × ${unitPrice}码分），剩余 ${result.balance || 0} 码分`,
          variant: 'default'
        });
        return true;
      } else {
        // 码分不足
        toast({
          title: '码分不足',
          description: result.error || `需要 ${totalPrice} 码分，您的码分不足，请升级会员或充值`,
          variant: 'destructive'
        });
        // 延迟跳转到会员页面
        setTimeout(() => {
          navigate('/membership');
        }, 2000);
        return false;
      }
    } catch (error) {
      console.error('扣减码分失败:', error);
      toast({
        title: '操作失败',
        description: '扣减码分失败，请稍后重试',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsDeducting(false);
    }
  }, [toast, navigate]);

  /**
   * 检查码分是否足够
   * @param userId 用户ID
   * @param featureKey 功能键名
   * @returns 码分是否足够
   */
  const checkSufficient = useCallback(async (
    userId: string,
    featureKey: string
  ): Promise<boolean> => {
    try {
      const price = await getFeaturePrice(featureKey);
      if (!price) {
        return false;
      }

      // 这里可以添加实际的余额检查逻辑
      // 暂时返回 true，实际扣减时会检查
      return true;
    } catch (error) {
      console.error('检查码分失败:', error);
      return false;
    }
  }, []);

  return {
    deduct,
    deductByQuantity,
    checkSufficient,
    isDeducting
  };
}
