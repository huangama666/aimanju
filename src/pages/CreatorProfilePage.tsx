import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  Star,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { getCreatorProfile } from '@/db/community-api';
import type { DbUser, DbNovel } from '@/types/database';
import { getNovelGenreLabel } from '@/utils/novel-type-mapper';

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<DbUser | null>(null);
  const [novels, setNovels] = useState<DbNovel[]>([]);
  const [novelCount, setNovelCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCreatorProfile();
    }
  }, [id]);

  const loadCreatorProfile = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getCreatorProfile(id);
      
      if (data) {
        setCreator(data.user);
        setNovels(data.novels);
        setNovelCount(data.novel_count);
      } else {
        toast.error('创作者不存在');
        navigate('/community');
      }
    } catch (error) {
      console.error('加载创作者信息失败:', error);
      toast.error('加载失败');
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleNovelClick = (novelId: string) => {
    navigate(`/novel/${novelId}?from=community`, {
      state: { fromCommunity: true }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!creator) {
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

        {/* 创作者信息卡片 */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* 头像 */}
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={creator.avatar_url || undefined} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                  {creator.nickname?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* 基本信息 */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{creator.nickname || '匿名用户'}</h1>
                
                {/* 统计数据 */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-5 w-5" />
                    <span className="text-lg font-semibold text-foreground">{novelCount}</span>
                    <span>部作品</span>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    <span>加入于 {formatDate(creator.created_at)}</span>
                  </div>
                </div>

                {/* 简介 */}
                {(creator as any).bio && (
                  <p className="text-muted-foreground mb-4 max-w-2xl">
                    {(creator as any).bio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 作品列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              创作作品
            </CardTitle>
            <CardDescription>
              共 {novelCount} 部作品
            </CardDescription>
          </CardHeader>
          <CardContent>
            {novels.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <p>该创作者还没有发布作品</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {novels.map((novel) => (
                  <Card
                    key={novel.id}
                    className="hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => handleNovelClick(novel.id)}
                  >
                    {/* 封面 */}
                    {novel.novel_thumb ? (
                      <div className="relative overflow-hidden rounded-t-lg">
                        <img
                          src={novel.novel_thumb}
                          alt={novel.novel_title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-purple-300" />
                      </div>
                    )}

                    {/* 内容 */}
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {novel.novel_title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-xs">
                        {novel.novel_content || '暂无简介'}
                      </CardDescription>
                      <div className="pt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          📚 {getNovelGenreLabel(novel.novel_type)}
                        </span>
                      </div>
                    </CardHeader>

                    {/* 底部信息 */}
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(novel.created_at)}</span>
                        </div>
                        {novel.chapters_data && typeof novel.chapters_data === 'string' && (
                          <Badge variant="secondary" className="text-xs">
                            {JSON.parse(novel.chapters_data).length || 0} 章
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
