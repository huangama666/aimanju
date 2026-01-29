import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Search, Pin, PinOff, Trash2, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getAllPosts, searchPosts, togglePostPin, deletePost } from '@/db/admin-api';
import type { Post } from '@/types/community';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function PostManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const data = await getAllPosts();
      setPosts(data);
    } catch (error) {
      console.error('加载帖子失败:', error);
      toast.error('加载帖子失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const data = await searchPosts(searchKeyword);
      setPosts(data);
    } catch (error) {
      console.error('搜索帖子失败:', error);
      toast.error('搜索帖子失败');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTogglePin = async (post: Post) => {
    try {
      await togglePostPin(post.id, !post.is_pinned);
      toast.success(post.is_pinned ? '已取消置顶' : '已置顶');
      await loadPosts();
    } catch (error) {
      console.error('切换置顶状态失败:', error);
      toast.error('操作失败');
    }
  };

  const handleDeleteClick = (post: Post) => {
    setSelectedPost(post);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPost) return;

    try {
      await deletePost(selectedPost.id);
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setSelectedPost(null);
      await loadPosts();
    } catch (error) {
      console.error('删除帖子失败:', error);
      toast.error('删除失败');
    }
  };

  const getPostTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      normal: '普通',
      poll: '投票',
      question: '问答',
    };
    return types[type] || type;
  };

  const getPostTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      normal: 'default',
      poll: 'secondary',
      question: 'outline',
    };
    return variants[type] || 'default';
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
          <CardTitle className="text-white">帖子管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索栏 */}
          <div className="flex gap-2">
            <Input
              placeholder="搜索帖子标题或内容..."
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
                  loadPosts();
                }}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                清除
              </Button>
            )}
          </div>

          {/* 帖子列表 */}
          <div className="rounded-md border border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-700/50 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300">标题</TableHead>
                  <TableHead className="text-slate-300">作者</TableHead>
                  <TableHead className="text-slate-300">类型</TableHead>
                  <TableHead className="text-slate-300">分类</TableHead>
                  <TableHead className="text-slate-300 text-center">状态</TableHead>
                  <TableHead className="text-slate-300 text-center">数据</TableHead>
                  <TableHead className="text-slate-300">发布时间</TableHead>
                  <TableHead className="text-slate-300 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                      暂无帖子数据
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white max-w-xs">
                        <div className="truncate" title={post.title}>
                          {post.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {post.user?.nickname || '未知用户'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPostTypeBadgeVariant(post.post_type)}>
                          {getPostTypeLabel(post.post_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {post.category || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {post.is_pinned && (
                          <Badge variant="destructive" className="bg-orange-500">
                            置顶
                          </Badge>
                        )}
                        {post.is_featured && (
                          <Badge variant="secondary" className="ml-1">
                            精选
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300 text-center">
                        <div className="flex items-center justify-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {post.views_count}
                          </span>
                          <span>💬 {post.comments_count}</span>
                          <span>❤️ {post.likes_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTogglePin(post)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            {post.is_pinned ? (
                              <>
                                <PinOff className="h-3 w-3 mr-1" />
                                取消置顶
                              </>
                            ) : (
                              <>
                                <Pin className="h-3 w-3 mr-1" />
                                置顶
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(post)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            删除
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
            共 {posts.length} 条帖子
          </div>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              确定要删除帖子「{selectedPost?.title}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
