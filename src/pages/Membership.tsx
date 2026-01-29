import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  getCurrentUser,
  getUserProfile,
  getCreditTransactions, 
  checkAndGrantMonthlyCredits,
  applyPendingMembership,
  cancelPendingMembership,
  getPromotionSettings
} from '@/db/api';
import { loadMembershipConfigs, CREDITS_TO_CASH_RATIO } from '@/config/membership';
import { MembershipBadge } from '@/components/membership/MembershipBadge';
import { RechargeDialog } from '@/components/membership/RechargeDialog';
import { MembershipUpgradeDialog } from '@/components/membership/MembershipUpgradeDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VipBadge } from '@/components/ui/vip-badge';
import type { CreditTransaction, MembershipLevel, DbUser, MembershipConfig, PromotionSettings } from '@/types/database';
import { 
  Crown, 
  Coins, 
  TrendingUp, 
  Calendar,
  Check,
  History,
  Loader2,
  Wallet,
  Sparkles,
  Wand2,
  Volume2,
  Users,
  RefreshCw,
  X
} from 'lucide-react';

export default function Membership() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<DbUser | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [upgradingLevel, setUpgradingLevel] = useState<MembershipLevel | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [targetUpgradeLevel, setTargetUpgradeLevel] = useState<MembershipLevel | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [membershipConfigs, setMembershipConfigs] = useState<Record<MembershipLevel, MembershipConfig> | null>(null);
  const [promotionSettings, setPromotionSettings] = useState<PromotionSettings | null>(null);
  const upgradeTabsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setInitialLoading(true);
      
      // 加载会员配置
      const configs = await loadMembershipConfigs();
      setMembershipConfigs(configs);
      
      const authUser = await getCurrentUser();
      if (!authUser) {
        navigate('/login');
        return;
      }
      
      const userProfile = await getUserProfile(authUser.id);
      if (!userProfile) {
        navigate('/login');
        return;
      }
      
      setUser(userProfile);

      // 检查并应用待生效的会员等级
      if (userProfile.pending_membership_level && userProfile.pending_membership_effective_date) {
        const effectiveDate = new Date(userProfile.pending_membership_effective_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (effectiveDate <= today) {
          try {
            await applyPendingMembership(userProfile.id);
            // 重新加载用户信息
            const updatedProfile = await getUserProfile(authUser.id);
            if (updatedProfile) {
              setUser(updatedProfile);
              toast({
                title: '会员等级已生效',
                description: `您的${configs[updatedProfile.membership_level].name}已生效`,
              });
            }
          } catch (error) {
            console.error('应用待生效会员等级失败:', error);
          }
        }
      }

      // 检查并发放每月码分
      checkAndGrantMonthlyCredits(userProfile.id).catch(console.error);

      // 加载限免设置
      try {
        const promotion = await getPromotionSettings();
        setPromotionSettings(promotion);
      } catch (error) {
        console.error('加载限免设置失败:', error);
      }

      // 加载交易记录
      loadTransactions(userProfile.id);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      navigate('/login');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadTransactions = async (userId: string) => {
    try {
      setLoading(true);
      const data = await getCreditTransactions(userId, 50);
      setTransactions(data);
    } catch (error) {
      console.error('加载交易记录失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载交易记录，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 格式化限免时间显示
  const formatPromotionTime = () => {
    if (!promotionSettings || !promotionSettings.is_enabled) {
      return '会员专属功能全部限免';
    }

    const now = new Date();
    const startTime = promotionSettings.start_time ? new Date(promotionSettings.start_time) : null;
    const endTime = promotionSettings.end_time ? new Date(promotionSettings.end_time) : null;

    // 检查是否在限免期间
    if (startTime && endTime && now >= startTime && now <= endTime) {
      const endDate = endTime.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const endTimeStr = endTime.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `会员专属功能全部限免（至${endDate} ${endTimeStr}）`;
    }

    return '会员专属功能全部限免';
  };

  const handleUpgrade = (newLevel: MembershipLevel) => {
    if (!user || !membershipConfigs) return;

    // 检查是否已有待生效的会员等级
    if (user.pending_membership_level) {
      toast({
        title: '提示',
        description: `您已有待生效的${membershipConfigs[user.pending_membership_level].name}，请先取消后再升级其他等级`,
        variant: 'default'
      });
      return;
    }

    if (user.membership_level === newLevel) {
      toast({
        title: '提示',
        description: '您已经是该等级会员',
        variant: 'default'
      });
      return;
    }

    // 打开升级支付对话框
    setTargetUpgradeLevel(newLevel);
    setUpgradeDialogOpen(true);
  };

  const handleCancelPending = () => {
    // 打开取消确认对话框
    setCancelConfirmOpen(true);
  };

  const confirmCancelPending = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await cancelPendingMembership(user.id);
      
      toast({
        title: '取消成功',
        description: '已取消待生效的会员等级',
        variant: 'default'
      });
      
      // 刷新用户信息
      await loadUserData();
    } catch (error) {
      console.error('取消待生效会员等级失败:', error);
      toast({
        title: '取消失败',
        description: '取消失败，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setCancelConfirmOpen(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      grant: '发放',
      consume: '消费',
      upgrade: '升级',
      refund: '退款',
      recharge: '充值'
    };
    return typeMap[type] || type;
  };

  // 显示初始加载状态
  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">会员中心</h1>
          <p className="text-muted-foreground">管理您的会员等级和码分</p>
        </div>
        <Card className="flex items-center justify-center py-20">
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">正在加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !membershipConfigs) {
    return null;
  }

  const currentConfig = membershipConfigs[user.membership_level];
  const creditsInYuan = (user.credits / CREDITS_TO_CASH_RATIO).toFixed(2);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">会员中心</h1>
        <p className="text-muted-foreground">管理您的会员等级和码分</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 当前会员信息 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" style={{ color: currentConfig.color }} />
              当前会员
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">等级</span>
              <div className="flex items-center gap-2">
                <MembershipBadge level={user.membership_level} size="md" />
                <span className="font-semibold" style={{ color: currentConfig.color }}>
                  {currentConfig.name}
                </span>
              </div>
            </div>
            
            {/* 待生效的会员等级 */}
            {user.pending_membership_level && user.pending_membership_effective_date && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">待生效等级</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={handleCancelPending}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MembershipBadge level={user.pending_membership_level} size="sm" />
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {membershipConfigs[user.pending_membership_level].name}
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-500">
                    {new Date(user.pending_membership_effective_date).toLocaleDateString('zh-CN')}生效
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                  点击右上角 × 可取消待生效的会员等级
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">码分余额</span>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-lg">{user.credits}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">约合人民币</span>
              <span className="font-semibold text-green-600">¥{creditsInYuan}</span>
            </div>

            {/* 充值按钮 */}
            <div className="pt-2">
              <Button
                onClick={() => setRechargeDialogOpen(true)}
                className="w-full bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724]"
              >
                <Wallet className="w-4 h-4 mr-2" />
                充值码分
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">每月发放</span>
              <span className="font-semibold">{currentConfig.monthlyCredits}码分</span>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold">会员权益</span>
              </div>
              <ul className="space-y-1">
                {currentConfig.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
                {/* 优惠期间额外权益 */}
                <li className="flex items-start gap-2 text-sm text-orange-600 font-semibold">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>{formatPromotionTime()}</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 会员等级卡片 */}
        <div className="lg:col-span-2" ref={upgradeTabsRef}>
          <Tabs defaultValue="upgrade" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upgrade">升级会员</TabsTrigger>
              <TabsTrigger value="history">消费记录</TabsTrigger>
            </TabsList>

            <TabsContent value="upgrade" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.keys(membershipConfigs) as MembershipLevel[]).map((level) => {
                  const config = membershipConfigs[level];
                  const isCurrent = user.membership_level === level;
                  
                  return (
                    <Card 
                      key={level}
                      className={`relative overflow-hidden transition-all ${
                        isCurrent 
                          ? 'ring-2 ring-primary' 
                          : 'hover:shadow-lg hover:border-primary/50'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-0 right-0 px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground">
                          当前等级
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-center mb-2">
                          <MembershipBadge level={level} size="lg" />
                        </div>
                        <CardTitle className="text-center text-lg">
                          {config.name}
                        </CardTitle>
                        <CardDescription className="text-center text-2xl font-bold text-foreground pt-2">
                          {config.monthlyCredits}
                          <span className="text-sm font-normal text-muted-foreground ml-1">码分/月</span>
                        </CardDescription>
                        
                        {/* 价格显示 */}
                        {level !== 'free' && (
                          <div className="text-center pt-2">
                            <div className="flex items-baseline justify-center gap-2">
                              <span className="text-2xl font-bold text-[#FF5724]">¥{config.price}</span>
                              <span className="text-sm text-gray-400 line-through">¥{config.originalPrice}</span>
                            </div>
                            <Badge variant="destructive" className="mt-1">限时优惠</Badge>

                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button
                          className="w-full"
                          variant={isCurrent ? 'default' : 'outline'}
                          disabled={isCurrent || upgradingLevel !== null || level === 'free'}
                          onClick={() => {
                            if (level !== 'free' && !isCurrent && upgradingLevel === null) {
                              handleUpgrade(level);
                            }
                          }}
                        >
                          {upgradingLevel === level ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              处理中...
                            </>
                          ) : isCurrent ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              当前等级
                            </>
                          ) : level === 'free' ? (
                            <>
                              默认等级
                            </>
                          ) : (
                            <>
                              升级到{config.name}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* 会员说明 */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">会员说明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">每月自动发放码分</h4>
                      <p className="text-sm text-muted-foreground">
                        每月1号自动发放对应等级的码分到您的账户，无需手动领取
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Coins className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">码分使用说明</h4>
                      <p className="text-sm text-muted-foreground">
                        1码分 = 0.01元人民币，可用于使用平台所有AI功能，包括小说生成、角色创建、音频生成等
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">升级生效时间</h4>
                      <p className="text-sm text-muted-foreground">
                        升级会员后将于下月1号生效，当月仍保持原等级。升级后立即享受对应等级的每月码分发放
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    消费记录
                  </CardTitle>
                  <CardDescription>
                    查看您的码分消费和获取记录
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        加载中...
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无交易记录
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={transaction.amount > 0 ? 'default' : 'secondary'}>
                                  {getTransactionTypeText(transaction.transaction_type)}
                                </Badge>
                                {transaction.feature_name && (
                                  <span className="text-sm font-medium">
                                    {transaction.feature_name}
                                  </span>
                                )}
                              </div>
                              {transaction.description && (
                                <p className="text-xs text-muted-foreground">
                                  {transaction.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(transaction.created_at)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-right ml-4">
                              <div className={`text-lg font-bold ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                余额: {transaction.balance_after}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {/* 会员专属功能 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            会员专属功能
          </CardTitle>
          <CardDescription>
            升级会员后即可使用以下AI智能功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 小说生成功能 */}
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">随机生成情节</h3>
                    <p className="text-xs text-muted-foreground">首页小说生成</p>
                  </div>
                </div>
                <VipBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                AI自动生成创意情节，激发创作灵感
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wand2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">优化情节描述</h3>
                    <p className="text-xs text-muted-foreground">首页小说生成</p>
                  </div>
                </div>
                <VipBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                AI优化用户输入的情节，提升表达质量
              </p>
            </div>

            {/* 音频生成功能 */}
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Volume2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">生成音频</h3>
                    <p className="text-xs text-muted-foreground">作品详情页</p>
                  </div>
                </div>
                <VipBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                将小说章节转换为语音音频，随时收听
              </p>
            </div>

            {/* 角色生成功能 */}
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">从章节中选择角色</h3>
                    <p className="text-xs text-muted-foreground">角色生成页面</p>
                  </div>
                </div>
                <VipBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                AI自动从章节中提取角色信息，快速创建
              </p>
            </div>

            {/* 智能写作辅助 */}
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wand2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">扩写</h3>
                    <p className="text-xs text-muted-foreground">作品编辑页面</p>
                  </div>
                </div>
                <VipBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                AI扩展选中的文字内容，丰富情节细节
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">润色</h3>
                    <p className="text-xs text-muted-foreground">作品编辑页面</p>
                  </div>
                </div>
                <VipBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                AI优化选中的文字表达，提升文学性
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">改写</h3>
                    <p className="text-xs text-muted-foreground">作品编辑页面</p>
                  </div>
                </div>
                <VipBadge size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                AI重新改写选中的文字，提供新的表达方式
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">升级会员，解锁全部AI功能</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  会员专属功能由先进的AI技术驱动，帮助您更高效地创作优质内容
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    // 切换到升级会员选项卡
                    const upgradeTab = document.querySelector('[value="upgrade"]') as HTMLElement;
                    if (upgradeTab) {
                      upgradeTab.click();
                    }
                    
                    // 滚动到升级会员区域
                    if (upgradeTabsRef.current) {
                      const yOffset = -20; // 顶部偏移量，避免被header遮挡
                      const y = upgradeTabsRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  立即升级会员
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 说明信息 */}
      {/* 充值对话框 */}
      {user && (
        <RechargeDialog
          open={rechargeDialogOpen}
          onOpenChange={setRechargeDialogOpen}
          userId={user.id}
          onSuccess={loadUserData}
        />
      )}
      {/* 会员升级支付对话框 */}
      {user && targetUpgradeLevel && (
        <MembershipUpgradeDialog
          open={upgradeDialogOpen}
          onOpenChange={setUpgradeDialogOpen}
          userId={user.id}
          currentLevel={user.membership_level}
          targetLevel={targetUpgradeLevel}
          onSuccess={loadUserData}
        />
      )}
      {/* 取消待生效会员确认对话框 */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消待生效会员等级？</AlertDialogTitle>
            <AlertDialogDescription>
              取消后，您的待生效会员等级将被清除，下月将继续使用当前会员等级。此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>我再想想</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelPending} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  取消中...
                </>
              ) : (
                '确认取消'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
