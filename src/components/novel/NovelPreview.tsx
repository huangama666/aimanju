import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, User, Image, Download, FileText, Loader2, Volume2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { exportNovelToPDF, exportChapterToPDF } from '@/utils/pdfExport';
import AudioPlayer, { AudioCache } from './AudioPlayer';
import { backgroundAudioService } from '@/services/backgroundAudioService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Novel, NovelChapter } from '@/types/novel';

interface ChapterStatus {
  status: 'pending' | 'generating' | 'success' | 'failed' | 'retrying';
  retryCount: number;
  error?: string;
}

interface CoverStatus {
  status: 'pending' | 'generating' | 'success' | 'failed';
  retryCount: number;
  error?: string;
}

interface NovelPreviewProps {
  novel: Novel;
  currentContent?: string;
  isGenerating: boolean;
  allChaptersGenerated?: boolean; // 所有章节是否已生成完成
  chapterStatuses?: Map<number, ChapterStatus>; // 章节生成状态
  coverStatus?: CoverStatus; // 封面生成状态
  isCoverGenerating?: boolean; // 封面是否正在生成
  onSelectChapter: (chapter: NovelChapter) => void;
  onGenerateCharacter: () => void;
  onGenerateComic: () => void;
  onExport: () => void;
  onRetryChapter?: (chapterIndex: number) => Promise<void>; // 重新生成章节回调
  onRetryCover?: () => Promise<void>; // 重新生成封面回调
}

