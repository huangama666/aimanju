import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  MessageSquare,
  ThumbsUp,
  Eye,
  Pin,
  Star,
  PlusCircle,
  BookOpen,
  Share2,
  Sparkles,
  TrendingUp,
  Search,
  X,
  Users,
  RefreshCw,
  Megaphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getPosts, createPost, toggleLike, getNovelShares, getRandomCreators } from '@/db/community-api';
import { getCurrentUser, getUserNovels } from '@/db/api';
import { getActiveAnnouncements } from '@/db/admin-api';
import CheckinCard from '@/components/community/CheckinCard';
import type { Post, CreatePostInput, NovelShare, Announcement } from '@/types/community';
import type { DbUser, DbNovel } from '@/types/database';
import { getNovelGenreLabel } from '@/utils/novel-type-mapper';

// 话题分类
const CATEGORIES = [
  { value: 'plot_analysis', label: '剧情分析' },
  { value: 'character_discussion', label: '角色厨' },
  { value: 'update_request', label: '催更专区' },
  { value: 'writing_tips', label: '写作探讨' },
  { value: 'book_recommendation', label: '新书推介' },
  { value: 'help', label: '书荒互助' },
  { value: 'urban', label: '都市言情区' },
  { value: 'fantasy', label: '玄幻仙侠区' },
  { value: 'fanfic', label: '同人创作区' },
  { value: 'author', label: '作者专区' },
];

