import React, { useState, useEffect } from 'react';
import { addCacheBuster } from "@/utils/cache-buster";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image, Loader2, RefreshCw, Play, Pause, Square, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useCredits } from '@/hooks/useCredits';
import { getCreditCosts } from '@/db/api';
import type { Novel, NovelChapter, ComicPanel } from '@/types/novel';

interface ComicGeneratorProps {
  novel: Novel;
  selectedChapter?: NovelChapter;
  comicPanels: ComicPanel[];
  onComicGenerated: (panels: ComicPanel[]) => void;
  onComicPanelsUpdate: (panels: ComicPanel[]) => void;
  onEnterReadingMode?: (chapterIndex: number) => void;
  onGeneratingStatusChange?: (isGenerating: boolean) => void;
  userId?: string; // 添加用户ID
}

const ComicGenerator: React.FC<ComicGeneratorProps> = ({
  novel,
  selectedChapter,
  comicPanels,
  onComicGenerated,
  onComicPanelsUpdate,
  onEnterReadingMode,
  onGeneratingStatusChange,
  userId
}) => {
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState(-1);
  const [batchSize, setBatchSize] = useState('5');
  const [pendingPanels, setPendingPanels] = useState<ComicPanel[]>([]);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [panelTimeouts, setPanelTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [panelStartTimes, setPanelStartTimes] = useState<Map<string, number>>(new Map());
  const [editingPanel, setEditingPanel] = useState<ComicPanel | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [comicGenerationCost, setComicGenerationCost] = useState<number>(10); // 漫画生成消耗
  const { createImageTask, getTaskStatus } = useImageGeneration();
  const { deduct: deductCredits, deductByQuantity } = useCredits();

  // 获取漫画生成消耗
  useEffect(() => {
    const fetchComicGenerationCost = async () => {
      try {
        const costs = await getCreditCosts();
        setComicGenerationCost(costs.comic_generation_cost);
        console.log('✅ [漫画生成] 获取积分消耗:', costs.comic_generation_cost);
      } catch (error) {
        console.error('❌ [漫画生成] 获取积分消耗失败:', error);
        // 使用默认值10码分
        setComicGenerationCost(10);
      }
    };
    fetchComicGenerationCost();
  }, []);

  useEffect(() => {
    if (selectedChapter) {
      setSelectedChapters([selectedChapter.id]);
    }
  }, [selectedChapter]);

  // 组件卸载时清理所有超时定时器
  useEffect(() => {
    return () => {
      panelTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      setPanelTimeouts(new Map());
      console.log('🧹 清理所有分镜生成超时定时器');
    };
  }, []);

  // 通知父组件分镜生成状态变化
  useEffect(() => {
    onGeneratingStatusChange?.(isGenerating);
  }, [isGenerating, onGeneratingStatusChange]);

  // 实时更新分镜状态并检查是否需要生成下一个
  useEffect(() => {
    const interval = setInterval(() => {
      // 更新 comicPanels 状态
      const updatedComicPanels = comicPanels.map(panel => {
        if (panel.taskId && panel.status === 'generating') {
          const task = getTaskStatus(panel.taskId);
          if (task) {
            if (task.status === 'SUCCESS' && task.imageUrl) {
              // 清除超时定时器
              const timeoutId = panelTimeouts.get(panel.id);
              if (timeoutId) {
                clearTimeout(timeoutId);
                setPanelTimeouts(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(panel.id);
                  return newMap;
                });
              }
              
              // 计算生成时间
              const startTime = panelStartTimes.get(panel.id);
              if (startTime) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`✅ 分镜 ${panel.id} 生成成功，耗时 ${duration} 秒`);
              }
              
              return { ...panel, imageUrl: task.imageUrl, status: 'completed' as const };
            } else if (task.status === 'FAILED') {
              // 清除超时定时器
              const timeoutId = panelTimeouts.get(panel.id);
              if (timeoutId) {
                clearTimeout(timeoutId);
                setPanelTimeouts(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(panel.id);
                  return newMap;
                });
              }
              
              console.error(`❌ 分镜 ${panel.id} 生成失败: ${task.error || '未知错误'}`);
              return { ...panel, status: 'failed' as const, error: task.error || '生成失败' };
            }
          }
        }
        return panel;
      });

      // 同时更新 pendingPanels 状态
      const updatedPendingPanels = pendingPanels.map(panel => {
        if (panel.taskId && panel.status === 'generating') {
          const task = getTaskStatus(panel.taskId);
          if (task) {
            if (task.status === 'SUCCESS' && task.imageUrl) {
              // 清除超时定时器
              const timeoutId = panelTimeouts.get(panel.id);
              if (timeoutId) {
                clearTimeout(timeoutId);
                setPanelTimeouts(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(panel.id);
                  return newMap;
                });
              }
              
              return { ...panel, imageUrl: task.imageUrl, status: 'completed' as const };
            } else if (task.status === 'FAILED') {
              // 清除超时定时器
              const timeoutId = panelTimeouts.get(panel.id);
              if (timeoutId) {
                clearTimeout(timeoutId);
                setPanelTimeouts(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(panel.id);
                  return newMap;
                });
              }
              
              return { ...panel, status: 'failed' as const, error: task.error || '生成失败' };
            }
          }
        }
        return panel;
      });

      // 只有当状态真的改变时才更新
      if (JSON.stringify(updatedComicPanels) !== JSON.stringify(comicPanels)) {
        onComicPanelsUpdate(updatedComicPanels);
      }
      
      if (JSON.stringify(updatedPendingPanels) !== JSON.stringify(pendingPanels)) {
        setPendingPanels(updatedPendingPanels);
      }
    }, 3000); // 每3秒检查一次状态

    return () => clearInterval(interval);
  }, [comicPanels, pendingPanels, getTaskStatus, onComicPanelsUpdate, panelTimeouts, panelStartTimes]);

  // 监听当前分镜完成状态，自动生成下一个
  useEffect(() => {
    if (!isGenerating || pendingPanels.length === 0) return;

    const currentPanel = pendingPanels[currentPanelIndex];
    if (currentPanel && (currentPanel.status === 'completed' || currentPanel.status === 'failed')) {
      if (currentPanelIndex < pendingPanels.length - 1) {
        console.log(`分镜 ${currentPanelIndex + 1} 已完成，2秒后开始生成下一个分镜`);
        setTimeout(() => {
          setCurrentPanelIndex(prev => prev + 1);
        }, 2000);
      } else {
        console.log('所有分镜生成完成');
        setIsGenerating(false);
        setCurrentGeneratingIndex(-1);
      }
    }
  }, [pendingPanels, isGenerating, currentPanelIndex]);

  // 顺序生成分镜的逻辑
  useEffect(() => {
    if (!isGenerating || pendingPanels.length === 0 || currentPanelIndex >= pendingPanels.length) {
      return;
    }

    const currentPanel = pendingPanels[currentPanelIndex];
    if (currentPanel && currentPanel.status === 'pending') {
      console.log(`开始生成第 ${currentPanelIndex + 1} 个分镜`);
      generateSinglePanel(currentPanel);
    }
  }, [isGenerating, pendingPanels, currentPanelIndex]);

  const generateSinglePanel = async (panel: ComicPanel) => {
    console.log(`🎬 开始生成分镜: ${panel.description}`);
    
    const prompt = `漫画风格分镜插画，${panel.description}，漫画分镜，高质量插画，细节丰富，专业漫画制作，4:3比例`;
    
    // 记录开始时间
    const startTime = Date.now();
    setPanelStartTimes(prev => new Map(prev.set(panel.id, startTime)));
    
    // 设置50秒超时
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ 分镜 ${panel.id} 生成超时（超过50秒），标记为失败并继续下一张`);
      const failedPanel = { 
        ...panel, 
        status: 'failed' as const, 
        error: '生成超时（超过50秒）' 
      };
      
      // 更新 pendingPanels 中的状态
      setPendingPanels(prev => 
        prev.map(p => p.id === panel.id ? failedPanel : p)
      );
      
      // 更新 comicPanels 中的状态
      const existing = comicPanels.find(p => p.id === panel.id);
      if (existing) {
        onComicPanelsUpdate(comicPanels.map(p => p.id === panel.id ? failedPanel : p));
      } else {
        onComicPanelsUpdate([...comicPanels, failedPanel]);
      }
      
      // 清理超时记录
      setPanelTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(panel.id);
        return newMap;
      });
    }, 50000); // 50秒超时
    
    setPanelTimeouts(prev => new Map(prev.set(panel.id, timeoutId)));
    
    try {
      const taskId = await createImageTask(prompt);
      const updatedPanel = { ...panel, taskId, status: 'generating' as const };
      
      // 更新 pendingPanels 中的状态
      setPendingPanels(prev => 
        prev.map(p => p.id === panel.id ? updatedPanel : p)
      );
      
      // 更新 comicPanels 中的状态
      const existing = comicPanels.find(p => p.id === panel.id);
      if (existing) {
        onComicPanelsUpdate(comicPanels.map(p => p.id === panel.id ? updatedPanel : p));
      } else {
        onComicPanelsUpdate([...comicPanels, updatedPanel]);
      }
      
    } catch (error) {
      console.error('❌ 生成分镜失败:', error);
      
      // 清除超时定时器
      const timeoutId = panelTimeouts.get(panel.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        setPanelTimeouts(prev => {
          const newMap = new Map(prev);
          newMap.delete(panel.id);
          return newMap;
        });
      }
      
      const failedPanel = { ...panel, status: 'failed' as const, error: error instanceof Error ? error.message : '生成失败' };
      
      setPendingPanels(prev => 
        prev.map(p => p.id === panel.id ? failedPanel : p)
      );
      
      const existing = comicPanels.find(p => p.id === panel.id);
      if (existing) {
        onComicPanelsUpdate(comicPanels.map(p => p.id === panel.id ? failedPanel : p));
      } else {
        onComicPanelsUpdate([...comicPanels, failedPanel]);
      }
    }
  };

  const handleChapterSelection = (chapterId: string, checked: boolean) => {
    if (checked) {
      setSelectedChapters(prev => [...prev, chapterId]);
    } else {
      setSelectedChapters(prev => prev.filter(id => id !== chapterId));
    }
  };

  const generateComicPanels = async () => {
    if (selectedChapters.length === 0) return;

    // 检查用户ID
    if (!userId) {
      toast.error('请先登录');
      return;
    }

    console.log('开始准备分镜生成，选中章节:', selectedChapters.length);
    
    // 准备所有待生成的分镜
    const allPanels: ComicPanel[] = [];
    
    for (const chapterId of selectedChapters) {
      const chapter = novel.chapters.find(c => c.id === chapterId);
      if (!chapter) continue;

      console.log(`准备章节: ${chapter.title}`);
      
      // 将章节内容分割成分镜
      const panels = splitChapterIntoPanels(chapter, parseInt(batchSize));
      console.log(`章节 ${chapter.title} 分割成 ${panels.length} 个分镜`);
      
      allPanels.push(...panels);
    }

    if (allPanels.length === 0) {
      console.log('没有分镜需要生成');
      return;
    }

    console.log(`总共准备生成 ${allPanels.length} 个分镜，将按顺序逐个生成`);

    // 按图片数量扣减码分
    const success = await deductByQuantity(userId, 'panel_creation', allPanels.length, `分镜创作（${allPanels.length}张）`);
    if (!success) {
      // 码分不足，useCredits hook 会显示提示
      return;
    }
    
    // 设置待生成的分镜列表
    setPendingPanels(allPanels);
    setCurrentPanelIndex(0);
    setIsGenerating(true);
    setCurrentGeneratingIndex(0);
  };

  // 重新生成失败的分镜
  const regenerateFailedPanels = async () => {
    // 找出所有失败的分镜
    const failedPanels = comicPanels.filter(panel => panel.status === 'failed');
    
    if (failedPanels.length === 0) {
      console.log('没有失败的分镜需要重新生成');
      return;
    }

    console.log(`找到 ${failedPanels.length} 个失败的分镜，将按顺序重新生成`);

    // 检查用户ID
    if (!userId) {
      toast.error('请先登录');
      return;
    }

    // 按图片数量扣减码分
    const success = await deductByQuantity(userId, 'panel_creation', failedPanels.length, `重新生成分镜（${failedPanels.length}张）`);
    if (!success) {
      // 码分不足，useCredits hook 会显示提示
      return;
    }
    
    // 重置失败分镜的状态为pending
    const resetPanels = failedPanels.map(panel => ({
      ...panel,
      status: 'pending' as const,
      error: undefined,
      taskId: undefined,
      imageUrl: undefined
    }));

    // 更新comicPanels中失败分镜的状态
    const updatedComicPanels = comicPanels.map(panel => {
      const resetPanel = resetPanels.find(rp => rp.id === panel.id);
      return resetPanel || panel;
    });
    onComicPanelsUpdate(updatedComicPanels);

    // 设置待生成的分镜列表（只包含失败的分镜）
    setPendingPanels(resetPanels);
    setCurrentPanelIndex(0);
    setIsGenerating(true);
    setCurrentGeneratingIndex(0);
  };

  const splitChapterIntoPanels = (chapter: NovelChapter, maxPanels: number): ComicPanel[] => {
    const sentences = chapter.content
      .split(/[。！？]/)
      .filter(s => s.trim().length > 10)
      .slice(0, maxPanels);
    
    return sentences.map((sentence, index) => ({
      id: `panel-${chapter.id}-${index}`,
      chapterId: chapter.id,
      order: index + 1,
      description: `${chapter.title}：${sentence.trim()}`,
      status: 'pending' as const,
      createdAt: new Date(),
    }));
  };

  const stopGeneration = () => {
    setIsGenerating(false);
    setCurrentGeneratingIndex(-1);
    setPendingPanels([]);
    setCurrentPanelIndex(0);
    console.log('用户停止了分镜生成');
  };

  const regeneratePanel = async (panel: ComicPanel) => {
    console.log(`🔄 重新生成分镜: ${panel.description}`);
    const prompt = `漫画风格分镜插画，${panel.description}，漫画分镜，高质量插画，细节丰富，专业漫画制作，4:3比例`;
    
    // 记录开始时间
    const startTime = Date.now();
    setPanelStartTimes(prev => new Map(prev.set(panel.id, startTime)));
    
    // 设置50秒超时
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ 分镜 ${panel.id} 重新生成超时（超过50秒）`);
      const failedPanel = { 
        ...panel, 
        status: 'failed' as const, 
        error: '重新生成超时（超过50秒）',
        imageUrl: undefined 
      };
      
      onComicPanelsUpdate(comicPanels.map(p => p.id === panel.id ? failedPanel : p));
      
      // 清理超时记录
      setPanelTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(panel.id);
        return newMap;
      });
    }, 50000); // 50秒超时
    
    setPanelTimeouts(prev => new Map(prev.set(panel.id, timeoutId)));
    
    try {
      const taskId = await createImageTask(prompt);
      const updatedPanel = { ...panel, taskId, status: 'generating' as const, imageUrl: undefined, error: undefined };
      
      onComicPanelsUpdate(comicPanels.map(p => p.id === panel.id ? updatedPanel : p));
      
    } catch (error) {
      console.error('❌ 重新生成分镜失败:', error);
      
      // 清除超时定时器
      const timeoutId = panelTimeouts.get(panel.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        setPanelTimeouts(prev => {
          const newMap = new Map(prev);
          newMap.delete(panel.id);
          return newMap;
        });
      }
      
      const failedPanel = { ...panel, status: 'failed' as const, error: error instanceof Error ? error.message : '重新生成失败' };
      onComicPanelsUpdate(comicPanels.map(p => p.id === panel.id ? failedPanel : p));
    }
  };

  // 打开编辑对话框
  const handleEditPanel = (panel: ComicPanel) => {
    setEditingPanel(panel);
    setEditedDescription(panel.description);
    setIsEditDialogOpen(true);
  };

  // 保存编辑并重新生成
  const handleSaveAndRegenerate = async () => {
    if (!editingPanel || !editedDescription.trim()) {
      toast.error('分镜描述不能为空');
      return;
    }

    // 更新分镜描述
    const updatedPanel = { ...editingPanel, description: editedDescription.trim() };
    onComicPanelsUpdate(comicPanels.map(p => p.id === editingPanel.id ? updatedPanel : p));
    
    toast.success('分镜描述已更新，开始重新生成...');
    
    // 关闭对话框
    setIsEditDialogOpen(false);
    setEditingPanel(null);
    setEditedDescription('');
    
    // 重新生成分镜
    await regeneratePanel(updatedPanel);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingPanel(null);
    setEditedDescription('');
  };

  const handlePanelClick = (panel: ComicPanel) => {
    // 检查屏幕尺寸，小于460px时不触发阅读模式
    if (window.innerWidth < 460) {
      return;
    }
    
    if (panel.status === 'completed' && panel.imageUrl && onEnterReadingMode) {
      // 找到该分镜所属章节的索引
      const chapterIndex = novel.chapters.findIndex(chapter => chapter.id === panel.chapterId);
      if (chapterIndex !== -1) {
        onEnterReadingMode(chapterIndex);
      }
    }
  };

  const getTaskProgress = (panel: ComicPanel) => {
    if (!panel.taskId) return 0;
    const task = getTaskStatus(panel.taskId);
    return task ? task.progress * 100 : 0;
  };

  const getStatusBadge = (status: ComicPanel['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">等待中</Badge>;
      case 'generating':
        return <Badge variant="default">生成中</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">已完成</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 漫画生成控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Image className="h-5 w-5" />
            漫画分镜生成器
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 章节选择 */}
          <div>
            <h3 className="font-medium mb-3">选择章节</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {novel.chapters.map((chapter) => (
                <div key={chapter.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={chapter.id}
                    checked={selectedChapters.includes(chapter.id)}
                    onCheckedChange={(checked) => 
                      handleChapterSelection(chapter.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={chapter.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {chapter.title}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 生成设置 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">每章分镜数量:</label>
              <Select value={batchSize} onValueChange={setBatchSize}>
                <SelectTrigger className="w-20" style={{ height: '2.25rem' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 生成按钮 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={generateComicPanels}
                disabled={isGenerating || selectedChapters.length === 0}
                className="flex-1"
                style={{ height: '3.25rem' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin max-[460px]:hidden" />
                    正在生成第 {currentPanelIndex + 1} 个分镜 (共 {pendingPanels.length} 个)
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4 max-[460px]:hidden" />
                    开始生成漫画分镜 (顺序生成)
                  </>
                )}
              </Button>
              
              {/* 重新生成失败分镜按钮 */}
              {!isGenerating && comicPanels.some(panel => panel.status === 'failed') && (
                <Button
                  onClick={regenerateFailedPanels}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新生成失败分镜 ({comicPanels.filter(panel => panel.status === 'failed').length})
                </Button>
              )}
            
              {isGenerating && (
                <Button
                  variant="outline"
                  onClick={stopGeneration}
                  style={{ height: '3.25rem' }}
                >
                  <Square className="mr-2 h-4 w-4 max-[460px]:hidden" />
                  停止生成
                </Button>
              )}
            </div>
            
            {!isGenerating && (
              <p className="text-sm text-muted-foreground text-center">
                消耗 <span className="font-semibold text-primary">{comicGenerationCost}码分</span>
              </p>
            )}
          </div>

          {/* 生成进度 */}
          {isGenerating && pendingPanels.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>总体进度</span>
                <span>{currentPanelIndex + 1} / {pendingPanels.length}</span>
              </div>
              <Progress 
                value={((currentPanelIndex + 1) / pendingPanels.length) * 100} 
                className="h-2"
              />
              <div className="text-sm text-muted-foreground">
                当前正在生成: {pendingPanels[currentPanelIndex]?.description.slice(0, 50)}...
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* 生成的分镜列表 */}
      {comicPanels.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">生成的分镜</CardTitle>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Play className="h-4 w-4" />
                <span className="font-['MF-d6b16e8f97010e7dfb98acad5cd9eff0'] text-[#2563eb]">分镜多次生成失败可能是内容涉及敏感词</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comicPanels.map((panel) => (
                  <Card key={panel.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">分镜 {panel.order}</span>
                        {getStatusBadge(panel.status)}
                      </div>

                      {/* 分镜图片 */}
                      <div 
                        className={`aspect-video bg-muted rounded-lg mb-3 overflow-hidden ${
                          panel.status === 'completed' && panel.imageUrl 
                            ? 'max-[460px]:cursor-default cursor-pointer max-[460px]:hover:ring-0 hover:ring-2 hover:ring-blue-500 transition-all duration-200 group' 
                            : ''
                        }`}
                        onClick={() => handlePanelClick(panel)}
                      >
                        {panel.imageUrl ? (
                          <div className="relative w-full h-full">
                            <img
                              src={addCacheBuster(panel.imageUrl)}
                              alt={`分镜 ${panel.order}`}
                              className="w-full h-full object-cover max-[460px]:group-hover:scale-100 group-hover:scale-105 transition-transform duration-200"
                              crossOrigin="anonymous"
                            />
                            {panel.status === 'completed' && (
                              <div className="absolute inset-0 bg-black/0 max-[460px]:group-hover:bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                <div className="opacity-0 max-[460px]:group-hover:opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-2">
                                  <Play className="h-6 w-6 text-gray-800" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : panel.status === 'generating' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Image className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* 生成进度 */}
                      {panel.status === 'generating' && panel.taskId && (
                        <div className="mb-3">
                          <Progress value={getTaskProgress(panel)} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(getTaskProgress(panel))}%
                          </p>
                        </div>
                      )}

                      {/* 分镜描述 */}
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
                        {panel.description}
                      </p>

                      {/* 错误信息 */}
                      {panel.status === 'failed' && panel.error && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                          {panel.error}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex gap-2">
                        {panel.status === 'failed' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPanel(panel)}
                              className="flex-1"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              编辑
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => regeneratePanel(panel)}
                              className="flex-1"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              重新生成
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regeneratePanel(panel)}
                            disabled={panel.status === 'generating'}
                            className="flex-1"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            重新生成
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* 编辑分镜对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑分镜描述</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="panel-description">分镜描述</Label>
              <Textarea
                id="panel-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="请输入分镜描述，例如：主角站在山顶，背景是夕阳..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                提示：详细的描述有助于生成更准确的分镜图片。避免使用敏感词汇。
              </p>
            </div>
            {editingPanel && (
              <div className="space-y-2">
                <Label>原始描述</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {editingPanel.description}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              取消
            </Button>
            <Button onClick={handleSaveAndRegenerate}>
              保存并重新生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComicGenerator;