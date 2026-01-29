import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Loader2, CheckCircle2, BookOpen, ArrowLeft, Sparkles, Edit, Eye, Coins } from 'lucide-react';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { getCurrentUser, getUserProfile, getUserNovels, updateNovelScripts, updateScriptContent, getCreditCosts } from '@/db/api';
import type { DbUser, DbNovel, ChapterData, SceneSegment } from '@/types/database';
import { useCredits } from '@/hooks/useCredits';
import { sendChatStream } from '@/utils/chatStream';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import {
  SakuraPetal,
  AnimeStar,
  ComicSparkle,
  ChineseCloud,
  CuteEmoji,
  JapaneseFan
} from '@/components/decorations/AnimeDecorations';

// 剧本数据类型
interface ScriptData {
  chapter_number: number;
  chapter_title: string;
  script_content: string;
  scenes?: SceneSegment[]; // 场景分段数组
  generated_at: string;
}

const ScriptGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { deduct: deductCredits } = useCredits();
  
  // 用户相关状态
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  
  // 积分相关状态
  const [creditCostPerChapter, setCreditCostPerChapter] = useState<number>(1); // 每章节默认1码分
  
  // 小说列表相关状态
  const [novels, setNovels] = useState<DbNovel[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string>('');
  const [selectedNovel, setSelectedNovel] = useState<DbNovel | null>(null);
  const [isLoadingNovels, setIsLoadingNovels] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // 初始加载状态
  
  // 章节选择相关状态
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // 剧本生成相关状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [generatedScripts, setGeneratedScripts] = useState<ScriptData[]>([]);
  
  // 剧本编辑相关状态
  const [editingScript, setEditingScript] = useState<ScriptData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingScript, setViewingScript] = useState<ScriptData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // 检查用户登录状态
  useEffect(() => {
    let isMounted = true;
    
    const checkLogin = async () => {
      try {
        const user = await getCurrentUser();
        if (isMounted && user) {
          const profile = await getUserProfile(user.id);
          if (isMounted) {
            setCurrentUser(profile);
            await loadUserNovels(user.id);
          }
        } else if (isMounted) {
          setIsLoginDialogOpen(true);
        }
      } catch (error) {
        // 忽略AbortError，这是正常的取消请求
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('⚠️ 请求被取消（组件已卸载）');
          return;
        }
        console.error('检查登录状态失败:', error);
        if (isMounted) {
          setIsLoginDialogOpen(true);
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };
    
    checkLogin();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // 获取每章节积分价格
  useEffect(() => {
    const fetchCreditCost = async () => {
      try {
        const costs = await getCreditCosts();
        setCreditCostPerChapter(costs.script_generation_cost);
        console.log('✅ [剧本生成] 获取每章节积分消耗:', costs.script_generation_cost);
      } catch (error) {
        console.error('❌ [剧本生成] 获取积分价格失败:', error);
        // 使用默认值1码分/章节
        setCreditCostPerChapter(1);
      }
    };
    fetchCreditCost();
  }, []);

  const checkUserLogin = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        setCurrentUser(profile);
        await loadUserNovels(user.id);
      } else {
        setIsLoginDialogOpen(true);
      }
    } catch (error) {
      // 忽略AbortError，这是正常的取消请求
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⚠️ 请求被取消');
        return;
      }
      console.error('检查登录状态失败:', error);
      setIsLoginDialogOpen(true);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // 加载用户的小说列表
  const loadUserNovels = async (userId: string) => {
    setIsLoadingNovels(true);
    try {
      const userNovels = await getUserNovels(userId);
      setNovels(userNovels);
      console.log('📚 加载用户小说列表:', userNovels.length, '部');
    } catch (error) {
      console.error('加载小说列表失败:', error);
      toast.error('加载小说列表失败');
    } finally {
      setIsLoadingNovels(false);
    }
  };

  // 选择小说
  const handleSelectNovel = (novelId: string) => {
    const novel = novels.find(n => n.id === novelId);
    if (novel) {
      setSelectedNovelId(novelId);
      setSelectedNovel(novel);
      setSelectedChapters([]);
      setSelectAll(false);
      
      // 加载已有的剧本数据
      if (novel.scripts_data && novel.scripts_data.length > 0) {
        setGeneratedScripts(novel.scripts_data);
        console.log('📖 选择小说:', novel.novel_title);
        console.log('✅ 已加载', novel.scripts_data.length, '个已生成的剧本');
        toast.success(`已选择小说：${novel.novel_title}（已有${novel.scripts_data.length}个剧本）`);
      } else {
        setGeneratedScripts([]);
        console.log('📖 选择小说:', novel.novel_title);
        toast.success(`已选择小说：${novel.novel_title}`);
      }
    }
  };

  // 处理章节选择
  const handleChapterToggle = (chapterNumber: number) => {
    setSelectedChapters(prev => {
      if (prev.includes(chapterNumber)) {
        return prev.filter(num => num !== chapterNumber);
      }
      return [...prev, chapterNumber].sort((a, b) => a - b);
    });
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (!selectedNovel?.chapters_data) return;
    
    if (selectAll) {
      setSelectedChapters([]);
      setSelectAll(false);
    } else {
      setSelectedChapters(selectedNovel.chapters_data.map(ch => ch.chapter_number));
      setSelectAll(true);
    }
  };

  // 为单个小说片段生成剧本场景（使用AI接口）
  const generateScriptForSegment = async (
    novelSegment: string,
    sceneNumber: number,
    novelTitle: string,
    chapterNumber: number,
    chapterTitle: string
  ): Promise<{ scene_title: string; script_content: string }> => {
    return new Promise((resolve, reject) => {
      let scriptContent = '';
      
      const prompt = `请根据以下小说片段，创作一个极简的影视剧本场景，适合短视频或漫画分镜制作。

【小说信息】
小说标题：${novelTitle}
章节号：第${chapterNumber}章
章节标题：${chapterTitle}
场景编号：第${sceneNumber}个场景

【小说片段内容】
${novelSegment}

【剧本创作要求】

1. **场景格式要求（最重要）**：
   - 只生成一个场景，不要生成多个场景
   - 场景开头必须使用固定格式：【场景${sceneNumber}：场景标题】
   - 场景标题格式：内景/外景-地点-时间（如：内景-客厅-白天）
   - **这个场景只包含1个画面（镜头）**
   - **画面用"画面："标注**
   
   示例格式：
   【场景${sceneNumber}：内景-客厅-白天】
   画面：（全景）客厅内，阳光透过窗户洒进来。小明坐在沙发上看书，突然抬起头，眼神中充满惊讶。

2. **画面描述要求**：
   - 画面要简洁明了，用一句话描述清楚
   - 必须标注镜头类型：全景/中景/特写/近景等
   - 包含关键的视觉元素：人物、动作、表情、环境
   - 如有对话，简短标注在画面描述后
   - 避免冗长的叙述，只保留最关键的视觉信息
   - 画面要完整呈现这段小说片段的核心内容

3. **内容精简原则**：
   - 忠实还原小说片段的核心情节
   - 去除冗余的描述和次要细节
   - 聚焦一个主要动作或情绪
   - 适合快速阅读和视觉化呈现

4. **剧本风格**：
   - 适合短视频、漫画、动画等视觉媒体
   - 节奏紧凑，画面感强
   - 易于理解和执行

请严格按照以上格式输出，只生成一个场景，包含1个画面。`;

      const controller = new AbortController();
      
      sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        apiId: import.meta.env.VITE_APP_ID,
        onUpdate: (content: string) => {
          scriptContent = content;
        },
        onComplete: () => {
          // 解析场景标题和内容
          const sceneRegex = /【场景\d+[：:](.*?)】/;
          const match = scriptContent.match(sceneRegex);
          const sceneTitle = match ? match[1].trim() : `场景${sceneNumber}`;
          
          resolve({
            scene_title: sceneTitle,
            script_content: scriptContent
          });
        },
        onError: (error: Error) => {
          console.error('AI生成剧本场景失败:', error);
          reject(error);
        },
        signal: controller.signal
      });
    });
  };

  // 解析剧本内容，提取场景分段
  const parseScriptScenes = (scriptContent: string): { scene_title: string; script_content: string }[] => {
    const scenes: { scene_title: string; script_content: string }[] = [];
    
    // 使用正则表达式匹配场景标记：【场景X：场景标题】
    const sceneRegex = /【场景\d+[：:](.*?)】/g;
    const matches = [...scriptContent.matchAll(sceneRegex)];
    
    if (matches.length === 0) {
      console.warn('⚠️ 未找到场景分隔符，将整个剧本作为单个场景');
      return [{
        scene_title: '完整剧本',
        script_content: scriptContent
      }];
    }
    
    // 提取每个场景的内容
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const sceneTitle = match[1].trim();
      const startIndex = match.index! + match[0].length;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : scriptContent.length;
      const sceneContent = scriptContent.substring(startIndex, endIndex).trim();
      
      scenes.push({
        scene_title: sceneTitle,
        script_content: sceneContent
      });
    }
    
    console.log(`📋 解析到 ${scenes.length} 个场景`);
    return scenes;
  };

  // 使用AI一次性生成整章所有场景的解说内容（严格控制字数）
  const extractAllNarrationContents = async (
    novelSegments: string[],
    novelTitle: string,
    chapterNumber: number,
    chapterTitle: string
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      let aiResponse = '';
      
      const sceneCount = novelSegments.length;
      const totalMinChars = sceneCount * 20;
      const totalMaxChars = sceneCount * 22;
      
      // 构建所有场景的小说片段列表
      const segmentsList = novelSegments.map((seg, idx) => 
        `场景${idx + 1}：${seg}`
      ).join('\n\n');
      
      const prompt = `请从小说解说的角度，为以下整章小说的所有场景生成解说内容，用于视频配音。

【小说信息】
小说标题：${novelTitle}
章节号：第${chapterNumber}章
章节标题：${chapterTitle}
场景总数：${sceneCount}个场景

【所有场景的小说片段】
${segmentsList}

【解说要求 - 必须严格执行，违反要求的内容将被拒绝】

⚠️ 重要提示：以下要求必须100%严格执行，不得有任何偏差！

1. **总字数要求（最高优先级）**：
   - 整章解说内容总字数必须在${totalMinChars}-${totalMaxChars}字之间
   - 绝对不能少于${totalMinChars}字
   - 绝对不能超过${totalMaxChars}字
   - 计算公式：场景数量(${sceneCount}) × 20~22字 = ${totalMinChars}~${totalMaxChars}字
   - 生成前请先计算总字数，确保符合要求

2. **每个场景解说字数要求（严格执行，不得违反）**：
   - 每个场景的解说内容必须在20-22个中文字之间
   - 绝对不能少于20字
   - 绝对不能超过22字
   - 严禁出现断句（如"李明走进房间。看到桌上有信。"这种断句形式）
   - 每个场景解说必须是完整的一句话
   - 不能使用句号、感叹号、问号等标点符号分隔
   - 示例正确格式："李明走进房间发现桌上放着一封信"
   - 示例错误格式："李明走进房间。看到信。"（断句，不符合要求）

3. **场景间关联要求（必须严格遵守，像正常文章一样流畅）**：
   - ⚠️ 关键要求：整章解说要像正常文章一样，前后关联自然流畅
   - ⚠️ 禁止生搬硬套：不要每个场景都重复主语（如"李明...李明...李明..."）
   - ⚠️ 使用代词连接：第一个场景可以用主语，后续场景多用"他"、"她"、"其"等代词
   - 场景之间要有逻辑关联，不能跳跃
   - 整体形成连贯的故事叙述，像一篇完整的文章
   - 前后场景要自然过渡，不要生硬
   
   错误示例（生搬硬套，重复主语）：
   场景1：李明走进房间发现桌上放着一封信
   场景2：李明拿起信封小心翼翼地拆开看到照片（❌ 重复"李明"）
   场景3：李明看到泛黄的照片上是他失散多年的亲人（❌ 又重复"李明"）
   
   正确示例（像正常文章，使用代词）：
   场景1：李明走进房间发现桌上放着一封信
   场景2：他拿起信封小心翼翼地拆开看到照片（✓ 用"他"代替"李明"）
   场景3：泛黄的照片上是他失散多年的亲人（✓ 延续前文，自然流畅）

4. **内容要求**：
   - 从小说解说的角度生成
   - 概括每个场景的核心情节或关键动作
   - 保持语义完整，不能断句
   - 适合作为视频配音的解说文本
   - 语气要客观、叙述性强
   - 像正常文章一样，不要生搬硬套

5. **输出格式要求（严格执行）**：
   - ⚠️ 重要：直接输出一段完整连贯的解说文本，不需要分段
   - ⚠️ 不要使用"场景X："这样的标记
   - ⚠️ 不要分行，生成一段完整的文章
   - ⚠️ 禁止在解说内容后添加字数标注（如"(20字)"、"（21字）"等）
   - 不要添加其他标记、符号或说明
   - 只输出解说内容本身，不要添加任何额外信息
   - 整段文本总字数必须在${totalMinChars}-${totalMaxChars}字之间

6. **一次性生成要求**：
   - 所有${sceneCount}个场景的解说内容必须一次性全部生成
   - 生成一段完整连贯的文章，不要分段
   - 不能分批生成
   - 不能遗漏任何场景
   - 整体要像一篇完整的文章，前后关联自然

示例（假设有3个场景，总字数60-66字）：
李明走进房间发现桌上放着一封信他拿起信封小心翼翼地拆开看到照片泛黄的照片上是他失散多年的亲人

注意：
- ✓ 这是一段完整的文本，不分段
- ✓ 没有"场景1"、"场景2"这样的标记
- ✓ 第一个场景用"李明"（主语）
- ✓ 后续场景用"他"（代词，避免重复主语）
- ✓ 整体像一篇完整的文章，自然流畅
- ✓ 没有字数标注（如"(20字)"）
- ✓ 总字数符合要求（60-66字）

请严格按照以上要求输出，确保：
✓ 总字数：${totalMinChars}-${totalMaxChars}字（必须符合）
✓ 生成一段完整连贯的文本，不分段（必须符合）
✓ 不使用"场景X："标记（必须符合）
✓ 场景间互相关联衔接，像正常文章一样（必须符合）
✓ 禁止断句，语义完整（必须符合）
✓ 避免重复主语，多用代词（必须符合）
✓ 禁止出现字数标注（必须符合）
✓ 一次性生成所有${sceneCount}个场景的内容（必须符合）

现在开始生成，请严格遵守以上所有要求：`;

      const controller = new AbortController();
      
      sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        apiId: import.meta.env.VITE_APP_ID,
        onUpdate: (content: string) => {
          aiResponse = content;
        },
        onComplete: () => {
          try {
            // 清理AI返回的内容
            let extractedContent = aiResponse.trim();
            
            console.log(`📝 开始解析AI生成的完整解说内容...`);
            console.log(`📝 AI返回内容总字数: ${extractedContent.length}字`);
            console.log(`📝 AI返回内容: "${extractedContent}"`);
            
            // 只移除句号（避免断句），保留其他标点符号
            const sentenceEndMarks = ['。', '.'];
            let hasEndMark = false;
            for (const mark of sentenceEndMarks) {
              if (extractedContent.includes(mark)) {
                hasEndMark = true;
                console.warn(`⚠️ 解说内容包含句号"${mark}"，将移除（避免断句）`);
                extractedContent = extractedContent.replace(new RegExp(`\\${mark}`, 'g'), '');
              }
            }
            
            // 移除字数标注（如"(20字)"、"（21字）"等）
            const wordCountPattern = /[（(]\d+字[）)]/g;
            if (wordCountPattern.test(extractedContent)) {
              console.warn(`⚠️ 解说内容包含字数标注，将移除`);
              extractedContent = extractedContent.replace(wordCountPattern, '');
            }
            
            // 移除所有换行符，但保留空格（可能是标点符号后的空格）
            extractedContent = extractedContent.replace(/\n/g, '').trim();
            
            console.log(`📝 清理后的解说内容: "${extractedContent}" (${extractedContent.length}字)`);
            
            // 验证总字数
            const totalChars = extractedContent.length;
            console.log(`\n📊 ========== 字数统计 ==========`);
            console.log(`📊 场景总数: ${sceneCount}个`);
            console.log(`📊 总字数: ${totalChars}字`);
            console.log(`📊 要求范围: ${totalMinChars}-${totalMaxChars}字`);
            console.log(`📊 是否符合: ${totalChars >= totalMinChars && totalChars <= totalMaxChars ? '✅ 符合' : '❌ 不符合'}`);
            
            // 如果总字数不符合要求，进行调整
            if (totalChars < totalMinChars) {
              console.warn(`⚠️ 总字数少于要求，将从原片段补充`);
              // 从原片段补充内容
              const needed = totalMinChars - totalChars;
              const extraContent = novelSegments.join('').substring(0, needed);
              extractedContent = extractedContent + extraContent;
              console.log(`📝 补充后的解说内容: "${extractedContent}" (${extractedContent.length}字)`);
            } else if (totalChars > totalMaxChars) {
              console.warn(`⚠️ 总字数超过要求，将截取`);
              extractedContent = extractedContent.substring(0, totalMaxChars);
              console.log(`📝 截取后的解说内容: "${extractedContent}" (${extractedContent.length}字)`);
            }
            
            // 智能分割解说内容
            const narrations: string[] = [];
            
            console.log(`\n📝 开始智能分割解说内容...`);
            
            // 计算目标字数分配
            const targetCharsPerScene = Math.floor(extractedContent.length / sceneCount);
            console.log(`📝 平均每个场景: ${targetCharsPerScene}字`);
            
            let remainingContent = extractedContent;
            
            for (let i = 0; i < sceneCount; i++) {
              // 最后一个场景：特殊处理，确保字数符合要求
              if (i === sceneCount - 1) {
                let lastNarration = remainingContent;
                
                // 确保最后一个场景也在20-22字之间
                if (lastNarration.length < 20) {
                  console.warn(`⚠️ 最后一个场景少于20字(${lastNarration.length}字)，从原片段补充`);
                  const needed = 20 - lastNarration.length;
                  const extraContent = novelSegments[i].substring(0, needed);
                  lastNarration = lastNarration + extraContent;
                } else if (lastNarration.length > 22) {
                  console.warn(`⚠️ 最后一个场景超过22字(${lastNarration.length}字)，智能截取`);
                  // 尝试在标点符号处截取
                  const punctuationMarks = ['，', '！', '？', '；', ',', '!', '?', ';'];
                  let cutIndex = 22;
                  
                  // 在20-22字范围内查找标点符号
                  for (let j = 22; j >= 20; j--) {
                    const char = lastNarration[j];
                    if (punctuationMarks.includes(char)) {
                      cutIndex = j + 1; // 包含标点符号
                      console.log(`📝 在标点符号"${char}"处截取（位置${cutIndex}）`);
                      break;
                    }
                  }
                  
                  lastNarration = lastNarration.substring(0, cutIndex);
                }
                
                narrations.push(lastNarration);
                console.log(`✅ 场景${i + 1}解说: "${lastNarration}" (${lastNarration.length}字)`);
                break;
              }
              
              // 计算这个场景应该取多少字
              let targetChars = Math.max(20, Math.min(22, targetCharsPerScene));
              
              // 尝试在标点符号处分割
              const punctuationMarks = ['，', '！', '？', '；', ',', '!', '?', ';'];
              let splitIndex = targetChars;
              let foundPunctuation = false;
              
              // 在目标字数附近查找标点符号（±2字范围内）
              for (let j = targetChars + 2; j >= targetChars - 2 && j >= 20 && j <= 22; j--) {
                if (j < remainingContent.length) {
                  const char = remainingContent[j];
                  if (punctuationMarks.includes(char)) {
                    splitIndex = j + 1; // 包含标点符号
                    foundPunctuation = true;
                    console.log(`📝 场景${i + 1}在标点符号"${char}"处分割（位置${splitIndex}）`);
                    break;
                  }
                }
              }
              
              // 如果没有找到合适的标点符号，确保在20-22字之间
              if (!foundPunctuation) {
                splitIndex = Math.max(20, Math.min(22, targetChars));
                console.log(`📝 场景${i + 1}未找到合适的标点符号，按${splitIndex}字分割`);
              }
              
              // 确保不超过剩余内容长度
              splitIndex = Math.min(splitIndex, remainingContent.length);
              
              // 提取这个场景的解说
              const narration = remainingContent.substring(0, splitIndex);
              narrations.push(narration);
              console.log(`✅ 场景${i + 1}解说: "${narration}" (${narration.length}字)`);
              
              // 更新剩余内容
              remainingContent = remainingContent.substring(splitIndex);
            }
            
            // 最终验证
            const finalTotalChars = narrations.reduce((sum, n) => sum + n.length, 0);
            console.log(`\n📊 ========== 最终字数统计 ==========`);
            console.log(`📊 场景总数: ${narrations.length}个`);
            console.log(`📊 总字数: ${finalTotalChars}字`);
            console.log(`📊 要求范围: ${totalMinChars}-${totalMaxChars}字`);
            console.log(`📊 是否符合: ${finalTotalChars >= totalMinChars && finalTotalChars <= totalMaxChars ? '✅ 符合' : '❌ 不符合'}`);
            
            // 验证每个场景字数
            let allScenesValid = true;
            narrations.forEach((n, idx) => {
              const isValid = n.length >= 20 && n.length <= 22;
              if (!isValid) {
                console.warn(`⚠️ 场景${idx + 1}字数不符合要求: ${n.length}字`);
                allScenesValid = false;
              }
            });
            
            console.log(`📊 每个场景字数是否符合: ${allScenesValid ? '✅ 全部符合' : '❌ 部分不符合'}`);
            
            console.log(`\n✅ ========== 解说内容生成完成 ==========`);
            console.log(`✅ 场景总数: ${narrations.length}个`);
            console.log(`✅ 总字数: ${finalTotalChars}字`);
            console.log(`✅ 所有场景解说:`);
            narrations.forEach((n, idx) => {
              console.log(`   场景${idx + 1}: "${n}" (${n.length}字)`);
            });
            
            resolve(narrations);
          } catch (error) {
            console.error('❌ 解析解说内容失败:', error);
            // 失败时使用备用方案：每个片段的前21字
            const fallbackNarrations = novelSegments.map(seg => seg.substring(0, 21));
            console.log(`⚠️ 使用备用方案，每个场景21字`);
            resolve(fallbackNarrations);
          }
        },
        onError: (error: Error) => {
          console.error('❌ AI生成解说内容失败:', error);
          // 失败时使用备用方案：每个片段的前21字
          const fallbackNarrations = novelSegments.map(seg => seg.substring(0, 21));
          console.log(`⚠️ 使用备用方案，每个场景21字`);
          resolve(fallbackNarrations);
        },
        signal: controller.signal
      });
    });
  };

  // 使用AI提取小说片段的解说内容（20-22字）- 保留用于单个场景
  const extractNarrationContent = async (
    novelSegment: string,
    sceneNumber: number,
    novelTitle: string,
    chapterNumber: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      let aiResponse = '';
      
      const prompt = `请从小说解说的角度，为以下小说片段生成解说内容，用于视频配音。

【小说信息】
小说标题：${novelTitle}
章节号：第${chapterNumber}章
场景号：场景${sceneNumber}

【小说片段】
${novelSegment}

【解说要求】

1. **字数要求（最重要）**：
   - 解说内容必须在20-22字之间
   - 不能少于20字
   - 不能超过22字
   - 如果超过22字，必须自动简化

2. **内容要求**：
   - 从小说解说的角度生成
   - 概括这段小说的核心情节或关键动作
   - 保持语义完整，不能断句
   - 适合作为视频配音的解说文本
   - 语气要客观、叙述性强

3. **输出格式要求**：
   - 只输出解说内容
   - 不要添加任何标记、符号或说明
   - 不要换行
   - 直接输出20-22字的解说内容

示例：
输入：李明走进房间，看到桌上放着一封信。他拿起信封，小心翼翼地拆开，里面是一张泛黄的照片。
输出：李明发现桌上信封打开看到泛黄照片

请严格按照以上要求输出，确保20-22字，语义完整，适合解说。`;

      const controller = new AbortController();
      
      sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        apiId: import.meta.env.VITE_APP_ID,
        onUpdate: (content: string) => {
          aiResponse = content;
        },
        onComplete: () => {
          // 清理AI返回的内容
          let extractedContent = aiResponse.trim();
          
          // 移除可能的标记符号
          extractedContent = extractedContent.replace(/^【.*?】/, '').trim();
          extractedContent = extractedContent.replace(/^输出[:：]/, '').trim();
          extractedContent = extractedContent.replace(/^解说[:：]/, '').trim();
          extractedContent = extractedContent.replace(/^解说内容[:：]/, '').trim();
          
          // 检查字数
          const length = extractedContent.length;
          console.log(`📝 提取的解说内容: "${extractedContent}" (${length}字)`);
          
          if (length < 20) {
            console.warn(`⚠️ 解说内容少于20字，使用原片段前22字`);
            extractedContent = novelSegment.substring(0, 22);
          } else if (length > 22) {
            console.warn(`⚠️ 解说内容超过22字，截取前22字`);
            extractedContent = extractedContent.substring(0, 22);
          }
          
          console.log(`✅ 最终解说内容: "${extractedContent}" (${extractedContent.length}字)`);
          resolve(extractedContent);
        },
        onError: (error: Error) => {
          console.error('❌ AI提取解说内容失败:', error);
          // 失败时使用原片段的前22字
          const fallback = novelSegment.substring(0, 22);
          console.log(`⚠️ 使用备用方案: "${fallback}"`);
          resolve(fallback);
        },
        signal: controller.signal
      });
      
      // 30秒超时
      setTimeout(() => {
        controller.abort();
        const fallback = novelSegment.substring(0, 22);
        console.log(`⏱️ AI提取超时，使用备用方案: "${fallback}"`);
        resolve(fallback);
      }, 30000);
    });
  };

  // 使用AI智能分段小说内容（保持语义完整，每段约110字）
  const segmentNovelContentWithAI = async (
    novelContent: string,
    sceneCount: number,
    novelTitle: string,
    chapterNumber: number,
    chapterTitle: string
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      let aiResponse = '';
      
      const prompt = `请将以下小说章节内容智能分段，用于影视剧本创作。

【小说信息】
小说标题：${novelTitle}
章节号：第${chapterNumber}章
章节标题：${chapterTitle}

【章节内容】
${novelContent}

【分段要求】

1. **分段数量**：必须分成 ${sceneCount} 段，不能多也不能少

2. **每段字数要求（最重要）**：
   - 每段约55字
   - 最少50字，最多60字
   - 严格控制在50-60字范围内

3. **语义完整性要求**：
   - 每段必须是完整的语义单元
   - 不能在句子中间断开
   - 不能在对话中间断开
   - 每段要有完整的情节或动作
   - 保持故事的连贯性和流畅性

4. **分段原则**：
   - 按照情节发展的自然节奏分段
   - 每段代表一个关键时刻或场景
   - 优先在场景转换、时间跳跃、人物动作转换处分段
   - 保持每段的独立性和完整性

5. **输出格式要求**：
   - 使用【片段1】【片段2】...【片段${sceneCount}】标记每个片段
   - 每个片段独立成段，用空行分隔
   - 不要添加任何额外的说明或注释
   - 直接输出分段后的内容

示例格式：
【片段1】
（这里是第1段的内容，约50-60字，语义完整）

【片段2】
（这里是第2段的内容，约50-60字，语义完整）

【片段3】
（这里是第3段的内容，约50-60字，语义完整）

请严格按照以上要求输出，确保每段50-60字，语义完整，不断句。`;

      const controller = new AbortController();
      
      sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        apiId: import.meta.env.VITE_APP_ID,
        onUpdate: (content: string) => {
          aiResponse = content;
        },
        onComplete: () => {
          // 解析AI返回的分段内容
          const segments: string[] = [];
          const regex = /【片段\d+】\s*([\s\S]*?)(?=【片段\d+】|$)/g;
          let match;
          
          while ((match = regex.exec(aiResponse)) !== null) {
            const segment = match[1].trim();
            if (segment.length > 0) {
              segments.push(segment);
            }
          }
          
          console.log(`✅ AI智能分段完成，共 ${segments.length} 段`);
          segments.forEach((seg, idx) => {
            const status = seg.length < 50 ? '⚠️ 少于50字' : seg.length > 60 ? '⚠️ 超过60字' : '✅';
            console.log(`  片段${idx + 1}: ${seg.length} 字 ${status}`);
          });
          
          // 如果AI返回的分段数量不对，使用备用方案
          if (segments.length !== sceneCount) {
            console.warn(`⚠️ AI返回的分段数量(${segments.length})与预期(${sceneCount})不符，使用备用方案`);
            resolve(segmentNovelContentFallback(novelContent, sceneCount));
          } else {
            resolve(segments);
          }
        },
        onError: (error: Error) => {
          console.error('AI智能分段失败:', error);
          console.log('使用备用分段方案...');
          resolve(segmentNovelContentFallback(novelContent, sceneCount));
        },
        signal: controller.signal
      });
    });
  };

  // 备用分段方案（如果AI分段失败）
  const segmentNovelContentFallback = (novelContent: string, sceneCount: number): string[] => {
    if (sceneCount <= 1) {
      return [novelContent];
    }
    
    console.log('📋 使用备用分段方案...');
    
    // 目标字数：55字，范围：50-60字
    const TARGET_CHARS_PER_SEGMENT = 55;
    const MIN_CHARS_PER_SEGMENT = 50;
    const MAX_CHARS_PER_SEGMENT = 60;
    
    // 按句子分割小说内容（保留句子完整性）
    // 匹配中文句号、问号、感叹号、省略号等
    const sentences = novelContent.split(/([。！？…]+)/).filter(s => s.trim().length > 0);
    
    // 重新组合句子和标点
    const completeSentences: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';
      completeSentences.push(sentence + punctuation);
    }
    
    console.log(`📖 小说内容共 ${novelContent.length} 字，${completeSentences.length} 个句子`);
    console.log(`📋 需要分成 ${sceneCount} 个场景，每个场景约 ${TARGET_CHARS_PER_SEGMENT} 字（不少于${MIN_CHARS_PER_SEGMENT}字）`);
    
    // 计算平均每个场景应该分配多少句子
    const avgSentencesPerScene = Math.ceil(completeSentences.length / sceneCount);
    console.log(`📊 平均每个场景分配 ${avgSentencesPerScene} 个句子`);
    
    // 按场景数量和字符数智能分段
    const segments: string[] = [];
    let sentenceIndex = 0;
    
    for (let i = 0; i < sceneCount; i++) {
      let currentSegment = '';
      
      // 至少要达到最小字符数（90字）
      while (sentenceIndex < completeSentences.length && currentSegment.length < MIN_CHARS_PER_SEGMENT) {
        currentSegment += completeSentences[sentenceIndex];
        sentenceIndex++;
      }
      
      // 如果已经达到最小字符数，继续添加句子直到接近目标字符数或超过最大字符数
      while (sentenceIndex < completeSentences.length) {
        const nextSentence = completeSentences[sentenceIndex];
        
        // 如果加上下一句会超过最大字符数，就停止
        if (currentSegment.length + nextSentence.length > MAX_CHARS_PER_SEGMENT) {
          break;
        }
        
        // 如果加上下一句接近或达到目标字符数，就加上然后停止
        currentSegment += nextSentence;
        sentenceIndex++;
        
        if (currentSegment.length >= TARGET_CHARS_PER_SEGMENT) {
          break;
        }
      }
      
      // 如果当前片段为空（理论上不应该发生），至少加一句话
      if (currentSegment.length === 0 && sentenceIndex < completeSentences.length) {
        currentSegment = completeSentences[sentenceIndex];
        sentenceIndex++;
      }
      
      segments.push(currentSegment.trim());
    }
    
    // 处理剩余的句子：如果还有剩余句子，均匀分配到各个片段
    if (sentenceIndex < completeSentences.length) {
      console.log(`⚠️ 还有 ${completeSentences.length - sentenceIndex} 个句子未分配，开始均匀分配...`);
      
      let segmentIndex = 0;
      let loopCount = 0; // 防止死循环的计数器
      const maxLoops = segments.length * 2; // 最多循环2轮
      
      while (sentenceIndex < completeSentences.length && loopCount < maxLoops) {
        const sentence = completeSentences[sentenceIndex];
        
        // 如果当前片段加上这句话不超过最大字符数+10，就加上
        if (segments[segmentIndex].length + sentence.length <= MAX_CHARS_PER_SEGMENT + 10) {
          segments[segmentIndex] += sentence;
          sentenceIndex++;
          loopCount = 0; // 成功添加后重置计数器
        } else {
          loopCount++; // 无法添加，计数器+1
        }
        
        // 移动到下一个片段
        segmentIndex = (segmentIndex + 1) % segments.length;
      }
      
      // 如果还有剩余句子（所有片段都已满），找最短的片段添加
      if (sentenceIndex < completeSentences.length) {
        console.log(`⚠️ 所有片段都已满，将剩余 ${completeSentences.length - sentenceIndex} 个句子添加到最短的片段`);
        
        while (sentenceIndex < completeSentences.length) {
          // 找到当前最短的片段
          let minLength = segments[0].length;
          let minIndex = 0;
          for (let i = 1; i < segments.length; i++) {
            if (segments[i].length < minLength) {
              minLength = segments[i].length;
              minIndex = i;
            }
          }
          
          // 添加到最短的片段
          segments[minIndex] += completeSentences[sentenceIndex];
          sentenceIndex++;
        }
      }
    }
    
    // 输出每个片段的字符数
    console.log(`📊 小说内容分段结果：`);
    segments.forEach((seg, idx) => {
      const status = seg.length < MIN_CHARS_PER_SEGMENT ? '⚠️ 少于90字' : '✅';
      console.log(`  片段${idx + 1}: ${seg.length} 字 ${status}`);
    });
    
    return segments;
  };

  // 生成剧本
  const handleGenerateScripts = async () => {
    if (!selectedNovel || selectedChapters.length === 0) {
      toast.error('请先选择要生成剧本的章节');
      return;
    }

    // 检查哪些章节已经有剧本
    const existingScripts = selectedNovel.scripts_data || [];
    const existingChapters = existingScripts.map(s => s.chapter_number);
    const chaptersWithScripts = selectedChapters.filter(ch => existingChapters.includes(ch));
    
    if (chaptersWithScripts.length > 0) {
      const confirmRegenerate = window.confirm(
        `以下章节已有剧本：第${chaptersWithScripts.join('、')}章\n\n是否要重新生成这些章节的剧本？\n\n点击"确定"将重新生成，点击"取消"将跳过这些章节。`
      );
      
      if (!confirmRegenerate) {
        // 用户选择跳过已有剧本的章节
        const chaptersToGenerate = selectedChapters.filter(ch => !existingChapters.includes(ch));
        if (chaptersToGenerate.length === 0) {
          toast.info('所有选中的章节都已有剧本，无需生成');
          return;
        }
        setSelectedChapters(chaptersToGenerate);
        toast.info(`将跳过已有剧本的章节，仅生成第${chaptersToGenerate.join('、')}章`);
      }
    }

    console.log('========================================');
    console.log('🎬 [剧本生成器] 开始生成剧本');
    console.log('📚 小说:', selectedNovel.novel_title);
    console.log('📝 选中章节:', selectedChapters);

    setIsGenerating(true);
    setProgress(0);
    
    // 保留未选中章节的已有剧本
    const chaptersToGenerate = selectedChapters;
    const preservedScripts = existingScripts.filter(
      script => !chaptersToGenerate.includes(script.chapter_number)
    );
    
    console.log(`🔄 保留了 ${preservedScripts.length} 个未选中章节的剧本`);
    console.log(`📝 将要生成 ${chaptersToGenerate.length} 个章节的剧本`);

    const newScripts: ScriptData[] = [...preservedScripts];
    const totalChapters = chaptersToGenerate.length;

    try {
      for (let i = 0; i < chaptersToGenerate.length; i++) {
        const chapterNumber = chaptersToGenerate[i];
        const chapter = selectedNovel.chapters_data.find(ch => ch.chapter_number === chapterNumber);

        if (!chapter) {
          console.warn(`⚠️ 章节 ${chapterNumber} 不存在，跳过`);
          continue;
        }

        console.log(`\n🎬 [剧本生成器] 正在生成第 ${i + 1}/${totalChapters} 个剧本...`);
        console.log(`📝 章节号: ${chapterNumber}`);
        console.log(`📝 章节标题: ${chapter.title}`);

        // 每个章节生成前扣减码分
        console.log(`💰 [剧本生成器] 扣减第 ${chapterNumber} 章的码分...`);
        const success = await deductCredits(currentUser?.id || '', 'script_creation', `生成第${chapterNumber}章剧本`);
        if (!success) {
          console.log(`❌ [剧本生成器] 第 ${chapterNumber} 章码分扣减失败，停止生成`);
          toast.error(`第${chapterNumber}章码分不足，已停止生成`);
          break;
        }

        setGeneratingChapter(chapterNumber);
        toast.loading(`正在生成第${chapterNumber}章的剧本...`, { id: `script-${chapterNumber}` });

        try {
          // 第一步：使用AI智能分段小说内容（保持语义完整，每段约55字）
          console.log(`📖 第一步：使用AI智能分段小说内容...`);
          const contentLength = chapter.content.length;
          // 根据小说长度计算场景数量：每55字一个场景（50-60字范围）
          // 移除最大15个场景的限制，让场景数量根据章节内容自动确定
          const estimatedSceneCount = Math.max(5, Math.ceil(contentLength / 55));
          console.log(`📊 小说内容长度: ${contentLength} 字`);
          console.log(`📊 预计场景数量: ${estimatedSceneCount} 个（每场景约55字）`);
          console.log(`✅ 已移除场景数量上限限制，根据章节内容自动确定`);
          
          toast.loading(`正在使用AI智能分段小说内容...`, { id: `segment-${chapterNumber}` });
          
          const novelSegments = await segmentNovelContentWithAI(
            chapter.content,
            estimatedSceneCount,
            selectedNovel.novel_title,
            chapterNumber,
            chapter.title
          );
          
          toast.success(`AI智能分段完成，共${novelSegments.length}段`, { id: `segment-${chapterNumber}` });
          
          console.log(`✅ AI智能分段完成，共 ${novelSegments.length} 段`);
          novelSegments.forEach((seg, idx) => {
            const status = seg.length < 90 ? '⚠️ 少于90字' : seg.length > 100 ? '⚠️ 超过100字' : '✅';
            console.log(`  片段${idx + 1}: ${seg.length} 字 ${status}`);
          });

          // 第二步：一次性生成整章所有场景的解说内容（严格控制字数）
          console.log(`\n📝 第二步：一次性生成整章所有场景的解说内容...`);
          toast.loading(`正在生成整章解说内容（${novelSegments.length}个场景）...`, { 
            id: `narration-${chapterNumber}` 
          });
          
          const allNarrations = await extractAllNarrationContents(
            novelSegments,
            selectedNovel.novel_title,
            chapterNumber,
            chapter.title
          );
          
          toast.success(`整章解说内容生成完成（${allNarrations.length}个场景）`, { 
            id: `narration-${chapterNumber}` 
          });
          
          console.log(`✅ 整章解说内容生成完成，共${allNarrations.length}个场景`);
          allNarrations.forEach((narration, idx) => {
            console.log(`  场景${idx + 1}解说: "${narration}" (${narration.length}字)`);
          });
          
          const totalNarrationChars = allNarrations.reduce((sum, n) => sum + n.length, 0);
          console.log(`📊 总字数: ${totalNarrationChars}字 (要求: ${novelSegments.length * 20}-${novelSegments.length * 22}字)`);

          // 第三步：为每个小说片段生成对应的剧本场景
          console.log(`\n🎬 第三步：开始为每个小说片段生成剧本场景...`);
          const scenes: SceneSegment[] = [];
          
          for (let sceneIndex = 0; sceneIndex < novelSegments.length; sceneIndex++) {
            const novelSegment = novelSegments[sceneIndex];
            const sceneNumber = sceneIndex + 1;
            const narrationContent = allNarrations[sceneIndex]; // 使用已生成的解说内容
            
            console.log(`\n🎬 正在生成场景 ${sceneNumber}/${novelSegments.length}...`);
            console.log(`📖 对应小说片段: ${novelSegment.substring(0, 50)}...（共${novelSegment.length}字）`);
            console.log(`📝 对应解说内容: "${narrationContent}" (${narrationContent.length}字)`);
            
            toast.loading(`正在生成第${chapterNumber}章的场景${sceneNumber}/${novelSegments.length}...`, { 
              id: `script-${chapterNumber}-scene-${sceneNumber}` 
            });
            
            try {
              // 根据小说片段生成剧本场景
              console.log(`🎬 根据小说片段生成剧本场景...`);
              const sceneData = await generateScriptForSegment(
                novelSegment, // ✅ 使用100-120字的小说片段
                sceneNumber,
                selectedNovel.novel_title,
                chapterNumber,
                chapter.title
              );
              
              scenes.push({
                scene_number: sceneNumber,
                scene_title: sceneData.scene_title,
                script_content: sceneData.script_content,
                novel_content: novelSegment, // ✅ 100-120字小说片段
                narration_content: narrationContent // ✅ 20-22字解说内容（已生成）
              });
              
              console.log(`✅ 场景${sceneNumber}生成成功: ${sceneData.scene_title}`);
              console.log(`   - 剧本长度: ${sceneData.script_content.length} 字符`);
              console.log(`   - 小说片段长度: ${novelSegment.length} 字符`);
              console.log(`   - 解说内容: "${narrationContent}" (${narrationContent.length}字)`);
              console.log(`   - 数据关联: 小说片段(${novelSegment.length}字) → 剧本场景 + 解说内容(${narrationContent.length}字) ✅`);
              
              toast.success(`场景${sceneNumber}生成成功`, { 
                id: `script-${chapterNumber}-scene-${sceneNumber}` 
              });
            } catch (error) {
              console.error(`❌ 场景${sceneNumber}生成失败:`, error);
              toast.error(`场景${sceneNumber}生成失败`, { 
                id: `script-${chapterNumber}-scene-${sceneNumber}` 
              });
              // 如果某个场景生成失败，添加一个空场景
              scenes.push({
                scene_number: sceneNumber,
                scene_title: `场景${sceneNumber}`,
                script_content: `【场景${sceneNumber}：生成失败】\n画面：生成失败，请重新生成。`,
                novel_content: novelSegment,
                narration_content: narrationContent // 使用已生成的解说内容
              });
            }
          }

          // 第四步：组合完整剧本数据
          console.log(`\n🎯 第四步：组合完整剧本数据...`);
          const fullScriptContent = scenes.map(scene => scene.script_content).join('\n\n');
          
          const script: ScriptData = {
            chapter_number: chapterNumber,
            chapter_title: chapter.title,
            script_content: fullScriptContent, // 完整剧本内容
            scenes: scenes, // 场景分段数据
            generated_at: new Date().toISOString()
          };

          console.log(`✅ [剧本生成器] 第 ${chapterNumber} 章剧本生成成功`);
          console.log(`📊 剧本总长度: ${fullScriptContent.length} 字符`);
          console.log(`📋 场景数量: ${scenes.length} 个`);
          console.log(`🎯 场景数据汇总:`);
          scenes.forEach((scene, idx) => {
            console.log(`  场景${idx + 1}: ${scene.scene_title}`);
            console.log(`    - 剧本长度: ${scene.script_content.length} 字符`);
            console.log(`    - 小说片段长度: ${scene.novel_content.length} 字符`);
            console.log(`    - 解说内容: "${scene.narration_content}" (${scene.narration_content.length}字)`);
          });

          newScripts.push(script);
          
          // 实时显示所有剧本（包括保留的和新生成的）
          setGeneratedScripts([...newScripts]);
          
          toast.success(`第${chapterNumber}章剧本生成成功！`, { id: `script-${chapterNumber}` });

          // 更新进度
          setProgress(((i + 1) / totalChapters) * 100);
        } catch (error) {
          console.error(`❌ [剧本生成器] 第 ${chapterNumber} 章剧本生成失败:`, error);
          toast.error(`第${chapterNumber}章剧本生成失败`, { id: `script-${chapterNumber}` });
        }
      }

      // 保存到数据库（保存所有剧本，包括保留的和新生成的）
      if (newScripts.length > 0) {
        console.log('\n💾 [剧本生成器] 开始保存剧本到数据库...');
        console.log(`📊 待保存剧本总数: ${newScripts.length}（包括${preservedScripts.length}个保留的剧本）`);
        
        await updateNovelScripts(selectedNovel.id, newScripts);
        
        console.log('✅ [剧本生成器] 剧本保存成功');
        
        // 重新加载小说列表以更新数据
        if (currentUser) {
          await loadUserNovels(currentUser.id);
        }
      }

      const newlyGeneratedCount = newScripts.length - preservedScripts.length;
      console.log('\n========================================');
      console.log('✨ [剧本生成器] 全部完成');
      console.log(`📊 本次生成: ${newlyGeneratedCount} 个剧本`);
      console.log(`📊 总剧本数: ${newScripts.length} 个`);
      console.log('========================================');

      toast.success(`成功生成 ${newlyGeneratedCount} 个剧本！当前共有 ${newScripts.length} 个剧本`);
      setSelectedChapters([]);
      setSelectAll(false);
    } catch (error) {
      console.error('❌ [剧本生成器] 生成过程异常:', error);
      toast.error('剧本生成过程出现错误');
    } finally {
      setIsGenerating(false);
      setGeneratingChapter(null);
      setProgress(0);
    }
  };

  // 登录成功回调
  const handleLoginSuccess = async () => {
    await checkUserLogin();
    // toast 已经在 LoginDialog 中显示，这里不需要重复显示
    // setIsLoginDialogOpen(false); // 对话框已经在 LoginDialog 中关闭
  };

  // 查看剧本
  const handleViewScript = (script: ScriptData) => {
    setViewingScript(script);
    setIsViewDialogOpen(true);
  };

  // 编辑剧本
  const handleEditScript = (script: ScriptData) => {
    setEditingScript(script);
    setIsEditDialogOpen(true);
  };

  // 保存剧本修改
  const handleSaveScript = async (newContent: string) => {
    if (!editingScript || !selectedNovel) {
      return;
    }

    try {
      console.log('💾 开始保存剧本修改...');
      await updateScriptContent(selectedNovel.id, editingScript.chapter_number, newContent);
      
      // 更新本地状态
      setGeneratedScripts(prev => 
        prev.map(s => 
          s.chapter_number === editingScript.chapter_number
            ? { ...s, script_content: newContent, updated_at: new Date().toISOString() }
            : s
        )
      );

      toast.success('剧本修改成功！');
      setIsEditDialogOpen(false);
      setEditingScript(null);
    } catch (error) {
      console.error('保存剧本修改失败:', error);
      toast.error('保存剧本修改失败');
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-[#FF8A5B] animate-float opacity-20">
          <SakuraPetal className="w-16 h-16" />
        </div>
        <div className="absolute top-40 right-20 text-[#FFCAB8] animate-sparkle opacity-30">
          <AnimeStar className="w-12 h-12" />
        </div>
        <div className="absolute bottom-20 left-1/4 text-[#FF7A4D] animate-wiggle opacity-25">
          <ComicSparkle className="w-10 h-10" />
        </div>
        <div className="absolute top-1/3 right-10 text-[#E64A1F] animate-bounce-gentle opacity-20">
          <CuteEmoji className="w-14 h-14" type="wink" />
        </div>
        <div className="absolute bottom-40 right-1/3 text-[#FF5724] animate-pulse-soft opacity-15">
          <JapaneseFan className="w-20 h-20" />
        </div>
        <div className="absolute top-1/2 left-1/3 text-[#FFCAB8] animate-float opacity-10">
          <ChineseCloud className="w-24 h-16" />
        </div>
      </div>
      {/* 初始加载状态 */}
      {isInitialLoading ? (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="h-16 w-16 text-[#FF5724] animate-spin mb-6" />
          <p className="text-xl text-gray-600 mb-2">正在加载数据...</p>
          <p className="text-sm text-muted-foreground">请稍候</p>
        </div>
      ) : (
        <>
          {/* 主内容区域 */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 页面标题 */}
        <div className="text-center mb-12 relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-[#FF8A5B] animate-sparkle opacity-40">
            <ComicSparkle className="w-8 h-8" />
          </div>
          <h1 className="font-bold bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent mb-4 relative inline-block" style={{ fontSize: '2.25rem' }}>
            码上做剧本
            <div className="absolute -top-2 -right-6 text-[#FF8A5B] animate-wiggle opacity-60">
              <AnimeStar className="w-6 h-6" />
            </div>
          </h1>
          <p className="text-gray-600 text-lg mt-2">将您的小说章节转化为专业剧本格式</p>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-[#E64A1F] animate-pulse-soft opacity-30">

          </div>
        </div>

        {/* 返回按钮 */}
        <div className="mb-6">

        </div>

        {/* 主要内容卡片 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-2 border-[#FFE8E0]">
          <CardHeader className="border-b border-[#FFE8E0]">
            <CardTitle className="flex items-center gap-2 text-2xl text-[#FF5724]">
              <FileText className="h-6 w-6" />
              剧本生成工作台
            </CardTitle>
            <CardDescription>
              选择您的小说和章节，一键生成专业剧本格式
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingNovels ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 text-[#FF5724] animate-spin mb-4" />
                <p className="text-muted-foreground">加载小说列表中...</p>
              </div>
            ) : novels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  您还没有创作任何小说<br />
                  请先在"码上制片厂"页面创作小说
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-[#FF5724] text-white"
                >
                  前往创作
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 小说选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#FF5724]" />
                    选择小说
                  </label>
                  <Select value={selectedNovelId} onValueChange={handleSelectNovel}>
                    <SelectTrigger className="w-full border-[#FFE8E0] focus:ring-[#FF5724]">
                      <SelectValue placeholder="请选择一部小说" />
                    </SelectTrigger>
                    <SelectContent>
                      {novels.map((novel) => (
                        <SelectItem key={novel.id} value={novel.id}>
                          {novel.novel_title} ({novel.chapters_data.length}章)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 章节选择 */}
                {selectedNovel && (
                  <>
                    <Separator className="bg-[#FFE8E0]" />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#FF5724]" />
                          选择章节
                        </label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all"
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                          />
                          <label
                            htmlFor="select-all"
                            className="text-sm font-medium cursor-pointer text-[#FF5724]"
                          >
                            全选 ({selectedNovel.chapters_data.length}章)
                          </label>
                        </div>
                      </div>

                      <ScrollArea className="h-[400px] rounded-md border border-[#FFE8E0] p-4">
                        <div className="space-y-3">
                          {selectedNovel.chapters_data.map((chapter) => (
                            <div
                              key={chapter.chapter_number}
                              className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                selectedChapters.includes(chapter.chapter_number)
                                  ? 'border-[#FF5724] bg-[#FFF5F0]'
                                  : 'border-[#FFE8E0] hover:border-[#FFCAB8] hover:bg-[#FFF5F0]/50'
                              }`}
                              onClick={() => handleChapterToggle(chapter.chapter_number)}
                            >
                              <Checkbox
                                checked={selectedChapters.includes(chapter.chapter_number)}
                                onCheckedChange={() => handleChapterToggle(chapter.chapter_number)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="border-[#FF5724] text-[#FF5724]">
                                    第{chapter.chapter_number}章
                                  </Badge>
                                  <span className="font-medium text-gray-900">{chapter.title}</span>
                                  {/* 显示已生成剧本的标识 */}
                                  {generatedScripts.some(s => s.chapter_number === chapter.chapter_number) && (
                                    <Badge className="bg-green-500 text-white">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      已生成
                                    </Badge>
                                  )}
                                  {generatingChapter === chapter.chapter_number && (
                                    <Loader2 className="h-4 w-4 text-[#FF5724] animate-spin" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {chapter.content.substring(0, 100)}...
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* 生成按钮和进度 */}
                    <div className="space-y-4">
                      {/* 积分消耗提示 */}
                      <div className="flex items-center justify-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <Coins className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-900">
                          每章节消耗 <span className="font-bold text-orange-600">{creditCostPerChapter}</span> 码分，
                          共 <span className="font-bold text-orange-600">{selectedChapters.length}</span> 章，
                          总计 <span className="font-bold text-orange-600">{selectedChapters.length * creditCostPerChapter}</span> 码分
                        </span>
                      </div>

                      {isGenerating && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">生成进度</span>
                            <span className="font-medium text-[#FF5724]">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button
                          onClick={handleGenerateScripts}
                          disabled={selectedChapters.length === 0 || isGenerating}
                          className="flex-1 bg-[#FF5724] text-white"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              生成剧本 ({selectedChapters.length}章 · {creditCostPerChapter}码分/章)
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 已生成的剧本列表 */}
                    {generatedScripts.length > 0 && (
                      <>
                        <Separator className="bg-[#FFE8E0]" />
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              已生成剧本 ({generatedScripts.length})
                            </h3>
                          </div>
                          
                          <div className="grid gap-3">
                            {generatedScripts.map((script) => (
                              <Card key={script.chapter_number} className="border-[#FFE8E0]">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className="bg-[#FF5724] text-white">
                                          第{script.chapter_number}章
                                        </Badge>
                                        <span className="font-medium">{script.chapter_title}</span>
                                        {script.scenes && script.scenes.length > 0 && (
                                          <Badge variant="secondary" className="ml-1">
                                            {script.scenes.length} 个场景
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        生成时间：{new Date(script.generated_at).toLocaleString('zh-CN')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        onClick={() => handleViewScript(script)}
                                        variant="outline"
                                        size="sm"
                                        className="border-[#FF5724] hover:bg-[#FFE8E0] text-[#ffffffff]"
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        查看
                                      </Button>
                                      <Button
                                        onClick={() => handleEditScript(script)}
                                        variant="outline"
                                        size="sm"
                                        className="border-[#FF5724] hover:bg-[#FFE8E0] text-[#ffffffff]"
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        修改
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </>
      )}
      {/* 登录对话框 */}
      <LoginDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
        onLoginSuccess={handleLoginSuccess}
      />
      {/* 查看剧本对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#FF5724] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              第{viewingScript?.chapter_number}章 - {viewingScript?.chapter_title}
              {viewingScript?.scenes && viewingScript.scenes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {viewingScript.scenes.length} 个场景
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ScrollArea className="h-[60vh] pr-4">
              {viewingScript?.scenes && viewingScript.scenes.length > 0 ? (
                // 显示场景分段
                <div className="space-y-6">
                  {viewingScript.scenes.map((scene, index) => (
                    <Card key={index} className="border-l-4 border-l-[#FF5724]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Badge variant="outline" className="text-[#FF5724] border-[#FF5724]">
                            场景 {scene.scene_number}
                          </Badge>
                          <span className="text-base font-medium">{scene.scene_title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 剧本内容 */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#FF5724] mb-2 flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            剧本内容
                          </h4>
                          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            {scene.script_content}
                          </pre>
                        </div>
                        
                        {/* 对应的小说片段 */}
                        {scene.novel_content && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              对应小说片段
                            </h4>
                            <div className="text-sm bg-blue-50 dark:bg-blue-950 p-4 rounded-lg whitespace-pre-wrap">
                              {scene.novel_content}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // 显示完整剧本（向后兼容）
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                  {viewingScript?.script_content}
                </pre>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      {/* 编辑剧本对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#FF5724] flex items-center gap-2">
              <Edit className="h-5 w-5" />
              修改剧本 - 第{editingScript?.chapter_number}章
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {editingScript && (
              <RichTextEditor
                title={`第${editingScript.chapter_number}章 - ${editingScript.chapter_title}`}
                initialContent={editingScript.script_content}
                onSave={handleSaveScript}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setEditingScript(null);
                }}
                placeholder="请输入剧本内容..."
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScriptGenerationPage;
