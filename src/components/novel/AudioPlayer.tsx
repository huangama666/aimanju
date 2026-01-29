import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { ttsService } from '@/services/ttsService';

interface AudioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  chapterContent: string;
  chapterId: string; // 添加章节ID用于缓存
}

// 语音缓存管理
export class AudioCache {
  private static cache = new Map<string, string>();
  private static generating = new Set<string>();
  
  static get(chapterId: string): string | null {
    return this.cache.get(chapterId) || null;
  }
  
  static set(chapterId: string, audioUrl: string): void {
    this.cache.set(chapterId, audioUrl);
    this.generating.delete(chapterId);
  }
  
  static has(chapterId: string): boolean {
    return this.cache.has(chapterId);
  }

  static isGenerating(chapterId: string): boolean {
    return this.generating.has(chapterId);
  }

  static setGenerating(chapterId: string): void {
    this.generating.add(chapterId);
  }

  static stopGenerating(chapterId: string): void {
    this.generating.delete(chapterId);
  }
  
  static clear(): void {
    this.cache.clear();
    this.generating.clear();
  }
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isOpen,
  onClose,
  chapterTitle,
  chapterContent,
  chapterId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressInterval = useRef<number | undefined>(undefined);

  // 组件打开时检查缓存和生成状态
  useEffect(() => {
    if (isOpen && chapterId) {
      const cachedAudioUrl = AudioCache.get(chapterId);
      const isGenerating = AudioCache.isGenerating(chapterId);
      
      if (cachedAudioUrl) {
        // 已有缓存，直接使用
        setAudioUrl(cachedAudioUrl);
        setIsLoading(false);
      } else if (isGenerating) {
        // 正在后台生成，显示加载状态并开始轮询
        setIsLoading(true);
        setLoadingProgress(10); // 设置初始进度
        startPollingForResult();
      } else {
        // 未开始生成，手动开始生成
        setAudioUrl(null);
        startSynthesis();
      }
    }
  }, [isOpen, chapterId]);

  // 轮询检查后台生成结果
  const startPollingForResult = () => {
    let progressValue = 10;
    const progressTimer = setInterval(() => {
      progressValue += Math.random() * 3 + 2;
      if (progressValue >= 95) {
        progressValue = 95;
      }
      setLoadingProgress(progressValue);
    }, 3000);

    const pollTimer = setInterval(() => {
      const cachedAudioUrl = AudioCache.get(chapterId);
      const isStillGenerating = AudioCache.isGenerating(chapterId);
      
      if (cachedAudioUrl) {
        // 生成完成
        clearInterval(progressTimer);
        clearInterval(pollTimer);
        setAudioUrl(cachedAudioUrl);
        setIsLoading(false);
        setLoadingProgress(100);
        toast.success('语音生成完成！');
      } else if (!isStillGenerating) {
        // 生成失败
        clearInterval(progressTimer);
        clearInterval(pollTimer);
        setIsLoading(false);
        toast.error('语音生成失败，请重试');
      }
    }, 3000);

    // 10分钟超时
    setTimeout(() => {
      clearInterval(progressTimer);
      clearInterval(pollTimer);
      if (isLoading) {
        setIsLoading(false);
        toast.error('语音生成超时，请重试');
      }
    }, 600000);
  };

  // 开始语音合成
  const startSynthesis = async () => {
    if (!chapterContent.trim()) {
      toast.error('章节内容为空，无法生成语音');
      return;
    }

    // 检查缓存中是否已有该章节的语音
    const cachedAudioUrl = AudioCache.get(chapterId);
    if (cachedAudioUrl) {
      setAudioUrl(cachedAudioUrl);
      toast.success('已加载缓存的语音文件！');
      return;
    }

    // 标记为正在生成
    AudioCache.setGenerating(chapterId);
    setIsLoading(true);
    setLoadingProgress(0);
    
    // 进度更新 - 每3秒更新一次
    let progressValue = 0;
    const progressTimer = setInterval(() => {
      progressValue += Math.random() * 3 + 2; // 每次增加2-5%
      if (progressValue >= 95) {
        progressValue = 95; // 保持在95%，等待实际完成
        clearInterval(progressTimer);
      }
      setLoadingProgress(progressValue);
    }, 3000); // 每3秒更新一次

    try {
      const audioUrl = await ttsService.synthesizeText(chapterContent, {
        voice: 3, // 度逍遥
        speed: 5,
        pitch: 5,
        volume: 8
      });
      
      // 缓存生成的语音URL
      AudioCache.set(chapterId, audioUrl);
      
      setAudioUrl(audioUrl);
      setLoadingProgress(100);
      toast.success('语音合成完成！');
    } catch (error) {
      console.error('语音合成失败:', error);
      toast.error(error instanceof Error ? error.message : '语音合成失败，请重试');
    } finally {
      clearInterval(progressTimer);
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  // 播放/暂停
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // 跳转到指定时间
  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // 快进/快退
  const skip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      seekTo(newTime);
    }
  };

  // 设置音量
  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  // 静音/取消静音
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // 设置播放速度
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // 清除当前章节缓存并重新生成
  const clearCacheAndRegenerate = () => {
    AudioCache.set(chapterId, ''); // 清除缓存
    setAudioUrl(null);
    startSynthesis();
    toast.info('已清除缓存，正在重新生成语音');
  };

  // 格式化时间
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // 组件打开时自动开始合成
  useEffect(() => {
    if (isOpen && !audioUrl && !isLoading) {
      startSynthesis();
    }
  }, [isOpen]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            听书 - {chapterTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 缓存状态提示 */}
          {!isLoading && audioUrl && AudioCache.has(chapterId) && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                  已缓存
                </Badge>
                <span className="text-sm text-green-700 dark:text-green-300">
                  该章节语音已缓存
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCacheAndRegenerate}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                重新生成
              </Button>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>正在合成语音...</span>
              </div>
              <Progress value={loadingProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                请稍候，正在为您生成高质量的语音内容（最多等待10分钟）
              </p>

            </div>
          )}

          {/* 音频播放器 */}
          {audioUrl && !isLoading && (
            <div className="space-y-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                className="hidden"
              />

              {/* 进度条 */}
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1}
                  onValueChange={(value) => seekTo(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* 播放控制 */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => skip(-10)}
                  disabled={currentTime <= 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seekTo(0)}
                  disabled={currentTime <= 0}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  onClick={togglePlayPause}
                  className="rounded-full w-12 h-12"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => skip(10)}
                  disabled={currentTime >= duration}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* 音量控制 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
              </div>

              {/* 播放速度 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">播放速度:</span>
                <div className="flex gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <Badge
                      key={rate}
                      variant={playbackRate === rate ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => handlePlaybackRateChange(rate)}
                    >
                      {rate}x
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 错误状态重试 */}
          {!isLoading && !audioUrl && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">语音合成失败</p>
              <Button onClick={startSynthesis}>
                重新生成
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AudioPlayer;