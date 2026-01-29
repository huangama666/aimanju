import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Eye,
  Pin,
  Star,
  Send,
  Trash2,
  BookOpen,
} from 'lucide-react';
import {
  getPostById,
  getPostComments,
  createPostComment,
  deletePostComment,
  toggleLike,
} from '@/db/community-api';
import { getCurrentUser } from '@/db/api';
import type { Post, PostComment } from '@/types/community';
import type { DbUser } from '@/types/database';
import { getNovelGenreLabel } from '@/utils/novel-type-mapper';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    if (id) {
      loadPost();
      loadComments();
    }
  }, [id]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { getUserProfile } = await import('@/db/api');
        const profile = await getUserProfile(user.id);
        if (profile) {
          setCurrentUser(profile);
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const loadPost = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getPostById(id);
      if (data) {
        setPost(data);
      } else {
        toast.error('帖子不存在');
        navigate('/community');
      }
    } catch (error) {
      console.error('加载帖子失败:', error);
      toast.error('加载失败');
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const data = await getPostComments(id);
      setComments(data);
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    if (!newComment.trim()) {
      toast.error('请输入评论内容');
      return;
    }

    if (!id) return;

    try {
      setSubmitting(true);
      await createPostComment({
        post_id: id,
        content: newComment.trim(),
      });
      toast.success('评论成功！');
      setNewComment('');
      loadComments();
      loadPost(); // 重新加载帖子以更新评论数
    } catch (error) {
      console.error('评论失败:', error);
      toast.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await deletePostComment(commentId);
      toast.success('删除成功');
      loadComments();
      loadPost();
    } catch (error) {
      console.error('删除评论失败:', error);
      toast.error('删除失败');
    }
  };

  const handleLikePost = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    if (!id) return;

    try {
      const isLiked = await toggleLike('post', id);
      toast.success(isLiked ? '点赞成功' : '取消点赞');
      loadPost();
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error('操作失败');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    try {
      const isLiked = await toggleLike('post_comment', commentId);
      toast.success(isLiked ? '点赞成功' : '取消点赞');
      loadComments();
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error('操作失败');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/community')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回社区
        </Button>

        {/* 帖子内容 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.user?.avatar_url || undefined} />
                  <AvatarFallback>{post.user?.nickname?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{post.user?.nickname || '匿名用户'}</span>
                    {post.is_pinned && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Pin className="mr-1 h-3 w-3" />
                        置顶
                      </Badge>
                    )}
                    {post.is_featured && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Star className="mr-1 h-3 w-3" />
                        精华
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatDate(post.created_at)}
                  </div>
                </div>
              </div>
            </div>
            <CardTitle className="mt-6 text-2xl">{post.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 引用小说 */}
            {post.novel && (
              <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/novel/${post.novel_id}?from=community`, {
                  state: { fromCommunity: true }
                })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2 text-purple-600">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm font-semibold">引用小说</span>
                  </div>
                  <div className="flex gap-4">
                    {post.novel.novel_thumb && (
                      <div className="relative">
                        <img
                          src={post.novel.novel_thumb}
                          alt={post.novel.novel_title}
                          className="w-20 h-28 object-cover rounded"
                        />
                        {(post.novel as any)?.price > 0 && (
                          <Badge className="absolute top-1 right-1 bg-[#FF5724] text-white text-xs px-1 py-0">
                            {(post.novel as any).price}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-base line-clamp-2 flex-1">
                          {post.novel.novel_title}
                        </h4>
                        {!post.novel.novel_thumb && (post.novel as any)?.price > 0 && (
                          <Badge className="bg-[#FF5724] text-white text-xs">
                            {(post.novel as any).price} 码分
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          📚 {getNovelGenreLabel((post.novel as any)?.novel_type)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {(post.novel as any)?.novel_content || '暂无简介'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="prose prose-sm max-w-none mb-6 whitespace-pre-wrap">
              {post.content}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button
                className="flex items-center gap-2 hover:text-purple-600 transition-colors"
                onClick={handleLikePost}
              >
                <ThumbsUp className="h-5 w-5" />
                <span>{post.likes_count || 0}</span>
              </button>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>{post.comments_count || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <span>{post.views_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 评论区 */}
        <Card>
          <CardHeader>
            <CardTitle>评论 ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 发表评论 */}
            <div className="mb-6">
              <Textarea
                placeholder="写下你的评论..."
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-2"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitComment}
                  disabled={submitting || !newComment.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? '发送中...' : '发表评论'}
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            {/* 评论列表 */}
            {comments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无评论，快来发表第一条评论吧！
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar>
                      <AvatarImage src={comment.user?.avatar_url || undefined} />
                      <AvatarFallback>{comment.user?.nickname?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{comment.user?.nickname || '匿名用户'}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <div className="text-sm mb-2 whitespace-pre-wrap">
                        {comment.content}
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-purple-600 transition-colors"
                          onClick={() => handleLikeComment(comment.id)}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span>{comment.likes_count || 0}</span>
                        </button>
                        {currentUser && currentUser.id === comment.user_id && (
                          <button
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-600 transition-colors"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>删除</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
