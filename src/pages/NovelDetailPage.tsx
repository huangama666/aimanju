import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { VipBadge } from "@/components/ui/vip-badge";
import { MemberFeatureButton } from "@/components/membership/MemberFeatureButton";
import { toast } from "sonner";
import { getNovelById, getCurrentUser, getUserProfile, checkNovelPurchase, updateNovel } from "@/db/api";
import { createPost, incrementNovelShareViewsByNovelId, toggleNovelShareLike, checkNovelShareLiked, getNovelShareStats } from "@/db/community-api";
import { getParallelNovels } from "@/db/parallel-api";
import { checkIsAdmin } from "@/db/admin-api";
import type { DbNovel, ChapterData, CharacterData, PanelData, ScriptData, DbUser, CostumeItem, MakeupItem, PropItem, SceneItem, StylingLogicItem, OverallAnalysisItem } from "@/types/database";
import type { CreatePostInput } from "@/types/community";
import { ArrowLeft, BookOpen, Users, Film, Edit, PlusCircle, Sparkles, Loader2, FileText, Lock, GitBranch, Eye, ThumbsUp, Heart, RefreshCw, Volume2, Trash2, Edit2 } from "lucide-react";
import { getNovelGenreLabel } from "@/utils/novel-type-mapper";
import { mapNovelTypeToGenre } from "@/utils/novel-recreation-helper";
import { analyzeNovelWithAI } from "@/utils/ai-novel-analyzer";
import { generateNovelCover } from "@/utils/coverGenerator";
import { chapterAudioService } from "@/services/chapterAudioService";
import PurchaseNovelDialog from "@/components/community/PurchaseNovelDialog";
import ImmersiveReading from "@/components/novel/ImmersiveReading";

// 话题分类
const CATEGORIES = [
  { value: 'plot', label: '剧情分析' },
  { value: 'character', label: '角色厨' },
  { value: 'update', label: '催更专区' },
  { value: 'writing', label: '写作探讨' },
  { value: 'other', label: '其他' },
];

