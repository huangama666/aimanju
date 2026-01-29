import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Gift, TrendingUp, Sparkles, HelpCircle, Plus, Minus } from 'lucide-react';
import { checkTodayCheckin, userCheckin, getUserScore } from '@/db/score-api';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/db/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CheckinCardProps {
  userId: string;
  onScoreUpdate?: (newScore: number) => void;
}

/**
 * 签到卡片组件
 * 支持每日签到、显示连续签到天数、码分统计
 * 响应式设计，完美适配PC、平板、手机等各种设备
 */
export default function CheckinCard({ userId, onScoreUpdate }: CheckinCardProps) {
  const { toast } = useToast();
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userScore, setUserScore] = useState(0);
  const [consecutiveDays, setConsecutiveDays] = useState(0);

  // 加载签到状态和用户信息
  useEffect(() => {
    loadCheckinStatus();
  }, [userId]);

  const loadCheckinStatus = async () => {
    try {
      setChecking(true);
      
      // 检查今日签到状态
      const checkedIn = await checkTodayCheckin(userId);
      setHasCheckedIn(checkedIn);

      // 获取用户码分和连续签到天数
      const { data: userData, error } = await supabase
        .from('users')
        .select('credits, consecutive_checkin_days')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      setUserScore(userData?.credits || 0);
      setConsecutiveDays(userData?.consecutive_checkin_days || 0);
    } catch (error) {
      console.error('加载签到状态失败:', error);
    } finally {
      setChecking(false);
    }
  };

  // 处理签到
  const handleCheckin = async () => {
    try {
      setLoading(true);

      const result = await userCheckin(userId);

      setHasCheckedIn(true);
      setUserScore(result.score);
      setConsecutiveDays(result.consecutiveDays);

      // 通知父组件码分更新
      if (onScoreUpdate) {
        onScoreUpdate(result.score);
      }

      // 显示成功提示
      toast({
        title: '签到成功！🎉',
        description: (
          <div className="space-y-1">
            <p>恭喜你获得 <span className="font-bold text-[#FF5724]">+1 码分</span></p>
            <p>当前码分：<span className="font-bold">{result.score}</span></p>
            <p>连续签到：<span className="font-bold">{result.consecutiveDays}</span> 天</p>
          </div>
        ),
      });
    } catch (error: any) {
      console.error('签到失败:', error);
      toast({
        title: '签到失败',
        description: error.message || '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Card className="border-[#FF5724]/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF5724]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#FF5724]/30 shadow-lg">
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {/* 标题和码分显示 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FF5724]/10 rounded-lg">
                <Calendar className="h-5 w-5 text-[#FF5724]" />
              </div>
              <div>
                <h3 className="font-bold text-lg">每日签到</h3>
                <p className="text-xs text-muted-foreground">坚持签到，积累码分</p>
              </div>
            </div>

            {/* 码分显示 */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-[#FF5724]/20">
              <Sparkles className="h-4 w-4 text-[#FF5724]" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground">我的码分</div>
                <div className="text-xl font-bold text-[#FF5724]">{userScore}</div>
              </div>
              
              {/* 积分赚取说明按钮 */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-[#FF5724]/10"
                  >
                    <HelpCircle className="h-4 w-4 text-[#FF5724]" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#FF5724] flex items-center gap-2">
                      <Sparkles className="h-6 w-6" />
                      积分赚取说明
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      了解如何获取和使用码分
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* 积分获取方式 */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-green-600 flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        积分获取方式
                      </h3>
                      <div className="space-y-3 bg-green-50 p-4 rounded-lg">
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Gift className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">注册奖励</h4>
                              <span className="text-lg font-bold text-green-600">+100码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">新用户注册成功后自动获得（仅限首次注册）</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">邀请奖励</h4>
                              <span className="text-lg font-bold text-green-600">+50码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">每成功邀请一个用户注册并完成首次登录</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">每日签到</h4>
                              <span className="text-lg font-bold text-green-600">+1码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">每天签到可获得1码分</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">分享小说</h4>
                              <span className="text-lg font-bold text-green-600">+1码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">分享小说到社区可获得1码分（重复分享同一篇小说不会重复增加码分）</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Gift className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">发表帖子</h4>
                              <span className="text-lg font-bold text-green-600">+1码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">每天第一次发表帖子可获得1码分（当天后续发帖不会再增加码分）</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 积分扣除方式 */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                        <Minus className="h-5 w-5" />
                        积分扣除方式
                      </h3>
                      <div className="space-y-3 bg-red-50 p-4 rounded-lg">
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Minus className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">删除帖子</h4>
                              <span className="text-lg font-bold text-red-600">-对应码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">删除帖子会扣除对应获得的码分</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Minus className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">删除分享</h4>
                              <span className="text-lg font-bold text-red-600">-对应码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">删除小说分享会扣除对应获得的码分</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
                          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-base">购买收费小说</h4>
                              <span className="text-lg font-bold text-red-600">-相应码分</span>
                            </div>
                            <p className="text-sm text-muted-foreground">根据小说设置的收费标准扣除相应码分</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 温馨提示 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        温馨提示
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 码分可用于购买收费小说、兑换现金等</li>
                        <li>• 每日签到、发帖、分享等操作都有次数限制，请合理使用</li>
                        <li>• 邀请好友注册是快速获取码分的好方法</li>
                        <li>• 删除内容会扣除对应码分，请谨慎操作</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* 签到信息 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 连续签到天数 */}
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-[#FF5724]/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">连续签到</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{consecutiveDays}</div>
              <div className="text-xs text-muted-foreground">天</div>
            </div>

            {/* 今日奖励 */}
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-[#FF5724]/10">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-pink-500" />
                <span className="text-xs text-muted-foreground">今日奖励</span>
              </div>
              <div className="text-2xl font-bold text-pink-600">+1</div>
              <div className="text-xs text-muted-foreground">码分</div>
            </div>
          </div>

          {/* 签到按钮 */}
          <div className="pt-2">
            {hasCheckedIn ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 rounded-lg">
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  ✓ 今日已签到
                </Badge>
                <span className="text-sm text-muted-foreground">明天再来吧~</span>
              </div>
            ) : (
              <Button
                onClick={handleCheckin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white font-bold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>签到中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    <span>立即签到</span>
                    <span className="text-sm opacity-90">(+1 码分)</span>
                  </div>
                )}
              </Button>
            )}
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-center text-muted-foreground bg-white/40 backdrop-blur-sm p-2 rounded-lg">💡 邀请用户、发帖、创作、分享作品到社区均可获取码分</div>
        </div>
      </CardContent>
    </Card>
  );
}
