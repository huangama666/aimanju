import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { VipBadge } from '@/components/ui/vip-badge';
import { getCreditCosts } from '@/db/api';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { toast } from 'sonner';
import { Sparkles, Wand2, Loader2, Crown } from 'lucide-react';
import { 
  SakuraPetal, 
  AnimeStar, 
  ComicBubble, 
  ChineseCloud, 
  CuteEmoji, 
  JapaneseFan, 
  ComicSparkle,
  ChineseSeal 
} from '@/components/decorations/AnimeDecorations';
import { createTypewriter, calculateTypewriterDelay, Typewriter } from '@/utils/typewriter';
import type { NovelRequest } from '@/types/novel';
import type { DbUser } from '@/types/database';

interface NovelRequestFormProps {
  onSubmit: (request: NovelRequest) => void;
  isGenerating: boolean;
  initialData?: Partial<NovelRequest>; // 添加初始数据支持
  currentUser: DbUser | null; // 添加用户信息
}

const NovelRequestForm: React.FC<NovelRequestFormProps> = ({ onSubmit, isGenerating, initialData, currentUser }) => {
  const navigate = useNavigate();
  const [isRandomGenerating, setIsRandomGenerating] = useState(false); // 随机生成加载状态
  const [isOptimizing, setIsOptimizing] = useState(false); // 优化指令加载状态
  const [novelGenerationCost, setNovelGenerationCost] = useState<number>(10); // 小说生成消耗
  const typewriterRef = useRef<Typewriter | null>(null); // 打字机实例引用
  
  // 使用权限判断Hook
  const { hasAccess, isMember } = useFeatureAccess(
    currentUser?.membership_level || 'free'
  );
  
  const form = useForm<NovelRequest>({
    defaultValues: {
      genre: initialData?.genre || '',
      style: initialData?.style || '',
      plot: initialData?.plot || '',
      length: initialData?.length || 'short',
      characters: initialData?.characters || '',
      setting: initialData?.setting || '',
    },
  });

  // 获取小说生成消耗
  useEffect(() => {
    const fetchNovelGenerationCost = async () => {
      try {
        const costs = await getCreditCosts();
        setNovelGenerationCost(costs.novel_generation_cost);
        console.log('✅ [小说生成] 获取积分消耗:', costs.novel_generation_cost);
      } catch (error) {
        console.error('❌ [小说生成] 获取积分消耗失败:', error);
        // 使用默认值10码分
        setNovelGenerationCost(10);
      }
    };
    fetchNovelGenerationCost();
  }, []);

  // 当 initialData 变化时更新表单
  React.useEffect(() => {
    if (initialData) {
      console.log('📝 NovelRequestForm - 接收到初始数据:', initialData);
      Object.keys(initialData).forEach((key) => {
        const value = initialData[key as keyof NovelRequest];
        if (value) {
          form.setValue(key as keyof NovelRequest, value);
        }
      });
    }
  }, [initialData, form]);

  // 添加日志以调试isGenerating状态
  React.useEffect(() => {
    console.log('🔘 NovelRequestForm - isGenerating状态变化:', isGenerating);
  }, [isGenerating]);

  // 监控currentUser状态变化
  React.useEffect(() => {
    console.log('👤 NovelRequestForm - currentUser状态变化:', currentUser);
    console.log('👤 NovelRequestForm - currentUser是否存在:', !!currentUser);
    if (currentUser) {
      console.log('👤 NovelRequestForm - 用户ID:', currentUser.id);
      console.log('👤 NovelRequestForm - 用户手机:', currentUser.phone);
    }
  }, [currentUser]);

  // 组件卸载时清理打字机
  React.useEffect(() => {
    return () => {
      if (typewriterRef.current?.isActive()) {
        console.log('🧹 [清理] 组件卸载，停止打字机');
        typewriterRef.current.stop();
      }
    };
  }, []);

  // 处理表单提交
  const handleSubmit = async (data: NovelRequest) => {
    console.log('📝 [表单提交] 开始处理...');
    console.log('表单数据:', data);
    console.log('当前用户状态:', currentUser);
    
    // 直接使用传入的currentUser判断登录状态
    if (!currentUser) {
      console.log('⚠️ [表单提交] 用户未登录，提示点击右上角登录');
      toast.info('请先登录后开始创作，点击右上角登录按钮即可登录', {
        duration: 4000,
      });
      return;
    }
    
    console.log('✅ [表单提交] 用户已登录，继续创作流程');
    onSubmit(data);
  };

  // 随机生成关键情节（带打字机特效）
  const handleRandomGenerate = async () => {
    // 权限检查
    if (!hasAccess) {
      toast.error('此功能为会员专属，请升级会员后使用');
      navigate('/membership');
      return;
    }
    
    // 如果有正在运行的打字机，先停止
    if (typewriterRef.current?.isActive()) {
      typewriterRef.current.stop();
      typewriterRef.current = null;
    }
    
    setIsRandomGenerating(true);
    
    try {
      const genre = form.getValues('genre');
      const style = form.getValues('style');
      
      if (!genre || !style) {
        toast.error('请先选择小说题材和写作风格');
        setIsRandomGenerating(false);
        return;
      }

      // 动态导入AI服务
      const { generatePlot } = await import('@/services/aiService');
      const result = await generatePlot(genre, style);
      
      if (result && result.plot) {
        // 先填充角色和背景设定（无动画）
        if (result.characters) {
          form.setValue('characters', result.characters);
        }
        
        if (result.setting) {
          form.setValue('setting', result.setting);
        }
        
        // 计算合适的打字速度
        const delay = calculateTypewriterDelay(result.plot.length);
        
        // 创建打字机实例（仅用于情节）
        typewriterRef.current = createTypewriter(result.plot, {
          delay,
          onUpdate: (currentText) => {
            form.setValue('plot', currentText);
          },
          onComplete: () => {
            setIsRandomGenerating(false);
            toast.success('随机生成成功！已自动填充情节、角色和背景设定');
            typewriterRef.current = null;
          },
        });
        
        // 开始打字机动画
        typewriterRef.current.start();
      } else {
        toast.error('生成内容为空，请重试');
        setIsRandomGenerating(false);
      }
    } catch (error) {
      console.error('❌ [随机生成] 生成失败:', error);
      toast.error('随机生成失败，请重试');
      setIsRandomGenerating(false);
    }
  };

  // 优化关键情节（带打字机特效）
  const handleOptimizePlot = async () => {
    console.log('✨ [优化指令] 开始优化关键情节...');
    
    // 权限检查
    if (!hasAccess) {
      toast.error('此功能为会员专属，请升级会员后使用');
      navigate('/membership');
      return;
    }
    
    // 如果有正在运行的打字机，先停止
    if (typewriterRef.current?.isActive()) {
      typewriterRef.current.stop();
      typewriterRef.current = null;
    }
    
    setIsOptimizing(true);
    
    try {
      const currentPlot = form.getValues('plot');
      
      if (!currentPlot || currentPlot.trim().length === 0) {
        toast.error('请先输入关键情节描述');
        setIsOptimizing(false);
        return;
      }

      console.log('📝 [优化指令] 原始内容:', currentPlot);
      
      // 动态导入AI服务
      const { optimizePlot } = await import('@/services/aiService');
      const optimizedPlot = await optimizePlot(currentPlot);
      
      if (optimizedPlot) {
        // 先清空内容
        form.setValue('plot', '');
        
        // 计算合适的打字速度
        const delay = calculateTypewriterDelay(optimizedPlot.length);
        
        // 创建打字机实例
        typewriterRef.current = createTypewriter(optimizedPlot, {
          delay,
          onUpdate: (currentText) => {
            form.setValue('plot', currentText);
          },
          onComplete: () => {
            setIsOptimizing(false);
            toast.success('优化成功！');
            typewriterRef.current = null;
          },
        });
        
        // 开始打字机动画
        typewriterRef.current.start();
      } else {
        toast.error('优化内容为空，请重试');
        setIsOptimizing(false);
      }
    } catch (error) {
      console.error('❌ [优化指令] 优化失败:', error);
      toast.error('优化失败，请重试');
      setIsOptimizing(false);
    }
  };

  return (
    <Card className="w-full card-tomato relative overflow-hidden">
      {/* 卡片装饰元素 */}
      <div className="absolute top-3 right-3 text-pink-400 animate-float opacity-20">
        <SakuraPetal className="w-6 h-6" />
      </div>
      <div className="absolute top-4 left-4 text-yellow-400 animate-sparkle opacity-25">
        <AnimeStar className="w-4 h-4" />
      </div>
      <div className="absolute bottom-4 right-6 text-blue-400 animate-wiggle opacity-15">
        <ComicSparkle className="w-5 h-5" />
      </div>
      <div className="absolute bottom-3 left-3 text-purple-400 animate-bounce-gentle opacity-20">
        <CuteEmoji className="w-5 h-5" type="happy" />
      </div>
      <div className="absolute top-1/2 right-2 text-green-400 animate-pulse-soft opacity-10">
        <JapaneseFan className="w-6 h-6" />
      </div>
      <div className="absolute top-1/3 left-2 text-red-400 animate-spin-slow opacity-12">
        <ChineseCloud className="w-8 h-5" />
      </div>
      
      <CardHeader className="relative z-10">
        <CardTitle className="text-2xl font-tomato-title font-bold text-center text-tomato-text relative">小说创作需求</CardTitle>
        <div className="text-center text-sm text-tomato-secondary mt-2 space-y-1">

        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-tomato-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-tomato-md">
              <FormField
                control={form.control}
                name="genre"
                rules={{ required: '请选择小说题材' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tomato-text font-medium">小说题材</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-tomato input-tomato">
                          <SelectValue placeholder="选择题材类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-tomato">
                        <SelectItem value="fantasy">玄幻</SelectItem>
                        <SelectItem value="urban">都市</SelectItem>
                        <SelectItem value="historical">历史</SelectItem>
                        <SelectItem value="romance">言情</SelectItem>
                        <SelectItem value="scifi">科幻</SelectItem>
                        <SelectItem value="martial">武侠</SelectItem>
                        <SelectItem value="mystery">悬疑</SelectItem>
                        <SelectItem value="adventure">冒险</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="error-tomato" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="style"
                rules={{ required: '请选择写作风格' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tomato-text font-medium">写作风格</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-tomato input-tomato">
                          <SelectValue placeholder="选择写作风格" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-tomato">
                        <SelectItem value="humorous">幽默风趣</SelectItem>
                        <SelectItem value="serious">严肃深刻</SelectItem>
                        <SelectItem value="romantic">浪漫温馨</SelectItem>
                        <SelectItem value="suspenseful">紧张悬疑</SelectItem>
                        <SelectItem value="philosophical">哲理思辨</SelectItem>
                        <SelectItem value="light">轻松愉快</SelectItem>
                        <SelectItem value="dark">黑暗沉重</SelectItem>
                        <SelectItem value="epic">史诗宏大</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="error-tomato" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="plot"
              rules={{ required: '请描述关键情节' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>关键情节描述</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="请详细描述小说的主要情节、冲突和发展方向..."
                        className="min-h-[120px] pr-20"
                        {...field}
                      />
                      {/* 右下角图标按钮组 */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-2">
                        <TooltipProvider>
                          {/* 随机生成按钮 */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={handleRandomGenerate}
                                  disabled={isRandomGenerating || isOptimizing || !hasAccess}
                                  className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                  {isRandomGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </button>
                                <div className="absolute" style={{ top: '-0.8rem', right: '-0.6rem' }}>
                                  <VipBadge size="sm" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {hasAccess ? (
                                '随机生成情节'
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 font-semibold">
                                    <Crown className="w-4 h-4" />
                                    <span>会员专属功能</span>
                                  </div>
                                  <p className="text-xs">点击升级会员后即可使用</p>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                          
                          {/* 优化指令按钮 */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={handleOptimizePlot}
                                  disabled={isRandomGenerating || isOptimizing || !hasAccess}
                                  className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                  {isOptimizing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Wand2 className="w-4 h-4" />
                                  )}
                                </button>
                                <div className="absolute" style={{ top: '-0.8rem', right: '-0.6rem' }}>
                                  <VipBadge size="sm" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {hasAccess ? (
                                '优化情节描述'
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 font-semibold">
                                    <Crown className="w-4 h-4" />
                                    <span>会员专属功能</span>
                                  </div>
                                  <p className="text-xs">点击升级会员后即可使用</p>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>小说长度</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="short" id="short" />
                        <Label htmlFor="short">短篇（3-5章）</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium">中篇（8-12章）</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="long" id="long" />
                        <Label htmlFor="long">长篇（15-20章）</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="characters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>主要角色（可选）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="描述主要角色的性格、背景等..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>背景设定（可选）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="描述故事发生的时代、地点、世界观等..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button
                type="submit"
                size="lg"
                disabled={isGenerating}
                className="px-8 py-3 text-lg"
                data-href="">
                {isGenerating ? '正在生成中...' : '开始创作小说'}
              </Button>
              <p className="text-sm text-muted-foreground">
                消耗 <span className="font-semibold text-primary">{novelGenerationCost}码分</span>
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NovelRequestForm;