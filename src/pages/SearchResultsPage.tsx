import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Search,
  X,
  ArrowLeft,
  BookOpen,
  Eye,
  ThumbsUp,
  Star,
  Share2,
  Sparkles,
} from 'lucide-react';
import { searchNovelShares } from '@/db/community-api';
import type { NovelShare } from '@/types/community';
import { getNovelGenreLabel } from '@/utils/novel-type-mapper';

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<'relevance' | 'time' | 'popularity'>(
    (searchParams.get('sort') as 'relevance' | 'time' | 'popularity') || 'relevance'
  );
  const [searchResults, setSearchResults] = useState<NovelShare[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const keyword = searchParams.get('q');
    const sort = searchParams.get('sort') as 'relevance' | 'time' | 'popularity';
    
    if (keyword) {
      setSearchKeyword(keyword);
      if (sort) {
        setSortBy(sort);
      }
      performSearch(keyword, sort || 'relevance');
    }
  }, [searchParams]);

  const performSearch = async (keyword: string, sort: 'relevance' | 'time' | 'popularity') => {
    if (!keyword.trim()) {
      toast.error('请输入搜索关键词');
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      console.log('🔍 开始搜索小说:', keyword, '排序方式:', sort);
      const results = await searchNovelShares(keyword, sort, 50);
      setSearchResults(results);
      console.log('✅ 搜索完成，找到', results.length, '个结果');
      
      if (results.length === 0) {
        toast.info('未找到相关小说');
      } else {
        toast.success(`找到 ${results.length} 个相关小说`);
      }
    } catch (error) {
      console.error('❌ 搜索失败:', error);
      toast.error('搜索失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    if (!searchKeyword.trim()) {
      toast.error('请输入搜索关键词');
      return;
    }
    
    // 更新 URL 参数
    setSearchParams({ q: searchKeyword, sort: sortBy });
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    setSearchResults([]);
    setHasSearched(false);
    setSearchParams({});
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSortChange = (value: string) => {
    const newSort = value as 'relevance' | 'time' | 'popularity';
    setSortBy(newSort);
    if (searchKeyword.trim()) {
      setSearchParams({ q: searchKeyword, sort: newSort });
    }
  };

  const handleNovelClick = (novelId: string) => {
    navigate(`/novel/${novelId}`);
  };

  const handleBackToCommunity = () => {
    navigate('/community');
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

          {/* 搜索框 */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索小说标题、简介或作者..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="pl-10 pr-10"
                      autoFocus
                    />
                    {searchKeyword && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        onClick={handleClearSearch}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={sortBy} onValueChange={handleSortChange}>
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
                    onClick={handleSearch}
                    disabled={isSearching || !searchKeyword.trim()}
                    className="bg-gradient-to-r from-[#FF5724] to-orange-600 hover:from-[#E64D1F] hover:to-orange-700 text-white"
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        搜索中...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        搜索
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索结果 */}
        <div className="max-w-5xl mx-auto">
          {isSearching ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5724]"></div>
              <p className="mt-4 text-muted-foreground">正在搜索...</p>
            </div>
          ) : !hasSearched ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">请输入关键词开始搜索</p>
                <p className="text-sm text-muted-foreground">
                  您可以搜索小说标题、简介、作者昵称或分享描述
                </p>
              </CardContent>
            </Card>
          ) : searchResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg mb-2">未找到相关小说</p>
                <p className="text-sm text-muted-foreground mb-4">
                  试试其他关键词或调整搜索条件
                </p>
                <Button
                  variant="outline"
                  onClick={handleBackToCommunity}
                >
                  返回社区广场
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 搜索结果统计 */}
              <div className="mb-6">
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-[#FF5724]" />
                        <span className="text-sm text-muted-foreground">
                          找到 <span className="font-semibold text-[#FF5724] text-lg">{searchResults.length}</span> 个相关小说
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        关键词：<span className="font-semibold text-foreground">"{searchKeyword}"</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 搜索结果列表 */}
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-4">
                  {searchResults.map((share) => (
                    <Card
                      key={share.id}
                      className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                      onClick={() => handleNovelClick(share.novel_id)}
                    >
                      {share.novel?.novel_thumb && (
                        <img
                          src={share.novel.novel_thumb}
                          alt={share.novel.novel_title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      )}
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={share.user?.avatar_url || undefined} />
                            <AvatarFallback>{share.user?.nickname?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            {share.user?.nickname || '匿名用户'}
                          </span>
                          {share.is_featured && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 ml-auto">
                              <Star className="mr-1 h-3 w-3" />
                              精选
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base line-clamp-2">
                          {share.novel?.novel_title || '未命名小说'}
                        </CardTitle>
                        <CardDescription className="line-clamp-3 text-xs">
                          {share.novel?.novel_content || '暂无简介'}
                        </CardDescription>
                        <div className="pt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            📚 {getNovelGenreLabel(share.novel?.novel_type)}
                          </span>
                        </div>
                        {share.share_description && (
                          <div className="mt-2 p-2 rounded text-xs text-orange-700">
                            <Share2 className="inline h-3 w-3 mr-1" />
                            {share.share_description}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{share.views_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{share.likes_count || 0}</span>
                          </div>
                          <span className="ml-auto">{formatDate(share.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
