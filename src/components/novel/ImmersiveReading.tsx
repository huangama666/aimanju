import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Maximize2,
  Minimize2,
  Settings,
  Sun,
  Moon,
  Type,
  AlignJustify,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { chapterAudioService } from '@/services/chapterAudioService';
import type { ChapterData, PanelData } from '@/types/database';

interface ImmersiveReadingProps {
  novelTitle: string;
  chapters: ChapterData[];
  panels: PanelData[];
  initialChapterIndex?: number;
  onClose: () => void;
}

const ImmersiveReading: React.FC<ImmersiveReadingProps> = ({
  novelTitle,
  chapters,
  panels,
  initialChapterIndex = 0,
  onClose,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  // 阅读设置
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 音频播放相关状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playMode, setPlayMode] = useState<'single' | 'all'>('single'); // 播放模式：单章节或全部
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentChapter = chapters[currentChapterIndex];
  const currentPanels = panels.filter(panel => panel.chapter_number === currentChapter?.chapter_number);
  const totalChapters = chapters.length;

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

  // 保存阅读进度到 localStorage
  useEffect(() => {
    if (currentChapter) {
      localStorage.setItem(`reading_progress_${novelTitle}`, JSON.stringify({
        chapterIndex: currentChapterIndex,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentChapterIndex, novelTitle]);

  // 保存阅读设置到 localStorage
  useEffect(() => {
    localStorage.setItem('reading_settings', JSON.stringify({
      fontSize,
      lineHeight,
      isDarkMode
    }));
  }, [fontSize, lineHeight, isDarkMode]);

  // 加载阅读设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('reading_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setFontSize(settings.fontSize || 18);
        setLineHeight(settings.lineHeight || 1.8);
        setIsDarkMode(settings.isDarkMode || false);
      } catch (error) {
        console.error('加载阅读设置失败:', error);
      }
    }
  }, []);

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setImageLoading(true);
      // 停止当前音频
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < totalChapters - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setImageLoading(true);
      // 停止当前音频
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // 加载章节音频
  useEffect(() => {
    if (currentChapter) {
      const audioUrl = chapterAudioService.getChapterAudio(currentChapter);
      setAudioUrl(audioUrl);
      
      const wasPlaying = isPlaying;
      setIsPlaying(false);
      setCurrentTime(0);
      
      // 如果有音频，更新audio元素
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        
        // 如果之前在播放且是全部播放模式，自动播放新章节
        if (wasPlaying && playMode === 'all') {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error('自动播放失败:', error);
            toast.error('音频自动播放失败');
          });
        }
      }
    }
  }, [currentChapterIndex, currentChapter, playMode]);

  // 音频播放控制
  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) {
      toast.error('该章节暂无音频');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('播放失败:', error);
        toast.error('音频播放失败');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    
    // 如果是全部播放模式，自动播放下一章
    if (playMode === 'all' && currentChapterIndex < totalChapters - 1) {
      // 延迟一下再切换到下一章并播放
      setTimeout(() => {
        setCurrentChapterIndex(currentChapterIndex + 1);
        setImageLoading(true);
        // 下一章的音频会在 useEffect 中自动加载和播放
        setIsPlaying(true);
      }, 500);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const mutedTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const borderClass = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const cardBgClass = isDarkMode ? 'bg-gray-800' : 'bg-gray-50';

  return (
    <div className={`fixed inset-0 z-50 ${bgClass} flex flex-col ${isFullscreen ? 'p-0' : 'p-0 md:p-4'}`}>
      {/* 顶部工具栏 */}
      <div className={`flex items-center justify-between p-3 md:p-4 border-b ${borderClass} ${bgClass}/95 backdrop-blur-sm flex-shrink-0`}>
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">退出阅读</span>
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 flex-shrink-0" />
            <span className={`font-medium truncate ${textClass}`}>{novelTitle}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            第 {currentChapterIndex + 1} / {totalChapters} 章
          </Badge>
          
          {/* 阅读设置 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">阅读设置</h4>
                
                {/* 字体大小 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      字体大小
                    </Label>
                    <span className="text-sm text-muted-foreground">{fontSize}px</span>
                  </div>
                  <Slider
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    min={14}
                    max={24}
                    step={1}
                  />
                </div>
                
                {/* 行间距 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <AlignJustify className="h-4 w-4" />
                      行间距
                    </Label>
                    <span className="text-sm text-muted-foreground">{lineHeight.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[lineHeight]}
                    onValueChange={(value) => setLineHeight(value[0])}
                    min={1.2}
                    max={2.5}
                    step={0.1}
                  />
                </div>
                
                {/* 夜间模式 */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    夜间模式
                  </Label>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={setIsDarkMode}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="hidden md:flex">
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 主要阅读区域 */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* 左侧：小说内容 */}
        <div className="flex-1 md:border-r border-b md:border-b-0 flex flex-col min-h-0">
          {/* 章节标题 */}
          <div className={`p-4 md:p-6 border-b ${borderClass} ${cardBgClass} flex-shrink-0`}>
            <h2 className={`text-xl md:text-2xl font-bold ${textClass} mb-2`}>
              {currentChapter.title}
            </h2>
            <div className={`flex items-center gap-2 md:gap-4 text-xs md:text-sm ${mutedTextClass} flex-wrap`}>
              <span>第 {currentChapterIndex + 1} 章</span>
              {currentChapter.content && (
                <span>约 {currentChapter.content.length} 字</span>
              )}
            </div>
          </div>
          
          {/* 章节内容 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full [&>div>div[style]]:!block">
              <div className="p-4 md:p-6">
                <div className="prose prose-lg max-w-none">
                  {currentChapter.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p 
                        key={index} 
                        className={`mb-4 md:mb-6 ${textClass}`}
                        style={{ 
                          fontSize: `${fontSize}px`,
                          lineHeight: lineHeight
                        }}
                      >
                        {paragraph.trim()}
                      </p>
                    )
                  ))}
                </div>
                
                {/* 章节结尾提示 */}
                <div className={`mt-8 md:mt-12 pt-6 md:pt-8 border-t ${borderClass} text-center`}>
                  <p className={`${mutedTextClass} text-sm mb-4`}>
                    — 第 {currentChapterIndex + 1} 章 完 —
                  </p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    {currentChapterIndex > 0 && (
                      <Button variant="outline" onClick={goToPreviousChapter}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        上一章
                      </Button>
                    )}
                    {currentChapterIndex < totalChapters - 1 && (
                      <Button onClick={goToNextChapter}>
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
        <div className="flex-1 md:w-1/2 flex flex-col min-h-0">
          {/* 分镜标题 */}
          <div className={`p-4 md:p-6 border-b ${borderClass} ${cardBgClass} flex-shrink-0`}>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-5 w-5" />
              <h3 className={`text-lg md:text-xl font-semibold ${textClass}`}>分镜图片</h3>
            </div>
            <p className={`text-xs md:text-sm ${mutedTextClass}`}>
              {currentPanels.length > 0 
                ? `共 ${currentPanels.length} 个分镜` 
                : '暂无分镜图片'
              }
            </p>
          </div>

          {/* 分镜内容 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full [&>div>div[style]]:!block">
              <div className="p-4 md:p-6">
                {currentPanels.length > 0 ? (
                  <div className="space-y-6 md:space-y-8">
                    {currentPanels.map((panel, index) => (
                      <Card key={panel.id} className={`overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                        <CardContent className="p-0">
                          {/* 分镜序号 */}
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2">
                            <span className="text-sm font-medium">分镜 {panel.panel_number}</span>
                          </div>
                          
                          {/* 分镜图片 */}
                          <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                            {imageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            {panel.image_url ? (
                              <img
                                src={panel.image_url}
                                alt={panel.description || `分镜 ${panel.panel_number}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                crossOrigin="anonymous"
                                onLoad={handleImageLoad}
                                onError={handleImageError}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                  <p className={`text-sm ${mutedTextClass}`}>暂无图片</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 分镜描述 */}
                          {panel.description && (
                            <div className={`p-4 md:p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-sm md:text-base`}>
                                {panel.description}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* 章节分镜结尾 */}
                    <div className="text-center py-6 md:py-8">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full ${mutedTextClass} text-sm`}>
                        <ImageIcon className="h-4 w-4" />
                        本章分镜完毕
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center h-full ${mutedTextClass}`}>
                    <ImageIcon className="h-16 md:h-20 w-16 md:w-20 mb-4 md:mb-6 opacity-30" />
                    <h3 className="text-lg md:text-xl font-medium mb-2">暂无分镜图片</h3>
                    <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-center max-w-sm text-sm md:text-base px-4`}>
                      该章节还没有生成分镜内容
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* 音频播放器 - 固定在底部 */}
      {audioUrl && (
        <div className={`border-t ${borderClass} ${bgClass}/95 backdrop-blur-sm flex-shrink-0 p-3`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              {/* 播放模式切换 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 p-2"
                    title={playMode === 'single' ? '当前：单章播放' : '当前：连续播放'}
                  >
                    {playMode === 'single' ? (
                      <span className="text-xs font-medium">单章</span>
                    ) : (
                      <span className="text-xs font-medium">连续</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm mb-3">播放模式</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => setPlayMode('single')}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          playMode === 'single'
                            ? 'bg-[#FF5724] text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="font-medium">单章播放</div>
                        <div className="text-xs opacity-80 mt-0.5">播放完当前章节后停止</div>
                      </button>
                      <button
                        onClick={() => setPlayMode('all')}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          playMode === 'all'
                            ? 'bg-[#FF5724] text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="font-medium">连续播放</div>
                        <div className="text-xs opacity-80 mt-0.5">自动播放后续章节</div>
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* 播放/暂停按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="flex-shrink-0"
                style={{ backgroundColor: '#FF5724', color: 'white' }}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              {/* 时间显示 */}
              <span className={`text-xs ${mutedTextClass} flex-shrink-0`}>
                {formatTime(currentTime)}
              </span>

              {/* 进度条 */}
              <div className="flex-1 px-2">
                <Slider
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  max={duration || 100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>

              {/* 总时长 */}
              <span className={`text-xs ${mutedTextClass} flex-shrink-0`}>
                {formatTime(duration)}
              </span>

              {/* 音量控制 */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="p-2"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.1}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* 上一章/下一章 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousChapter}
                  disabled={currentChapterIndex === 0}
                  className="p-2"
                  title="上一章"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextChapter}
                  disabled={currentChapterIndex === totalChapters - 1}
                  className="p-2"
                  title="下一章"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的audio元素 */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* 底部导航 - 仅在桌面端显示 */}
      <div className={`hidden md:flex items-center justify-between p-4 border-t ${borderClass} ${bgClass}/95 backdrop-blur-sm flex-shrink-0`}>
        <Button
          variant="outline"
          onClick={goToPreviousChapter}
          disabled={currentChapterIndex === 0}
          className="flex items-center gap-2 min-w-[120px]"
        >
          <ChevronLeft className="h-4 w-4" />
          上一章
        </Button>

        <div className="flex items-center gap-6">
          {/* 阅读进度 */}
          <div className="text-center">
            <div className={`text-xs ${mutedTextClass} mb-1`}>阅读进度</div>
            <div className={`text-sm font-medium ${textClass}`}>
              {Math.round(((currentChapterIndex + 1) / totalChapters) * 100)}%
            </div>
          </div>
          
          {/* 章节信息 */}
          <div className="text-center">
            <div className={`text-xs ${mutedTextClass} mb-1`}>当前章节</div>
            <div className={`text-sm font-medium max-w-[200px] truncate ${textClass}`}>
              {currentChapter.title}
            </div>
          </div>
          
          {/* 分镜数量 */}
          <div className="text-center">
            <div className={`text-xs ${mutedTextClass} mb-1`}>分镜数量</div>
            <div className={`text-sm font-medium ${textClass}`}>
              {currentPanels.length} 个
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={goToNextChapter}
          disabled={currentChapterIndex === totalChapters - 1}
          className="flex items-center gap-2 min-w-[120px]"
        >
          下一章
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 快捷键提示 - 仅在桌面端显示 */}
      <div className="hidden md:block fixed bottom-4 left-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
        <div>← → 翻页 | ESC 退出 | F 全屏</div>
      </div>
    </div>
  );
};

export default ImmersiveReading;