const NovelPreview: React.FC<NovelPreviewProps> = ({
  novel,
  currentContent,
  isGenerating,
  allChaptersGenerated = false,
  chapterStatuses,
  coverStatus,
  isCoverGenerating = false,
  onSelectChapter,
  onGenerateCharacter,
  onGenerateComic,
  onExport,
  onRetryChapter,
  onRetryCover,
}) => {
  const [selectedChapter, setSelectedChapter] = useState<NovelChapter | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingChapter, setIsExportingChapter] = useState<string | null>(null);
  const [audioPlayerOpen, setAudioPlayerOpen] = useState(false);
  const [currentAudioChapter, setCurrentAudioChapter] = useState<NovelChapter | null>(null);
  const [currentTabValue, setCurrentTabValue] = useState<string>(novel.chapters[0]?.id || '');
  const scrollAreaRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // 监听章节内容变化，自动滚动到底部（仅在生成时）
  useEffect(() => {
    const chapterIndex = novel.chapters.findIndex(ch => ch.id === currentTabValue);
    if (chapterIndex === -1) return;
    
    const status = chapterStatuses?.get(chapterIndex);
    const chapter = novel.chapters[chapterIndex];
    
    // 如果当前章节正在生成，自动滚动到底部
    if (status && (status.status === 'generating' || status.status === 'retrying') && chapter?.content) {
      const scrollContainer = scrollAreaRefs.current.get(currentTabValue);
      if (scrollContainer) {
        const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          // 使用 requestAnimationFrame 确保在 DOM 更新后滚动
          requestAnimationFrame(() => {
            viewport.scrollTop = viewport.scrollHeight;
          });
        }
      }
    }
  }, [novel.chapters, currentTabValue, chapterStatuses]);

  // 当所有章节生成完成后，开始后台生成音频
  useEffect(() => {
    if (novel && novel.chapters && novel.chapters.length > 0 && allChaptersGenerated) {
      // 准备章节数据
      const chaptersForAudio = novel.chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        content: chapter.content
      }));
      
      // 开始后台生成音频
      backgroundAudioService.startBackgroundGeneration(chaptersForAudio);
    }
  }, [novel, allChaptersGenerated]);

  const handleChapterSelect = (chapter: NovelChapter) => {
    setSelectedChapter(chapter);
    onSelectChapter(chapter);
  };

  // 处理听书按钮点击
  const handleListenToChapter = (chapter: NovelChapter) => {
    if (!chapter.content || chapter.content.trim().length === 0) {
      toast.error('该章节内容为空，无法生成语音');
      return;
    }
    
    // 优先检查章节是否已有音频URL（从数据库加载的）
    if (chapter.audioUrl) {
      console.log(`🎵 [听书] 章节 ${chapter.order} 已有音频URL: ${chapter.audioUrl}`);
      // 将音频URL添加到缓存
      AudioCache.set(chapter.id, chapter.audioUrl);
      setCurrentAudioChapter(chapter);
      setAudioPlayerOpen(true);
      return;
    }
    
    // 检查内存缓存中的音频状态
    const hasAudio = AudioCache.has(chapter.id);
    const isGenerating = AudioCache.isGenerating(chapter.id);
    
    if (hasAudio) {
      // 音频已生成完成，直接播放
      console.log(`🎵 [听书] 章节 ${chapter.order} 音频在缓存中`);
      setCurrentAudioChapter(chapter);
      setAudioPlayerOpen(true);
    } else if (isGenerating) {
      // 音频正在生成中，显示生成窗口
      console.log(`⏳ [听书] 章节 ${chapter.order} 音频生成中`);
      setCurrentAudioChapter(chapter);
      setAudioPlayerOpen(true);
    } else {
      // 音频未开始生成，开始生成并显示窗口
      console.log(`🎬 [听书] 章节 ${chapter.order} 开始生成音频`);
      setCurrentAudioChapter(chapter);
      setAudioPlayerOpen(true);
    }
  };

  // 导出整本小说为PDF
  const handleExportNovelToPDF = async () => {
    if (novel.chapters.length === 0) {
      toast.error('没有可导出的章节内容');
      return;
    }

    setIsExportingPDF(true);
    try {
      await exportNovelToPDF(novel);
      toast.success('小说PDF导出成功！');
    } catch (error) {
      console.error('PDF导出失败:', error);
      toast.error(error instanceof Error ? error.message : 'PDF导出失败，请重试');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // 导出单个章节为PDF
  const handleExportChapterToPDF = async (chapterId: string) => {
    setIsExportingChapter(chapterId);
    try {
      await exportChapterToPDF(novel, chapterId);
      toast.success('章节PDF导出成功！');
    } catch (error) {
      console.error('章节PDF导出失败:', error);
      toast.error(error instanceof Error ? error.message : '章节PDF导出失败，请重试');
    } finally {
      setIsExportingChapter(null);
    }
  };

  const getGenreLabel = (genre: string) => {
    const genreMap: Record<string, string> = {
      fantasy: '玄幻',
      urban: '都市',
      historical: '历史',
      romance: '言情',
      scifi: '科幻',
      martial: '武侠',
      mystery: '悬疑',
      adventure: '冒险',
    };
    return genreMap[genre] || genre;
  };

  const getStyleLabel = (style: string) => {
    const styleMap: Record<string, string> = {
      humorous: '幽默风趣',
      serious: '严肃深刻',
      romantic: '浪漫温馨',
      suspenseful: '紧张悬疑',
      philosophical: '哲理思辨',
      light: '轻松愉快',
      dark: '黑暗沉重',
      epic: '史诗宏大',
    };
    return styleMap[style] || style;
  };

  const getTotalWordCount = () => {
    return novel.chapters.reduce((total, chapter) => total + (chapter.wordCount || 0), 0);
  };

  const getAverageWordCount = () => {
    const total = getTotalWordCount();
    return novel.chapters.length > 0 ? Math.round(total / novel.chapters.length) : 0;
  };

  return (
    <div className="w-full space-y-6">
      {/* 小说信息卡片 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              {novel.title}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{getGenreLabel(novel.genre)}</Badge>
              {novel.style && novel.style !== '未知' && (
                <Badge variant="outline">{getStyleLabel(novel.style)}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* 封面图片 */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              {novel.coverImageUrl ? (
                <div className="w-32 h-48 rounded-lg overflow-hidden border border-gray-200 shadow-md relative group">
                  <img
                    src={novel.coverImageUrl}
                    alt={`${novel.title}封面`}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                  {/* 重新生成按钮（悬停显示） */}
                  {onRetryCover && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={onRetryCover}
                        disabled={isCoverGenerating}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isCoverGenerating ? 'animate-spin' : ''}`} />
                        重新生成
                      </Button>
                    </div>
                  )}
                </div>
              ) : coverStatus?.status === 'failed' ? (
                <div className="w-32 h-48 rounded-lg border-2 border-dashed border-red-300 flex flex-col items-center justify-center bg-red-50 p-2">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                  <span className="text-xs text-red-600 text-center mb-2">封面生成失败</span>
                  {coverStatus.error && (
                    <span className="text-xs text-red-500 text-center mb-2">{coverStatus.error}</span>
                  )}
                  {coverStatus.retryCount > 0 && (
                    <span className="text-xs text-gray-500 mb-2">已重试 {coverStatus.retryCount} 次</span>
                  )}
                  {onRetryCover && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetryCover}
                      disabled={isCoverGenerating}
                      className="gap-1 text-xs h-7"
                    >
                      <RefreshCw className={`h-3 w-3 ${isCoverGenerating ? 'animate-spin' : ''}`} />
                      重新生成
                    </Button>
                  )}
                </div>
              ) : isCoverGenerating || coverStatus?.status === 'generating' ? (
                <div className="w-32 h-48 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center bg-blue-50">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                  <span className="text-xs text-blue-600">封面生成中...</span>
                  {coverStatus?.retryCount && coverStatus.retryCount > 0 && (
                    <span className="text-xs text-gray-500 mt-1">第 {coverStatus.retryCount} 次重试</span>
                  )}
                </div>
              ) : (
                <div className="w-32 h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <Image className="h-8 w-8 mx-auto mb-2" />
                    <span className="text-xs">等待生成封面...</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* 小说信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">{novel.description}</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs sm:text-sm">章节数</span>
                  <span className="font-medium text-sm sm:text-base">{novel.chapters.length} 章</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs sm:text-sm">总字数</span>
                  <span className="font-medium text-sm sm:text-base">{getTotalWordCount().toLocaleString()} 字</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs sm:text-sm">平均字数</span>
                  <span className="font-medium text-sm sm:text-base">{getAverageWordCount().toLocaleString()} 字/章</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs sm:text-sm">创建时间</span>
                  <span className="font-medium text-sm sm:text-base">{novel.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 章节内容 - 只要有章节就显示，不管是否正在生成 */}
      {novel.chapters.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base sm:text-lg">章节内容</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerateCharacter}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  disabled={isGenerating}
                >
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">生成角色</span>
                  <span className="sm:hidden">角色</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerateComic}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  disabled={isGenerating}
                >
                  <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">生成漫画</span>
                  <span className="sm:hidden">漫画</span>
                </Button>

              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={currentTabValue} 
              onValueChange={setCurrentTabValue}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 h-auto p-2">
                {novel.chapters.map((chapter, index) => {
                  const status = chapterStatuses?.get(index);
                  return (
                    <TabsTrigger
                      key={chapter.id}
                      value={chapter.id}
                      className="text-xs sm:text-sm p-2 h-auto whitespace-normal flex flex-col items-center gap-1"
                      onClick={() => handleChapterSelect(chapter)}
                    >
                      <span className="line-clamp-2">{chapter.title}</span>
                      {chapter.wordCount > 0 && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {chapter.wordCount}字
                        </Badge>
                      )}
                      {status && status.status === 'generating' && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs flex items-center gap-1"
                        >
                          <Loader2 className="h-3 w-3 animate-spin" />
                          生成中...
                        </Badge>
                      )}
                      {status && status.status === 'retrying' && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          重试中({status.retryCount}/5)
                        </Badge>
                      )}
                      {status && status.status === 'failed' && (
                        <Badge 
                          variant="destructive" 
                          className="text-xs flex items-center gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          生成失败
                        </Badge>
                      )}
                      {chapter.content === '' && !status && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          等待生成...
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {novel.chapters.map((chapter, index) => {
                const status = chapterStatuses?.get(index);
                return (
                  <TabsContent key={chapter.id} value={chapter.id} className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base sm:text-lg md:text-xl">{chapter.title}</CardTitle>
                            {chapter.wordCount > 0 && (
                              <Badge 
                                variant="outline"
                                className="text-xs"
                              >
                                {chapter.wordCount}字
                              </Badge>
                            )}
                            {status && status.status === 'generating' && (
                              <Badge 
                                variant="secondary"
                                className="flex items-center gap-1 text-xs"
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                生成中...
                              </Badge>
                            )}
                            {status && status.status === 'retrying' && (
                              <Badge 
                                variant="secondary"
                                className="flex items-center gap-1 text-xs"
                              >
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                重试中({status.retryCount}/5)
                              </Badge>
                            )}
                            {status && status.status === 'failed' && (
                              <Badge 
                                variant="destructive"
                                className="flex items-center gap-1 text-xs"
                              >
                                <AlertCircle className="h-3 w-3" />
                                <span className="hidden sm:inline">生成失败 (已重试{status.retryCount}次)</span>
                                <span className="sm:hidden">失败</span>
                              </Badge>
                            )}
                            {chapter.content === '' && !status && (
                              <Badge 
                                variant="secondary"
                                className="flex items-center gap-1 text-xs"
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                等待生成...
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 重新生成按钮 - 只有失败时才显示 */}
                            {status && status.status === 'failed' && onRetryChapter && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRetryChapter(index)}
                                className="flex items-center gap-2 text-xs sm:text-sm"
                              >
                                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">重新生成</span>
                                <span className="sm:hidden">重试</span>
                              </Button>
                            )}
                            {/* 听书按钮 - 只有内容生成完成后才可用 */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleListenToChapter(chapter)}
                              className="flex items-center gap-2 border-0 hover:opacity-90 text-xs sm:text-sm"
                              style={{ backgroundColor: '#FF5724', color: 'white' }}
                              disabled={chapter.content === ''}
                              title="听书"
                            >
                              <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">听书</span>
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea 
                          className="h-[400px] sm:h-[500px] w-full"
                          ref={(el) => {
                            if (el) {
                              scrollAreaRefs.current.set(chapter.id, el as unknown as HTMLDivElement);
                            }
                          }}
                        >
                          <div className="prose prose-sm max-w-none text-sm sm:text-base markdown-content">
                            {chapter.content ? (
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                              >
                                {chapter.content}
                              </ReactMarkdown>
                            ) : (status?.error && (
                              <div className="text-red-500 p-3 sm:p-4 bg-red-50 rounded-md">
                                <p className="font-semibold mb-2 text-sm sm:text-base">生成失败</p>
                                <p className="text-xs sm:text-sm">{status.error}</p>
                                <p className="text-xs sm:text-sm mt-2">已自动重试{status.retryCount}次，请点击"重新生成"按钮手动重试。</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* 音频播放器 */}
      {currentAudioChapter && (
        <AudioPlayer
          isOpen={audioPlayerOpen}
          onClose={() => {
            setAudioPlayerOpen(false);
            setCurrentAudioChapter(null);
          }}
          chapterTitle={currentAudioChapter.title}
          chapterContent={currentAudioChapter.content}
          chapterId={currentAudioChapter.id}
        />
      )}
    </div>
  );
};

export default NovelPreview;