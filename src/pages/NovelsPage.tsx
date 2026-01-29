import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, BookOpen, Eye, ThumbsUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { getNovelShares } from '@/db/community-api';
import type { NovelShare } from '@/types/community';
import { getNovelGenreLabel } from '@/utils/novel-type-mapper';

// 每页显示的小说数量
const NOVELS_PER_PAGE = 12;

// 排序选项
const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'likes', label: '最多点赞' },
  { value: 'views', label: '最多浏览' },
];

/**
 * 小说浏览页面
 * 显示所有分享的小说，支持分页、搜索、排序
 */
export default function NovelsPage() {
  const navigate = useNavigate();
  const [novels, setNovels] = useState<NovelShare[]>([]);
  const [filteredNovels, setFilteredNovels] = useState<NovelShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);

  // 加载小说数据
  useEffect(() => {
    loadNovels();
  }, []);

  // 搜索和排序
  useEffect(() => {
    filterAndSortNovels();
  }, [novels, searchKeyword, sortBy]);

  const loadNovels = async () => {
    try {
      setLoading(true);
      const data = await getNovelShares(1000); // 获取所有小说
      setNovels(data);
    } catch (error) {
      console.error('加载小说失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortNovels = () => {
    let result = [...novels];

    // 搜索过滤
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (novel) =>
          novel.novel?.novel_title?.toLowerCase().includes(keyword) ||
          novel.novel?.novel_content?.toLowerCase().includes(keyword) ||
          novel.user?.nickname?.toLowerCase().includes(keyword)
      );
    }

    // 排序
    switch (sortBy) {
      case 'likes':
        result.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        break;
      case 'views':
        result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'latest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredNovels(result);
    setCurrentPage(1); // 重置到第一页
  };

  // 计算分页数据
  const totalPages = Math.ceil(filteredNovels.length / NOVELS_PER_PAGE);
  const startIndex = (currentPage - 1) * NOVELS_PER_PAGE;
  const endIndex = startIndex + NOVELS_PER_PAGE;
  const currentNovels = filteredNovels.slice(startIndex, endIndex);

  // 跳转到小说详情页
  const handleNovelClick = (novelId: string) => {
    navigate(`/novel/${novelId}`);
  };

  // 页码跳转
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#FF5724] mb-2 flex items-center justify-center gap-2">
            <BookOpen className="h-10 w-10" />
            看小说
          </h1>
          <p className="text-muted-foreground">发现精彩的创作作品</p>
        </div>

        {/* 搜索和排序栏 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 搜索框 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索小说标题、简介或作者..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 排序选择 */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 小说列表 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5724]"></div>
            <p className="mt-4 text-muted-foreground">加载中...</p>
          </div>
        ) : currentNovels.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">暂无小说</p>
          </div>
        ) : (
          <>
            {/* 小说网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {currentNovels.map((share) => (
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
                      <Badge className="absolute top-2 left-2 bg-[#FF5724] text-white">
                        {share.novel.price} 码分
                      </Badge>
                    )}
                    {/* 精选标签 */}
                    {share.is_featured && (
                      <Badge className="absolute top-2 right-2 bg-orange-500">精选</Badge>
                    )}
                  </div>

                  {/* 小说信息 */}
                  <CardContent className="p-4">
                    {/* 标题 */}
                    <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-[#FF5724] transition-colors">
                      {share.novel?.novel_title || '未命名小说'}
                    </h3>

                    {/* 简介 */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {share.novel?.novel_content || '暂无简介'}
                    </p>

                    {/* 作者信息 */}
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={share.user?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                          {(share.user?.nickname || '匿名')[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {share.user?.nickname || '匿名用户'}
                      </span>
                    </div>

                    {/* 统计信息 */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{share.views_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{share.likes_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 分页导航 */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4">
                {/* 页码信息 */}
                <div className="text-sm text-muted-foreground">
                  第 {currentPage} 页，共 {totalPages} 页 · 共 {filteredNovels.length} 部小说
                </div>

                {/* 分页按钮 */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {/* 上一页 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>

                  {/* 页码 */}
                  {getPageNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                      <Button
                        key={index}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={
                          currentPage === page
                            ? 'bg-[#FF5724] hover:bg-[#E64A1F]'
                            : ''
                        }
                      >
                        {page}
                      </Button>
                    ) : (
                      <span key={index} className="px-2 text-muted-foreground">
                        {page}
                      </span>
                    )
                  )}

                  {/* 下一页 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* 快速跳转 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">跳转到</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    className="w-20 text-center"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const page = parseInt((e.target as HTMLInputElement).value);
                        if (page >= 1 && page <= totalPages) {
                          handlePageChange(page);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground">页</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
