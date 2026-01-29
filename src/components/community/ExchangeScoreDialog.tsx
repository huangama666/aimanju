import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { exchangeScoreToCash, getUserExchangeRecords } from '@/db/pricing-api';
import { getUserScore } from '@/db/score-api';
import { useToast } from '@/hooks/use-toast';
import type { ExchangeRecord } from '@/types/database';

interface ExchangeScoreDialogProps {
  userId: string;
  onExchangeSuccess?: (newScore: number) => void;
}

/**
 * 码分兑换现金对话框组件
 * 兑换比例：100码分=1元
 * 显示温馨提示：模拟兑换，请勿当真
 * 响应式设计，完美适配PC、平板、手机等各种设备
 */
export default function ExchangeScoreDialog({
  userId,
  onExchangeSuccess,
}: ExchangeScoreDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scoreAmount, setScoreAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [loadingScore, setLoadingScore] = useState(true);
  const [exchangeRecords, setExchangeRecords] = useState<ExchangeRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 加载用户码分和兑换记录
  useEffect(() => {
    if (open && userId) {
      loadUserData();
    }
  }, [open, userId]);

  const loadUserData = async () => {
    try {
      setLoadingScore(true);
      const [score, records] = await Promise.all([
        getUserScore(userId),
        getUserExchangeRecords(userId, 10),
      ]);
      setUserScore(score);
      setExchangeRecords(records);
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      setLoadingScore(false);
    }
  };

  const handleExchange = async () => {
    try {
      setLoading(true);

      const amount = parseInt(scoreAmount);

      // 验证兑换数量
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: '兑换数量无效',
          description: '请输入有效的码分数量',
          variant: 'destructive',
        });
        return;
      }

      if (amount % 100 !== 0) {
        toast({
          title: '兑换数量无效',
          description: '兑换数量必须是100的倍数',
          variant: 'destructive',
        });
        return;
      }

      if (amount > userScore) {
        toast({
          title: '码分不足',
          description: '您的码分不足以进行兑换',
          variant: 'destructive',
        });
        return;
      }

      // 兑换码分
      const result = await exchangeScoreToCash(userId, amount);

      // 更新用户码分
      setUserScore(result.newScore);

      // 通知父组件兑换成功
      if (onExchangeSuccess) {
        onExchangeSuccess(result.newScore);
      }

      // 显示成功提示
      toast({
        title: '兑换成功！🎉',
        description: (
          <div className="space-y-1">
            <p>恭喜您成功兑换现金</p>
            <p>扣除码分：<span className="font-bold text-[#FF5724]">{amount}</span></p>
            <p>获得现金：<span className="font-bold text-green-600">{result.cashAmount}元</span></p>
            <p>剩余码分：<span className="font-bold">{result.newScore}</span></p>
          </div>
        ),
      });

      // 重置表单
      setScoreAmount('');

      // 重新加载数据
      loadUserData();
    } catch (error: any) {
      console.error('兑换失败:', error);
      toast({
        title: '兑换失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCashAmount = () => {
    const amount = parseInt(scoreAmount);
    if (isNaN(amount) || amount <= 0) return 0;
    return amount / 100;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Coins className="h-5 w-5" />
          <span className="hidden sm:inline">码分兑换现金</span>
          <span className="sm:hidden">兑换</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-green-600" />
            码分兑换现金
          </DialogTitle>
          <DialogDescription>
            将您的码分兑换成现金，兑换比例：100码分=1元
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 温馨提示 */}
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 font-medium">
              ⚠️ 温馨提示：模拟兑换，请勿当真
            </AlertDescription>
          </Alert>

          {/* 当前码分 */}
          <div className="p-4 rounded-lg border border-[#FF5724]/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">当前码分</div>
                <div className="text-3xl font-bold text-[#FF5724]">
                  {loadingScore ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5724]"></div>
                  ) : (
                    userScore
                  )}
                </div>
              </div>
              <Sparkles className="h-12 w-12 text-[#FF5724] opacity-50" />
            </div>
          </div>

          {/* 兑换比例说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-blue-900">兑换比例</div>
            </div>
            <div className="text-2xl font-bold text-blue-900 text-center py-2">
              100 码分 = 1 元
            </div>
          </div>

          {/* 兑换数量输入 */}
          <div className="space-y-2">
            <Label htmlFor="scoreAmount" className="text-sm font-medium">
              兑换码分数量 <span className="text-xs text-muted-foreground">(必须是100的倍数)</span>
            </Label>
            <Input
              id="scoreAmount"
              type="number"
              min="100"
              step="100"
              value={scoreAmount}
              onChange={(e) => setScoreAmount(e.target.value)}
              placeholder="请输入兑换码分数量"
              className="text-base"
            />
          </div>

          {/* 兑换金额显示 */}
          {scoreAmount && parseInt(scoreAmount) > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-800">预计获得现金</span>
                <span className="text-2xl font-bold text-green-600">
                  ¥{calculateCashAmount().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* 兑换说明 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-gray-900">兑换说明</div>
            <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
              <li>兑换数量必须是100的倍数</li>
              <li>兑换后码分将立即扣除</li>
              <li>兑换记录可在历史记录中查看</li>
              <li>本功能为模拟功能，仅供演示</li>
            </ul>
          </div>

          {/* 兑换历史 */}
          {exchangeRecords.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full text-sm"
              >
                {showHistory ? '隐藏' : '查看'}兑换历史 ({exchangeRecords.length}条)
              </Button>
              {showHistory && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {exchangeRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 bg-white border rounded-lg text-xs"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">
                          兑换 {record.score_amount} 码分
                        </span>
                        <span className="text-green-600 font-bold">
                          +¥{record.cash_amount}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(record.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="flex-1 order-2 sm:order-1"
          >
            取消
          </Button>
          <Button
            onClick={handleExchange}
            disabled={loading || loadingScore || !scoreAmount || parseInt(scoreAmount) <= 0}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white order-1 sm:order-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>兑换中...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                <span>确认兑换</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
