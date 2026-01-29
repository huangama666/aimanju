import React, { useState, useEffect } from 'react';
import { addCacheBuster } from "@/utils/cache-buster";
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VipBadge } from '@/components/ui/vip-badge';
import { MemberFeatureButton } from '@/components/membership/MemberFeatureButton';
import { User, Loader2, RefreshCw, Eye, Users } from 'lucide-react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useCredits } from '@/hooks/useCredits';
import { getCreditCosts } from '@/db/api';
import { uploadImageToStorage } from '@/utils/storage-helper';
import { toast } from 'sonner';
import CharacterSelectorDialog from './CharacterSelectorDialog';
import type { CharacterRequest, Character, NovelChapter } from '@/types/novel';
import type { ExtractedCharacter } from '@/services/aiService';
import type { MembershipLevel } from '@/types/database';

interface CharacterGeneratorProps {
  characters: Character[];
  onCharacterGenerated: (character: Character) => void;
  onCharactersUpdate: (characters: Character[]) => void;
  onGeneratingStatusChange?: (isGenerating: boolean) => void;
  chapters?: NovelChapter[];
  userId?: string; // 添加用户ID
  membershipLevel?: MembershipLevel; // 添加会员等级
  novelId?: string; // 添加小说ID，用于上传图片到Storage
}