export default function NovelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [novel, setNovel] = useState<DbNovel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // AI 分析加载状态
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false); // 是否已购买
  const [checkingPurchase, setCheckingPurchase] = useState(true); // 检查购买状态
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false); // 购买对话框状态
  const [parallelNovels, setParallelNovels] = useState<DbNovel[]>([]); // 平行世界小说列表
  const [loadingParallel, setLoadingParallel] = useState(false); // 加载平行世界小说状态
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState<CreatePostInput>({
    title: '',
    content: '',
    post_type: 'normal',
    category: '',
    novel_id: undefined,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isImmersiveReading, setIsImmersiveReading] = useState(false); // 沉浸式阅读状态
  const [immersiveChapterIndex, setImmersiveChapterIndex] = useState(0); // 沉浸式阅读起始章节
  const [viewsCount, setViewsCount] = useState(0); // 浏览量
  const [likesCount, setLikesCount] = useState(0); // 点赞数
  const [isLiked, setIsLiked] = useState(false); // 是否已点赞
  const [isLiking, setIsLiking] = useState(false); // 点赞操作中
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false); // 重新生成封面状态
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false); // 生成音频状态
  const [audioGenerationProgress, setAudioGenerationProgress] = useState(0); // 音频生成进度
  const [isAdmin, setIsAdmin] = useState(false); // 是否是超级管理员
  
  // 删除和编辑相关状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'character' | 'panel' | 'script' | 'costume' | 'makeup' | 'prop' | 'scene' | 'styling' | 'overall', id: string, index?: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 判断是否从社区打开（通过 location.state 或 URL 参数）
  const isFromCommunity = location.state?.fromCommunity || new URLSearchParams(location.search).get('from') === 'community';
  // 判断是否是当前用户的小说
  const isOwnNovel = novel && currentUser && novel.user_id === currentUser.id;
  // 判断是否需要付费（收费且未购买且不是自己的小说）
  const needsPurchase = novel && novel.price > 0 && !hasPurchased && !isOwnNovel;

  useEffect(() => {
    loadCurrentUser();
    if (id) {
      loadNovelDetail(id);
    }
  }, [id]);

  // 检查购买状态
  useEffect(() => {
    const checkPurchase = async () => {
      if (novel && currentUser && novel.price > 0 && !isOwnNovel) {
        setCheckingPurchase(true);
        const purchased = await checkNovelPurchase(currentUser.id, novel.id);
        setHasPurchased(purchased);
        setCheckingPurchase(false);
      } else {
        setCheckingPurchase(false);
      }
    };
    checkPurchase();
  }, [novel, currentUser, isOwnNovel]);

  const loadCurrentUser = async () => {
    try {
      const authUser = await getCurrentUser();
      if (authUser) {
        const userProfile = await getUserProfile(authUser.id);
        setCurrentUser(userProfile);
        
        // 检查是否是超级管理员
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
        console.log('👤 用户管理员状态:', adminStatus);
      }
    } catch (error) {
      console.error('获取当前用户失败:', error);
    }
  };

  const loadNovelDetail = async (novelId: string) => {
    try {
      setLoading(true);
      const data = await getNovelById(novelId);
      if (data) {
        setNovel(data);
        // 自动设置帖子的小说引用
        setNewPost(prev => ({
          ...prev,
          novel_id: data.id,
        }));
        // 加载平行世界小说列表
        loadParallelNovels(novelId);
        // 增加浏览量
        incrementNovelShareViewsByNovelId(novelId).catch(err => {
          console.error('增加浏览量失败:', err);
        });
        // 加载统计数据
        loadNovelStats(novelId);
      } else {
        toast.error("小说不存在");
        navigate(-1);
      }
    } catch (error) {
      console.error("加载小说详情失败:", error);
      toast.error("加载失败");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  // 加载小说统计数据
  const loadNovelStats = async (novelId: string) => {
    try {
      // 获取统计数据
      const stats = await getNovelShareStats(novelId);
      if (stats) {
        setViewsCount(stats.viewsCount);
        setLikesCount(stats.likesCount);
      }
      // 检查是否已点赞
      const liked = await checkNovelShareLiked(novelId);
      setIsLiked(liked);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 加载平行世界小说列表
  const loadParallelNovels = async (novelId: string) => {
    try {
      setLoadingParallel(true);
      console.log('[小说详情页] 加载平行世界小说列表，小说ID:', novelId);
      const parallels = await getParallelNovels(novelId);
      setParallelNovels(parallels);
      console.log('[小说详情页] 平行世界小说数量:', parallels.length);
    } catch (error) {
      console.error('[小说详情页] 加载平行世界小说失败:', error);
    } finally {
      setLoadingParallel(false);
    }
  };

  // 按章节分组拍戏分析数据
  const groupAnalysisByChapter = () => {
    if (!novel) return {};
    
    const chapterMap: Record<number, {
      chapterNumber: number;
      chapterTitle: string;
      costume: CostumeItem[];
      makeup: MakeupItem[];
      props: PropItem[];
      scene: SceneItem[];
      stylingLogic: StylingLogicItem[];
      overallAnalysis: OverallAnalysisItem[];
    }> = {};

    // 初始化章节映射
    novel.chapters_data?.forEach((chapter: ChapterData) => {
      chapterMap[chapter.chapter_number] = {
        chapterNumber: chapter.chapter_number,
        chapterTitle: chapter.title,
        costume: [],
        makeup: [],
        props: [],
        scene: [],
        stylingLogic: [],
        overallAnalysis: []
      };
    });

    // 分组服装数据
    novel.costume_data?.forEach((item: CostumeItem) => {
      if (item.chapter_number && chapterMap[item.chapter_number]) {
        chapterMap[item.chapter_number].costume.push(item);
      }
    });

    // 分组化妆数据
    novel.makeup_data?.forEach((item: MakeupItem) => {
      if (item.chapter_number && chapterMap[item.chapter_number]) {
        chapterMap[item.chapter_number].makeup.push(item);
      }
    });

    // 分组道具数据
    novel.props_data?.forEach((item: PropItem) => {
      if (item.chapter_number && chapterMap[item.chapter_number]) {
        chapterMap[item.chapter_number].props.push(item);
      }
    });

    // 分组场景数据
    novel.scene_data?.forEach((item: SceneItem) => {
      if (item.chapter_number && chapterMap[item.chapter_number]) {
        chapterMap[item.chapter_number].scene.push(item);
      }
    });

    // 分组造型逻辑数据
    novel.styling_logic_data?.forEach((item: StylingLogicItem) => {
      if (item.chapter_number && chapterMap[item.chapter_number]) {
        chapterMap[item.chapter_number].stylingLogic.push(item);
      }
    });

    // 分组整体分析数据
    novel.overall_analysis_data?.forEach((item: OverallAnalysisItem) => {
      if (item.chapter_number && chapterMap[item.chapter_number]) {
        chapterMap[item.chapter_number].overallAnalysis.push(item);
      }
    });

    // 只返回有数据的章节
    return Object.values(chapterMap).filter(chapter => 
      chapter.costume.length > 0 ||
      chapter.makeup.length > 0 ||
      chapter.props.length > 0 ||
      chapter.scene.length > 0 ||
      chapter.stylingLogic.length > 0 ||
      chapter.overallAnalysis.length > 0
    );
  };

  // 购买成功回调
  const handlePurchaseSuccess = () => {
    setHasPurchased(true);
    setIsPurchaseDialogOpen(false);
    toast.success("购买成功！现在可以查看完整内容了");
  };

  // 处理返回按钮
  const handleGoBack = () => {
    // 如果有来源页面，返回上一页，否则返回社区
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1);
    }
  };

  // 处理发布帖子
  const handleCreatePost = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    if (!newPost.title.trim()) {
      toast.error('请输入帖子标题');
      return;
    }

    if (!newPost.content.trim()) {
      toast.error('请输入帖子内容');
      return;
    }

    if (!newPost.category) {
      toast.error('请选择话题分类');
      return;
    }

    try {
      console.log('📝 发布帖子:', newPost);
      await createPost(newPost);
      toast.success('发布成功！');
      setIsCreatePostDialogOpen(false);
      // 重置表单
      setNewPost({
        title: '',
        content: '',
        post_type: 'normal',
        category: '',
        novel_id: novel?.id,
      });
      // 跳转到社区广场
      navigate('/community');
    } catch (error) {
      console.error('❌ 发布帖子失败:', error);
      toast.error('发布失败，请稍后重试');
    }
  };

  // 打开沉浸式阅读
  const handleOpenImmersiveReading = (chapterIndex: number = 0) => {
    console.log("📖 打开沉浸式阅读，起始章节:", chapterIndex);
    setImmersiveChapterIndex(chapterIndex);
    setIsImmersiveReading(true);
  };

  // 关闭沉浸式阅读
  const handleCloseImmersiveReading = () => {
    console.log("📖 关闭沉浸式阅读");
    setIsImmersiveReading(false);
  };

  // 处理点赞
  const handleLike = async () => {
    if (!id) return;
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    
    try {
      setIsLiking(true);
      const result = await toggleNovelShareLike(id);
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
      toast.success(result.isLiked ? '点赞成功' : '取消点赞');
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsLiking(false);
    }
  };

  // 处理章节点击事件
  const handleChapterClick = (chapter: ChapterData) => {
    if (!novel) return;

    console.log("📖 点击章节:", chapter.title);
    console.log("🔍 检查角色和分镜数据...");
    
    const characters = (novel.characters_data as CharacterData[]) || [];
    const panels = (novel.panels_data as PanelData[]) || [];
    
    console.log("👥 角色数量:", characters.length);
    console.log("🎬 分镜数量:", panels.length);

    // 无论是否有角色和分镜数据，都跳转到创作页面
    console.log("🚀 跳转到创作页面，传递所有数据");
    
    // 确定默认打开的选项卡
    let defaultTab = "character";
    if (characters.length === 0) {
      defaultTab = "character";
      toast.info("请为小说生成角色信息");
    } else if (panels.length === 0) {
      defaultTab = "comic";
      toast.info("请为小说生成分镜内容");
    } else {
      defaultTab = "character";
      toast.success("已加载角色和分镜数据，可以继续编辑");
    }
    
    // 跳转到创作页面，并传递小说数据、角色数据和分镜数据
    navigate("/", {
      state: {
        novelData: {
          id: novel.id,
          title: novel.novel_title,
          description: novel.novel_content,
          coverImageUrl: novel.novel_thumb,
          genre: novel.novel_type || '未知',
          chapters: novel.chapters_data,
          characters: characters, // 传递角色数据
          panels: panels, // 传递分镜数据
        },
        activeTab: defaultTab,
      },
    });
  };

  // 处理"我要二创"按钮点击
  const handleRecreation = async () => {
    if (!novel) return;

    console.log("🎨 开始二创:", novel.novel_title);
    console.log("📚 小说类型:", novel.novel_type);
    console.log("📝 小说简介:", novel.novel_content);

    try {
      setIsAnalyzing(true);
      toast.loading("AI 正在分析小说内容...", { id: 'ai-analyzing' });

      // 使用 AI 分析小说内容
      const analysisResult = await analyzeNovelWithAI(
        novel.novel_content,
        novel.novel_title,
        novel.novel_type
      );

      console.log("✨ AI 分析结果:", analysisResult);

      // 映射小说类型到表单题材
      const genre = mapNovelTypeToGenre(novel.novel_type);
      console.log("🎭 映射后的题材:", genre);

      // 构建二创数据，使用 AI 分析的结果
      const recreationData = {
        genre: genre,
        plot: `${analysisResult.plot}\n\n【主要冲突】${analysisResult.conflict}\n\n【发展方向】${analysisResult.development}`,
        style: '', // 让用户自己选择
        length: 'short' as const, // 默认短篇
      };

      toast.success("AI 分析完成！正在跳转到创作页面...", { id: 'ai-analyzing' });

      // 跳转到首页创作选项卡，并传递二创数据
      navigate("/", {
        state: {
          recreationData: recreationData,
        },
      });
    } catch (error) {
      console.error("❌ AI 分析失败:", error);
      toast.error("AI 分析失败，请稍后重试", { id: 'ai-analyzing' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 重新生成封面
  const handleRegenerateCover = async () => {
    if (!novel) return;
    
    // 只有小说作者或超级管理员可以重新生成封面
    if (!isOwnNovel && !isAdmin) {
      toast.error("您没有权限重新生成封面");
      return;
    }

    try {
      setIsRegeneratingCover(true);
      toast.loading("正在生成封面...", { id: 'regenerate-cover' });

      const coverUrl = await generateNovelCover(
        novel.novel_title,
        novel.novel_type,
        novel.novel_content
      );

      // 更新数据库
      await updateNovel(novel.id, {
        novel_thumb: coverUrl
      });

      // 更新本地状态
      setNovel({
        ...novel,
        novel_thumb: coverUrl
      });

      toast.success("封面生成成功！", { id: 'regenerate-cover' });
    } catch (error) {
      console.error("❌ 封面生成失败:", error);
      toast.error("封面生成失败，请稍后重试", { id: 'regenerate-cover' });
    } finally {
      setIsRegeneratingCover(false);
    }
  };

  // 批量生成章节音频
  const handleGenerateAudio = async () => {
    if (!novel || !isOwnNovel) return;

    const chapters = (novel.chapters_data as ChapterData[]) || [];
    if (chapters.length === 0) {
      toast.error("没有可生成音频的章节");
      return;
    }

    try {
      setIsGeneratingAudio(true);
      setAudioGenerationProgress(0);
      toast.loading("正在生成章节音频...", { id: 'generate-audio' });

      let successCount = 0;
      let failCount = 0;
      const updatedChapters = [...chapters];

      for (let i = 0; i < updatedChapters.length; i++) {
        const chapter = updatedChapters[i];
        
        // 检查是否已有音频
        if (chapter.audio_url) {
          console.log(`第${chapter.chapter_number}章已有音频，跳过`);
          continue;
        }

        try {
          console.log(`开始生成第${chapter.chapter_number}章音频...`);
          
          const audioUrl = await chapterAudioService.generateChapterAudio(
            novel.id,
            chapter.chapter_number,
            chapter.title,
            chapter.content
          );

          if (audioUrl) {
            // 更新章节数据
            updatedChapters[i] = {
              ...chapter,
              audio_url: audioUrl,
              audio_status: 'completed'
            };
            successCount++;
            console.log(`第${chapter.chapter_number}章音频生成成功`);
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`第${chapter.chapter_number}章音频生成失败:`, error);
          failCount++;
        }

        // 更新进度
        const progress = Math.round(((i + 1) / updatedChapters.length) * 100);
        setAudioGenerationProgress(progress);
      }

      // 保存更新后的章节数据到数据库
      if (successCount > 0) {
        try {
          await updateNovel(novel.id, {
            chapters_data: updatedChapters
          });
          console.log('✅ 章节音频数据已保存到数据库');
        } catch (error) {
          console.error('❌ 保存章节音频数据失败:', error);
        }
      }

      // 重新加载小说数据以获取最新的音频信息
      if (id) {
        await loadNovelDetail(id);
      }

      if (failCount === 0) {
        toast.success(`所有章节音频生成完成！`, { id: 'generate-audio' });
      } else {
        toast.warning(`音频生成完成！成功${successCount}个，失败${failCount}个`, { id: 'generate-audio' });
      }
    } catch (error) {
      console.error("❌ 音频生成失败:", error);
      toast.error("音频生成失败，请稍后重试", { id: 'generate-audio' });
    } finally {
      setIsGeneratingAudio(false);
      setAudioGenerationProgress(0);
    }
  };

  // 打开删除确认对话框
  const handleDeleteClick = (type: 'character' | 'panel' | 'script' | 'costume' | 'makeup' | 'prop' | 'scene' | 'styling' | 'overall', id: string, index?: number) => {
    setDeleteTarget({ type, id, index });
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteTarget || !novel) return;

    try {
      setIsDeleting(true);
      const { type, id, index } = deleteTarget;

      switch (type) {
        case 'character': {
          // 删除角色
          const updatedCharacters = characters.filter(char => char.id !== id);
          await updateNovel(novel.id, {
            characters_data: updatedCharacters
          });
          setNovel({
            ...novel,
            characters_data: updatedCharacters
          });
          toast.success("角色已删除");
          break;
        }
        case 'panel': {
          // 删除分镜
          const updatedPanels = panels.filter(panel => panel.id !== id);
          await updateNovel(novel.id, {
            panels_data: updatedPanels
          });
          setNovel({
            ...novel,
            panels_data: updatedPanels
          });
          toast.success("分镜已删除");
          break;
        }
        case 'script': {
          // 删除剧本
          const updatedScripts = (novel.scripts_data || []).filter((_, i) => i !== index);
          await updateNovel(novel.id, {
            scripts_data: updatedScripts
          });
          setNovel({
            ...novel,
            scripts_data: updatedScripts
          });
          toast.success("剧本已删除");
          break;
        }
        case 'costume': {
          // 删除服装分析
          const updatedCostumes = (novel.costume_data || []).filter((_, i) => i !== index);
          await updateNovel(novel.id, {
            costume_data: updatedCostumes
          });
          setNovel({
            ...novel,
            costume_data: updatedCostumes
          });
          toast.success("服装分析已删除");
          break;
        }
        case 'makeup': {
          // 删除化妆分析
          const updatedMakeup = (novel.makeup_data || []).filter((_, i) => i !== index);
          await updateNovel(novel.id, {
            makeup_data: updatedMakeup
          });
          setNovel({
            ...novel,
            makeup_data: updatedMakeup
          });
          toast.success("化妆分析已删除");
          break;
        }
        case 'prop': {
          // 删除道具分析
          const updatedProps = (novel.props_data || []).filter((_, i) => i !== index);
          await updateNovel(novel.id, {
            props_data: updatedProps
          });
          setNovel({
            ...novel,
            props_data: updatedProps
          });
          toast.success("道具分析已删除");
          break;
        }
        case 'scene': {
          // 删除布景分析
          const updatedScenes = (novel.scene_data || []).filter((_, i) => i !== index);
          await updateNovel(novel.id, {
            scene_data: updatedScenes
          });
          setNovel({
            ...novel,
            scene_data: updatedScenes
          });
          toast.success("布景分析已删除");
          break;
        }
        case 'styling': {
          // 删除造型逻辑分析
          const updatedStyling = (novel.styling_logic_data || []).filter((_, i) => i !== index);
          await updateNovel(novel.id, {
            styling_logic_data: updatedStyling
          });
          setNovel({
            ...novel,
            styling_logic_data: updatedStyling
          });
          toast.success("造型逻辑分析已删除");
          break;
        }
        case 'overall': {
          // 删除综合分析
          const updatedOverall = (novel.overall_analysis_data || []).filter((_, i) => i !== index);
          await updateNovel(novel.id, {
            overall_analysis_data: updatedOverall
          });
          setNovel({
            ...novel,
            overall_analysis_data: updatedOverall
          });
          toast.success("综合分析已删除");
          break;
        }
      }
    } catch (error) {
      console.error("删除失败:", error);
      toast.error("删除失败，请稍后重试");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  // 检查是否有章节缺少音频
  const hasChaptersWithoutAudio = () => {
    const chapters = (novel?.chapters_data as ChapterData[]) || [];
    const chaptersWithoutAudio = chapters.filter(chapter => !chapter.audio_url);
    
    console.log('🔍 检查章节音频状态:');
    console.log('  总章节数:', chapters.length);
    console.log('  缺少音频的章节数:', chaptersWithoutAudio.length);
    if (chaptersWithoutAudio.length > 0) {
      console.log('  缺少音频的章节:', chaptersWithoutAudio.map(ch => `第${ch.chapter_number}章`).join(', '));
    }
    
    return chaptersWithoutAudio.length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return null;
  }

  const chapters = (novel.chapters_data as ChapterData[]) || [];
  const characters = (novel.characters_data as CharacterData[]) || [];
  const panels = (novel.panels_data as PanelData[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 py-4 md:py-8 max-[729px]:pb-20">
      <div className="container max-w-6xl mx-auto px-4">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="mb-3 md:mb-4 text-sm md:text-base"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-3 w-3 md:h-4 md:w-4" />
          返回
        </Button>

        {/* 小说基本信息 */}
        <Card className="mb-4 md:mb-8">
          <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* 封面 */}
              <div className="flex-shrink-0 w-full md:w-auto relative group">
                {novel.novel_thumb ? (
                  <img
                    src={novel.novel_thumb}
                    alt={novel.novel_title}
                    className="w-full md:w-48 h-64 object-cover rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-full md:w-48 h-64 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center shadow-lg">
                    <BookOpen className="h-12 w-12 md:h-16 md:w-16 text-white" />
                  </div>
                )}
                
                {/* 重新生成封面按钮 - 小说作者或超级管理员可见，鼠标悬浮时显示 */}
                {(isOwnNovel || isAdmin) && (
                  <Button
                    onClick={handleRegenerateCover}
                    disabled={isRegeneratingCover}
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    {isRegeneratingCover ? (
                      <>
                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin mr-1" />
                        生成中
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        {novel.novel_thumb ? '重新生成' : '生成封面'}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <h1 className="text-xl md:text-3xl font-bold line-clamp-2">{novel.novel_title}</h1>
                  {/* 我要二创按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecreation}
                    disabled={isAnalyzing}
                    className="w-full md:w-auto md:ml-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 disabled:opacity-50 text-xs md:text-sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                        我要二创
                      </>
                    )}
                  </Button>
                </div>
                <div className="mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium bg-primary/10 text-primary">
                    📚 类型：{getNovelGenreLabel(novel.novel_type)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  <span>📖 {chapters.length} 章节</span>
                  <span>👥 {characters.length} 角色</span>
                  <span>🎬 {panels.length} 分镜</span>
                  <span>📝 {novel.scripts_data?.length || 0} 剧本</span>
                  <span>🎭 {(novel.costume_data?.length || 0) + (novel.makeup_data?.length || 0) + (novel.props_data?.length || 0) + (novel.scene_data?.length || 0) + (novel.styling_logic_data?.length || 0) + (novel.overall_analysis_data?.length || 0) > 0 ? '已分析' : '未分析'}</span>
                </div>
                <Separator className="my-3 md:my-4" />
                <div>
                  <h3 className="font-semibold mb-2 text-sm md:text-base">简介</h3>
                  <p className="text-muted-foreground leading-relaxed text-xs md:text-sm line-clamp-4 md:line-clamp-none">
                    {novel.novel_content || "暂无简介"}
                  </p>
                </div>
                
                {/* 统计信息和点赞按钮 */}
                <Separator className="my-3 md:my-4" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{viewsCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{likesCount}</span>
                    </div>
                  </div>
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                    disabled={isLiking || !currentUser}
                    className={isLiked ? "bg-[#FF5724] hover:bg-[#E64A1F]" : ""}
                  >
                    {isLiking ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Heart className={`mr-1 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    )}
                    {isLiked ? '已点赞' : '点赞'}
                  </Button>
                </div>

                {/* 音频生成提示 - 仅自己的小说且有章节缺少音频时显示 */}
                {isOwnNovel && hasChaptersWithoutAudio() && (
                  <>
                    <Separator className="my-3 md:my-4" />
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Volume2 className="h-5 w-5 text-[#FF5724] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                            部分章节还没有音频
                          </p>
                          <p className="text-xs text-orange-800 dark:text-orange-200 mb-3">
                            为您的小说生成音频，让读者可以听书
                          </p>
                          {isGeneratingAudio && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-orange-800 dark:text-orange-200">生成进度</span>
                                <span className="font-medium text-orange-900 dark:text-orange-100">{audioGenerationProgress}%</span>
                              </div>
                              <Progress value={audioGenerationProgress} className="h-1.5" />
                            </div>
                          )}
                          {currentUser && (
                            <MemberFeatureButton
                              membershipLevel={currentUser.membership_level}
                              featureName="生成音频"
                              onClick={handleGenerateAudio}
                              disabled={isGeneratingAudio}
                              size="sm"
                              className="bg-[#FF5724] hover:bg-[#E64A1F] text-white"
                            >
                              {isGeneratingAudio ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  生成中...
                                </>
                              ) : (
                                <>
                                  <Volume2 className="mr-1 h-3 w-3" />
                                  生成音频
                                </>
                              )}
                            </MemberFeatureButton>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 平行世界展示区域 */}
        {(parallelNovels.length > 0 || novel.parallel_source_id) && (
          <Card className="mb-4 md:mb-8 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#FF5724]">
                <GitBranch className="h-5 w-5" />
                平行世界
              </CardTitle>
              <CardDescription>
                {novel.parallel_source_id 
                  ? `这是一部平行世界二创作品，从第 ${novel.parallel_start_chapter} 章开始重新创作`
                  : `基于本作的平行世界二创作品 (${parallelNovels.length})`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 如果是平行世界作品，显示起始章节标记 */}
              {novel.parallel_source_id && novel.parallel_start_chapter && (
                <div className="mb-4 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold">平行世界起点</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    本作品从第 <Badge variant="outline" className="mx-1">{novel.parallel_start_chapter}</Badge> 章开始进行平行世界二创，
                    前 {novel.parallel_start_chapter - 1} 章内容继承自源小说。
                  </p>
                </div>
              )}

              {/* 显示平行世界小说列表 */}
              {parallelNovels.length > 0 && (
                <div className="space-y-3">
                  {loadingParallel ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" />
                    </div>
                  ) : (
                    parallelNovels.map((parallelNovel) => (
                      <div
                        key={parallelNovel.id}
                        className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/novel/${parallelNovel.id}`)}
                      >
                        {parallelNovel.novel_thumb ? (
                          <img
                            src={parallelNovel.novel_thumb}
                            alt={parallelNovel.novel_title}
                            className="w-16 h-20 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                            {parallelNovel.novel_title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            {parallelNovel.novel_content || '暂无简介'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge variant="outline" className="text-xs">
                              从第 {parallelNovel.parallel_start_chapter} 章开始
                            </Badge>
                            <span>📖 {parallelNovel.chapters_data?.length || 0} 章</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 创建平行世界按钮 */}
              {!novel.parallel_source_id && isOwnNovel && (
                <div className="mt-4">
                  <Button
                    onClick={() => navigate('/parallel')}
                    variant="outline"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                  >
                    <GitBranch className="mr-2 h-4 w-4" />
                    创建平行世界
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 详细内容标签页 */}
        <Tabs defaultValue="chapters" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1 h-auto">
            <TabsTrigger value="chapters" className="text-xs md:text-sm py-2 md:py-2.5">
              <BookOpen className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">章节内容</span>
              <span className="md:hidden">章节</span>
            </TabsTrigger>
            <TabsTrigger 
              value="characters" 
              className="text-xs md:text-sm py-2 md:py-2.5"
              disabled={needsPurchase}
            >
              <Users className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">角色信息</span>
              <span className="md:hidden">角色</span>
              {needsPurchase && <Lock className="ml-1 h-3 w-3" />}
            </TabsTrigger>
            <TabsTrigger 
              value="panels" 
              className="text-xs md:text-sm py-2 md:py-2.5"
              disabled={needsPurchase}
            >
              <Film className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">分镜内容</span>
              <span className="md:hidden">分镜</span>
              {needsPurchase && <Lock className="ml-1 h-3 w-3" />}
            </TabsTrigger>
            <TabsTrigger 
              value="scripts" 
              className="text-xs md:text-sm py-2 md:py-2.5"
              disabled={needsPurchase}
            >
              <FileText className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">剧本内容</span>
              <span className="md:hidden">剧本</span>
              {needsPurchase && <Lock className="ml-1 h-3 w-3" />}
            </TabsTrigger>
            <TabsTrigger 
              value="filming" 
              className="text-xs md:text-sm py-2 md:py-2.5"
              disabled={needsPurchase}
            >
              <Film className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">拍戏准备</span>
              <span className="md:hidden">准备</span>
              {needsPurchase && <Lock className="ml-1 h-3 w-3" />}
            </TabsTrigger>
          </TabsList>

          {/* 章节内容 */}
          <TabsContent value="chapters">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg md:text-xl">章节列表</CardTitle>
                    <CardDescription className="text-xs md:text-sm">共 {chapters.length} 章</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* 沉浸式阅读按钮 */}
                    {chapters.length > 0 && !needsPurchase && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenImmersiveReading(0)}
                        className="w-full sm:w-auto text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                      >
                        <Eye className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                        沉浸式阅读
                      </Button>
                    )}
                    {/* 只有非社区来源且是自己的小说才显示继续创作按钮 */}
                    {!isFromCommunity && isOwnNovel && chapters.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChapterClick(chapters[0])}
                        className="w-full sm:w-auto text-xs md:text-sm"
                      >
                        <Edit className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                        继续创作
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {/* 收费提示 */}
                {needsPurchase && currentUser && (
                  <Card className="mb-4 border-[#FF5724]/30">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Lock className="h-5 w-5 text-[#FF5724]" />
                          <div>
                            <p className="font-semibold text-sm">该小说需要购买后才能查看完整内容</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              价格：{novel?.price} 码分 · 未购买仅可查看第一章
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => setIsPurchaseDialogOpen(true)}
                          className="bg-[#FF5724] hover:bg-[#FF5724]/90"
                        >
                          立即购买
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* 购买对话框 */}
                {needsPurchase && currentUser && novel && (
                  <PurchaseNovelDialog
                    open={isPurchaseDialogOpen}
                    onOpenChange={setIsPurchaseDialogOpen}
                    novelId={novel.id}
                    novelTitle={novel.novel_title}
                    novelThumb={novel.novel_thumb}
                    price={novel.price}
                    userId={currentUser.id}
                    onPurchaseSuccess={handlePurchaseSuccess}
                  />
                )}
                
                {chapters.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                    暂无章节内容
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] md:h-[600px] pr-2 md:pr-4">
                    <div className="space-y-4 md:space-y-6">
                      {chapters
                        .filter((_, index) => !needsPurchase || index === 0)
                        .map((chapter) => (
                        <div 
                          key={chapter.chapter_number}
                          className="group relative"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm font-semibold text-primary">
                                第 {chapter.chapter_number} 章
                              </span>
                              {chapter.optimized && (
                                <></>
                              )}
                            </div>
                          </div>
                          <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3">{chapter.title}</h3>
                          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap text-xs md:text-sm">
                            {chapter.content}
                          </div>
                          {chapter.chapter_number < chapters.length && (
                            <Separator className="mt-4 md:mt-6" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 角色信息 */}
          <TabsContent value="characters">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">角色列表</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  共 {characters.length} 个角色
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {characters.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                    暂无角色信息
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {characters.map((character) => (
                      <Card key={character.id} className="overflow-hidden hover:shadow-lg transition-shadow relative group">
                        <CardContent className="p-0">
                          {/* 删除按钮 - 仅自己的小说显示 */}
                          {isOwnNovel && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick('character', character.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* 角色图片 */}
                          {character.image_url && (
                            <div 
                              className="relative aspect-[3/4] overflow-hidden cursor-pointer group/image"
                              onClick={() => setPreviewImage(character.image_url)}
                            >
                              <img
                                src={character.image_url}
                                alt={character.name}
                                className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="opacity-0 group-hover/image:opacity-100 transition-opacity">
                                  <div className="bg-white/90 rounded-full p-2">
                                    <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 角色信息 */}
                          <div className="p-3 md:p-4">
                            <h4 className="font-bold text-base md:text-lg mb-2 line-clamp-1">{character.name}</h4>
                            <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-3">
                              {character.description}
                            </p>
                            {character.traits && character.traits.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {character.traits.slice(0, 3).map((trait, index) => (
                                  <span
                                    key={index}
                                    className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded"
                                  >
                                    {trait}
                                  </span>
                                ))}
                                {character.traits.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{character.traits.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 分镜内容 */}
          <TabsContent value="panels">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">分镜列表</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  共 {panels.length} 个分镜
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {panels.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground text-sm md:text-base">
                    暂无分镜内容
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] md:h-[600px] pr-2 md:pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {panels.map((panel) => (
                        <Card key={panel.id} className="relative group">
                          <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                            {/* 删除按钮 - 仅自己的小说显示 */}
                            {isOwnNovel && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteClick('panel', panel.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <div className="mb-2 text-xs md:text-sm text-muted-foreground">
                              第 {panel.chapter_number} 章 - 分镜 {panel.panel_number}
                            </div>
                            {panel.image_url ? (
                              <img
                                src={panel.image_url}
                                alt={panel.description}
                                className="w-full h-40 md:h-48 object-cover rounded-lg mb-2 md:mb-3 cursor-pointer"
                                onClick={() => setPreviewImage(panel.image_url)}
                              />
                            ) : (
                              <div className="w-full h-40 md:h-48 flex items-center justify-center bg-gray-100 rounded-lg mb-2 md:mb-3">
                                <span className="text-gray-400 text-sm">暂无图片</span>
                              </div>
                            )}
                            <p className="text-xs md:text-sm line-clamp-3">{panel.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 剧本内容 */}
          <TabsContent value="scripts">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">剧本列表</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  共 {novel?.scripts_data?.length || 0} 个剧本
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {!novel?.scripts_data || novel.scripts_data.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 text-sm md:text-base">暂无剧本内容</p>
                    {isOwnNovel && (
                      <Button onClick={() => navigate('/script')} size="sm" className="md:text-base">
                        前往创作剧本
                      </Button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] md:h-[600px] pr-2 md:pr-4">
                    <div className="space-y-4 md:space-y-6">
                      {novel.scripts_data
                        .sort((a, b) => a.chapter_number - b.chapter_number)
                        .map((script, index) => (
                          <div key={index} className="relative group">
                            {index > 0 && <Separator className="my-4 md:my-6" />}
                            <div className="space-y-3 md:space-y-4">
                              {/* 剧本标题 */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-base md:text-lg font-semibold">
                                    第 {script.chapter_number} 章：{script.chapter_title}
                                  </h3>
                                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                                    生成时间：{new Date(script.generated_at).toLocaleString('zh-CN')}
                                  </p>
                                </div>
                                {/* 删除按钮 - 仅自己的小说显示 */}
                                {isOwnNovel && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteClick('script', script.chapter_number.toString(), index)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    删除
                                  </Button>
                                )}
                              </div>
                              
                              {/* 剧本内容 */}
                              <Card className="bg-muted/30">
                                <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                                  <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <pre className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed">
                                      {script.script_content}
                                    </pre>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 拍戏分析 */}
          <TabsContent value="filming">
            <div className="space-y-4 md:space-y-6">
              {/* 服装分析 */}
              {novel?.costume_data && novel.costume_data.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2 text-lg md:text-xl">
                      👔 服装分析
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">角色服装设计要求</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-3 md:space-y-4">
                      {novel.costume_data.map((item, index) => (
                        <div key={index} className="p-3 md:p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 relative group">
                          {/* 删除按钮 - 仅自己的小说显示 */}
                          {isOwnNovel && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick('costume', index.toString(), index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-[#FF5724] text-sm md:text-base">{item.character}</h4>
                            {item.chapter_number && (
                              <Badge variant="outline" className="text-xs">
                                第{item.chapter_number}章
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-xs md:text-sm">
                            <p><strong>描述：</strong>{item.description}</p>
                            <p><strong>材质：</strong>{item.material}</p>
                            <p><strong>颜色：</strong>{item.color}</p>
                            <p><strong>风格：</strong>{item.style}</p>
                            <p><strong>用途：</strong>{item.purpose}</p>
                          </div>
                          {/* 显示生成的图片 */}
                          {item.image_urls && item.image_urls.length > 0 && (
                            <div className="mt-2 md:mt-3">
                              <p className="text-xs md:text-sm font-semibold mb-2">参考图片：</p>
                              <div className="flex gap-2 flex-wrap">
                                {item.image_urls.map((url, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-700 cursor-pointer hover:border-orange-400 transition-colors"
                                    onClick={() => setPreviewImage(url)}
                                  >
                                    <img
                                      src={url}
                                      alt={`${item.character}服装${imgIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 化妆分析 */}
              {novel?.makeup_data && novel.makeup_data.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2 text-lg md:text-xl">
                      💄 化妆分析
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">角色化妆效果要求</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-3 md:space-y-4">
                      {novel.makeup_data.map((item, index) => (
                        <div key={index} className="p-3 md:p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 relative group">
                          {/* 删除按钮 - 仅自己的小说显示 */}
                          {isOwnNovel && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick('makeup', index.toString(), index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-[#FF5724] text-sm md:text-base">{item.character}</h4>
                            {item.chapter_number && (
                              <Badge variant="outline" className="text-xs">
                                第{item.chapter_number}章
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-xs md:text-sm">
                            <p><strong>描述：</strong>{item.description}</p>
                            <p><strong>风格：</strong>{item.style}</p>
                            <p><strong>细节：</strong>{item.details}</p>
                            <p><strong>情绪：</strong>{item.emotion}</p>
                          </div>
                          {/* 显示生成的图片 */}
                          {item.image_urls && item.image_urls.length > 0 && (
                            <div className="mt-2 md:mt-3">
                              <p className="text-xs md:text-sm font-semibold mb-2">参考图片：</p>
                              <div className="flex gap-2 flex-wrap">
                                {item.image_urls.map((url, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-700 cursor-pointer hover:border-orange-400 transition-colors"
                                    onClick={() => setPreviewImage(url)}
                                  >
                                    <img
                                      src={url}
                                      alt={`${item.character}化妆${imgIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 道具分析 */}
              {novel?.props_data && novel.props_data.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2 text-lg md:text-xl">
                      🎭 道具分析
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">场景道具设计要求</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-3 md:space-y-4">
                      {novel.props_data.map((item, index) => (
                        <div key={index} className="p-3 md:p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 relative group">
                          {/* 删除按钮 - 仅自己的小说显示 */}
                          {isOwnNovel && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick('prop', index.toString(), index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-[#FF5724] text-sm md:text-base">{item.name}</h4>
                            {item.chapter_number && (
                              <Badge variant="outline" className="text-xs">
                                第{item.chapter_number}章
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-xs md:text-sm">
                            <p><strong>描述：</strong>{item.description}</p>
                            <p><strong>功能：</strong>{item.function}</p>
                            <p><strong>剧情关联：</strong>{item.plot_relevance}</p>
                          </div>
                          {/* 显示生成的图片 */}
                          {item.image_urls && item.image_urls.length > 0 && (
                            <div className="mt-2 md:mt-3">
                              <p className="text-xs md:text-sm font-semibold mb-2">参考图片：</p>
                              <div className="flex gap-2 flex-wrap">
                                {item.image_urls.map((url, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-700 cursor-pointer hover:border-orange-400 transition-colors"
                                    onClick={() => setPreviewImage(url)}
                                  >
                                    <img
                                      src={url}
                                      alt={`${item.name}${imgIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 布景分析 */}
              {novel?.scene_data && novel.scene_data.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2 text-lg md:text-xl">
                      🏛️ 布景分析
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">场景布置设计要求</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-3 md:space-y-4">
                      {novel.scene_data.map((item, index) => (
                        <div key={index} className="p-3 md:p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 relative group">
                          {/* 删除按钮 - 仅自己的小说显示 */}
                          {isOwnNovel && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick('scene', index.toString(), index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-[#FF5724] text-sm md:text-base">{item.location}</h4>
                            {item.chapter_number && (
                              <Badge variant="outline" className="text-xs">
                                第{item.chapter_number}章
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-xs md:text-sm">
                            <p><strong>布局：</strong>{item.layout}</p>
                            <p><strong>装饰：</strong>{item.decoration}</p>
                            <p><strong>氛围：</strong>{item.atmosphere}</p>
                            <p><strong>光源：</strong>{item.lighting}</p>
                          </div>
                          {/* 显示生成的图片 */}
                          {item.image_urls && item.image_urls.length > 0 && (
                            <div className="mt-2 md:mt-3">
                              <p className="text-xs md:text-sm font-semibold mb-2">参考图片：</p>
                              <div className="flex gap-2 flex-wrap">
                                {item.image_urls.map((url, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-700 cursor-pointer hover:border-orange-400 transition-colors"
                                    onClick={() => setPreviewImage(url)}
                                  >
                                    <img
                                      src={url}
                                      alt={`${item.location}场景${imgIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 造型逻辑分析 */}
              {novel?.styling_logic_data && novel.styling_logic_data.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2 text-lg md:text-xl">
                      🎨 造型逻辑分析
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">造型设计逻辑说明</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-3 md:space-y-4">
                      {novel.styling_logic_data.map((item, index) => (
                        <div key={index} className="p-3 md:p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 relative group">
                          {/* 删除按钮 - 仅自己的小说显示 */}
                          {isOwnNovel && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick('styling', index.toString(), index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-[#FF5724] text-sm md:text-base">{item.aspect}</h4>
                            {item.chapter_number && (
                              <Badge variant="outline" className="text-xs">
                                第{item.chapter_number}章
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-xs md:text-sm">
                            <p><strong>逻辑说明：</strong>{item.logic}</p>
                            <p><strong>角色反映：</strong>{item.character_reflection}</p>
                            <p><strong>剧情联系：</strong>{item.plot_connection}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 综合分析 */}
              {novel?.overall_analysis_data && novel.overall_analysis_data.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2 text-lg md:text-xl">
                      📋 综合分析
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">整体制作建议</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-3 md:space-y-4">
                      {novel.overall_analysis_data.map((item, index) => (
                        <div key={index} className="p-3 md:p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 relative group">
                          {/* 删除按钮 - 仅自己的小说显示 */}
                          {isOwnNovel && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteClick('overall', index.toString(), index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-[#FF5724] text-sm md:text-base">{item.category}</h4>
                            {item.chapter_number && (
                              <Badge variant="outline" className="text-xs">
                                第{item.chapter_number}章
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-xs md:text-sm">
                            <p><strong>建议：</strong>{item.suggestion}</p>
                            <p><strong>协调要求：</strong>{item.coordination}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 如果没有任何拍戏分析数据 */}
              {(!novel?.costume_data || novel.costume_data.length === 0) &&
               (!novel?.makeup_data || novel.makeup_data.length === 0) &&
               (!novel?.props_data || novel.props_data.length === 0) &&
               (!novel?.scene_data || novel.scene_data.length === 0) &&
               (!novel?.styling_logic_data || novel.styling_logic_data.length === 0) &&
               (!novel?.overall_analysis_data || novel.overall_analysis_data.length === 0) && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">暂无拍戏准备内容</p>
                    {isOwnNovel && (
                      <Button onClick={() => navigate('/preparation')}>
                        前往创作拍戏准备
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 讨论区 - 已移除 */}
        </Tabs>

        {/* 底部发布帖子按钮 */}
        <div className="mt-8 flex justify-center">
          <Dialog open={isCreatePostDialogOpen} onOpenChange={setIsCreatePostDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                引用此小说发布帖子
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>发布帖子</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* 引用的小说信息 */}
                {novel && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 md:p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-purple-900 dark:text-purple-100">
                        引用小说
                      </span>
                    </div>
                    <div className="flex gap-3">
                      {novel.novel_thumb && (
                        <img
                          src={novel.novel_thumb}
                          alt={novel.novel_title}
                          className="w-16 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">{novel.novel_title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {novel.novel_content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 话题分类 */}
                <div className="space-y-2">
                  <Label htmlFor="category">话题分类 *</Label>
                  <Select
                    value={newPost.category}
                    onValueChange={(value) => setNewPost({ ...newPost, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="选择话题分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 帖子标题 */}
                <div className="space-y-2">
                  <Label htmlFor="title">帖子标题 *</Label>
                  <Textarea
                    id="title"
                    placeholder="输入帖子标题..."
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* 帖子内容 */}
                <div className="space-y-2">
                  <Label htmlFor="content">帖子内容 *</Label>
                  <Textarea
                    id="content"
                    placeholder="分享你对这部小说的看法..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={8}
                    className="resize-none"
                  />
                </div>

                {/* 发布按钮 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreatePostDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                  >
                    发布
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget && (
                  <>
                    {deleteTarget.type === 'character' && '确定要删除这个角色吗？'}
                    {deleteTarget.type === 'panel' && '确定要删除这个分镜吗？'}
                    {deleteTarget.type === 'script' && '确定要删除这个剧本吗？'}
                    {deleteTarget.type === 'costume' && '确定要删除这个服装分析吗？'}
                    {deleteTarget.type === 'makeup' && '确定要删除这个化妆分析吗？'}
                    {deleteTarget.type === 'prop' && '确定要删除这个道具分析吗？'}
                    {deleteTarget.type === 'scene' && '确定要删除这个布景分析吗？'}
                    {deleteTarget.type === 'styling' && '确定要删除这个造型逻辑分析吗？'}
                    {deleteTarget.type === 'overall' && '确定要删除这个综合分析吗？'}
                  </>
                )}
                此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  '确认删除'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 图片预览对话框 */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>图片预览</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center">
              {previewImage && (
                <img
                  src={previewImage}
                  alt="预览"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 沉浸式阅读组件 */}
        {isImmersiveReading && novel && chapters.length > 0 && (
          <ImmersiveReading
            novelTitle={novel.novel_title}
            chapters={chapters}
            panels={panels}
            initialChapterIndex={immersiveChapterIndex}
            onClose={handleCloseImmersiveReading}
          />
        )}
      </div>
    </div>
  );
}