export default function CommunityPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [novelShares, setNovelShares] = useState<NovelShare[]>([]);
  const [userNovels, setUserNovels] = useState<DbNovel[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState<CreatePostInput>({
    title: '',
    content: '',
    post_type: 'normal',
    category: '',
    novel_id: undefined,
  });

  // 小说搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'time' | 'popularity'>('relevance');
  
  // 帖子搜索相关状态
  const [postSearchKeyword, setPostSearchKeyword] = useState('');
  const [postSortBy, setPostSortBy] = useState<'relevance' | 'time' | 'popularity'>('relevance');
  
  // 公告展开状态
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set());

  const POSTS_PER_PAGE = 10; // 每次加载10条帖子

  useEffect(() => {
    loadCurrentUser();
    loadInitialData();
  }, [activeCategory]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { getUserProfile } = await import('@/db/api');
        const profile = await getUserProfile(user.id);
        if (profile) {
          setCurrentUser(profile);
          // 加载用户的小说列表
          const novels = await getUserNovels(user.id);
          setUserNovels(novels);
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setPosts([]);
      setPage(1);
      setHasMore(true);
      const category = activeCategory === 'all' ? undefined : activeCategory;
      const [postsData, sharesData, creatorsData, announcementsData] = await Promise.all([
        getPosts(undefined, category, POSTS_PER_PAGE),
        getNovelShares(100), // 获取更多小说用于排序
        getRandomCreators(8),
        getActiveAnnouncements(), // 加载激活的公告
      ]);
      setPosts(postsData);
      // 按点赞数排序小说，只取前8篇
      const sortedShares = sharesData.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      setNovelShares(sortedShares.slice(0, 8));
      setCreators(creatorsData);
      setAnnouncements(announcementsData);
      setHasMore(postsData.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const category = activeCategory === 'all' ? undefined : activeCategory;
      const nextPage = page + 1;
      const offset = page * POSTS_PER_PAGE;
      
      // 获取下一页的帖子
      const allPosts = await getPosts(undefined, category, offset + POSTS_PER_PAGE);
      const newPosts = allPosts.slice(offset);
      
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setPage(nextPage);
        setHasMore(newPosts.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('加载更多帖子失败:', error);
      toast.error('加载更多失败');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreatePost = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }

    try {
      await createPost(newPost);
      toast.success('发布成功！');
      setIsCreateDialogOpen(false);
      setNewPost({
        title: '',
        content: '',
        post_type: 'normal',
        category: '',
        novel_id: undefined,
      });
      loadInitialData();
    } catch (error) {
      console.error('发布帖子失败:', error);
      toast.error('发布失败');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    try {
      const isLiked = await toggleLike('post', postId);
      toast.success(isLiked ? '点赞成功' : '取消点赞');
      loadInitialData();
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error('操作失败');
    }
  };

  const handlePostClick = (postId: string) => {
    navigate(`/community/post/${postId}`);
  };

  const handleNovelClick = (novelId: string) => {
    navigate(`/novel/${novelId}?from=community`, {
      state: { fromCommunity: true }
    });
  };

  const handleCreatorClick = (creatorId: string) => {
    navigate(`/creator/${creatorId}`);
  };

  const handleRefreshCreators = async () => {
    try {
      setCreatorsLoading(true);
      const creatorsData = await getRandomCreators(8);
      setCreators(creatorsData);
      toast.success('刷新成功');
    } catch (error) {
      console.error('刷新创作者列表失败:', error);
      toast.error('刷新失败');
    } finally {
      setCreatorsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 小说搜索处理函数
  const handleSearch = () => {
    if (!searchKeyword.trim()) {
      toast.error('请输入搜索关键词');
      return;
    }

    // 跳转到搜索结果页面
    navigate(`/search?q=${encodeURIComponent(searchKeyword)}&sort=${sortBy}`);
  };

  // 清空小说搜索
  const handleClearSearch = () => {
    setSearchKeyword('');
  };

  // 按回车键搜索小说
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 帖子搜索处理函数
  const handlePostSearch = () => {
    if (!postSearchKeyword.trim()) {
      toast.error('请输入搜索关键词');
      return;
    }

    // 这里可以实现帖子搜索逻辑
    toast.info('帖子搜索功能开发中...');
  };

  // 清空帖子搜索
  const handleClearPostSearch = () => {
    setPostSearchKeyword('');
  };

  // 按回车键搜索帖子
  const handlePostSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePostSearch();
    }
  };

  // 切换公告展开/收起
  const toggleAnnouncementExpand = (id: string) => {
    setExpandedAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 获取公告类型标签颜色
  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'activity':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rule':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // 获取公告类型标签文本
  const getAnnouncementTypeLabel = (type: string) => {
    switch (type) {
      case 'system':
        return '系统通知';
      case 'activity':
        return '活动公告';
      case 'rule':
        return '规则更新';
      default:
        return '公告';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br">
      {/* 装饰元素 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Sparkles className="absolute top-20 left-10 text-orange-300 w-8 h-8 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 text-red-300 w-6 h-6 animate-pulse delay-100" />
        <Sparkles className="absolute bottom-40 left-1/4 text-pink-300 w-7 h-7 animate-pulse delay-200" />
      </div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF5724] to-orange-600 bg-clip-text text-transparent">
                社区广场
              </h1>
              <p className="text-muted-foreground mt-1">
                与书友交流，分享创作心得
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#FF5724] to-orange-600 text-white">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  发布帖子
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>发布新帖子</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">标题</Label>
                    <Input
                      id="title"
                      placeholder="输入帖子标题..."
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">分类</Label>
                    <Select
                      value={newPost.category}
                      onValueChange={(value) => setNewPost({ ...newPost, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="novel">引用小说（可选）</Label>
                    <Select
                      value={newPost.novel_id}
                      onValueChange={(value) => setNewPost({ ...newPost, novel_id: value === 'none' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择要引用的小说" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不引用小说</SelectItem>
                        {userNovels.map((novel) => (
                          <SelectItem key={novel.id} value={novel.id}>
                            {novel.novel_title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="content">内容</Label>
                    <Textarea
                      id="content"
                      placeholder="分享你的想法..."
                      rows={8}
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleCreatePost}>
                      发布
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 公告展示区域 */}
          {announcements.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4 text-orange-700">
                <Megaphone className="h-5 w-5" />
                <h2 className="text-lg font-semibold">平台公告</h2>
              </div>
              <div className="space-y-3">
                {announcements.map((announcement) => {
                  const isExpanded = expandedAnnouncements.has(announcement.id);
                  const contentPreview = announcement.content.length > 100 
                    ? announcement.content.substring(0, 100) + '...' 
                    : announcement.content;
                  
                  return (
                    <div
                      key={announcement.id}
                      className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {announcement.is_pinned && (
                              <Pin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            )}
                            <Badge className={`${getAnnouncementTypeColor(announcement.type)} border`}>
                              {getAnnouncementTypeLabel(announcement.type)}
                            </Badge>
                            <h3 className="font-semibold text-gray-900 truncate">
                              {announcement.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {isExpanded ? announcement.content : contentPreview}
                          </p>
                          {announcement.content.length > 100 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAnnouncementExpand(announcement.id)}
                              className="mt-2 h-auto p-0 text-orange-600 hover:text-orange-700 hover:bg-transparent"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  收起
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  展开
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(announcement.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 分类标签 */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all" className="py-2 px-4">
                <TrendingUp className="mr-2 h-4 w-4" />
                全部
              </TabsTrigger>
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="py-2 px-4">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 帖子搜索框 */}
          <Card className="mt-6 bg-white/80 backdrop-blur-sm border-orange-200">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索帖子标题、内容..."
                      value={postSearchKeyword}
                      onChange={(e) => setPostSearchKeyword(e.target.value)}
                      onKeyPress={handlePostSearchKeyPress}
                      className="pl-10 pr-10"
                    />
                    {postSearchKeyword && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        onClick={handleClearPostSearch}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={postSortBy} onValueChange={(value: any) => setPostSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">相关度</SelectItem>
                      <SelectItem value="time">最新发布</SelectItem>
                      <SelectItem value="popularity">最受欢迎</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handlePostSearch}
                    disabled={!postSearchKeyword.trim()}
                    className="bg-gradient-to-r from-[#FF5724] to-orange-600 text-white"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    搜索
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 论坛式布局：左侧帖子区，右侧小说区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：帖子区域 */}
          <div className="lg:col-span-2">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  讨论帖子
                </CardTitle>
                <CardDescription>
                  与书友交流讨论，分享创作心得
                </CardDescription>
              </CardHeader>
            </Card>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5724]"></div>
                <p className="mt-4 text-muted-foreground">加载中...</p>
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无帖子，快来发布第一个吧！</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <ScrollArea className="h-[2000px]">
                  <div className="space-y-4 pr-4">
                    {posts.map((post) => (
                      <Card
                        key={post.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handlePostClick(post.id)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar>
                                <AvatarImage src={post.user?.avatar_url || undefined} />
                                <AvatarFallback>{post.user?.nickname?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{post.user?.nickname || '匿名用户'}</span>
                                  {post.is_pinned && (
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                      <Pin className="mr-1 h-3 w-3" />
                                      置顶
                                    </Badge>
                                  )}
                                  {post.is_featured && (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                      <Star className="mr-1 h-3 w-3" />
                                      精华
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <span>{formatDate(post.created_at)}</span>
                                  {post.category && (
                                    <>
                                      <span>·</span>
                                      <span>
                                        {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <CardTitle className="mt-4">{post.title}</CardTitle>
                          <CardDescription className="line-clamp-2 mt-2">
                            {post.content}
                          </CardDescription>
                          {post.novel && (
                            <div className="mt-3 p-3 rounded-lg border border-orange-200">
                              <div className="flex items-center gap-2 text-sm text-orange-700">
                                <BookOpen className="h-4 w-4" />
                                <span className="font-medium">引用小说：</span>
                                <span>{post.novel.novel_title}</span>
                              </div>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <button
                              className="flex items-center gap-1 hover:text-[#FF5724] transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikePost(post.id);
                              }}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span>{post.likes_count || 0}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span>{post.comments_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{post.views_count || 0}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* 加载更多按钮 */}
                {hasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      onClick={loadMorePosts}
                      disabled={loadingMore}
                      className="w-full"
                    >
                      {loadingMore ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#FF5724] mr-2"></div>
                          加载中...
                        </>
                      ) : (
                        '加载更多'
                      )}
                    </Button>
                  </div>
                )}
                
                {!hasMore && posts.length > 0 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    没有更多帖子了
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：签到、作者版块和小说区域 */}
          <div className="lg:col-span-1">
            {/* 签到卡片 */}
            {currentUser && (
              <div className="mb-4">
                <CheckinCard userId={currentUser.id} />
              </div>
            )}
            
            {/* 作者版块 */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    热门创作者
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshCreators}
                    disabled={creatorsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${creatorsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>
                  发现优秀创作者
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF5724]"></div>
                  </div>
                ) : creators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无创作者
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {creators.map((creator) => (
                      <div
                        key={creator.id}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                        onClick={() => handleCreatorClick(creator.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={creator.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                            {(creator.nickname || '匿名')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {creator.nickname || '匿名用户'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {creator.novel_count || 0} 部作品
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* 小说分享区 */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      小说分享区
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      发现精彩作品
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/novels')}
                    className="text-white bg-[#FF5724] border-[#FF5724]"
                    style={{
                      padding: '1.2rem 1rem',
                      lineHeight: '1.5rem',
                      fontSize: '1rem'
                    }}
                  >
                    看小说
                  </Button>
                </div>
              </CardHeader>
            </Card>
            {/* 小说搜索框 */}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5724]"></div>
              </div>
            ) : novelShares.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-sm">
                    暂无分享的小说
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[2000px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                  {novelShares.map((share) => (
                    <Card
                      key={share.id}
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      onClick={() => handleNovelClick(share.novel_id)}
                    >
                      {/* 小说封面 */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100">
                        {share.novel?.novel_thumb ? (
                          <img
                            src={share.novel.novel_thumb}
                            alt={share.novel.novel_title || '小说封面'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-20 w-20 text-[#FF5724] opacity-50" />
                          </div>
                        )}
                        
                        {/* 收费标签 */}
                        {share.novel?.price > 0 && (
                          <Badge className="absolute top-2 left-2 bg-[#FF5724] text-white z-10">
                            {share.novel.price} 码分
                          </Badge>
                        )}
                        
                        {/* 精选标签 */}
                        {share.is_featured && (
                          <Badge className="absolute top-2 right-2 bg-orange-500 z-10">
                            <Star className="mr-1 h-3 w-3" />
                            精选
                          </Badge>
                        )}
                        
                        {/* 分享描述悬浮层 - 桌面端悬浮显示，移动端半透明叠加 */}
                        {share.share_description && (
                          <>
                            {/* 桌面端：鼠标悬浮显示 */}
                            <div className="hidden md:block absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex items-end">
                              <div className="text-white text-sm leading-relaxed">
                                <div className="flex items-start gap-2">
                                  <Share2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <p style={{
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'inherit',
                                    WebkitLineClamp: 'none'
                                  }}>{share.share_description}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* 移动端/平板端：半透明叠加层 */}
                            <div className="md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 pt-8">
                              <div className="text-white text-xs leading-relaxed">
                                <div className="flex items-start gap-1.5">
                                  <Share2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <p className="line-clamp-2">{share.share_description}</p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 小说信息 */}
                      <CardHeader className="p-4">
                        {/* 作者信息 */}
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={share.user?.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                              {(share.user?.nickname || '匿名')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">
                            {share.user?.nickname || '匿名用户'}
                          </span>
                        </div>

                        {/* 标题 */}
                        <CardTitle className="text-base line-clamp-1 group-hover:text-[#FF5724] transition-colors">
                          {share.novel?.novel_title || '未命名小说'}
                        </CardTitle>

                        {/* 简介 */}
                        <CardDescription className="line-clamp-2 text-xs mt-1">
                          {share.novel?.novel_content || '暂无简介'}
                        </CardDescription>

                        {/* 类型标签 */}
                        <div className="pt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            📚 {getNovelGenreLabel(share.novel?.novel_type)}
                          </span>
                        </div>

                        {/* 统计信息 */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{share.views_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{share.likes_count || 0}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
