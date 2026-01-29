import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Sparkles, BookOpen, GitBranch, Loader2, Info, CheckCircle2, Coins } from 'lucide-react';
import { getCurrentUser, getCreditCosts } from '@/db/api';
import { getUserNovelsForParallel, getNovelForParallel, continueParallelChapters, generateParallelChapterContent } from '@/db/parallel-api';
import type { DbNovel, DbUser } from '@/types/database';
import { getNovelGenreLabel } from '@/utils/novel-type-mapper';
import { useCredits } from '@/hooks/useCredits';

type GenerationStage = 'idle' | 'outline' | 'content' | 'completed';

export default function ParallelWorldPage() {
  const navigate = useNavigate();
  const { deduct: deductCredits } = useCredits();
  
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [novels, setNovels] = useState<(DbNovel & { source?: string })[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<(DbNovel & { source?: string }) | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [creationRequirement, setCreationRequirement] = useState('');
  const [chapterCount, setChapterCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [creditCost, setCreditCost] = useState<number>(8); // 默认8码分
  
  // 新增：生成阶段管理
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [newNovelId, setNewNovelId] = useState<string>('');
  const [currentGeneratingChapter, setCurrentGeneratingChapter] = useState<number>(0);
  const [totalChaptersToGenerate, setTotalChaptersToGenerate] = useState<number>(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // 添加页面离开前的确认提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCreating) {
        e.preventDefault();
        e.returnValue = '章节正在生成中，离开页面将中断生成过程。确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isCreating]);

  useEffect(() => {
    loadUserAndNovels();
  }, []);

  // 获取积分价格
  useEffect(() => {
    const fetchCreditCost = async () => {
      try {
        const costs = await getCreditCosts();
        setCreditCost(costs.parallel_world_cost);
        console.log('✅ [平行世界] 获取积分消耗:', costs.parallel_world_cost);
      } catch (error) {
        console.error('❌ [平行世界] 获取积分价格失败:', error);
        // 使用默认值8码分
        setCreditCost(8);
      }
    };
    fetchCreditCost();
  }, []);

  const loadUserAndNovels = async () => {
    try {
      setIsLoading(true);
      
      // 获取当前用户
      const authUser = await getCurrentUser();
      if (!authUser) {
        toast.error('请先登录');
        navigate('/');
        return;
      }
      
      // 获取用户完整信息
      const { getUserProfile } = await import('@/db/api');
      const userProfile = await getUserProfile(authUser.id);
      setCurrentUser(userProfile);

      // 获取用户的小说列表
      const novelList = await getUserNovelsForParallel(authUser.id);
      setNovels(novelList);
      
      console.log('[平行世界页面] 加载完成，小说数量:', novelList.length);
    } catch (error) {
      console.error('[平行世界页面] 加载失败:', error);
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取小说来源标签
  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'own':
        return { text: '我的', color: 'bg-blue-500' };
      case 'free':
        return { text: '免费', color: 'bg-green-500' };
      case 'purchased':
        return { text: '已购', color: 'bg-orange-500' };
      default:
        return { text: '未知', color: 'bg-gray-500' };
    }
  };

  const handleNovelSelect = async (novelId: string) => {
    try {
      setIsLoadingChapters(true);
      setSelectedNovel(null); // 先清空之前的选择
      
      // 从novels列表中找到对应的小说（包含source信息）
      const novelWithSource = novels.find(n => n.id === novelId);
      
      const novel = await getNovelForParallel(novelId);
      if (novel) {
        // 保留source信息
        const novelData = {
          ...novel,
          source: novelWithSource?.source
        };
        setSelectedNovel(novelData);
        const totalChapters = novel.chapters_data?.length || 0;
        setSelectedChapter(totalChapters > 0 ? totalChapters : 1);
        setCreationRequirement('');
        console.log('[平行世界页面] 选择小说:', novel.novel_title, '总章节数:', totalChapters, '来源:', novelWithSource?.source);
      }
    } catch (error) {
      console.error('[平行世界页面] 选择小说失败:', error);
      toast.error('加载小说失败');
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleCreateParallel = async () => {
    if (!selectedNovel || !currentUser) {
      toast.error('请选择小说');
      return;
    }

    if (!creationRequirement.trim()) {
      toast.error('请输入二创需求');
      return;
    }

    if (chapterCount < 1 || chapterCount > 5) {
      toast.error('请输入有效的章节数量（1-5章）');
      return;
    }

    // 扣减码分
    const success = await deductCredits(currentUser.id, 'parallel_world', '平行世界创作');
    if (!success) {
      return;
    }

    try {
      setIsCreating(true);
      setGenerationStage('outline');
      console.log('[平行世界页面] ========== 第一阶段：生成章节大纲 ==========');
      console.log('  - 源小说ID:', selectedNovel.id);
      console.log('  - 起始章节:', selectedChapter);
      console.log('  - 用户ID:', currentUser.id);
      console.log('  - 二创需求:', creationRequirement);
      console.log('  - 生成章节数:', chapterCount);

      // 第一阶段：生成章节大纲
      toast.info(`正在生成${chapterCount}章平行世界章节大纲，请稍候...`, {
        duration: 10000,
      });

      const createdNovelId = await continueParallelChapters(
        selectedNovel.id,
        selectedChapter,
        currentUser.id,
        creationRequirement,
        chapterCount
      );

      console.log('[平行世界页面] 第一阶段完成，新小说ID:', createdNovelId);
      toast.success('章节大纲生成成功！开始生成章节详细内容...');
      
      // 保存新小说ID和章节信息
      setNewNovelId(createdNovelId);
      setTotalChaptersToGenerate(chapterCount);
      setGenerationStage('content');

      // 第二阶段：逐章生成详细内容
      console.log('[平行世界页面] ========== 第二阶段：生成章节详细内容 ==========');
      
      for (let i = 0; i < chapterCount; i++) {
        const chapterNumber = selectedChapter + i;
        setCurrentGeneratingChapter(i + 1);
        
        console.log(`[平行世界页面] 正在生成第${chapterNumber}章详细内容 (${i + 1}/${chapterCount})...`);
        
        try {
          await generateParallelChapterContent(createdNovelId, chapterNumber);
          console.log(`[平行世界页面] 第${chapterNumber}章生成并保存成功`);
        } catch (error) {
          console.error(`[平行世界页面] 第${chapterNumber}章生成失败:`, error);
          toast.error(`第${chapterNumber}章生成失败，但其他章节将继续生成`);
        }
      }

      // 全部完成
      console.log('[平行世界页面] ========== 所有章节生成完成 ==========');
      setGenerationStage('completed');
      setShowCompletionDialog(true);
      
    } catch (error) {
      console.error('[平行世界页面] 创作失败:', error);
      const errorMessage = error instanceof Error ? error.message : '创作失败，请重试';
      toast.error(errorMessage);
      setGenerationStage('idle');
    } finally {
      setIsCreating(false);
    }
  };

  // 处理完成对话框的确认按钮
  const handleCompletionConfirm = () => {
    setShowCompletionDialog(false);
    navigate(`/novel/${newNovelId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br via-red-50 to-pink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5724]" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br via-red-50 to-pink-50 py-4 md:py-8">
      {/* 装饰元素 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Sparkles className="absolute top-20 left-10 text-orange-300 w-8 h-8 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 text-red-300 w-6 h-6 animate-pulse delay-100" />
        <GitBranch className="absolute bottom-40 left-20 text-orange-400 w-10 h-10 animate-pulse delay-200" />
        <BookOpen className="absolute bottom-20 right-10 text-red-300 w-8 h-8 animate-pulse delay-300" />
      </div>
      <div className="container mx-auto px-2 sm:px-4 max-w-6xl relative z-10">
        {/* 页面标题 */}
        <div className="mb-6 md:mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GitBranch className="h-8 w-8 md:h-10 md:w-10 text-[#FF5724]" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent">
              平行世界
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-600">基于现有小说，创造全新的故事分支</p>
        </div>

        {/* 功能说明 */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#FF5724]">
              <Info className="h-5 w-5" />
              功能说明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>• 选择一部小说和起始章节，从该章节开始进行平行世界二创</p>

            <p>• 输入您的二创需求，描述新的故事发展方向和情节变化</p>
            <p>• 系统会基于前面章节的内容和您的需求，AI生成新的章节</p>
            <p>• 新小说归属于您，与原作者的小说完全独立</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：小说选择和章节选择 */}
          <div className="space-y-6">
            {/* 小说选择 */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#FF5724]">
                  <BookOpen className="h-5 w-5" />
                  选择小说
                </CardTitle>
                <CardDescription>选择要进行平行世界二创的小说</CardDescription>
              </CardHeader>
              <CardContent>
                {novels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>暂无可用于二创的小说</p>
                    <p className="text-sm mt-2">您可以创作自己的小说，或者查看社区中的免费小说</p>
                    <div className="flex gap-3 justify-center mt-4">
                      <Button
                        onClick={() => navigate('/')}
                        variant="outline"
                      >
                        去创作小说
                      </Button>
                      <Button
                        onClick={() => navigate('/novels')}
                        variant="outline"
                      >
                        浏览社区小说
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select onValueChange={handleNovelSelect} disabled={isCreating}>
                    <SelectTrigger disabled={isCreating}>
                      <SelectValue placeholder="请选择小说" />
                    </SelectTrigger>
                    <SelectContent>
                      {novels.map((novel) => {
                        const sourceLabel = getSourceLabel(novel.source);
                        return (
                          <SelectItem key={novel.id} value={novel.id}>
                            <div className="flex items-center gap-2">
                              <span>{novel.novel_title}</span>
                              <Badge 
                                variant="outline" 
                                className={`ml-2 text-white ${sourceLabel.color}`}
                              >
                                {sourceLabel.text}
                              </Badge>
                              {novel.novel_type && (
                                <Badge variant="outline" className="ml-1">
                                  {getNovelGenreLabel(novel.novel_type)}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                {/* 加载章节中的提示 */}
                {isLoadingChapters && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex items-center justify-center gap-2 text-[#FF5724]">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-medium">加载章节中...</span>
                    </div>
                  </div>
                )}

                {selectedNovel && !isLoadingChapters && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex items-start gap-3">
                      {selectedNovel.novel_thumb && (
                        <img
                          src={selectedNovel.novel_thumb}
                          alt={selectedNovel.novel_title}
                          className="w-16 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {selectedNovel.novel_title}
                          </h3>
                          {selectedNovel.source && (
                            <Badge 
                              variant="outline" 
                              className={`text-white ${getSourceLabel(selectedNovel.source).color}`}
                            >
                              {getSourceLabel(selectedNovel.source).text}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {selectedNovel.novel_content}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-gray-500" style={{ fontSize: '0.85rem', lineHeight: '1.2rem' }}>
                          <span>章节数: {selectedNovel.chapters_data?.length || 0}</span>
                          {selectedNovel.novel_type && (
                            <Badge variant="outline" style={{ fontSize: '0.85rem', lineHeight: '1.2rem' }}>
                              {getNovelGenreLabel(selectedNovel.novel_type)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 章节选择 */}
            {selectedNovel && !isLoadingChapters && selectedNovel.chapters_data && selectedNovel.chapters_data.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#FF5724]">
                    <GitBranch className="h-5 w-5" />
                    选择起始章节
                  </CardTitle>
                  <CardDescription>从哪个章节开始进行平行世界二创</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>起始章节</Label>
                    <Select
                      value={selectedChapter.toString()}
                      onValueChange={(value) => setSelectedChapter(Number.parseInt(value))}
                      disabled={isCreating}
                    >
                      <SelectTrigger disabled={isCreating}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedNovel.chapters_data.map((chapter) => (
                          <SelectItem
                            key={chapter.chapter_number}
                            value={chapter.chapter_number.toString()}
                          >
                            第{chapter.chapter_number}章：{chapter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-gray-500 mt-2" style={{ fontSize: '0.85rem', lineHeight: '1.2rem' }}>
                      从第{selectedChapter}章开始创作新的故事发展
                    </p>
                  </div>

                  {/* 章节简介预览 */}
                  {selectedNovel.simple_context && selectedNovel.simple_context.length > 0 && (
                    <div className="hidden mt-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        前面章节简介：
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedNovel.simple_context
                          .filter((ctx) => ctx.chapter_number < selectedChapter)
                          .map((ctx) => (
                            <div key={ctx.chapter_number} style={{ fontSize: '0.85rem', lineHeight: '1.2rem' }}>
                              <span className="font-medium text-[#FF5724]">
                                第{ctx.chapter_number}章：
                              </span>
                              <span className="text-gray-600">{ctx.summary}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：二创需求输入 */}
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#FF5724]">
                  <Sparkles className="h-5 w-5" />
                  二创需求
                </CardTitle>
                <CardDescription>描述新的故事发展方向和情节变化</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">

                  <Textarea
                    id="creationRequirement"
                    value={creationRequirement}
                    onChange={(e) => setCreationRequirement(e.target.value)}
                    placeholder="请描述您希望的故事发展方向，例如：&#10;- 主角在这里遇到了新的挑战...&#10;- 情节发生了意想不到的转折...&#10;- 角色关系出现了新的变化..."
                    rows={8}
                    disabled={!selectedNovel || isCreating}
                  />
                  <p className="text-xs text-gray-500">
                    系统会基于前面章节的内容和您的需求，生成新的章节
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapterCount">生成章节数</Label>
                  <Select
                    value={chapterCount.toString()}
                    onValueChange={(value) => setChapterCount(Number.parseInt(value))}
                    disabled={!selectedNovel || isCreating}
                  >
                    <SelectTrigger disabled={!selectedNovel || isCreating}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((count) => (
                        <SelectItem key={count} value={count.toString()}>
                          {count}章
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    建议生成1-5章，章节详细内容将在小说详情页自动生成
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h4 className="text-sm font-semibold text-[#E64A1F] mb-2">提示：</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• 将创建一部新的小说作品，归属于您</li>
                    <li>• 系统会自动生成章节简介和详细内容</li>
                    <li>• 新小说会在源小说详情页的平行世界列表中展示</li>
                    <li>• 生成时间较长，请耐心等待</li>
                  </ul>
                </div>

                {/* 积分消耗提示 */}
                <div className="flex items-center justify-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <Coins className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-900">
                    本次创作将消耗 <span className="font-bold text-orange-600">{creditCost}</span> 码分
                  </span>
                </div>

                <Button
                  onClick={handleCreateParallel}
                  disabled={!selectedNovel || isCreating || !creationRequirement.trim()}
                  className="w-full bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {generationStage === 'outline' && '正在生成章节大纲...'}
                      {generationStage === 'content' && `正在生成第${currentGeneratingChapter}章内容...`}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      开始创作平行世界 ({creditCost}码分)
                    </>
                  )}
                </Button>
                
                {isCreating && (
                  <div className="mt-4 space-y-3">
                    {generationStage === 'outline' && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-[#FF5724] flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-gray-700">
                            <p className="font-semibold mb-1 text-[#FF5724]">第一阶段：生成章节大纲</p>
                            <p>系统正在为您创作{chapterCount}章的章节大纲，这可能需要1-2分钟时间。</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {generationStage === 'content' && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
                        <div className="flex items-start gap-2">
                          <Loader2 className="h-5 w-5 text-[#FF5724] flex-shrink-0 mt-0.5 animate-spin" />
                          <div className="text-sm text-gray-700">
                            <p className="font-semibold mb-1 text-[#FF5724]">第二阶段：生成章节详细内容</p>
                            <p>正在生成第 {currentGeneratingChapter} / {totalChaptersToGenerate} 章</p>
                          </div>
                        </div>
                        <Progress 
                          value={(currentGeneratingChapter / totalChaptersToGenerate) * 100} 
                          className="h-2"
                        />
                        <p className="text-xs text-gray-600">
                          每章生成后会自动保存，请耐心等待...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* 完成对话框 */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <DialogTitle>平行世界创作完成！</DialogTitle>
            </div>
            <DialogDescription className="space-y-2">
              <p>恭喜！您的平行世界小说已经创作完成。</p>
              <p className="text-sm">
                • 已生成 {totalChaptersToGenerate} 章节大纲<br />
                • 已生成 {totalChaptersToGenerate} 章节详细内容<br />
                • 所有内容已自动保存
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={handleCompletionConfirm}
              className="w-full bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white"
            >
              查看小说详情
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