const CharacterGenerator: React.FC<CharacterGeneratorProps> = ({ 
  characters, 
  onCharacterGenerated, 
  onCharactersUpdate,
  onGeneratingStatusChange,
  chapters = [],
  userId,
  membershipLevel,
  novelId
}) => {
  const [isCharacterSelectorOpen, setIsCharacterSelectorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [characterGenerationCost, setCharacterGenerationCost] = useState<number>(1); // 角色生成消耗
  const { createImageTask, getTaskStatus } = useImageGeneration();
  const { deduct: deductCredits } = useCredits();

  // 获取角色生成消耗
  useEffect(() => {
    const fetchCharacterGenerationCost = async () => {
      try {
        const costs = await getCreditCosts();
        setCharacterGenerationCost(costs.character_generation_cost);
        console.log('✅ [角色生成] 获取积分消耗:', costs.character_generation_cost);
      } catch (error) {
        console.error('❌ [角色生成] 获取积分消耗失败:', error);
        // 使用默认值1码分
        setCharacterGenerationCost(1);
      }
    };
    fetchCharacterGenerationCost();
  }, []);

  const form = useForm<CharacterRequest>({
    defaultValues: {
      name: '',
      description: '',
      appearance: '',
      personality: '',
      style: 'anime',
    },
  });

  // 实时更新角色状态
  useEffect(() => {
    const interval = setInterval(async () => {
      const updatedCharacters = await Promise.all(characters.map(async (character) => {
        if (character.taskId && character.status === 'generating') {
          const task = getTaskStatus(character.taskId);
          if (task) {
            if (task.status === 'SUCCESS' && task.imageUrl) {
              // 上传图片到Supabase Storage
              let storageUrl = task.imageUrl;
              if (novelId) {
                try {
                  console.log(`📤 [角色生成] 上传角色图片到Storage: ${character.name}`);
                  const timestamp = Date.now();
                  const randomStr = Math.random().toString(36).substring(7);
                  const fileName = `${timestamp}_${randomStr}.png`;
                  const filePath = `${novelId}/characters/${fileName}`;
                  
                  storageUrl = await uploadImageToStorage(
                    task.imageUrl,
                    'character-images',
                    filePath
                  );
                  console.log(`✅ [角色生成] 图片上传成功: ${storageUrl}`);
                } catch (error) {
                  console.error(`❌ [角色生成] 图片上传失败:`, error);
                  // 如果上传失败，使用原始URL
                  storageUrl = task.imageUrl;
                }
              }
              
              const updatedCharacter = { ...character, imageUrl: storageUrl, status: 'completed' as const };
              onCharacterGenerated(updatedCharacter);
              return updatedCharacter;
            } else if (task.status === 'FAILED') {
              return { ...character, status: 'failed' as const, error: task.error || '生成失败' };
            }
          }
        }
        return character;
      }));
      
      // 只有当状态真的改变时才更新
      if (JSON.stringify(updatedCharacters) !== JSON.stringify(characters)) {
        onCharactersUpdate(updatedCharacters);
      }
    }, 3000); // 每3秒检查一次状态

    return () => clearInterval(interval);
  }, [characters, getTaskStatus, onCharacterGenerated, onCharactersUpdate, novelId]);

  // 监控角色生成状态，通知父组件
  useEffect(() => {
    const hasGeneratingCharacters = characters.some(character => {
      if (character.status === 'generating') {
        // 检查任务状态
        if (character.taskId) {
          const task = getTaskStatus(character.taskId);
          // 如果没有任务信息（初始化中）或任务正在进行中，都算作生成中
          return !task || task.status === 'INIT' || task.status === 'WAIT' || task.status === 'RUNNING';
        }
        return true; // 如果没有taskId但状态是generating，也算作生成中
      }
      return false;
    }) || isGenerating; // 或者正在提交新的生成请求
    
    if (onGeneratingStatusChange) {
      onGeneratingStatusChange(hasGeneratingCharacters);
    }
  }, [characters, isGenerating, onGeneratingStatusChange, getTaskStatus]);

  const handleSubmit = async (data: CharacterRequest) => {
    console.log('🎯 [角色生成] handleSubmit 被调用');
    console.log('📋 [角色生成] 表单数据:', data);
    console.log('👤 [角色生成] 用户ID:', userId);
    console.log('💎 [角色生成] 会员等级:', membershipLevel);
    
    // 检查用户ID
    if (!userId) {
      console.error('❌ [角色生成] 用户未登录');
      toast.error('请先登录');
      return;
    }

    console.log('✅ [角色生成] 用户验证通过');

    // 扣减码分
    console.log('💰 [角色生成] 开始扣减码分，消耗:', characterGenerationCost);
    const success = await deductCredits(userId, 'character_creation', '角色创作');
    if (!success) {
      console.error('❌ [角色生成] 码分扣减失败');
      // 码分不足，useCredits hook 会显示提示
      return;
    }

    console.log('✅ [角色生成] 码分扣减成功');
    setIsGenerating(true);
    
    // 通知父组件生成状态变化
    if (onGeneratingStatusChange) {
      onGeneratingStatusChange(true);
    }
    
    try {
      console.log('🎨 [角色生成] 开始生成角色:', data.name);
      
      // 构建角色描述提示词 - 专门生成9:16全身照
      const prompt = `国漫风格全身角色设计，${data.name}，${data.appearance}，${data.personality}，${data.description}，全身站立姿势，9:16竖版构图，高质量插画，细节丰富，专业角色设计，完整人物形象，从头到脚的完整展示`;
      
      console.log('📝 [角色生成] 提示词:', prompt);
      
      // 创建图片生成任务
      console.log('🚀 [角色生成] 调用 createImageTask...');
      const taskId = await createImageTask(prompt);
      console.log('✅ [角色生成] 任务创建成功，taskId:', taskId);
      
      // 创建角色对象
      const newCharacter: Character = {
        id: `character-${Date.now()}`,
        name: data.name,
        description: data.description,
        appearance: data.appearance,
        personality: data.personality,
        taskId,
        status: 'generating',
        createdAt: new Date(),
      };
      
      console.log('📦 [角色生成] 新角色对象:', newCharacter);
      
      onCharactersUpdate([...characters, newCharacter]);
      
      // 重置表单
      form.reset();
      
      toast.success('角色生成任务已提交，请稍候...');
      
    } catch (error) {
      console.error('❌ [角色生成] 生成角色失败:', error);
      toast.error(`角色生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
      // 通知父组件生成状态变化
      if (onGeneratingStatusChange) {
        onGeneratingStatusChange(false);
      }
      console.log('🏁 [角色生成] handleSubmit 完成');
    }
  };

  const regenerateCharacter = async (character: Character) => {
    const prompt = `国漫风格全身角色设计，${character.name}，${character.appearance}，${character.personality}，${character.description}，全身站立姿势，9:16竖版构图，高质量插画，细节丰富，专业角色设计，完整人物形象，从头到脚的完整展示`;
    
    try {
      const taskId = await createImageTask(prompt);
      const updatedCharacter = { ...character, taskId, status: 'generating' as const, imageUrl: undefined, error: undefined };
      
      onCharactersUpdate(
        characters.map(char => char.id === character.id ? updatedCharacter : char)
      );
      
    } catch (error) {
      console.error('重新生成角色失败:', error);
      toast.error('重新生成角色失败，请重试');
      const failedCharacter = { ...character, status: 'failed' as const, error: error instanceof Error ? error.message : '重新生成失败' };
      onCharactersUpdate(
        characters.map(char => char.id === character.id ? failedCharacter : char)
      );
    }
  };

  const getTaskProgress = (character: Character) => {
    if (!character.taskId) return 0;
    const task = getTaskStatus(character.taskId);
    return task ? task.progress * 100 : 0;
  };

  const getTaskStatusText = (character: Character) => {
    if (!character.taskId) return '未开始';
    const task = getTaskStatus(character.taskId);
    if (!task) return '初始化中...';
    
    switch (task.status) {
      case 'INIT':
        return '初始化中...';
      case 'WAIT':
        return '排队中...';
      case 'RUNNING':
        return '生成中...';
      case 'SUCCESS':
        return '生成完成';
      case 'FAILED':
        return '生成失败';
      default:
        return '未知状态';
    }
  };

  // 处理从章节中选择的角色
  const handleCharacterSelect = (character: ExtractedCharacter) => {
    console.log('📝 选择角色:', character);
    
    // 填充表单
    form.setValue('name', character.name);
    form.setValue('appearance', character.appearance);
    form.setValue('personality', character.personality);
    form.setValue('description', character.background);
    
    toast.success(`已填充角色信息：${character.name}`);
  };

  return (
    <div className="space-y-6">
      {/* 角色生成表单 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5" />
              角色生成器
            </CardTitle>
            {chapters.length > 0 && membershipLevel && (
              <MemberFeatureButton
                membershipLevel={membershipLevel}
                featureName="从章节中选择角色"
                variant="outline"
                size="sm"
                onClick={() => setIsCharacterSelectorOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                从章节中选择角色
              </MemberFeatureButton>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: '请输入角色姓名' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="输入角色姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>生成风格</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择生成风格" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="anime">国漫风格</SelectItem>
                          <SelectItem value="realistic">写实风格</SelectItem>
                          <SelectItem value="cartoon">卡通风格</SelectItem>
                          <SelectItem value="chibi">Q版风格</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="appearance"
                rules={{ required: '请描述角色外貌' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>外貌描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="详细描述角色的外貌特征，如身高、发色、眼色、服装等..."
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
                name="personality"
                rules={{ required: '请描述角色性格' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>性格特征</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="描述角色的性格特点、行为习惯、说话方式等..."
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>背景描述（可选）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="角色的背景故事、职业、特殊能力等..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full"
                  style={{ height: '3.25rem' }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    '生成角色形象'
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  消耗 <span className="font-semibold text-primary">{characterGenerationCost}码分</span>
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 生成的角色列表 */}
      {characters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">生成的角色</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((character) => (
                <Card key={character.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={addCacheBuster(character.imageUrl)} 
                          alt={character.name}
                          crossOrigin="anonymous"
                        />
                        <AvatarFallback>
                          {character.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{character.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {getTaskStatusText(character)}
                        </Badge>
                      </div>
                    </div>

                    {character.taskId && !character.imageUrl && (
                      <div className="mb-3">
                        <Progress value={getTaskProgress(character)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          生成进度: {Math.round(getTaskProgress(character))}%
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">外貌：</span>
                        <p className="text-muted-foreground text-xs">
                          {character.appearance}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">性格：</span>
                        <p className="text-muted-foreground text-xs">
                          {character.personality}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      {character.imageUrl && (
                        <>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                预览
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>{character.name} - 全身照</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center">
                                <img
                                  src={addCacheBuster(character.imageUrl)}
                                  alt={character.name}
                                  className="max-w-full max-h-96 object-contain rounded-lg"
                                  crossOrigin="anonymous"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regenerateCharacter(character)}
                        disabled={!character.imageUrl}
                        className="flex-1"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        重新生成
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 角色选择器对话框 */}
      <CharacterSelectorDialog
        open={isCharacterSelectorOpen}
        onOpenChange={setIsCharacterSelectorOpen}
        chapters={chapters}
        onCharacterSelect={handleCharacterSelect}
      />
    </div>
  );
};

export default CharacterGenerator;