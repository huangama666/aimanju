import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getCurrentUser, getUserProfile, getUserNovels, signOut, deleteNovel } from "@/db/api";
import { shareNovel, checkNovelShared, unshareNovel, getUserPosts, deletePost } from "@/db/community-api";
import { handleShareNovelScore, handleDeleteShareScore } from "@/db/score-api";
import type { DbUser, DbNovel } from "@/types/database";
import type { Post } from "@/types/community";
import { BookOpen, LogOut, User, Share2, Camera, Edit2, Trash2, MessageSquare, ThumbsUp, Eye, Pin, Star, Sparkles, Users, PenSquare } from "lucide-react";
import AvatarEditDialog from "@/components/profile/AvatarEditDialog";
import NicknameEditDialog from "@/components/profile/NicknameEditDialog";
import NovelPricingDialog from "@/components/community/NovelPricingDialog";
import ExchangeScoreDialog from "@/components/community/ExchangeScoreDialog";
import InviteDialog from "@/components/profile/InviteDialog";
import NovelExportButton from "@/components/profile/NovelExportButton";
import BatchExportButton from "@/components/profile/BatchExportButton";
import { getNovelGenreLabel } from "@/utils/novel-type-mapper";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<DbUser | null>(null);
  const [novels, setNovels] = useState<DbNovel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedNovel, setSelectedNovel] = useState<DbNovel | null>(null);
  const [shareDescription, setShareDescription] = useState('');
  const [sharedNovels, setSharedNovels] = useState<Set<string>>(new Set());
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // 获取当前用户
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast.error("请先登录");
        navigate("/");
        return;
      }

      // 获取用户信息
      const userProfile = await getUserProfile(currentUser.id);
      if (userProfile) {
        setUser(userProfile);
      }

      // 获取用户的小说列表
      const userNovels = await getUserNovels(currentUser.id);
      setNovels(userNovels);

      // 获取用户的帖子列表
      const userPosts = await getUserPosts(currentUser.id);
      setPosts(userPosts);

      // 检查哪些小说已分享
      const shared = new Set<string>();
      for (const novel of userNovels) {
        const isShared = await checkNovelShared(novel.id);
        if (isShared) {
          shared.add(novel.id);
        }
      }
      setSharedNovels(shared);
    } catch (error) {
      console.error("加载用户数据失败:", error);
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("已退出登录");
      navigate("/");
    } catch (error) {
      console.error("退出登录失败:", error);
      toast.error("退出登录失败");
    }
  };

  const handleViewNovel = (novelId: string) => {
    navigate(`/novel/${novelId}`);
  };

  const handleShareNovel = (novel: DbNovel) => {
    setSelectedNovel(novel);
    setShareDescription('');
    setShareDialogOpen(true);
  };

  const handleConfirmShare = async () => {
    if (!selectedNovel || !user) return;

    try {
      // 分享小说
      const shareResult = await shareNovel({
        novel_id: selectedNovel.id,
        share_description: shareDescription.trim() || undefined,
      });

      // 处理码分奖励
      try {
        const scoreResult = await handleShareNovelScore(
          user.id,
          selectedNovel.id,
          shareResult.id
        );

        if (scoreResult.scoreEarned) {
          // 更新用户码分
          setUser({ ...user, score: scoreResult.newScore });
          toast.success(`分享成功！获得 +1 码分，当前码分：${scoreResult.newScore}`);
        } else {
          toast.success('分享成功！（该小说已分享过，不重复获得码分）');
        }
      } catch (scoreError) {
        console.error('处理码分奖励失败:', scoreError);
        toast.success('分享成功！');
      }

      setShareDialogOpen(false);
      setSelectedNovel(null);
      setShareDescription('');
      // 更新分享状态
      setSharedNovels(prev => new Set(prev).add(selectedNovel.id));
    } catch (error: any) {
      console.error('分享失败:', error);
      toast.error(error.message || '分享失败');
    }
  };

  const handleUnshareNovel = async (novelId: string) => {
    if (!confirm('确定要取消分享这部小说吗？取消分享将扣除相应码分。')) return;

    if (!user) return;

    try {
      // 获取分享记录ID
      const { data: shareData } = await import('@/db/supabase').then(m => m.supabase
        .from('novel_shares')
        .select('id')
        .eq('novel_id', novelId)
        .maybeSingle()
      );

      // 取消分享
      await unshareNovel(novelId);

      // 处理码分扣除
      if (shareData?.id) {
        try {
          const scoreResult = await handleDeleteShareScore(user.id, shareData.id);
          if (scoreResult.scoreDeducted) {
            // 更新用户码分
            setUser({ ...user, score: scoreResult.newScore });
            toast.success(`已取消分享，扣除 1 码分，当前码分：${scoreResult.newScore}`);
          } else {
            toast.success('已取消分享');
          }
        } catch (scoreError) {
          console.error('处理码分扣除失败:', scoreError);
          toast.success('已取消分享');
        }
      } else {
        toast.success('已取消分享');
      }

      // 更新分享状态
      setSharedNovels(prev => {
        const newSet = new Set(prev);
        newSet.delete(novelId);
        return newSet;
      });
    } catch (error) {
      console.error('取消分享失败:', error);
      toast.error('取消分享失败');
    }
  };

  // 头像更新回调
  const handleAvatarUpdated = (newAvatarUrl: string) => {
    if (user) {
      setUser({ ...user, avatar_url: newAvatarUrl });
    }
  };

  // 昵称更新回调
  const handleNicknameUpdated = (newNickname: string) => {
    if (user) {
      setUser({ ...user, nickname: newNickname });
    }
  };

  // 删除小说
  const handleDeleteNovel = async (novelId: string, novelTitle: string) => {
    if (!confirm(`确定要删除小说《${novelTitle}》吗？此操作不可恢复。`)) return;

    try {
      await deleteNovel(novelId);
      toast.success('小说已删除');
      // 更新小说列表
      setNovels(prev => prev.filter(n => n.id !== novelId));
      // 更新分享状态
      setSharedNovels(prev => {
        const newSet = new Set(prev);
        newSet.delete(novelId);
        return newSet;
      });
    } catch (error) {
      console.error('删除小说失败:', error);
      toast.error('删除小说失败');
    }
  };

  // 删除帖子
  const handleDeletePost = async (postId: string) => {
    if (!confirm('确定要删除这个帖子吗？此操作不可恢复。')) return;

    try {
      await deletePost(postId);
      toast.success('帖子已删除');
      // 更新帖子列表
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('删除帖子失败:', error);
      toast.error('删除帖子失败');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 获取分类标签
  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'plot_analysis': '剧情分析',
      'character_discussion': '角色厨',
      'update_request': '催更专区',
      'writing_tips': '写作探讨',
      'book_recommendation': '新书推介',
      'help': '书荒互助',
      'urban': '都市言情区',
      'fantasy': '玄幻仙侠区',
      'fanfic': '同人创作区',
      'author': '作者专区',
    };
    return categories[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 md:py-8 max-[729px]:pb-20">
      <div className="container max-w-6xl mx-auto px-4">
        {/* 用户信息卡片 */}

        {/* 我的码分卡片 */}
        <div className="mb-4 md:mb-8">
          <Card className="border-[#FF5724]/30">
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-[#FF5724]/10 rounded-lg flex-shrink-0">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-[#FF5724]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardDescription className="text-xs md:text-sm font-medium">我的码分</CardDescription>
                      <CardTitle className="text-2xl md:text-3xl text-[#FF5724]">
                        {user?.credits || 0}
                      </CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      通过签到、分享、发帖赚取码分
                    </p>
                  </div>
                </div>
                {user && (
                  <div className="flex-shrink-0 flex gap-2">
                    <Button
                      onClick={() => setInviteDialogOpen(true)}
                      variant="outline"
                      size="sm"
                      style={{ height: '2.9rem' }}
                      className="border-[#FF5724] bg-[#FF5724] text-white"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      邀请好友
                    </Button>
                    <ExchangeScoreDialog
                      userId={user.id}
                      onExchangeSuccess={(newScore) => {
                        setUser({ ...user, score: newScore });
                      }}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-8">
          <Card>
            <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
              <CardDescription className="text-xs md:text-sm">创作的小说</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{novels.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
              <CardDescription className="text-xs md:text-sm">发布的帖子</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{posts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
              <CardDescription className="text-xs md:text-sm">总章节数</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">
                {novels.reduce((sum, novel) => sum + (novel.chapters_data?.length || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
              <CardDescription className="text-xs md:text-sm">总角色数</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">
                {novels.reduce((sum, novel) => sum + (novel.characters_data?.length || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
              <CardDescription className="text-xs md:text-sm">总剧本数</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">
                {novels.reduce((sum, novel) => sum + (novel.scripts_data?.length || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 作品和帖子列表 */}
        <Tabs defaultValue="novels" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6">
            <TabsTrigger value="novels" className="flex items-center gap-2 text-xs md:text-sm">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              我的作品 ({novels.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2 text-xs md:text-sm">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
              我的帖子 ({posts.length})
            </TabsTrigger>
          </TabsList>

          {/* 作品列表 */}
          <TabsContent value="novels">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                      我的作品
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm mt-1.5">
                      您创作的所有小说作品
                    </CardDescription>
                  </div>
                  {novels.length > 0 && (
                    <BatchExportButton novels={novels} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {novels.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <BookOpen className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 text-sm md:text-base">还没有创作任何作品</p>
                    <Button onClick={() => navigate("/")} size="sm" className="md:text-base">
                      开始创作
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {novels.map((novel, index) => (
                      <div key={novel.id}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
                          {/* 封面 */}
                          <div className="flex-shrink-0 w-full md:w-auto">
                            {novel.novel_thumb ? (
                              <img
                                src={novel.novel_thumb}
                                alt={novel.novel_title}
                                className="w-full md:w-24 h-48 md:h-32 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full md:w-24 h-48 md:h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                                <BookOpen className="h-12 w-12 md:h-8 md:w-8 text-white" />
                              </div>
                            )}
                          </div>

                          {/* 信息 */}
                          <div className="flex-1 min-w-0 w-full">
                            <h3 className="text-lg md:text-xl font-bold mb-2">{novel.novel_title}</h3>
                            <p className="text-muted-foreground text-xs md:text-sm mb-2 line-clamp-2">
                              {novel.novel_content || "暂无简介"}
                            </p>
                            <div className="mb-2">
                              <span className="inline-flex items-center px-2 py-0.5 md:px-2.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                📚 {getNovelGenreLabel(novel.novel_type)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mb-3">
                              <span>📖 {novel.chapters_data?.length || 0} 章节</span>
                              <span>👥 {novel.characters_data?.length || 0} 角色</span>
                              <span>🎬 {novel.panels_data?.length || 0} 分镜</span>
                              <span>📝 {novel.scripts_data?.length || 0} 剧本</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleViewNovel(novel.id)}
                                className="text-xs md:text-sm"
                              >
                                查看详情
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/novel/${novel.id}/edit`)}
                                className="text-xs md:text-sm"
                              >
                                <PenSquare className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                编辑作品
                              </Button>
                              {sharedNovels.has(novel.id) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUnshareNovel(novel.id)}
                                  className="text-xs md:text-sm"
                                >
                                  <Share2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                  已分享
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShareNovel(novel)}
                                  className="text-xs md:text-sm"
                                >
                                  <Share2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                  分享到社区
                                </Button>
                              )}
                              <NovelPricingDialog
                                novelId={novel.id}
                                novelTitle={novel.novel_title}
                                currentPrice={novel.price || 0}
                                onPriceUpdated={(newPrice) => {
                                  // 更新本地小说价格
                                  setNovels(novels.map(n => 
                                    n.id === novel.id ? { ...n, price: newPrice } : n
                                  ));
                                }}
                              />
                              <NovelExportButton 
                                novel={novel}
                                variant="outline"
                                size="sm"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteNovel(novel.id, novel.novel_title)}
                                className="text-xs md:text-sm"
                              >
                                <Trash2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                删除
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 帖子列表 */}
          <TabsContent value="posts">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                  我的帖子
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  您在社区发布的所有帖子
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {posts.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <MessageSquare className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 text-sm md:text-base">还没有发布任何帖子</p>
                    <Button onClick={() => navigate("/community")} size="sm" className="md:text-base">
                      前往社区
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post, index) => (
                      <div key={post.id}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="space-y-3">
                          {/* 帖子头部 */}
                          <div className="flex items-start justify-between gap-2 md:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 md:gap-2 mb-2 flex-wrap">
                                {post.is_pinned && (
                                  <Badge variant="secondary" className="gap-1 text-xs">
                                    <Pin className="h-2 w-2 md:h-3 md:w-3" />
                                    置顶
                                  </Badge>
                                )}
                                {post.is_featured && (
                                  <Badge variant="default" className="gap-1 text-xs">
                                    <Star className="h-2 w-2 md:h-3 md:w-3" />
                                    精选
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryLabel(post.category)}
                                </Badge>
                              </div>
                              <h3 
                                className="text-base md:text-lg font-bold mb-2 cursor-pointer hover:text-primary transition-colors line-clamp-2"
                                onClick={() => navigate(`/community/post/${post.id}`)}
                              >
                                {post.title}
                              </h3>
                              <p className="text-muted-foreground text-xs md:text-sm line-clamp-2 mb-2">
                                {post.content}
                              </p>
                            </div>
                          </div>

                          {/* 关联小说 */}
                          {post.novel && (
                            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/50 rounded-lg">
                              {(post.novel as any).novel_thumb && (
                                <img
                                  src={(post.novel as any).novel_thumb}
                                  alt={post.novel.novel_title}
                                  className="w-10 h-14 md:w-12 md:h-16 object-cover rounded flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs md:text-sm font-medium line-clamp-1">
                                  📚 {post.novel.novel_title}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 帖子底部信息 */}
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                <span>{post.views_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3 md:h-4 md:w-4" />
                                <span>{post.likes_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                                <span>{post.comments_count || 0}</span>
                              </div>
                              <span>{formatDate(post.created_at)}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/community/post/${post.id}`)}
                                className="flex-1 md:flex-none text-xs md:text-sm"
                              >
                                查看详情
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeletePost(post.id)}
                                className="flex-1 md:flex-none text-xs md:text-sm"
                              >
                                <Trash2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                                删除
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* 分享对话框 */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">分享小说到社区</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs md:text-sm">小说标题</Label>
              <p className="text-xs md:text-sm font-medium mt-1">{selectedNovel?.novel_title}</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="share-description" className="text-xs md:text-sm">分享描述（可选）</Label>
                <span className={`text-xs ${shareDescription.length > 30 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {shareDescription.length}/30
                </span>
              </div>
              <Textarea
                id="share-description"
                placeholder="说说你为什么推荐这部小说..."
                rows={4}
                value={shareDescription}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 30) {
                    setShareDescription(value);
                  }
                }}
                maxLength={30}
                className="text-xs md:text-sm"
              />
              {shareDescription.length >= 30 && (
                <p className="text-xs text-red-500 mt-1">已达到最大字数限制</p>
              )}
            </div>
            <div className="flex flex-col md:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setShareDialogOpen(false)} className="w-full md:w-auto text-xs md:text-sm">
                取消
              </Button>
              <Button onClick={handleConfirmShare} className="w-full md:w-auto text-xs md:text-sm">
                确认分享
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* 头像编辑对话框 */}
      {user && (
        <AvatarEditDialog
          open={avatarDialogOpen}
          onOpenChange={setAvatarDialogOpen}
          userId={user.id}
          currentAvatarUrl={user.avatar_url || undefined}
          onAvatarUpdated={handleAvatarUpdated}
        />
      )}
      {/* 昵称编辑对话框 */}
      {user && (
        <NicknameEditDialog
          open={nicknameDialogOpen}
          onOpenChange={setNicknameDialogOpen}
          userId={user.id}
          currentNickname={user.nickname}
          onNicknameUpdated={handleNicknameUpdated}
        />
      )}
      {/* 邀请好友对话框 */}
      {user && (
        <InviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          userId={user.id}
        />
      )}
    </div>
  );
}
