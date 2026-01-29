import { useState, useCallback } from 'react';
import { sendChatStream } from '@/utils/chatStream';
import { generateNovelCover } from '@/utils/coverGenerator';
import type { NovelRequest, Novel, NovelChapter, NovelOutline, ChapterOutline, ChapterGenerationStatus } from '@/types/novel';

const MAX_RETRY_COUNT = 5; // 最大重试次数

export const useNovelGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentContent, setCurrentContent] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);


  // 第一阶段：生成章节规划
  const generateNovelOutline = useCallback(async (
    request: NovelRequest,
    onUpdate: (content: string) => void,
    onComplete: (outline: NovelOutline) => void,
    onError: (error: Error) => void
  ) => {
    setIsGenerating(true);
    setCurrentContent('');
    
    const controller = new AbortController();
    setAbortController(controller);

    // 根据长度确定章节数量
    let minChapters = 3;
    let maxChapters = 5;
    if (request.length === 'medium') {
      minChapters = 8;
      maxChapters = 12;
    } else if (request.length === 'long') {
      minChapters = 15;
      maxChapters = 20;
    }
    const chapterCount = request.length === 'short' ? '3-5' : request.length === 'medium' ? '8-12' : '15-20';

    const prompt = `请根据以下要求为小说创作章节规划：

题材：${request.genre}
风格：${request.style}
情节要求：${request.plot}
${request.characters ? `主要角色：${request.characters}` : ''}
${request.setting ? `背景设定：${request.setting}` : ''}
章节数量：${chapterCount}章

**【重要】章节数量要求：**
- 必须生成${minChapters}到${maxChapters}章的完整规划
- 不能少于${minChapters}章，建议生成${maxChapters}章
- 每一章都必须有完整的章节标题和章节简介

**重要要求：**
1. **必须为小说创作一个极具吸引力的爆款标题**，标题要求：
   - 具备强烈的视觉冲击力和情感共鸣
   - 包含悬念、冲突或反转元素
   - 符合网络小说流行趋势
   - 字数控制在8-15字之间
   - 可以使用"重生"、"逆袭"、"系统"、"穿越"、"霸总"、"修仙"等热门元素

2. **每章节简介必须不少于300字**，要详细描述：
   - 本章的主要情节发展
   - 关键场景和冲突
   - 人物关系变化
   - 情感线索
   - 悬念设置

3. **小说简介要突出爽点和卖点**，吸引读者

请按照以下格式输出（必须包含所有${minChapters}-${maxChapters}章）：
# [爆款小说标题]

## 简介
[小说简介，200-300字，突出爽点和卖点]

## 第一章 [章节标题]
### 章节简介
[章节简介，不少于300字，详细描述本章情节、场景、冲突、人物关系等]

## 第二章 [章节标题]
### 章节简介
[章节简介，不少于300字]

## 第三章 [章节标题]
### 章节简介
[章节简介，不少于300字]

...（继续到第${maxChapters}章）

创作要求：
1. 小说标题必须是爆款标题，具备强烈吸引力
2. **必须生成完整的${minChapters}-${maxChapters}章规划，不能遗漏任何章节**
3. 每章节简介必须达到300字以上，内容详实
4. 章节标题要有吸引力，体现本章核心冲突或爽点
5. 章节之间要有连贯性和递进关系
6. 情节设计要有起伏，每章都有悬念或爽点
7. 符合所选题材和风格的特点

**请务必生成${minChapters}到${maxChapters}章的完整规划，不要遗漏章节！**`;

    let finalContent = '';

    try {
      await sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        apiId: import.meta.env.VITE_APP_ID,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        onUpdate: (content: string) => {
          finalContent = content;
          setCurrentContent(content);
          onUpdate(content);
        },
        onComplete: async () => {
          setIsGenerating(false);
          setAbortController(null);
          
          // 解析章节规划
          const outline = parseNovelOutline(finalContent);
          onComplete(outline);
        },
        onError: (error: Error) => {
          setIsGenerating(false);
          setAbortController(null);
          onError(error);
        },
        signal: controller.signal
      });
    } catch (error) {
      setIsGenerating(false);
      setAbortController(null);
      onError(error as Error);
    }
  }, []);

  // 生成单个章节的函数（支持重试）
  const generateSingleChapter = useCallback(async (
    chapterIndex: number,
    chapterOutline: ChapterOutline,
    request: NovelRequest,
    outline: NovelOutline,
    previousChapters: NovelChapter[],
    onUpdate: (chapterIndex: number, content: string) => void,
    onStatusUpdate?: (info: { chapterIndex: number; status: ChapterGenerationStatus['status']; retryCount: number; error?: string }) => void,
    retryCount: number = 0
  ): Promise<NovelChapter> => {
    const isFirstChapter = chapterIndex === 0;
    const isLastChapter = chapterIndex === outline.chapters.length - 1;
    
    console.log(`📝 开始生成第${chapterIndex + 1}章，重试次数: ${retryCount}`);
    
    // 更新状态为生成中
    onStatusUpdate?.({
      chapterIndex,
      status: retryCount > 0 ? 'retrying' : 'generating',
      retryCount
    });
    
    const controller = new AbortController();
    setAbortController(controller);

    // 构建上下文信息
    let contextInfo = '';
    
    // 添加前一章信息（如果不是第一章）
    if (!isFirstChapter && previousChapters[chapterIndex - 1]) {
      const prevChapter = previousChapters[chapterIndex - 1];
      const prevOutline = outline.chapters[chapterIndex - 1];
      const prevEnding = prevChapter.content.slice(-800);
      contextInfo += `\n**前一章信息（必须仔细阅读并衔接）：**
章节标题：${prevChapter.title}
章节简介：${prevOutline.summary}

前一章结尾部分（本章开头必须自然承接以下内容）：
${prevEnding}
`;
    }
    
    // 添加后一章信息（如果不是最后一章）
    if (!isLastChapter) {
      const nextOutline = outline.chapters[chapterIndex + 1];
      contextInfo += `\n**后一章信息（为下一章做铺垫）：**
章节标题：${nextOutline.title}
章节简介：${nextOutline.summary}
`;
    }

    const prompt = `请根据以下章节规划，创作详细的章节内容：

小说标题：${outline.title}
小说简介：${outline.description}

**当前章节信息：**
章节标题：${chapterOutline.title}
章节简介：${chapterOutline.summary}
${contextInfo}

题材：${request.genre}
风格：${request.style}

**重要要求：**
1. **章节内容必须不少于2000字**
2. 内容要丰富精彩，包含：
   - 生动的场景描写
   - 丰富的对话和心理描写
   - 细腻的情感刻画
   - 紧凑的情节推进
3. 严格按照当前章节简介的情节发展
4. ${!isFirstChapter ? '**【关键】本章开头必须紧密衔接前一章结尾内容，确保情节连贯流畅，时间、地点、人物状态要自然过渡，不能出现断层感。注意：前一章内容仅供你理解上下文，不要在开头写"上一章讲到..."、"回顾上文..."等总结性内容，直接进入故事情节即可**' : '作为开篇章节，要引人入胜，设置好故事背景，介绍主要人物和环境'}
5. ${!isLastChapter ? '章节结尾要为下一章做好铺垫，与下一章简介呼应，留下悬念或转折点' : '作为结尾章节，要给故事一个完整、令人满意的收尾'}
6. 保持与小说整体风格（${request.style}）一致
7. 每章结尾要有悬念或爽点，吸引读者继续阅读
8. ${!isFirstChapter ? '开篇第一段要自然承接前一章的情节，不要突兀地开始新场景，也不要写章节回顾' : ''}
9. **禁止在章节开头写任何形式的上章回顾、内容总结或过渡性说明，直接从故事情节开始写起**
10. **【重要】避免使用套路化表达，以下词语在整章中出现不得超过2次：**
    - 动作类：轰、炸开、猛地、僵住了、扯出
    - 表情类：嘴角勾起、微微挑眉、脸色、嘴角、他的嘴角微微上扬、他的表情变暗、他的脸变了、脸上堆满了笑、脸上带着笑意
    - 眼神类：眼神深邃、眼神热切、眼神坚定、眼神锐利、锐利的眼睛、xx的眼神、的目光、目光扫过、目光里毫不遮掩、眼中闪过一丝惊讶、眼中流露出……的表情
    - 心理类：心中一凛、心下了然、心中了然、心里隐隐有了猜测、心中一动、心中一片平静、心中、他的心一跳、觉得、意识到、感觉到、认为、他知道、我知道、知道
    - 程度副词：顿时、立刻、连忙、显然、似乎、确实、几乎、可能、渐渐、更是、或许、十分、恐怕、不断、瞬间、再次、暂时、绝对、随时
    - 模糊词：就像是、仿佛、如同、像是、像、好像、看似、大致、些许、有点、略微
    - 状态词：取而代之的是、紧锁、沉重、看不出、淡淡、郑重、清淡、不知道、注定、接下来、一定、此刻、沉吟、不卑不亢、不动声色、小心翼翼、沉吟片刻、果然
    - 形容词：显著、至关重要、波涛汹涌、不可估量、无法想象、无法用言语形容、显得有些兴奋、显得异常清晰、显得更加……、不容置疑、不可置信、不易察觉、纯粹、冰冷、清冷、沸腾、扭曲、撕裂、漆黑、窒息、剧痛、死寂、沉寂、冷寂、甜腻、力道大得惊人、巨大、近乎偏执
    - 短语类：一丝、一抹、一股、带着一丝、带着...、口吻、以一种、以及、充满、行云流水、话锋一转、这一刻、一时之间、这一次、深吸一口气、缓缓地说、指节泛白、空气凝滞如铁
    - 声音类：声音不大、声音平静、声音坚定、声音轻细、炸雷、闷响
    - 比喻类：像淬了毒的匕首、刺入……的心脏、嘴角勾起一个……的弧度、看得目瞪口呆、嘴巴张得能塞下一个鸡蛋、却比……还要冰冷、像在看一个……的人、透露出的寒意、让空气的温度都下降了几度、却重重砸在……的心头、时间仿佛被按下了暂停、在……炸开、带着不容置疑的……、这不是……而是
    - 其他：电弧、闪烁、裹挟、凝固、诅咒、宣战、我都要烦死了、我知道，我赢了

请直接输出章节内容，不要包含章节标题，不要写"上一章"相关的回顾内容，避免使用上述套路化表达，内容必须达到2000字以上：`;

    let chapterContent = '';

    return new Promise<NovelChapter>((resolve, reject) => {
      sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        apiId: import.meta.env.VITE_APP_ID,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        onUpdate: (content: string) => {
          chapterContent = content;
          onUpdate(chapterIndex, content);
        },
        onComplete: async () => {
          const chapter: NovelChapter = {
            id: chapterOutline.id,
            title: chapterOutline.title,
            content: chapterContent,
            order: chapterOutline.order,
            wordCount: chapterContent.length,
            createdAt: new Date(),
          };
          
          console.log(`✅ 第${chapterIndex + 1}章生成成功: ${chapter.title} (${chapter.content.length}字)`);
          
          // 更新状态为成功
          onStatusUpdate?.({
            chapterIndex,
            status: 'success',
            retryCount
          });
          
          setAbortController(null);
          resolve(chapter);
        },
        onError: async (error: Error) => {
          console.error(`❌ 第${chapterIndex + 1}章生成失败:`, error);
          setAbortController(null);
          
          // 如果还没达到最大重试次数，自动重试
          if (retryCount < MAX_RETRY_COUNT) {
            console.log(`🔄 第${chapterIndex + 1}章开始第${retryCount + 1}次重试...`);
            try {
              const chapter = await generateSingleChapter(
                chapterIndex,
                chapterOutline,
                request,
                outline,
                previousChapters,
                onUpdate,
                onStatusUpdate,
                retryCount + 1
              );
              resolve(chapter);
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            // 达到最大重试次数，标记为失败
            console.error(`❌ 第${chapterIndex + 1}章已重试${MAX_RETRY_COUNT}次，全部失败`);
            onStatusUpdate?.({
              chapterIndex,
              status: 'failed',
              retryCount,
              error: error.message
            });
            reject(error);
          }
        },
        signal: controller.signal
      });
    });
  }, []);

  // 第二阶段：生成详细章节内容
  const generateDetailedChapters = useCallback(async (
    request: NovelRequest,
    outline: NovelOutline,
    onChapterUpdate: (chapterIndex: number, content: string) => void,
    onChapterComplete: (chapter: NovelChapter) => void,
    onAllComplete: (novel: Novel) => void,
    onError: (error: Error) => void,
    onCoverGenerationStart?: () => void,
    onCoverGenerationComplete?: () => void,
    onStatusUpdate?: (info: { chapterIndex: number; status: ChapterGenerationStatus['status']; retryCount: number; error?: string }) => void
  ) => {
    setIsGenerating(true);
    
    const chapters: NovelChapter[] = [];
    
    try {
      // 依次生成每个章节的详细内容
      for (let i = 0; i < outline.chapters.length; i++) {
        const chapterOutline = outline.chapters[i];
        
        try {
          // 使用新的generateSingleChapter函数，支持自动重试
          const chapter = await generateSingleChapter(
            i,
            chapterOutline,
            request,
            outline,
            chapters,
            onChapterUpdate,
            onStatusUpdate
          );
          
          chapters.push(chapter);
          onChapterComplete(chapter);
        } catch (error) {
          // 章节生成失败（已重试5次），但不中断整个流程
          console.error(`第${i + 1}章生成失败，跳过该章节`);
          // 可以选择继续生成下一章，或者中断整个流程
          // 这里选择中断整个流程
          throw error;
        }
      }
      
      // 所有章节生成完成，创建完整小说对象
      const novel: Novel = {
        id: `novel-${Date.now()}`,
        title: outline.title,
        description: outline.description,
        genre: request.genre,
        style: request.style,
        chapters: chapters,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // 生成封面图片
      try {
        console.log('开始生成小说封面...');
        onCoverGenerationStart?.();
        
        const coverImageUrl = await generateNovelCover(
          novel.title,
          novel.genre,
          novel.description
        );
        novel.coverImageUrl = coverImageUrl;
        console.log('小说封面生成完成:', coverImageUrl);
        
        onCoverGenerationComplete?.();
      } catch (error) {
        console.warn('封面生成失败，将使用默认封面:', error);
        onCoverGenerationComplete?.();
      }
      
      console.log('✅ 所有内容生成完成，设置isGenerating为false');
      setIsGenerating(false);
      onAllComplete(novel);
      
    } catch (error) {
      console.error('❌ 生成过程出错，设置isGenerating为false');
      setIsGenerating(false);
      setAbortController(null);
      onError(error as Error);
    }
  }, [generateSingleChapter]);

  // 手动重新生成单个章节（用于用户点击重新生成按钮）
  const retryChapterGeneration = useCallback(async (
    chapterIndex: number,
    chapterOutline: ChapterOutline,
    request: NovelRequest,
    outline: NovelOutline,
    previousChapters: NovelChapter[],
    onUpdate: (chapterIndex: number, content: string) => void,
    onStatusUpdate?: (info: { chapterIndex: number; status: ChapterGenerationStatus['status']; retryCount: number; error?: string }) => void
  ): Promise<NovelChapter> => {
    console.log(`🔄 用户手动重新生成第${chapterIndex + 1}章`);
    
    // 手动重新生成时，重试次数从0开始
    return generateSingleChapter(
      chapterIndex,
      chapterOutline,
      request,
      outline,
      previousChapters,
      onUpdate,
      onStatusUpdate,
      0 // 重置重试次数
    );
  }, [generateSingleChapter]);

  const stopGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
    }
  }, [abortController]);

  // 解析章节规划
  const parseNovelOutline = (content: string): NovelOutline => {
    const lines = content.split('\n').filter(line => line.trim());
    
    let title = '未命名小说';
    let description = '';
    const chapters: ChapterOutline[] = [];
    
    let currentChapter: Partial<ChapterOutline> | null = null;
    let currentSummary: string[] = [];
    let chapterOrder = 0;
    let isInSummary = false;
    let isInDescription = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 解析标题
      if (trimmedLine.startsWith('# ') && title === '未命名小说') {
        title = trimmedLine.substring(2).trim();
        continue;
      }
      
      // 解析简介标记
      if (trimmedLine.startsWith('## 简介')) {
        isInDescription = true;
        continue;
      }
      
      // 解析章节标题
      if (trimmedLine.startsWith('## 第') && trimmedLine.includes('章')) {
        // 保存上一章
        if (currentChapter && currentSummary.length > 0) {
          chapters.push({
            ...currentChapter,
            summary: currentSummary.join('\n'),
          } as ChapterOutline);
        }
        
        // 开始新章节
        chapterOrder++;
        currentChapter = {
          id: `chapter-${chapterOrder}`,
          title: trimmedLine.substring(2).trim(),
          order: chapterOrder,
        };
        currentSummary = [];
        isInSummary = false;
        isInDescription = false;
        continue;
      }
      
      // 解析章节简介标记
      if (trimmedLine.startsWith('### 章节简介')) {
        isInSummary = true;
        continue;
      }
      
      // 收集简介内容
      if (isInDescription && trimmedLine && !trimmedLine.startsWith('#')) {
        description += (description ? '\n' : '') + trimmedLine;
      }
      
      // 收集章节简介内容
      if (isInSummary && currentChapter && trimmedLine && !trimmedLine.startsWith('#')) {
        currentSummary.push(trimmedLine);
      }
    }
    
    // 保存最后一章
    if (currentChapter && currentSummary.length > 0) {
      chapters.push({
        ...currentChapter,
        summary: currentSummary.join('\n'),
      } as ChapterOutline);
    }
    
    // 检查章节简介字数
    const insufficientChapters = chapters.filter(chapter => chapter.summary.length < 300);
    if (insufficientChapters.length > 0) {
      console.warn(`以下章节简介字数不足300字：`, insufficientChapters.map(c => `${c.title}: ${c.summary.length}字`));
    }
    
    return {
      title,
      description: description || '暂无简介',
      chapters,
    };
  };

  // 重新生成封面
  const retryCoverGeneration = useCallback(async (
    title: string,
    genre: string,
    description: string,
    onStart?: () => void,
    onComplete?: (coverUrl: string) => void,
    onError?: (error: Error) => void
  ): Promise<string | null> => {
    try {
      console.log('🔄 开始重新生成封面...');
      onStart?.();
      
      const coverImageUrl = await generateNovelCover(title, genre, description);
      
      console.log('✅ 封面重新生成成功:', coverImageUrl);
      onComplete?.(coverImageUrl);
      
      return coverImageUrl;
    } catch (error) {
      console.error('❌ 封面重新生成失败:', error);
      onError?.(error as Error);
      return null;
    }
  }, []);

  return {
    generateNovelOutline,
    generateDetailedChapters,
    retryChapterGeneration,
    retryCoverGeneration,
    stopGeneration,
    isGenerating,
    currentContent,
  };
};