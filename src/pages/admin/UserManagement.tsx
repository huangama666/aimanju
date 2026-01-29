import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Coins, Loader2, Shield, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { getAllUsers, searchUsers, updateUserScore } from '@/db/admin-api';
import { MembershipBadge } from '@/components/membership/MembershipBadge';
import { membershipConfig } from '@/config/membership';
import { supabase } from '@/db/supabase';
import type { UserWithAdmin } from '@/types/community';
import type { MembershipLevel } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithAdmin | null>(null);
  const [scoreChange, setScoreChange] = useState('');
  const [scoreReason, setScoreReason] = useState('');
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<MembershipLevel>('free');
  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('加载用户失败:', error);
      toast.error('加载用户失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const data = await searchUsers(searchKeyword);
      setUsers(data);
    } catch (error) {
      console.error('搜索用户失败:', error);
      toast.error('搜索用户失败');
    } finally {
      setIsSearching(false);
    }
  };

  const handleScoreClick = (user: UserWithAdmin) => {
    setSelectedUser(user);
    setScoreChange('');
    setScoreReason('');
    setScoreDialogOpen(true);
  };

  const handleScoreUpdate = async () => {
    if (!selectedUser) return;

    const change = Number.parseInt(scoreChange);
    if (Number.isNaN(change) || change === 0) {
      toast.error('请输入有效的积分变动值');
      return;
    }

    if (!scoreReason.trim()) {
      toast.error('请输入操作原因');
      return;
    }

    try {
      setIsUpdatingScore(true);
      await updateUserScore(selectedUser.id, change, scoreReason);
      toast.success('积分更新成功');
      setScoreDialogOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('更新积分失败:', error);
      toast.error('更新积分失败');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const handleMembershipClick = (user: UserWithAdmin) => {
    setSelectedUser(user);
    setSelectedMembership((user.membership_level as MembershipLevel) || 'free');
    setMembershipDialogOpen(true);
  };

  const handleMembershipUpdate = async () => {
    if (!selectedUser) return;

    try {
      setIsUpdatingMembership(true);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          membership_level: selectedMembership,
          credits: membershipConfig[selectedMembership].monthlyCredits
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('会员等级更新成功');
      setMembershipDialogOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('更新会员等级失败:', error);
      toast.error('更新会员等级失败');
    } finally {
      setIsUpdatingMembership(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">用户管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索栏 */}
          <div className="flex gap-2">
            <Input
              placeholder="搜索用户昵称或手机号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-primary hover:bg-primary/90"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  搜索
                </>
              )}
            </Button>
            {searchKeyword && (
              <Button
                onClick={() => {
                  setSearchKeyword('');
                  loadUsers();
                }}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                清除
              </Button>
            )}
          </div>

          {/* 用户列表 */}
          <div className="rounded-md border border-slate-700 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-700/50 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300">昵称</TableHead>
                  <TableHead className="text-slate-300">手机号</TableHead>
                  <TableHead className="text-slate-300 text-center">角色</TableHead>
                  <TableHead className="text-slate-300 text-center">会员等级</TableHead>
                  <TableHead className="text-slate-300 text-center">码分</TableHead>
                  <TableHead className="text-slate-300">注册时间</TableHead>
                  <TableHead className="text-slate-300 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                      暂无用户数据
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.nickname}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-sm">
                              {user.nickname.charAt(0)}
                            </div>
                          )}
                          <span className="max-xl:hidden">{user.nickname}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 max-xl:hidden">
                        {user.phone || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.is_admin ? (
                          <Badge variant="destructive" className="bg-orange-500">
                            <Shield className="h-3 w-3 mr-1" />
                            <span className="max-xl:hidden">管理员</span>
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <span className="max-xl:hidden">普通用户</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <MembershipBadge 
                            level={(user.membership_level as MembershipLevel) || 'free'} 
                            size="sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-yellow-400 font-semibold">
                          <Coins className="h-4 w-4" />
                          {user.credits || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm max-xl:hidden">
                        {formatDistanceToNow(new Date(user.created_at), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMembershipClick(user)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <Crown className="h-3 w-3 xl:mr-1" />
                            <span className="max-xl:hidden">会员</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScoreClick(user)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <Coins className="h-3 w-3 xl:mr-1" />
                            <span className="max-xl:hidden">积分</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 统计信息 */}
          <div className="text-sm text-slate-400">
            共 {users.length} 位用户
          </div>
        </CardContent>
      </Card>

      {/* 积分调整对话框 */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">调整用户积分</DialogTitle>
            <DialogDescription className="text-slate-400">
              为用户「{selectedUser?.nickname}」调整码分
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-score" className="text-slate-300">
                当前码分
              </Label>
              <div className="flex items-center gap-2 text-yellow-400 font-semibold text-lg">
                <Coins className="h-5 w-5" />
                {selectedUser?.score || 0}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="score-change" className="text-slate-300">
                积分变动 *
              </Label>
              <Input
                id="score-change"
                type="number"
                placeholder="输入正数增加，负数减少"
                value={scoreChange}
                onChange={(e) => setScoreChange(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400">
                例如：输入 10 增加10码分，输入 -5 减少5码分
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="score-reason" className="text-slate-300">
                操作原因 *
              </Label>
              <Input
                id="score-reason"
                placeholder="请输入调整原因"
                value={scoreReason}
                onChange={(e) => setScoreReason(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            {scoreChange && (
              <div className="p-3 bg-slate-700/50 rounded-md">
                <p className="text-sm text-slate-300">
                  调整后码分：
                  <span className="text-yellow-400 font-semibold ml-2">
                    {Math.max(0, (selectedUser?.score || 0) + Number.parseInt(scoreChange || '0'))}
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScoreDialogOpen(false)}
              className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
            >
              取消
            </Button>
            <Button
              onClick={handleScoreUpdate}
              disabled={isUpdatingScore}
              className="bg-primary hover:bg-primary/90"
            >
              {isUpdatingScore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                '确认更新'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 会员管理对话框 */}
      <Dialog open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>管理会员等级</DialogTitle>
            <DialogDescription className="text-slate-400">
              为用户 {selectedUser?.nickname} 设置会员等级
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="membership" className="text-slate-300">
                选择会员等级
              </Label>
              <Select
                value={selectedMembership}
                onValueChange={(value) => setSelectedMembership(value as MembershipLevel)}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      <MembershipBadge level="free" size="sm" />
                      <span>{membershipConfig.free.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({membershipConfig.free.monthlyCredits}码分/月)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <MembershipBadge level="basic" size="sm" />
                      <span>{membershipConfig.basic.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({membershipConfig.basic.monthlyCredits}码分/月)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="intermediate">
                    <div className="flex items-center gap-2">
                      <MembershipBadge level="intermediate" size="sm" />
                      <span>{membershipConfig.intermediate.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({membershipConfig.intermediate.monthlyCredits}码分/月)
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div className="flex items-center gap-2">
                      <MembershipBadge level="premium" size="sm" />
                      <span>{membershipConfig.premium.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({membershipConfig.premium.monthlyCredits}码分/月)
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg space-y-2">
              <p className="text-sm text-slate-300">
                <strong>当前等级：</strong>
                {membershipConfig[(selectedUser?.membership_level as MembershipLevel) || 'free'].name}
              </p>
              <p className="text-sm text-slate-300">
                <strong>新等级：</strong>
                {membershipConfig[selectedMembership].name}
              </p>
              <p className="text-sm text-slate-400">
                更新后将自动设置码分为 {membershipConfig[selectedMembership].monthlyCredits}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMembershipDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              取消
            </Button>
            <Button
              onClick={handleMembershipUpdate}
              disabled={isUpdatingMembership}
              className="bg-primary hover:bg-primary/90"
            >
              {isUpdatingMembership ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                '确认更新'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
