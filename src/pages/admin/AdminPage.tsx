import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, FileText, Megaphone, BarChart3, Loader2, Settings, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { checkIsAdmin, getAdminStats } from '@/db/admin-api';
import type { AdminStats } from '@/types/community';
import PostManagement from './PostManagement';
import UserManagement from './UserManagement';
import AnnouncementManagement from './AnnouncementManagement';
import PromotionManagement from './PromotionManagement';

export default function AdminPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setIsLoading(true);
      const adminStatus = await checkIsAdmin();
      
      if (!adminStatus) {
        toast.error('您没有权限访问管理后台');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await loadStats();
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      toast.error('检查权限失败，请重试');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
      toast.error('加载统计数据失败');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-slate-300">正在验证管理员权限...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-4 md:py-8">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">管理后台</h1>
          </div>
          <p className="text-sm md:text-base text-slate-400">平台管理与数据监控</p>
        </div>

        {/* 主要内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 bg-slate-800/50 border border-slate-700 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white text-white text-xs sm:text-sm"
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">概览</span>
              <span className="sm:hidden">概览</span>
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white text-white text-xs sm:text-sm"
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">帖子管理</span>
              <span className="sm:hidden">帖子</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white text-white text-xs sm:text-sm"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">用户管理</span>
              <span className="sm:hidden">用户</span>
            </TabsTrigger>
            <TabsTrigger 
              value="announcements" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white text-white text-xs sm:text-sm"
            >
              <Megaphone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">公告管理</span>
              <span className="sm:hidden">公告</span>
            </TabsTrigger>
            <TabsTrigger 
              value="promotion" 
              className="data-[state=active]:bg-primary data-[state=active]:text-white text-white text-xs sm:text-sm"
            >
              <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">限免设置</span>
              <span className="sm:hidden">限免</span>
            </TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    用户总数
                  </CardTitle>
                  <CardDescription className="text-slate-400">注册用户数量</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{stats?.total_users || 0}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    今日活跃: {stats?.active_users_today || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-400" />
                    帖子总数
                  </CardTitle>
                  <CardDescription className="text-slate-400">社区帖子数量</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{stats?.total_posts || 0}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-400" />
                    小说总数
                  </CardTitle>
                  <CardDescription className="text-slate-400">创作小说数量</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{stats?.total_novels || 0}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-400" />
                    公告总数
                  </CardTitle>
                  <CardDescription className="text-slate-400">平台公告数量</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-white">{stats?.total_announcements || 0}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/admin/settings')}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-cyan-400" />
                    码分设置
                  </CardTitle>
                  <CardDescription className="text-slate-400">管理码分消耗配置</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full border-slate-600 text-white hover:bg-primary hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/admin/settings');
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    进入设置
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">快速操作</CardTitle>
                <CardDescription className="text-slate-400">常用管理功能</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('posts')}
                  className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
                >
                  <FileText className="h-6 w-6 text-green-400 mb-2" />
                  <h3 className="text-white font-semibold mb-1">管理帖子</h3>
                  <p className="text-sm text-slate-400">查看、置顶、删除帖子</p>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
                >
                  <Users className="h-6 w-6 text-blue-400 mb-2" />
                  <h3 className="text-white font-semibold mb-1">管理用户</h3>
                  <p className="text-sm text-slate-400">查看用户、调整码分</p>
                </button>

                <button
                  onClick={() => setActiveTab('announcements')}
                  className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
                >
                  <Megaphone className="h-6 w-6 text-orange-400 mb-2" />
                  <h3 className="text-white font-semibold mb-1">发布公告</h3>
                  <p className="text-sm text-slate-400">创建、编辑、管理公告</p>
                </button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 帖子管理标签页 */}
          <TabsContent value="posts">
            <PostManagement />
          </TabsContent>

          {/* 用户管理标签页 */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* 公告管理标签页 */}
          <TabsContent value="announcements">
            <AnnouncementManagement onAnnouncementChange={loadStats} />
          </TabsContent>

          {/* 限免设置标签页 */}
          <TabsContent value="promotion">
            <PromotionManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
