import React, { useState, useEffect, useCallback } from 'react';
import { addCacheBuster } from "@/utils/cache-buster";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  BookOpen, 
  Image as ImageIcon,
  Home,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { Novel, NovelChapter, ComicPanel } from '@/types/novel';

interface ReadingModeProps {
  novel: Novel;
  comicPanels: ComicPanel[];
  initialChapterIndex?: number;
  onClose: () => void;
}

const ReadingMode: React.FC<ReadingModeProps> = ({
  novel,
  comicPanels,
  initialChapterIndex = 0,
  onClose,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const currentChapter = novel.chapters[currentChapterIndex];
  const currentPanels = comicPanels.filter(panel => panel.chapterId === currentChapter?.id);
  const totalChapters = novel.chapters.length;

  // 键盘导航
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        goToPreviousChapter();
        break;
      case 'ArrowRight':
        event.preventDefault();
        goToNextChapter();
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
    }
  }, [currentChapterIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // 防止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setImageLoading(true);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < totalChapters - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setImageLoading(true);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  if (!currentChapter) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 bg-white flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-white/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            退出阅读
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium">{novel.title}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            第 {currentChapterIndex + 1} 章 / 共 {totalChapters} 章
          </Badge>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 主要阅读区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：小说内容 */}
        <div className="flex-1 border-r flex flex-col">
          {/* 章节标题 */}
          <div className="p-6 border-b bg-gray-50 flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentChapter.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>字数：{currentChapter.wordCount?.toLocaleString() || 0} 字</span>
              <span>创建时间：{currentChapter.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
          
          {/* 章节内容 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full [&>div>div[style]]:!block">
              <div className="p-6">
                <div className="prose prose-lg max-w-none">
                  {currentChapter.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-6 leading-8 text-gray-800 text-lg">
                        {paragraph.trim()}
                      </p>
                    )
                  ))}
                </div>
                
                {/* 章节结尾提示 */}
                <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                  <p className="text-gray-500 text-sm mb-4">
                    — 第 {currentChapterIndex + 1} 章 完 —
                  </p>
                  <div className="flex justify-center gap-4">
                    {currentChapterIndex > 0 && (
                      <Button variant="outline" onClick={goToPreviousChapter} style={{ height: '2.25rem' }}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        上一章
                      </Button>
                    )}
                    {currentChapterIndex < totalChapters - 1 && (
                      <Button onClick={goToNextChapter} style={{ height: '2.25rem' }}>
                        下一章
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* 右侧：分镜图片 */}
        <div className="w-1/2 flex flex-col">
          {/* 分镜标题 */}
          <div className="p-6 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-5 w-5" />
              <h3 className="text-xl font-semibold">分镜图片</h3>
            </div>
            <p className="text-sm text-gray-600">
              {currentPanels.length > 0 
                ? `共 ${currentPanels.length} 个分镜` 
                : '暂无分镜图片'
              }
            </p>
          </div>

          {/* 分镜内容 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full [&>div>div[style]]:!block">
              <div className="p-6">
                {currentPanels.length > 0 ? (
                  <div className="space-y-8">
                    {currentPanels.map((panel, index) => (
                      <Card key={panel.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardContent className="p-0">
                          {/* 分镜序号 */}
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2">
                            <span className="text-sm font-medium">分镜 {panel.order}</span>
                          </div>
                          
                          {/* 分镜图片 */}
                          <div className="relative aspect-video bg-gray-100">
                            {imageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            <img
                              src={addCacheBuster(panel.imageUrl)}
                              alt={panel.description}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              crossOrigin="anonymous"
                              onLoad={handleImageLoad}
                              onError={handleImageError}
                            />
                          </div>
                          
                          {/* 分镜描述 */}
                          {panel.description && (
                            <div className="p-6 bg-gray-50">
                              <p className="text-gray-700 leading-relaxed">
                                {panel.description}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* 章节分镜结尾 */}
                    <div className="text-center py-8">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-600 text-sm">
                        <ImageIcon className="h-4 w-4" />
                        本章分镜完毕
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <ImageIcon className="h-20 w-20 mb-6 opacity-30" />
                    <h3 className="text-xl font-medium mb-2">暂无分镜图片</h3>
                    <p className="text-gray-400 text-center max-w-sm">
                      该章节还没有生成分镜内容，请返回分镜页面进行生成
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={onClose}
                      style={{ height: '2.25rem' }}
                    >
                      返回分镜页面
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between p-4 border-t bg-white/95 backdrop-blur-sm flex-shrink-0">
        <Button
          variant="outline"
          onClick={goToPreviousChapter}
          disabled={currentChapterIndex === 0}
          className="flex items-center gap-2 min-w-[120px]"
          style={{ height: '2.25rem' }}
        >
          <ChevronLeft className="h-4 w-4" />
          上一章
        </Button>

        <div className="flex items-center gap-6">
          {/* 阅读进度 */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">阅读进度</div>
            <div className="text-sm font-medium">
              {Math.round(((currentChapterIndex + 1) / totalChapters) * 100)}%
            </div>
          </div>
          
          {/* 章节信息 */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">当前章节</div>
            <div className="text-sm font-medium max-w-[200px] truncate">
              {currentChapter.title}
            </div>
          </div>
          
          {/* 分镜数量 */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">分镜数量</div>
            <div className="text-sm font-medium">
              {currentPanels.length} 个
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={goToNextChapter}
          disabled={currentChapterIndex === totalChapters - 1}
          className="flex items-center gap-2 min-w-[120px]"
          style={{ height: '2.25rem' }}
        >
          下一章
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 快捷键提示 */}
      <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
        <div>← → 翻页 | ESC 退出 | F 全屏</div>
      </div>
    </div>
  );
};

export default ReadingMode;