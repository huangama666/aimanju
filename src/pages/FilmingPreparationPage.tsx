import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  getCurrentUser, 
  getUserNovels, 
  updateNovel,
  updateCostumeAnalysis,
  updateMakeupAnalysis,
  updatePropsAnalysis,
  updateSceneAnalysis,
  getCreditCosts
} from "@/db/api";
import type { DbNovel, CostumeItem, MakeupItem, PropItem, SceneItem, StylingLogicItem, OverallAnalysisItem } from "@/types/database";
import { Loader2, Sparkles, Image as ImageIcon, CheckCircle2, X, AlertCircle, Coins } from "lucide-react";
import { useCredits } from '@/hooks/useCredits';
import { sendChatStream } from "@/utils/ai-chat-stream";
import axios from "axios";
import { ChapterAnalysisDisplay } from "@/components/filming/ChapterAnalysisDisplay";
import { uploadImagesToStorage } from "@/utils/storage-helper";

const APP_ID = import.meta.env.VITE_APP_ID;

export default function FilmingPreparationPage() {
  const navigate = useNavigate();
  const { deduct: deductCredits, deductByQuantity } = useCredits();
  
  const [novels, setNovels] = useState<DbNovel[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string>("");
  const [selectedNovel, setSelectedNovel] = useState<DbNovel | null>(null);
  const [selectedScripts, setSelectedScripts] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // 初始加载状态
  const [analysisProgress, setAnalysisProgress] = useState(0); // 分析进度
  const [currentAnalyzingChapter, setCurrentAnalyzingChapter] = useState<number | null>(null); // 当前正在分析的章节
  const [failedChapters, setFailedChapters] = useState<number[]>([]); // 失败的章节列表
  const [creditCostPerChapter, setCreditCostPerChapter] = useState<number>(1); // 每章节默认1码分
  const [analysisResult, setAnalysisResult] = useState<{
    costume: CostumeItem[];
    makeup: MakeupItem[];
    props: PropItem[];
    scene: SceneItem[];
    stylingLogic: StylingLogicItem[];
    overallAnalysis: OverallAnalysisItem[];
  } | null>(null);
  const [generatingImages, setGeneratingImages] = useState<{
    [key: string]: boolean;
  }>({});
  const [generatedImages, setGeneratedImages] = useState<{
    [key: string]: string[];
  }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageGenerationQueue, setImageGenerationQueue] = useState<Array<{
    category: string;
    items: unknown[];
  }>>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // 获取当前用户的小说列表
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          toast.error("请先登录");
          navigate("/");
          return;
        }

        const userNovels = await getUserNovels(user.id);
        // 只显示有剧本的小说
        const novelsWithScripts = userNovels.filter(novel => 
          novel.scripts_data && novel.scripts_data.length > 0
        );
        setNovels(novelsWithScripts);
      } catch (error) {
        console.error("获取小说列表失败:", error);
        toast.error("获取小说列表失败");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchNovels();
  }, [navigate]);

  // 获取每章节积分价格
  useEffect(() => {
    const fetchCreditCost = async () => {
      try {
        const costs = await getCreditCosts();
        setCreditCostPerChapter(costs.filming_analysis_cost);
        console.log('✅ [拍戏分析] 获取每章节积分消耗:', costs.filming_analysis_cost);
      } catch (error) {
        console.error('❌ [拍戏分析] 获取积分价格失败:', error);
        // 使用默认值1码分/章节
        setCreditCostPerChapter(1);
      }
    };
    fetchCreditCost();
  }, []);

  // 当选择小说时，更新选中的小说
  const handleNovelSelect = (novelId: string) => {
    setSelectedNovelId(novelId);
    const novel = novels.find(n => n.id === novelId);
    setSelectedNovel(novel || null);
    setSelectedScripts([]);
    
    // 加载已有的分析结果
    if (novel) {
      const hasAnalysis = 
        (novel.costume_data && novel.costume_data.length > 0) ||
        (novel.makeup_data && novel.makeup_data.length > 0) ||
        (novel.props_data && novel.props_data.length > 0) ||
        (novel.scene_data && novel.scene_data.length > 0) ||
        (novel.styling_logic_data && novel.styling_logic_data.length > 0) ||
        (novel.overall_analysis_data && novel.overall_analysis_data.length > 0);
      
      if (hasAnalysis) {
        setAnalysisResult({
          costume: novel.costume_data || [],
          makeup: novel.makeup_data || [],
          props: novel.props_data || [],
          scene: novel.scene_data || [],
          stylingLogic: novel.styling_logic_data || [],
          overallAnalysis: novel.overall_analysis_data || []
        });
        console.log('✅ 已加载小说的分析结果');
      } else {
        setAnalysisResult(null);
      }
    } else {
      setAnalysisResult(null);
    }
    
    setGeneratedImages({});
    
    // 如果小说有已保存的图片数据，加载它们（按章节分类）
    if (novel) {
      const savedImages: { [key: string]: string[] } = {};
      
      // 加载服装图片（按章节）
      if (novel.costume_data) {
        novel.costume_data.forEach((item: CostumeItem) => {
          const key = `costume_${item.chapter_number}`;
          if (item.image_urls && item.image_urls.length > 0) {
            if (!savedImages[key]) {
              savedImages[key] = [];
            }
            savedImages[key].push(...item.image_urls);
          }
        });
      }
      
      // 加载化妆图片（按章节）
      if (novel.makeup_data) {
        novel.makeup_data.forEach((item: MakeupItem) => {
          const key = `makeup_${item.chapter_number}`;
          if (item.image_urls && item.image_urls.length > 0) {
            if (!savedImages[key]) {
              savedImages[key] = [];
            }
            savedImages[key].push(...item.image_urls);
          }
        });
      }
      
      // 加载道具图片（按章节）
      if (novel.props_data) {
        novel.props_data.forEach((item: PropItem) => {
          const key = `props_${item.chapter_number}`;
          if (item.image_urls && item.image_urls.length > 0) {
            if (!savedImages[key]) {
              savedImages[key] = [];
            }
            savedImages[key].push(...item.image_urls);
          }
        });
      }
      
      // 加载布景图片（按章节）
      if (novel.scene_data) {
        novel.scene_data.forEach((item: SceneItem) => {
          const key = `scene_${item.chapter_number}`;
          if (item.image_urls && item.image_urls.length > 0) {
            if (!savedImages[key]) {
              savedImages[key] = [];
            }
            savedImages[key].push(...item.image_urls);
          }
        });
      }
      
      console.log('📥 加载已保存的图片:', savedImages);
      setGeneratedImages(savedImages);
    }
  };

  // 检查章节是否已分析
  const isChapterAnalyzed = (chapterNumber: number): boolean => {
    if (!analysisResult) return false;
    
    return (
      analysisResult.costume.some(item => item.chapter_number === chapterNumber) ||
      analysisResult.makeup.some(item => item.chapter_number === chapterNumber) ||
      analysisResult.props.some(item => item.chapter_number === chapterNumber) ||
      analysisResult.scene.some(item => item.chapter_number === chapterNumber) ||
      analysisResult.stylingLogic.some(item => item.chapter_number === chapterNumber) ||
      analysisResult.overallAnalysis.some(item => item.chapter_number === chapterNumber)
    );
  };

  // 处理图片生成队列
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingQueue || imageGenerationQueue.length === 0) {
        return;
      }

      setIsProcessingQueue(true);
      const task = imageGenerationQueue[0];
      
      try {
        await handleGenerateImagesInternal(task.category, task.items);
      } catch (error) {
        console.error("队列处理失败:", error);
      }
      
      // 移除已处理的任务
      setImageGenerationQueue(prev => prev.slice(1));
      setIsProcessingQueue(false);
    };

    processQueue();
  }, [imageGenerationQueue, isProcessingQueue]);

  // 切换剧本选择
  const toggleScriptSelection = (chapterNumber: number) => {
    setSelectedScripts(prev => {
      if (prev.includes(chapterNumber)) {
        return prev.filter(n => n !== chapterNumber);
      } else {
        return [...prev, chapterNumber];
      }
    });
  };

  // 分析剧本
  const handleAnalyzeScript = async () => {
    if (!selectedNovel || selectedScripts.length === 0) {
      toast.error("请选择要分析的剧本");
      return;
    }

    // 检查哪些章节已经分析过
    const analyzedChapters = selectedScripts.filter(ch => isChapterAnalyzed(ch));
    
    if (analyzedChapters.length > 0) {
      const confirmReanalyze = window.confirm(
        `以下章节已有分析结果：第${analyzedChapters.join('、')}章\n\n是否要重新分析这些章节？\n\n点击"确定"将重新分析，点击"取消"将跳过这些章节。`
      );
      
      if (!confirmReanalyze) {
        // 用户选择跳过已分析的章节
        const chaptersToAnalyze = selectedScripts.filter(ch => !analyzedChapters.includes(ch));
        if (chaptersToAnalyze.length === 0) {
          toast.info('所有选中的章节都已分析，无需重新分析');
          return;
        }
        setSelectedScripts(chaptersToAnalyze);
        toast.info(`将跳过已分析的章节，仅分析第${chaptersToAnalyze.join('、')}章`);
      }
    }

    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      toast.error("请先登录");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentAnalyzingChapter(null);
    setFailedChapters([]);
    console.log("🎬 开始按章节分析剧本...");

    try {
      // 获取选中的剧本
      const selectedScriptData = selectedNovel.scripts_data
        .filter(script => selectedScripts.includes(script.chapter_number))
        .sort((a, b) => a.chapter_number - b.chapter_number);

      console.log(`📝 共选中 ${selectedScriptData.length} 个章节的剧本`);

      // 用于存储所有章节的分析结果 - 从现有结果开始，而不是空数组
      const allCostume: CostumeItem[] = analysisResult?.costume ? [...analysisResult.costume] : [];
      const allMakeup: MakeupItem[] = analysisResult?.makeup ? [...analysisResult.makeup] : [];
      const allProps: PropItem[] = analysisResult?.props ? [...analysisResult.props] : [];
      const allScene: SceneItem[] = analysisResult?.scene ? [...analysisResult.scene] : [];
      const allStylingLogic: StylingLogicItem[] = analysisResult?.stylingLogic ? [...analysisResult.stylingLogic] : [];
      const allOverallAnalysis: OverallAnalysisItem[] = analysisResult?.overallAnalysis ? [...analysisResult.overallAnalysis] : [];

      // 记录要分析的章节号
      const chaptersToAnalyze = selectedScriptData.map(s => s.chapter_number);
      console.log(`📋 将要分析的章节: ${chaptersToAnalyze.join(', ')}`);

      // 移除这些章节的旧分析结果（如果存在）
      const removedCostume = allCostume.filter(item => !chaptersToAnalyze.includes(item.chapter_number));
      const removedMakeup = allMakeup.filter(item => !chaptersToAnalyze.includes(item.chapter_number));
      const removedProps = allProps.filter(item => !chaptersToAnalyze.includes(item.chapter_number));
      const removedScene = allScene.filter(item => !chaptersToAnalyze.includes(item.chapter_number));
      const removedStylingLogic = allStylingLogic.filter(item => !chaptersToAnalyze.includes(item.chapter_number));
      const removedOverallAnalysis = allOverallAnalysis.filter(item => !chaptersToAnalyze.includes(item.chapter_number));

      // 清空数组并添加保留的结果
      allCostume.length = 0;
      allCostume.push(...removedCostume);
      allMakeup.length = 0;
      allMakeup.push(...removedMakeup);
      allProps.length = 0;
      allProps.push(...removedProps);
      allScene.length = 0;
      allScene.push(...removedScene);
      allStylingLogic.length = 0;
      allStylingLogic.push(...removedStylingLogic);
      allOverallAnalysis.length = 0;
      allOverallAnalysis.push(...removedOverallAnalysis);

      console.log(`🔄 保留了其他章节的分析结果`);

      const failedChaptersList: number[] = [];

      // 逐个章节进行分析
      for (let i = 0; i < selectedScriptData.length; i++) {
        const script = selectedScriptData[i];
        const chapterNum = script.chapter_number;
        const chapterTitle = script.chapter_title;
        const scriptContent = script.script_content;

        // 每个章节分析前扣减1码分
        console.log(`💰 [剧本分析] 扣减第 ${chapterNum} 章的码分...`);
        const success = await deductCredits(user.id, 'filming_analysis', `分析第${chapterNum}章剧本`);
        if (!success) {
          console.log(`❌ [剧本分析] 第 ${chapterNum} 章码分扣减失败，停止分析`);
          toast.error(`第${chapterNum}章码分不足，已停止分析`);
          failedChaptersList.push(chapterNum);
          break;
        }

        // 更新当前分析的章节
        setCurrentAnalyzingChapter(chapterNum);
        const progressPercent = Math.round((i / selectedScriptData.length) * 100);
        setAnalysisProgress(progressPercent);

        console.log(`\n📖 正在分析第 ${i + 1}/${selectedScriptData.length} 个章节：第${chapterNum}章 - ${chapterTitle}`);
        toast.info(`正在分析第 ${i + 1}/${selectedScriptData.length} 个章节：第${chapterNum}章`);

        // 构建分析提示词
        const analysisPrompt = `你是一位专业的影视制作顾问。请分析以下剧本章节内容，并按照六个方面提供详细的拍摄制作指导。

剧本章节：
第${chapterNum}章：${chapterTitle}

剧本内容：
${scriptContent}

请按照以下格式返回JSON数据（必须是有效的JSON格式）：

{
  "costume": [
    {
      "character": "角色名称",
      "description": "服装详细描述",
      "material": "材质说明",
      "color": "颜色及其象征意义",
      "style": "风格特点",
      "purpose": "设计用途和功能"
    }
  ],
  "makeup": [
    {
      "character": "角色名称",
      "description": "化妆详细描述",
      "style": "妆容风格",
      "details": "细节要求",
      "emotion": "情绪表达"
    }
  ],
  "props": [
    {
      "name": "道具名称",
      "description": "道具详细描述",
      "function": "功能说明",
      "plot_relevance": "与剧情的关联"
    }
  ],
  "scene": [
    {
      "location": "场景位置",
      "layout": "布局描述（只描述场景布局，不要包含任何人物、角色或人的活动）",
      "decoration": "装饰风格（只描述装饰物品，不要包含任何人物）",
      "atmosphere": "氛围描述（只描述环境氛围，不要包含任何人物）",
      "lighting": "光源设置（只描述光线效果，不要包含任何人物）"
    }
  ],
  "stylingLogic": [
    {
      "aspect": "方面（服装/化妆/道具/布景）",
      "logic": "逻辑说明",
      "character_reflection": "如何反映角色",
      "plot_connection": "与剧情的联系"
    }
  ],
  "overallAnalysis": [
    {
      "category": "分类",
      "suggestion": "建议",
      "coordination": "协调要求"
    }
  ]
}

重要提示：
1. 请确保返回的是完整的、有效的JSON格式数据，不要包含任何其他文字说明
2. 如果某个章节没有相关内容，可以返回空数组[]
3. 请详细分析本章节的所有相关内容
4. **布景分析特别要求**：在scene的layout、decoration、atmosphere、lighting字段中，只描述场景环境本身，不要包含任何人物、角色或人的活动。例如：
   - ❌ 错误示例："评审室内摆放长桌和椅子，有评委在评审项目"
   - ✅ 正确示例："评审室内摆放长桌和椅子"
   - ❌ 错误示例："客厅里有沙发和茶几，主人公坐在沙发上"
   - ✅ 正确示例："客厅里有沙发和茶几"
5. 布景分析应该纯粹描述场景环境、布局、装饰、氛围和光线，不涉及任何人物元素`;

        let fullResponse = "";
        let chapterAnalysisSuccess = false;

        // 调用AI模型进行分析
        try {
          await new Promise<void>((resolve, reject) => {
            sendChatStream({
              endpoint: "/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat",
              apiId: APP_ID,
              messages: [
                {
                  role: "user",
                  content: analysisPrompt
                }
              ],
              onUpdate: (content: string) => {
                fullResponse = content;
                console.log(`📊 第${chapterNum}章 AI分析进度:`, content.length, "字符");
              },
              onComplete: async () => {
                console.log(`✅ 第${chapterNum}章 AI分析完成`);

                try {
                  // 尝试从响应中提取JSON
                  let jsonStr = fullResponse.trim();
                  
                  // 如果响应包含```json标记，提取其中的JSON
                  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
                  if (jsonMatch) {
                    jsonStr = jsonMatch[1].trim();
                  } else {
                    // 尝试找到第一个{和最后一个}
                    const firstBrace = jsonStr.indexOf('{');
                    const lastBrace = jsonStr.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                    }
                  }

                  console.log(`🔍 第${chapterNum}章 提取的JSON字符串:`, jsonStr.substring(0, 200) + "...");

                  // 尝试修复常见的JSON格式问题
                  try {
                    // 第一次尝试：直接解析
                    const parsedResult = JSON.parse(jsonStr);
                    console.log(`✅ 第${chapterNum}章 JSON解析成功`);

                    // 将当前章节的分析结果添加到总结果中，并添加chapter_number字段
                    if (parsedResult.costume) {
                      allCostume.push(...parsedResult.costume.map((item: CostumeItem) => ({
                        ...item,
                        chapter_number: chapterNum
                      })));
                    }
                    if (parsedResult.makeup) {
                      allMakeup.push(...parsedResult.makeup.map((item: MakeupItem) => ({
                        ...item,
                        chapter_number: chapterNum
                      })));
                    }
                    if (parsedResult.props) {
                      allProps.push(...parsedResult.props.map((item: PropItem) => ({
                        ...item,
                        chapter_number: chapterNum
                      })));
                    }
                    if (parsedResult.scene) {
                      allScene.push(...parsedResult.scene.map((item: SceneItem) => ({
                        ...item,
                        chapter_number: chapterNum
                      })));
                    }
                    if (parsedResult.stylingLogic) {
                      allStylingLogic.push(...parsedResult.stylingLogic.map((item: StylingLogicItem) => ({
                        ...item,
                        chapter_number: chapterNum
                      })));
                    }
                    if (parsedResult.overallAnalysis) {
                      allOverallAnalysis.push(...parsedResult.overallAnalysis.map((item: OverallAnalysisItem) => ({
                        ...item,
                        chapter_number: chapterNum
                      })));
                    }

                    // 实时更新显示结果
                    setAnalysisResult({
                      costume: [...allCostume],
                      makeup: [...allMakeup],
                      props: [...allProps],
                      scene: [...allScene],
                      stylingLogic: [...allStylingLogic],
                      overallAnalysis: [...allOverallAnalysis]
                    });

                    chapterAnalysisSuccess = true;
                    resolve();
                  } catch (parseError) {
                    // 第二次尝试：修复JSON格式问题
                    console.warn(`⚠️ 第${chapterNum}章 JSON解析失败，尝试修复...`);
                    
                    // 尝试修复常见问题：
                    // 1. 移除末尾的逗号
                    let fixedJson = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                    // 2. 修复未闭合的数组和对象
                    const openBraces = (fixedJson.match(/{/g) || []).length;
                    const closeBraces = (fixedJson.match(/}/g) || []).length;
                    const openBrackets = (fixedJson.match(/\[/g) || []).length;
                    const closeBrackets = (fixedJson.match(/]/g) || []).length;
                    
                    // 补充缺失的闭合括号
                    for (let i = 0; i < openBrackets - closeBrackets; i++) {
                      fixedJson += ']';
                    }
                    for (let i = 0; i < openBraces - closeBraces; i++) {
                      fixedJson += '}';
                    }
                    
                    try {
                      const parsedResult = JSON.parse(fixedJson);
                      console.log(`✅ 第${chapterNum}章 JSON修复并解析成功`);

                      // 将当前章节的分析结果添加到总结果中
                      if (parsedResult.costume) {
                        allCostume.push(...parsedResult.costume.map((item: CostumeItem) => ({
                          ...item,
                          chapter_number: chapterNum
                        })));
                      }
                      if (parsedResult.makeup) {
                        allMakeup.push(...parsedResult.makeup.map((item: MakeupItem) => ({
                          ...item,
                          chapter_number: chapterNum
                        })));
                      }
                      if (parsedResult.props) {
                        allProps.push(...parsedResult.props.map((item: PropItem) => ({
                          ...item,
                          chapter_number: chapterNum
                        })));
                      }
                      if (parsedResult.scene) {
                        allScene.push(...parsedResult.scene.map((item: SceneItem) => ({
                          ...item,
                          chapter_number: chapterNum
                        })));
                      }
                      if (parsedResult.stylingLogic) {
                        allStylingLogic.push(...parsedResult.stylingLogic.map((item: StylingLogicItem) => ({
                          ...item,
                          chapter_number: chapterNum
                        })));
                      }
                      if (parsedResult.overallAnalysis) {
                        allOverallAnalysis.push(...parsedResult.overallAnalysis.map((item: OverallAnalysisItem) => ({
                          ...item,
                          chapter_number: chapterNum
                        })));
                      }

                      // 实时更新显示结果
                      setAnalysisResult({
                        costume: [...allCostume],
                        makeup: [...allMakeup],
                        props: [...allProps],
                        scene: [...allScene],
                        stylingLogic: [...allStylingLogic],
                        overallAnalysis: [...allOverallAnalysis]
                      });

                      chapterAnalysisSuccess = true;
                      resolve();
                    } catch (fixError) {
                      // 修复失败，记录错误
                      console.error(`❌ 第${chapterNum}章 JSON修复失败:`, fixError);
                      console.error("原始响应:", fullResponse);
                      toast.error(`第${chapterNum}章分析结果解析失败，将继续分析下一章`);
                      failedChaptersList.push(chapterNum);
                      resolve(); // 继续执行，不中断
                    }
                  }
                } catch (error) {
                  console.error(`❌ 第${chapterNum}章 JSON解析失败:`, error);
                  console.error("原始响应:", fullResponse);
                  toast.error(`第${chapterNum}章分析结果解析失败，将继续分析下一章`);
                  failedChaptersList.push(chapterNum);
                  resolve(); // 继续执行，不中断
                }
              },
              onError: (error: Error) => {
                console.error(`❌ 第${chapterNum}章 AI分析失败:`, error);
                toast.error(`第${chapterNum}章剧本分析失败，将继续分析下一章`);
                failedChaptersList.push(chapterNum);
                resolve(); // 继续执行，不中断
              }
            });
          });
        } catch (error) {
          console.error(`❌ 第${chapterNum}章分析出错:`, error);
          failedChaptersList.push(chapterNum);
        }

        // 添加延迟，避免请求过快
        if (i < selectedScriptData.length - 1) {
          console.log("⏳ 等待1秒后继续下一章节...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 所有章节分析完成后，更新状态和保存到数据库
      setAnalysisProgress(100);
      setCurrentAnalyzingChapter(null);
      setFailedChapters(failedChaptersList);

      console.log("\n✅ 所有章节分析完成！");
      console.log(`📊 统计：服装${allCostume.length}项，化妆${allMakeup.length}项，道具${allProps.length}项，布景${allScene.length}项`);

      if (failedChaptersList.length > 0) {
        console.log(`⚠️ 失败的章节: ${failedChaptersList.join(', ')}`);
      }

      setAnalysisResult({
        costume: allCostume,
        makeup: allMakeup,
        props: allProps,
        scene: allScene,
        stylingLogic: allStylingLogic,
        overallAnalysis: allOverallAnalysis
      });

      // 保存分析结果到数据库
      console.log("💾 开始保存分析结果到数据库...");
      await updateNovel(selectedNovel.id, {
        costume_data: allCostume,
        makeup_data: allMakeup,
        props_data: allProps,
        scene_data: allScene,
        styling_logic_data: allStylingLogic,
        overall_analysis_data: allOverallAnalysis
      });
      console.log("✅ 分析结果保存成功");

      const successCount = selectedScriptData.length - failedChaptersList.length;
      if (failedChaptersList.length === 0) {
        toast.success(`所有章节剧本分析完成！共分析${selectedScriptData.length}个章节`);
      } else {
        toast.warning(`剧本分析完成！成功${successCount}个，失败${failedChaptersList.length}个章节`);
      }
      
      setIsAnalyzing(false);
    } catch (error) {
      console.error("❌ 分析过程出错:", error);
      toast.error("分析过程出错");
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setCurrentAnalyzingChapter(null);
    }
  };

  // 获取所有已分析的章节号
  const getAnalyzedChapters = (): number[] => {
    if (!analysisResult) return [];
    
    const chapterNumbers = new Set<number>();
    
    analysisResult.costume.forEach(item => chapterNumbers.add(item.chapter_number));
    analysisResult.makeup.forEach(item => chapterNumbers.add(item.chapter_number));
    analysisResult.props.forEach(item => chapterNumbers.add(item.chapter_number));
    analysisResult.scene.forEach(item => chapterNumbers.add(item.chapter_number));
    analysisResult.stylingLogic.forEach(item => chapterNumbers.add(item.chapter_number));
    analysisResult.overallAnalysis.forEach(item => chapterNumbers.add(item.chapter_number));
    
    return Array.from(chapterNumbers).sort((a, b) => a - b);
  };

  // 根据章节号过滤分析结果
  const getChapterAnalysis = (chapterNum: number) => {
    if (!analysisResult) return null;
    
    return {
      costume: analysisResult.costume.filter(item => item.chapter_number === chapterNum),
      makeup: analysisResult.makeup.filter(item => item.chapter_number === chapterNum),
      props: analysisResult.props.filter(item => item.chapter_number === chapterNum),
      scene: analysisResult.scene.filter(item => item.chapter_number === chapterNum),
      stylingLogic: analysisResult.stylingLogic.filter(item => item.chapter_number === chapterNum),
      overallAnalysis: analysisResult.overallAnalysis.filter(item => item.chapter_number === chapterNum)
    };
  };

  // 修改分析项目
  const handleUpdateAnalysisItem = async (
    type: 'costume' | 'makeup' | 'props' | 'scene',
    chapterNum: number,
    itemIndex: number,
    updates: any
  ) => {
    if (!selectedNovel) {
      toast.error('请先选择小说');
      return;
    }

    try {
      console.log('💾 开始保存分析内容修改...');
      console.log('类型:', type);
      console.log('章节号:', chapterNum);
      console.log('项目索引:', itemIndex);
      
      // 调用对应的API函数
      switch (type) {
        case 'costume':
          await updateCostumeAnalysis(selectedNovel.id, chapterNum, itemIndex, updates);
          break;
        case 'makeup':
          await updateMakeupAnalysis(selectedNovel.id, chapterNum, itemIndex, updates);
          break;
        case 'props':
          await updatePropsAnalysis(selectedNovel.id, chapterNum, itemIndex, updates);
          break;
        case 'scene':
          await updateSceneAnalysis(selectedNovel.id, chapterNum, itemIndex, updates);
          break;
      }

      // 更新本地状态
      if (analysisResult) {
        const updatedResult = { ...analysisResult };
        const items = updatedResult[type].filter((item: any) => item.chapter_number === chapterNum);
        
        if (itemIndex < items.length) {
          const globalIndex = updatedResult[type].findIndex(
            (item: any, idx: number) => 
              item.chapter_number === chapterNum && 
              updatedResult[type].slice(0, idx + 1).filter((i: any) => i.chapter_number === chapterNum).length === itemIndex + 1
          );
          
          if (globalIndex !== -1) {
            updatedResult[type][globalIndex] = {
              ...updatedResult[type][globalIndex],
              ...updates,
              updated_at: new Date().toISOString()
            };
            setAnalysisResult(updatedResult);
          }
        }
      }

      toast.success('分析内容修改成功！');
    } catch (error) {
      console.error('保存分析内容修改失败:', error);
      toast.error('保存分析内容修改失败');
      throw error;
    }
  };

  // 添加图片生成任务到队列
  const handleGenerateImages = (category: string, items: unknown[]) => {
    if (!items || items.length === 0) {
      toast.error("没有可生成的内容");
      return;
    }

    // 检查是否已经在队列中
    const alreadyInQueue = imageGenerationQueue.some(task => task.category === category);
    if (alreadyInQueue || generatingImages[category]) {
      toast.info(`${category}图片生成任务已在队列中`);
      return;
    }

    // 添加到队列
    setImageGenerationQueue(prev => [...prev, { category, items }]);
    toast.info(`${category}图片生成任务已加入队列，当前队列长度：${imageGenerationQueue.length + 1}`);
  };

  // 实际生成图片的内部函数
  const handleGenerateImagesInternal = async (category: string, items: unknown[]) => {
    if (!selectedNovel) {
      toast.error("请先选择小说");
      return;
    }

    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      toast.error("请先登录");
      return;
    }

    // 按图片数量扣减码分
    const success = await deductByQuantity(
      user.id, 
      'script_image_generation', 
      items.length, 
      `剧本分析图片生成（${category}，${items.length}张）`
    );
    if (!success) {
      // 码分不足，useCredits hook 会显示提示
      return;
    }

    setGeneratingImages(prev => ({ ...prev, [category]: true }));
    console.log(`🎨 开始生成${category}图片，共${items.length}张...`);

    try {
      const imageUrls: string[] = [];

      for (let i = 0; i < items.length; i++) {
        console.log(`🖼️ 生成第${i + 1}/${items.length}张图片...`);
        toast.info(`正在生成第${i + 1}/${items.length}张图片...`);

        // 构建图片描述
        let prompt = "";
        // 提取category的基础类型（去掉章节号）
        const baseCategory = category.split('_')[0];
        
        if (baseCategory === "costume") {
          const costumeItem = items[i] as CostumeItem;
          prompt = `漫画风格，服装设计图，${costumeItem.description}，${costumeItem.material}材质，${costumeItem.color}颜色，${costumeItem.style}风格，平铺展示，无人物，服装细节清晰，二次元画风，纯服装展示，不要包含任何人物、模特或人体`;
        } else if (baseCategory === "makeup") {
          const makeupItem = items[i] as MakeupItem;
          prompt = `漫画风格，${makeupItem.character}的${makeupItem.description}，${makeupItem.style}风格，${makeupItem.details}，二次元画风`;
        } else if (baseCategory === "props") {
          const propItem = items[i] as PropItem;
          prompt = `漫画风格，${propItem.description}，纯色背景，二次元画风，纯道具展示，不要包含任何人物、角色或人体，只展示道具本身，简洁的纯色背景`;
        } else if (baseCategory === "scene") {
          const sceneItem = items[i] as SceneItem;
          prompt = `漫画风格，${sceneItem.location}场景，${sceneItem.layout}，${sceneItem.decoration}，${sceneItem.atmosphere}，${sceneItem.lighting}，二次元画风，纯场景展示，不要包含任何人物、角色或人体，只展示场景环境`;
        }

        console.log(`📝 图片描述: ${prompt}`);

        // 调用AI作画接口
        const response = await axios.post(
          "/api/miaoda/runtime/apicenter/source/proxy/iragtextToImageiiVMkBQMEHfZ6rd",
          {
            prompt: prompt,
            width: 1024,
            height: 1024
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-App-Id": APP_ID
            }
          }
        );

        if (response.data.status === 0 && response.data.data?.task_id) {
          const taskId = response.data.data.task_id;
          console.log(`✅ 任务创建成功，task_id: ${taskId}`);

          // 轮询查询结果
          let attempts = 0;
          const maxAttempts = 30; // 最多等待5分钟
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
            attempts++;

            console.log(`🔍 查询任务状态 (${attempts}/${maxAttempts})...`);

            const queryResponse = await axios.post(
              "/api/miaoda/runtime/apicenter/source/proxy/iraggetImgjWUTzny87hoV6fSaYzr2Rj",
              {
                task_id: taskId
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  "X-App-Id": APP_ID
                }
              }
            );

            if (queryResponse.data.status === 0 && queryResponse.data.data) {
              const taskStatus = queryResponse.data.data.task_status;
              console.log(`📊 任务状态: ${taskStatus}`);

              if (taskStatus === "SUCCESS") {
                const imageUrl = queryResponse.data.data.sub_task_result_list?.[0]?.final_image_list?.[0]?.img_url;
                if (imageUrl) {
                  console.log(`✅ 图片生成成功: ${imageUrl}`);
                  imageUrls.push(imageUrl);
                  break;
                }
              } else if (taskStatus === "FAILED") {
                console.error("❌ 图片生成失败");
                break;
              }
            }
          }

          if (attempts >= maxAttempts) {
            console.warn("⚠️ 图片生成超时");
          }
        } else {
          console.error("❌ 任务创建失败:", response.data);
        }
      }

      // 不要先显示AI生成的原始图片，直接上传到Supabase Storage
      console.log(`✅ ${category}图片生成完成，共${imageUrls.length}张`);

      // 上传图片到Supabase Storage并保存URL到数据库
      if (imageUrls.length > 0) {
        console.log(`📤 上传${category}图片到Storage...`);
        toast.info(`正在上传图片到云存储...`);
        
        // 提取category的基础类型（去掉章节号）
        const baseCategory = category.split('_')[0];
        const chapterNum = parseInt(category.split('_')[1]);
        
        // 确定bucket名称
        let bucketName = '';
        if (baseCategory === "costume") {
          bucketName = 'filming-costume-images';
        } else if (baseCategory === "makeup") {
          bucketName = 'filming-makeup-images';
        } else if (baseCategory === "props") {
          bucketName = 'filming-props-images';
        } else if (baseCategory === "scene") {
          bucketName = 'filming-scene-images';
        }
        
        // 上传图片到Storage
        const baseFolder = `${selectedNovel.id}/chapter_${chapterNum}/${baseCategory}`;
        const storageUrls = await uploadImagesToStorage(imageUrls, bucketName, baseFolder);
        console.log(`✅ 图片上传完成，Storage URLs:`, storageUrls);
        
        // 首次生成时直接显示Storage URL（不显示AI生成的原始URL）
        setGeneratedImages(prev => ({ ...prev, [category]: storageUrls }));
        toast.success(`图片已生成并上传到云存储`);
        
        // 更新对应类型的数据，为每个item添加image_urls（使用Storage URL）
        const updatedItems = items.map((item, index) => {
          const typedItem = item as Record<string, unknown>;
          return {
            ...typedItem,
            image_urls: [storageUrls[index]].filter(Boolean) // 保存Storage URL
          };
        });

        // 获取当前所有数据
        const currentCostumeData = selectedNovel.costume_data || [];
        const currentMakeupData = selectedNovel.makeup_data || [];
        const currentPropsData = selectedNovel.props_data || [];
        const currentSceneData = selectedNovel.scene_data || [];

        const updateData: Record<string, unknown> = {};
        
        if (baseCategory === "costume") {
          // 合并数据：更新当前章节的数据，保留其他章节的数据
          const otherChaptersData = currentCostumeData.filter((item: CostumeItem) => item.chapter_number !== chapterNum);
          updateData.costume_data = [...otherChaptersData, ...updatedItems];
        } else if (baseCategory === "makeup") {
          const otherChaptersData = currentMakeupData.filter((item: MakeupItem) => item.chapter_number !== chapterNum);
          updateData.makeup_data = [...otherChaptersData, ...updatedItems];
        } else if (baseCategory === "props") {
          const otherChaptersData = currentPropsData.filter((item: PropItem) => item.chapter_number !== chapterNum);
          updateData.props_data = [...otherChaptersData, ...updatedItems];
        } else if (baseCategory === "scene") {
          const otherChaptersData = currentSceneData.filter((item: SceneItem) => item.chapter_number !== chapterNum);
          updateData.scene_data = [...otherChaptersData, ...updatedItems];
        }

        console.log(`💾 保存${category}图片URL到数据库...`);
        await updateNovel(selectedNovel.id, updateData);
        console.log(`✅ ${category}图片URL保存成功`);
        
        // 更新本地小说数据
        setSelectedNovel(prev => prev ? { ...prev, ...updateData } : null);
      }

      toast.success(`${category}图片生成完成！共${imageUrls.length}张`);
    } catch (error) {
      console.error(`❌ 生成${category}图片失败:`, error);
      toast.error(`生成${category}图片失败`);
    } finally {
      setGeneratingImages(prev => ({ ...prev, [category]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 初始加载状态 */}
      {isInitialLoading ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="h-16 w-16 text-[#FF5724] animate-spin mb-6" />
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">正在加载数据...</p>
          <p className="text-sm text-muted-foreground">请稍候</p>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8 relative">
          {/* 二次元装饰元素 */}
          <div className="absolute top-0 left-1/4 w-8 h-8 text-orange-400 opacity-50 animate-bounce">⭐</div>
          <div className="absolute top-0 right-1/4 w-8 h-8 text-red-400 opacity-50 animate-pulse">✨</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent mb-2">
            🎬 码上准备
          </h1>
          <p className="text-muted-foreground">
            专业的剧本拍摄制作分析工具
          </p>
        </div>

        {/* 小说选择 */}
        <Card className="mb-6 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">
              📚 选择小说
            </CardTitle>
            <CardDescription>请选择包含剧本的小说作品</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedNovelId} onValueChange={handleNovelSelect}>
              <SelectTrigger className="w-full border-orange-300 focus:ring-[#FF5724] hover:border-[#FF5724] transition-colors">
                <SelectValue placeholder="请选择小说" />
              </SelectTrigger>
              <SelectContent>
                {novels.length === 0 ? (
                  <SelectItem value="none" disabled>
                    暂无包含剧本的小说
                  </SelectItem>
                ) : (
                  novels.map(novel => (
                    <SelectItem key={novel.id} value={novel.id}>
                      {novel.novel_title} ({novel.scripts_data?.length || 0}个剧本)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 剧本选择 */}
        {selectedNovel && (
          <Card className="mb-6 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">
                📝 选择剧本
              </CardTitle>
              <CardDescription>勾选需要分析的剧本章节</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {selectedNovel.scripts_data?.map(script => (
                    <div
                      key={script.chapter_number}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-orange-100 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all hover:shadow-md"
                    >
                      <Checkbox
                        id={`script-${script.chapter_number}`}
                        checked={selectedScripts.includes(script.chapter_number)}
                        onCheckedChange={() => toggleScriptSelection(script.chapter_number)}
                        className="border-[#FF5724] data-[state=checked]:bg-[#FF5724]"
                      />
                      <label
                        htmlFor={`script-${script.chapter_number}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">第{script.chapter_number}章：{script.chapter_title}</span>
                          {/* 显示已分析的标识 */}
                          {isChapterAnalyzed(script.chapter_number) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3" />
                              已分析
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {script.script_content.substring(0, 100)}...
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 flex flex-col gap-4">
                {/* 进度条显示 */}
                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {currentAnalyzingChapter 
                          ? `正在分析第 ${currentAnalyzingChapter} 章...` 
                          : '准备分析...'}
                      </span>
                      <span className="font-medium text-[#FF5724]">{analysisProgress}%</span>
                    </div>
                    <Progress value={analysisProgress} className="h-2" />
                  </div>
                )}

                {/* 失败章节提示 */}
                {failedChapters.length > 0 && !isAnalyzing && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        以下章节分析失败：
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        第 {failedChapters.join('、')} 章
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        您可以重新选择这些章节并再次点击"分析剧本"按钮进行重试
                      </p>
                    </div>
                  </div>
                )}

                {/* 积分消耗提示 */}
                <div className="flex items-center justify-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <Coins className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-900">
                    每章节消耗 <span className="font-bold text-orange-600">{creditCostPerChapter}</span> 码分，
                    共 <span className="font-bold text-orange-600">{selectedScripts.length}</span> 章，
                    总计 <span className="font-bold text-orange-600">{selectedScripts.length * creditCostPerChapter}</span> 码分
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    已选择 {selectedScripts.length} 个剧本
                  </div>
                  <Button
                    onClick={handleAnalyzeScript}
                    disabled={selectedScripts.length === 0 || isAnalyzing}
                    className="bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        分析剧本 ({selectedScripts.length}章 · {creditCostPerChapter}码分/章)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* 分析结果 */}
        {analysisResult && (
          <Card className="border-orange-200 dark:border-orange-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">
                📋 分析结果
              </CardTitle>
              <CardDescription>按章节查看剧本分析结果</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={`chapter-${getAnalyzedChapters()[0]}`} className="w-full">
                <TabsList className="w-full flex-wrap h-auto gap-2 bg-orange-50 dark:bg-orange-900/20 p-2">
                  {getAnalyzedChapters().map((chapterNum) => {
                    const chapterScript = selectedNovel?.scripts_data?.find(s => s.chapter_number === chapterNum);
                    return (
                      <TabsTrigger
                        key={chapterNum}
                        value={`chapter-${chapterNum}`}
                        className="data-[state=active]:bg-[#FF5724] data-[state=active]:text-white"
                      >
                        第{chapterNum}章{chapterScript ? ` - ${chapterScript.chapter_title}` : ''}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {getAnalyzedChapters().map((chapterNum) => {
                  const chapterAnalysis = getChapterAnalysis(chapterNum);
                  const chapterScript = selectedNovel?.scripts_data?.find(s => s.chapter_number === chapterNum);
                  
                  if (!chapterAnalysis) return null;

                  return (
                    <TabsContent key={chapterNum} value={`chapter-${chapterNum}`} className="mt-6">
                      <ChapterAnalysisDisplay
                        chapterNum={chapterNum}
                        chapterTitle={chapterScript?.chapter_title}
                        costume={chapterAnalysis.costume}
                        makeup={chapterAnalysis.makeup}
                        props={chapterAnalysis.props}
                        scene={chapterAnalysis.scene}
                        stylingLogic={chapterAnalysis.stylingLogic}
                        overallAnalysis={chapterAnalysis.overallAnalysis}
                        generatingImages={generatingImages}
                        generatedImages={generatedImages}
                        onGenerateImages={handleGenerateImages}
                        onPreviewImage={setPreviewImage}
                        onUpdateItem={(type, itemIndex, updates) => 
                          handleUpdateAnalysisItem(type, chapterNum, itemIndex, updates)
                        }
                      />
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* 图片预览对话框 */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-[#FF5724]">图片预览</DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-square bg-black/5">
              {previewImage && (
                <img
                  src={previewImage}
                  alt="预览图片"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              )}
            </div>

          </DialogContent>
        </Dialog>
      </div>
      )}
    </div>
  );
}
