import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Sparkles, AlertCircle, Gift, Share2, MessageSquare } from 'lucide-react';
import { purchaseNovel } from '@/db/pricing-api';
import { getUserScore } from '@/db/score-api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PurchaseNovelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  novelId: string;
  novelTitle: string;
  novelThumb?: string | null;
  price: number;
  onPurchaseSuccess?: () => void;
}

/**
 * 购买小说对话框组件
 * 支持码分兑换阅读，码分不足提示
 * 响应式设计，完美适配PC、平板、手机等各种设备
 */
export default function PurchaseNovelDialog({
  open,
  onOpenChange,
  userId,
  novelId,
  novelTitle,
  novelThumb,
  price,
  onPurchaseSuccess,
}: PurchaseNovelDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [loadingScore, setLoadingScore] = useState(true);

  // 加载用户码分
  useEffect(() => {
    if (open && userId) {
      loadUserScore();
    }
  }, [open, userId]);

  const loadUserScore = async () => {
    try {
      setLoadingScore(true);
      const score = await getUserScore(userId);
      setUserScore(score);
    } catch (error) {
      console.error('加载用户码分失败:', error);
    } finally {
      setLoadingScore(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);

      // 购买小说
      const result = await purchaseNovel(userId, novelId);

      // 更新用户码分
      setUserScore(result.newScore);

      // 通知父组件购买成功
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }

      // 显示成功提示
      toast({
        title: '购买成功！🎉',
        description: (
          <div className="space-y-1">
            <p>您已成功购买《{novelTitle}》</p>
            <p>扣除码分：<span className="font-bold text-[#FF5724]">{price}</span></p>
            <p>剩余码分：<span className="font-bold">{result.newScore}</span></p>
          </div>
        ),
      });

      // 关闭对话框
      onOpenChange(false);
    } catch (error: any) {
      console.error('购买失败:', error);
      toast({
        title: '购买失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isScoreEnough = userScore >= price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#FF5724]" />
            确定兑换小说
          </DialogTitle>
          <DialogDescription>
            使用码分兑换小说阅读权限，购买后可随时阅读
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 小说信息 */}
          <div className="flex gap-3 p-3 rounded-lg border border-[#FF5724]/20">
            {novelThumb && (
              <img
                src={novelThumb}
                alt={novelTitle}
                className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground mb-1">小说标题</div>
              <div className="font-medium text-sm sm:text-base line-clamp-2 mb-2">
                {novelTitle}
              </div>
              <Badge className="bg-[#FF5724] text-white">
                收费 {price} 码分
              </Badge>
            </div>
          </div>

          {/* 码分信息 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">当前码分</div>
              <div className="text-xl sm:text-2xl font-bold text-[#FF5724]">
                {loadingScore ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF5724]"></div>
                ) : (
                  userScore
                )}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">所需码分</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {price}
              </div>
            </div>
          </div>

          {/* 码分不足提示 */}
          {!loadingScore && !isScoreEnough && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <p className="font-medium">码分不足，无法兑换</p>
                  <p className="text-sm">
                    还需要 <span className="font-bold">{price - userScore}</span> 码分
                  </p>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">赚取码分的方式：</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Gift className="h-3 w-3" />
                        <span>每日签到：+1 码分</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Share2 className="h-3 w-3" />
                        <span>分享小说：+1 码分（每本小说首次分享）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        <span>发表帖子：+1 码分（每天首次发帖）</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/community');
                    }}
                    className="w-full mt-2 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    前往社区赚取码分
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 购买说明 */}
          {!loadingScore && isScoreEnough && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-medium text-blue-900">购买说明</div>
              </div>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>购买后可随时阅读该小说</li>
                <li>购买记录永久保存</li>
                <li>不支持退款或转让</li>
              </ul>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 order-2 sm:order-1"
          >
            取消
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={loading || loadingScore || !isScoreEnough}
            className="flex-1 bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white order-1 sm:order-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>购买中...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span>确定兑换</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
