import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { DollarSign, Sparkles } from 'lucide-react';
import { setNovelPrice } from '@/db/pricing-api';
import { useToast } from '@/hooks/use-toast';

interface NovelPricingDialogProps {
  novelId: string;
  novelTitle: string;
  currentPrice: number;
  onPriceUpdated?: (newPrice: number) => void;
}

/**
 * 小说收费设置对话框组件
 * 支持设置小说收费码分，取消收费设置
 * 响应式设计，完美适配PC、平板、手机等各种设备
 */
export default function NovelPricingDialog({
  novelId,
  novelTitle,
  currentPrice,
  onPriceUpdated,
}: NovelPricingDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(currentPrice.toString());
  const [loading, setLoading] = useState(false);

  const handleSetPrice = async () => {
    try {
      setLoading(true);

      const priceValue = parseInt(price);

      // 验证价格
      if (isNaN(priceValue) || priceValue < 0) {
        toast({
          title: '价格无效',
          description: '请输入有效的码分数量（0或正整数）',
          variant: 'destructive',
        });
        return;
      }

      // 设置小说价格
      await setNovelPrice(novelId, priceValue);

      // 通知父组件价格更新
      if (onPriceUpdated) {
        onPriceUpdated(priceValue);
      }

      // 显示成功提示
      toast({
        title: priceValue === 0 ? '已取消收费' : '收费设置成功！',
        description:
          priceValue === 0
            ? '小说已设置为免费阅读'
            : `小说收费已设置为 ${priceValue} 码分`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error('设置收费失败:', error);
      toast({
        title: '设置失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs md:text-sm"
        >
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">设置收费</span>
          <span className="sm:hidden">收费</span>
          {currentPrice > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 bg-[#FF5724] text-white text-xs"
            >
              {currentPrice}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#FF5724]" />
            设置小说收费
          </DialogTitle>
          <DialogDescription>
            为您的小说设置阅读收费，读者需要支付码分才能阅读
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 小说信息 */}
          <div className="p-3 rounded-lg border border-[#FF5724]/20">
            <div className="text-sm text-muted-foreground mb-1">小说标题</div>
            <div className="font-medium text-sm sm:text-base line-clamp-2">
              {novelTitle}
            </div>
          </div>

          {/* 当前收费状态 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-muted-foreground">当前状态</span>
            {currentPrice === 0 ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                免费阅读
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-[#FF5724] text-white">
                收费 {currentPrice} 码分
              </Badge>
            )}
          </div>

          {/* 价格设置 */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium">
              收费码分 <span className="text-xs text-muted-foreground">(0表示免费)</span>
            </Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="请输入收费码分数量"
              className="text-base"
            />
            <div className="text-xs text-muted-foreground">
              💡 提示：设置为0表示免费阅读，设置为正整数表示收费阅读
            </div>
          </div>

          {/* 收费说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-blue-900">收费说明</div>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>读者需要支付码分才能阅读收费小说</li>
              <li>每个读者对同一本小说只需购买一次</li>
              <li>购买后可以随时重复阅读</li>
              <li>您可以随时修改或取消收费设置</li>
            </ul>
          </div>
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
            onClick={handleSetPrice}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white order-1 sm:order-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>设置中...</span>
              </div>
            ) : (
              '确认设置'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
