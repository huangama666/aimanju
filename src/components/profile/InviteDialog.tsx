import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Copy, Users, Gift, Share2 } from 'lucide-react';
import { getUserInviteCode, getInviteStats } from '@/db/invite-api';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export default function InviteDialog({ open, onOpenChange, userId }: InviteDialogProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [stats, setStats] = useState({
    totalInvites: 0,
    totalRewards: 0,
    inviteRecords: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      loadInviteData();
    }
  }, [open, userId]);

  const loadInviteData = async () => {
    try {
      setLoading(true);
      
      // 获取邀请码
      const code = await getUserInviteCode(userId);
      if (code) {
        setInviteCode(code);
        // 生成邀请链接
        const link = `${window.location.origin}/?invite=${code}`;
        setInviteLink(link);
      }
      
      // 获取邀请统计
      const inviteStats = await getInviteStats(userId);
      setStats(inviteStats);
    } catch (error) {
      console.error('加载邀请数据失败:', error);
      toast.error('加载邀请数据失败');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('邀请码已复制到剪贴板');
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('邀请链接已复制到剪贴板');
  };

  const shareToSocial = () => {
    const text = `快来加入码上制片厂，一起创作精彩小说！使用我的邀请码 ${inviteCode} 注册，你将获得100码分，我也能获得50码分奖励！`;
    const shareData = {
      title: '邀请你加入码上制片厂',
      text: text,
      url: inviteLink
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        // 如果分享失败，复制文本
        navigator.clipboard.writeText(`${text}\n${inviteLink}`);
        toast.success('邀请信息已复制到剪贴板');
      });
    } else {
      // 不支持分享API，复制文本
      navigator.clipboard.writeText(`${text}\n${inviteLink}`);
      toast.success('邀请信息已复制到剪贴板');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#FF5724]">
            <Users className="h-5 w-5" />
            邀请好友
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5724]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 邀请统计 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-orange-50 to-red-50">
                <CardContent className="pt-6 ml-[20px] mb-[20px]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Users className="h-6 w-6 text-[#FF5724]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">已邀人数</p>
                      <p className="text-2xl font-bold text-[#FF5724]">{stats.totalInvites}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
                <CardContent className="pt-6 ml-[20px] mb-[20px]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Gift className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">奖励码分</p>
                      <p className="text-2xl font-bold text-orange-600">0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* 邀请码 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">我的邀请码</h3>
              <div className="flex gap-2">
                <Input
                  value={inviteCode}
                  readOnly
                  className="font-mono text-lg font-bold text-center"
                />
                <Button onClick={copyInviteCode} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 邀请链接 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">邀请链接</h3>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="text-sm"
                />
                <Button onClick={copyInviteLink} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 分享按钮 */}
            <Button 
              onClick={shareToSocial} 
              className="w-full bg-[#FF5724] hover:bg-[#E64A1F]"
            >
              <Share2 className="h-4 w-4 mr-2" />
              分享邀请
            </Button>

            <Separator />

            {/* 邀请规则 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">邀请规则</h3>
              <div className="bg-orange-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <Gift className="h-4 w-4 text-[#FF5724] mt-0.5 flex-shrink-0" />
                  <span>新用户使用你的邀请码注册，你将获得 <strong className="text-[#FF5724]">50码分</strong> 奖励</span>
                </p>
                <p className="flex items-start gap-2">
                  <Gift className="h-4 w-4 text-[#FF5724] mt-0.5 flex-shrink-0" />
                  <span>新用户注册成功后将获得 <strong className="text-[#FF5724]">100码分</strong> 注册奖励</span>
                </p>
                <p className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-[#FF5724] mt-0.5 flex-shrink-0" />
                  <span>邀请人数不限，每成功邀请一人即可获得奖励</span>
                </p>
                <p className="flex items-start gap-2 text-gray-600">
                  <span className="text-[#FF5724] mt-0.5 flex-shrink-0">⚠️</span>
                  <span>同一设备或IP地址的重复注册不计入有效邀请</span>
                </p>
              </div>
            </div>

            {/* 邀请记录 */}
            {stats.inviteRecords.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">邀请记录</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {stats.inviteRecords.map((record: any) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-[#FF5724]" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{record.invitee?.nickname || '用户'}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(record.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#FF5724]">+50 码分</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
