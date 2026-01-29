import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { rechargeCredits } from '@/db/api';
import { Coins, Loader2, CheckCircle2, Smartphone } from 'lucide-react';

interface RechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function RechargeDialog({ open, onOpenChange, userId, onSuccess }: RechargeDialogProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'input' | 'paying' | 'success'>('input');

  // 计算可获得的码分
  const credits = amount ? Math.floor(parseFloat(amount) * 100) : 0;

  // 重置状态
  const resetState = () => {
    setAmount('');
    setPaymentStep('input');
    setRecharging(false);
  };

  // 处理对话框关闭
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  // 模拟微信支付流程
  const handleRecharge = async () => {
    // 验证金额
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: '输入错误',
        description: '请输入有效的充值金额',
        variant: 'destructive'
      });
      return;
    }

    if (amountNum < 1) {
      toast({
        title: '金额过小',
        description: '最低充值金额为1元',
        variant: 'destructive'
      });
      return;
    }

    if (amountNum > 10000) {
      toast({
        title: '金额过大',
        description: '单次充值金额不能超过10000元',
        variant: 'destructive'
      });
      return;
    }

    try {
      setRecharging(true);
      
      // 步骤1: 显示支付中状态
      setPaymentStep('paying');
      
      // 模拟微信支付延迟（1.5秒）
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 步骤2: 调用后端充值
      const result = await rechargeCredits(userId, amountNum);
      
      if (result.success) {
        // 步骤3: 显示支付成功
        setPaymentStep('success');
        
        // 1.5秒后关闭对话框并刷新
        setTimeout(() => {
          toast({
            title: '充值成功',
            description: `成功充值 ${result.recharged} 码分，当前余额：${result.balance} 码分`,
          });
          onSuccess?.();
          handleOpenChange(false);
        }, 1500);
      } else {
        throw new Error(result.error || '充值失败');
      }
    } catch (error) {
      console.error('充值失败:', error);
      toast({
        title: '充值失败',
        description: error instanceof Error ? error.message : '充值过程中出现错误，请稍后重试',
        variant: 'destructive'
      });
      setPaymentStep('input');
    } finally {
      setRecharging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Coins className="h-6 w-6 text-[#FF5724]" />
            码分充值
          </DialogTitle>
          <DialogDescription>
            1元 = 100码分，充值后立即到账
          </DialogDescription>
        </DialogHeader>

        {/* 输入金额阶段 */}
        {paymentStep === 'input' && (
          <div className="space-y-6 py-4">
            {/* 充值金额输入 */}
            <div className="space-y-2">
              <Label htmlFor="amount">充值金额（元）</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="请输入充值金额"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg"
                  min="1"
                  max="10000"
                  step="0.01"
                  disabled={recharging}
                />
              </div>
            </div>

            {/* 可获得码分显示 */}
            {credits > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">可获得码分</span>
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-[#FF5724]" />
                    <span className="text-2xl font-bold text-[#FF5724]">{credits}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 快捷金额选择 */}
            <div className="space-y-2">
              <Label>快捷选择</Label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 50, 100, 200, 500, 1000].map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    onClick={() => setAmount(quickAmount.toString())}
                    disabled={recharging}
                  >
                    ¥{quickAmount}
                  </Button>
                ))}
              </div>
            </div>

            {/* 充值说明 */}
            <div className="text-sm text-gray-500 space-y-1">
              <p>• 充值金额最低1元，最高10000元</p>
              <p>• 充值的码分立即到账，永久有效</p>
              <p>• 码分可用于小说创作、角色生成、分镜制作等功能</p>
            </div>

            {/* 支付按钮 */}
            <Button
              onClick={handleRecharge}
              disabled={!amount || recharging || credits <= 0}
              className="w-full bg-gradient-to-r from-[#09BB07] to-[#07A803] hover:from-[#07A803] hover:to-[#09BB07] text-white h-12 text-lg"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              微信支付
            </Button>
          </div>
        )}

        {/* 支付中阶段 */}
        {paymentStep === 'paying' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-[#09BB07]" />
              <Smartphone className="h-8 w-8 text-[#09BB07] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">正在支付...</p>
              <p className="text-sm text-gray-500">请稍候，正在处理您的支付</p>
            </div>
          </div>
        )}

        {/* 支付成功阶段 */}
        {paymentStep === 'success' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-green-600">支付成功！</p>
              <p className="text-sm text-gray-500">已成功充值 {credits} 码分</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
