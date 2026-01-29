// 平行世界相关API
import { supabase } from './supabase';
import { sendChatStream } from '@/utils/chatStream';
import type { DbNovel, SimpleContext, ChapterData, CharacterData, PanelData, ScriptData } from '@/types/database';

/**
 * 获取用户可以进行平行世界二创的所有小说
 * 包括：
 * 1. 用户自己创作的小说
 * 2. 分享到社区的免费小说（price=0）
 * 3. 分享到社区且用户已购买的收费小说
 * @param userId 用户ID
 * @returns 小说列表（包含来源标识）
 */
export async function getUserNovelsForParallel(userId: string): Promise<(DbNovel & { source?: string })[]> {
  // console.log('[平行世界API] 获取用户可二创小说列表，用户ID:', userId);
  
  try {
    // 1. 获取用户自己的小说
    const { data: ownNovels, error: ownError } = await supabase
      .from('novels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ownError) {
      console.error('[平行世界API] 获取自己的小说失败:', ownError);
      throw ownError;
    }

    // console.log('[平行世界API] 获取到自己的小说数量:', ownNovels?.length || 0);

    // 标记来源为"自己的"
    const ownNovelsWithSource = (ownNovels || []).map(novel => ({
      ...novel,
      source: 'own'
    }));

    // 2. 获取分享到社区的所有小说（排除自己的）
    const { data: sharedNovels, error: sharedError } = await supabase
      .from('novel_shares')
      .select(`
        novel_id,
        novels (*)
      `)
      .neq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sharedError) {
      console.error('[平行世界API] 获取社区分享小说失败:', sharedError);
      throw sharedError;
    }

    // console.log('[平行世界API] 获取到社区分享小说数量:', sharedNovels?.length || 0);

    // 3. 获取用户已购买的小说ID列表
    const { data: purchases, error: purchaseError } = await supabase
      .from('purchase_records')
      .select('novel_id')
      .eq('user_id', userId);

    if (purchaseError) {
      console.error('[平行世界API] 获取购买记录失败:', purchaseError);
      throw purchaseError;
    }

    const purchasedNovelIds = new Set((purchases || []).map(p => p.novel_id));
    // console.log('[平行世界API] 用户已购买小说数量:', purchasedNovelIds.size);

    // 4. 筛选可访问的社区小说
    const accessibleSharedNovels: (DbNovel & { source?: string })[] = [];
    
    for (const share of sharedNovels || []) {
      const novel = (share as any).novels;
      if (!novel) continue;

      // 免费小说或已购买的收费小说
      if (novel.price === 0) {
        accessibleSharedNovels.push({
          ...novel,
          source: 'free'
        });
        // console.log('[平行世界API] 添加免费小说:', novel.novel_title);
      } else if (purchasedNovelIds.has(novel.id)) {
        accessibleSharedNovels.push({
          ...novel,
          source: 'purchased'
        });
        // console.log('[平行世界API] 添加已购买小说:', novel.novel_title);
      }
    }

    // console.log('[平行世界API] 可访问的社区小说数量:', accessibleSharedNovels.length);

    // 5. 合并所有小说
    const allNovels = [...ownNovelsWithSource, ...accessibleSharedNovels];
    
    // console.log('[平行世界API] 总计可二创小说数量:', allNovels.length);
    // console.log('[平行世界API] - 自己的小说:', ownNovelsWithSource.length);
    // console.log('[平行世界API] - 免费小说:', accessibleSharedNovels.filter(n => n.source === 'free').length);
    // console.log('[平行世界API] - 已购买小说:', accessibleSharedNovels.filter(n => n.source === 'purchased').length);

    return allNovels;
  } catch (error) {
    console.error('[平行世界API] 获取小说列表异常:', error);
    throw error;
  }
}

/**
 * 获取小说详情（包含所有数据）
 * @param novelId 小说ID
 * @returns 小说详情
 */
export async function getNovelForParallel(novelId: string): Promise<DbNovel | null> {
  // console.log('[平行世界API] 获取小说详情，小说ID:', novelId);
  
  try {
    const { data, error } = await supabase
      .from('novels')
      .select('*')
      .eq('id', novelId)
      .maybeSingle();

    if (error) {
      console.error('[平行世界API] 获取小说详情失败:', error);
      throw error;
    }

    // console.log('[平行世界API] 成功获取小说详情');
    return data;
  } catch (error) {
    console.error('[平行世界API] 获取小说详情异常:', error);
    throw error;
  }
}

/**
 * 创建平行世界二创小说
 * @param sourceNovelId 源小说ID
 * @param startChapter 起始章节号
 * @param userId 用户ID
 * @param newTitle 新小说标题
 * @param newDescription 新小说简介
 * @returns 新创建的小说ID
 */
export async function createParallelNovel(
  sourceNovelId: string,
  startChapter: number,
  userId: string,
  newTitle: string,
  newDescription: string
): Promise<string> {
  // console.log('[平行世界API] 开始创建平行世界小说');
  // console.log('[平行世界API] 源小说ID:', sourceNovelId);
  // console.log('[平行世界API] 起始章节:', startChapter);
  // console.log('[平行世界API] 用户ID:', userId);
  // console.log('[平行世界API] 新标题:', newTitle);

  try {
    // 1. 获取源小说数据
    const sourceNovel = await getNovelForParallel(sourceNovelId);
    if (!sourceNovel) {
      throw new Error('源小说不存在');
    }

    // console.log('[平行世界API] 成功获取源小说数据');

    // 2. 复制起始章节之前的数据
    const copiedChapters: ChapterData[] = [];
    const copiedSimpleContext: SimpleContext[] = [];
    const copiedCharacters: CharacterData[] = sourceNovel.characters_data || [];
    const copiedPanels: PanelData[] = [];
    const copiedScripts: ScriptData[] = [];

    // 复制章节数据
    if (Array.isArray(sourceNovel.chapters_data)) {
      for (const chapter of sourceNovel.chapters_data) {
        if (chapter.chapter_number < startChapter) {
          copiedChapters.push({ ...chapter });
        }
      }
    }

    // 复制章节简介
    if (Array.isArray(sourceNovel.simple_context)) {
      for (const context of sourceNovel.simple_context) {
        if (context.chapter_number < startChapter) {
          copiedSimpleContext.push({ ...context });
        }
      }
    }

    // 复制分镜数据
    if (Array.isArray(sourceNovel.panels_data)) {
      for (const panel of sourceNovel.panels_data) {
        if (panel.chapter_number < startChapter) {
          copiedPanels.push({ ...panel });
        }
      }
    }

    // 复制剧本数据
    if (Array.isArray(sourceNovel.scripts_data)) {
      for (const script of sourceNovel.scripts_data) {
        if (script.chapter_number < startChapter) {
          copiedScripts.push({ ...script });
        }
      }
    }

    // console.log('[平行世界API] 数据复制完成:');
    // console.log('[平行世界API] - 复制章节数:', copiedChapters.length);
    // console.log('[平行世界API] - 复制简介数:', copiedSimpleContext.length);
    // console.log('[平行世界API] - 复制角色数:', copiedCharacters.length);
    // console.log('[平行世界API] - 复制分镜数:', copiedPanels.length);
    // console.log('[平行世界API] - 复制剧本数:', copiedScripts.length);

    // 3. 创建新小说记录
    const { data: newNovel, error } = await supabase
      .from('novels')
      .insert({
        user_id: userId,
        novel_title: newTitle,
        novel_content: newDescription,
        novel_thumb: sourceNovel.novel_thumb, // 复制封面
        novel_type: sourceNovel.novel_type, // 复制类型
        chapters_data: copiedChapters,
        simple_context: copiedSimpleContext,
        characters_data: copiedCharacters,
        panels_data: copiedPanels,
        scripts_data: copiedScripts,
        parallel_source_id: sourceNovelId,
        parallel_start_chapter: startChapter,
        price: 0, // 默认免费
      })
      .select()
      .single();

    if (error) {
      console.error('[平行世界API] 创建平行世界小说失败:', error);
      throw error;
    }

    // console.log('[平行世界API] 成功创建平行世界小说，ID:', newNovel.id);
    return newNovel.id;
  } catch (error) {
    console.error('[平行世界API] 创建平行世界小说异常:', error);
    throw error;
  }
}

/**
 * 获取基于某个小说的所有平行世界二创作品
 * @param sourceNovelId 源小说ID
 * @returns 平行世界小说列表
 */
export async function getParallelNovels(sourceNovelId: string): Promise<DbNovel[]> {
  // console.log('[平行世界API] 获取平行世界小说列表，源小说ID:', sourceNovelId);
  
  try {
    const { data, error } = await supabase
      .from('novels')
      .select('*')
      .eq('parallel_source_id', sourceNovelId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[平行世界API] 获取平行世界小说列表失败:', error);
      throw error;
    }

    // console.log('[平行世界API] 成功获取平行世界小说列表，数量:', data?.length || 0);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[平行世界API] 获取平行世界小说列表异常:', error);
    throw error;
  }
}

/**
 * 检查小说是否为平行世界二创
 * @param novelId 小说ID
 * @returns 是否为平行世界二创
 */
export async function isParallelNovel(novelId: string): Promise<boolean> {
  // console.log('[平行世界API] 检查小说是否为平行世界二创，小说ID:', novelId);
  
  try {
    const { data, error } = await supabase
      .from('novels')
      .select('parallel_source_id')
      .eq('id', novelId)
      .maybeSingle();

    if (error) {
      console.error('[平行世界API] 检查失败:', error);
      throw error;
    }

    const isParallel = data?.parallel_source_id !== null;
    // console.log('[平行世界API] 检查结果:', isParallel);
    return isParallel;
  } catch (error) {
    console.error('[平行世界API] 检查异常:', error);
    throw error;
  }
}

/**
 * 获取源小说信息
 * @param novelId 平行世界小说ID
 * @returns 源小说信息
 */
export async function getSourceNovel(novelId: string): Promise<DbNovel | null> {
  // console.log('[平行世界API] 获取源小说信息，平行世界小说ID:', novelId);
  
  try {
    // 先获取平行世界小说的source_id
    const { data: parallelNovel, error: parallelError } = await supabase
      .from('novels')
      .select('parallel_source_id')
      .eq('id', novelId)
      .maybeSingle();

    if (parallelError) {
      console.error('[平行世界API] 获取平行世界小说失败:', parallelError);
      throw parallelError;
    }

    if (!parallelNovel?.parallel_source_id) {
      // console.log('[平行世界API] 该小说不是平行世界二创');
      return null;
    }

    // 获取源小说
    const { data: sourceNovel, error: sourceError } = await supabase
      .from('novels')
      .select('*')
      .eq('id', parallelNovel.parallel_source_id)
      .maybeSingle();

    if (sourceError) {
      console.error('[平行世界API] 获取源小说失败:', sourceError);
      throw sourceError;
    }

    // console.log('[平行世界API] 成功获取源小说信息');
    return sourceNovel;
  } catch (error) {
    console.error('[平行世界API] 获取源小说信息异常:', error);
    throw error;
  }
}

/**
 * 继续创作平行世界章节（创建新小说）
 * @param sourceNovelId 源小说ID
 * @param startChapter 起始章节号
 * @param userId 当前用户ID
 * @param creationRequirement 二创需求
 * @param chapterCount 生成章节数
 * @returns 新创建的小说ID
 */
export async function continueParallelChapters(
  sourceNovelId: string,
  startChapter: number,
  userId: string,
  creationRequirement: string,
  chapterCount: number
): Promise<string> {
  // console.log('========================================');
  // console.log('[平行世界API] 开始创作平行世界章节');
  // console.log('[平行世界API] 源小说ID:', sourceNovelId);
  // console.log('[平行世界API] 起始章节:', startChapter);
  // console.log('[平行世界API] 用户ID:', userId);
  // console.log('[平行世界API] 二创需求:', creationRequirement);
  // console.log('[平行世界API] 生成章节数:', chapterCount);

  try {
    // 1. 获取源小说数据
    const sourceNovel = await getNovelForParallel(sourceNovelId);
    if (!sourceNovel) {
      throw new Error('源小说不存在');
    }

    // console.log('[平行世界API] 成功获取源小说数据');
    // console.log('[平行世界API] 源小说标题:', sourceNovel.novel_title);

    // 2. 复制起始章节之前的数据
    const copiedChapters: ChapterData[] = [];
    const copiedSimpleContext: SimpleContext[] = [];
    const copiedCharacters: CharacterData[] = sourceNovel.characters_data || [];
    const copiedPanels: PanelData[] = [];
    const copiedScripts: ScriptData[] = [];

    // 复制章节数据
    if (Array.isArray(sourceNovel.chapters_data)) {
      for (const chapter of sourceNovel.chapters_data) {
        if (chapter.chapter_number < startChapter) {
          copiedChapters.push({ ...chapter });
        }
      }
    }

    // 复制章节简介
    if (Array.isArray(sourceNovel.simple_context)) {
      for (const context of sourceNovel.simple_context) {
        if (context.chapter_number < startChapter) {
          copiedSimpleContext.push({ ...context });
        }
      }
    }

    // 复制分镜数据
    if (Array.isArray(sourceNovel.panels_data)) {
      for (const panel of sourceNovel.panels_data) {
        if (panel.chapter_number < startChapter) {
          copiedPanels.push({ ...panel });
        }
      }
    }

    // 复制剧本数据
    if (Array.isArray(sourceNovel.scripts_data)) {
      for (const script of sourceNovel.scripts_data) {
        if (script.chapter_number < startChapter) {
          copiedScripts.push({ ...script });
        }
      }
    }

    // console.log('[平行世界API] 数据复制完成:');
    // console.log('[平行世界API] - 复制章节数:', copiedChapters.length);
    // console.log('[平行世界API] - 复制简介数:', copiedSimpleContext.length);
    // console.log('[平行世界API] - 复制角色数:', copiedCharacters.length);
    // console.log('[平行世界API] - 复制分镜数:', copiedPanels.length);
    // console.log('[平行世界API] - 复制剧本数:', copiedScripts.length);

    // 3. 构建历史内容摘要
    let historySummary = '';
    if (copiedSimpleContext.length > 0) {
      historySummary = copiedSimpleContext
        .map((ctx) => `第${ctx.chapter_number}章：${ctx.summary}`)
        .join('\n');
    }

    // console.log('[平行世界API] 历史内容摘要长度:', historySummary.length);

    // 4. 生成新的章节简介
    // console.log('[平行世界API] 开始生成新章节简介...');
    const newChapterSummaries = await generateParallelChapterSummaries(
      sourceNovel.novel_title,
      sourceNovel.novel_content || '',
      historySummary,
      creationRequirement,
      startChapter,
      chapterCount
    );

    // console.log('[平行世界API] 成功生成章节简介，数量:', newChapterSummaries.length);

    // 5. 创建章节数据（只包含标题，不包含详细内容）
    // console.log('[平行世界API] 创建章节数据结构（不生成详细内容）...');
    const newChapters: ChapterData[] = [];
    const newSimpleContext: SimpleContext[] = [];
    
    for (let i = 0; i < newChapterSummaries.length; i++) {
      const summary = newChapterSummaries[i];
      const chapterNumber = startChapter + i;

      // 只创建章节结构，不生成详细内容
      newChapters.push({
        chapter_number: chapterNumber,
        title: summary.title,
        content: '', // 空内容，等待后续生成
        optimized: false, // 标记为未优化
      });

      newSimpleContext.push({
        chapter_number: chapterNumber,
        title: summary.title,
        summary: summary.summary,
      });

      // console.log(`[平行世界API] 第${chapterNumber}章结构创建完成: ${summary.title}`);
    }

    // 6. 合并所有数据
    const allChapters = [...copiedChapters, ...newChapters];
    const allSimpleContext = [...copiedSimpleContext, ...newSimpleContext];

    // console.log('[平行世界API] 合并后总章节数:', allChapters.length);
    // console.log('[平行世界API] 合并后总简介数:', allSimpleContext.length);

    // 7. 创建新小说记录
    const newTitle = `${sourceNovel.novel_title}·平行世界`;
    const newDescription = `基于《${sourceNovel.novel_title}》的平行世界二创作品。\n\n原作简介：${sourceNovel.novel_content}\n\n二创方向：${creationRequirement}`;

    // console.log('[平行世界API] 创建新小说记录...');
    // console.log('[平行世界API] 新标题:', newTitle);

    const { data: newNovel, error } = await supabase
      .from('novels')
      .insert({
        user_id: userId,
        novel_title: newTitle,
        novel_content: newDescription,
        novel_thumb: sourceNovel.novel_thumb, // 复制封面
        novel_type: sourceNovel.novel_type, // 复制类型
        chapters_data: allChapters,
        simple_context: allSimpleContext,
        characters_data: copiedCharacters,
        panels_data: copiedPanels,
        scripts_data: copiedScripts,
        parallel_source_id: sourceNovelId, // 标记源小说ID
        parallel_start_chapter: startChapter, // 记录起始章节
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[平行世界API] 创建新小说失败:', error);
      throw error;
    }

    if (!newNovel) {
      throw new Error('创建新小说失败：未返回数据');
    }

    // console.log('[平行世界API] 新小说创建成功，ID:', newNovel.id);
    // console.log('========================================');
    
    return newNovel.id;
  } catch (error) {
    console.error('[平行世界API] 创作平行世界章节失败:', error);
    throw error;
  }
}

/**
 * 生成平行世界章节简介
 */
async function generateParallelChapterSummaries(
  novelTitle: string,
  novelContent: string,
  historySummary: string,
  creationRequirement: string,
  startChapter: number,
  chapterCount: number
): Promise<Array<{ title: string; summary: string }>> {
  // console.log('[平行世界API] 调用AI生成章节简介...');

  const prompt = `请为小说《${novelTitle}》创作平行世界二创的章节规划。

**小说简介：**
${novelContent}

**前面章节内容摘要：**
${historySummary}

**二创需求：**
${creationRequirement}

**任务要求：**
从第${startChapter}章开始，生成${chapterCount}章的平行世界二创章节规划。

**重要要求：**
1. **每章节简介必须不少于300字**，要详细描述：
   - 本章的主要情节发展
   - 关键场景和冲突
   - 人物关系变化
   - 情感线索
   - 悬念设置

2. 章节标题要有吸引力，体现本章核心冲突或爽点
3. 章节之间要有连贯性和递进关系
4. 情节设计要有起伏，每章都有悬念或爽点
5. 必须基于前面章节的内容，保持故事连贯性
6. 结合用户的二创需求，创造新的故事发展

请按照以下格式输出（必须包含所有${chapterCount}章）：

## 第${startChapter}章 [章节标题]
### 章节简介
[章节简介，不少于300字，详细描述本章情节、场景、冲突、人物关系等]

## 第${startChapter + 1}章 [章节标题]
### 章节简介
[章节简介，不少于300字]

## 第${startChapter + 2}章 [章节标题]
### 章节简介
[章节简介，不少于300字]

...（继续到第${startChapter + chapterCount - 1}章）

**请务必生成${chapterCount}章的完整规划，不要遗漏章节！**`;

  let fullResponse = '';
  
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
      fullResponse = content;
    },
    onComplete: () => {
      // console.log('[平行世界API] 章节简介生成完成');
    },
    onError: (error: Error) => {
      console.error('[平行世界API] 章节简介生成失败:', error);
      throw error;
    }
  });

  // 解析AI返回的内容
  const summaries: Array<{ title: string; summary: string }> = [];
  const chapterRegex = /##\s*第(\d+)章\s+(.+?)\n###\s*章节简介\n([\s\S]+?)(?=##\s*第\d+章|$)/g;
  let match;

  while ((match = chapterRegex.exec(fullResponse)) !== null) {
    const chapterNum = Number.parseInt(match[1]);
    const title = match[2].trim();
    const summary = match[3].trim();
    
    if (chapterNum >= startChapter && chapterNum < startChapter + chapterCount) {
      summaries.push({ title, summary });
      // console.log(`[平行世界API] 解析到第${chapterNum}章: ${title}`);
    }
  }

  if (summaries.length === 0) {
    console.warn('[平行世界API] 未能解析到章节简介，使用备用方案');
    // 备用方案：生成基础章节
    for (let i = 0; i < chapterCount; i++) {
      summaries.push({
        title: `第${startChapter + i}章`,
        summary: `基于用户需求：${creationRequirement}`,
      });
    }
  }

  // console.log(`[平行世界API] 成功生成${summaries.length}章简介`);
  return summaries;
}

/**
 * 生成章节详细内容（采用主页预览选项卡的功能逻辑）
 */
async function generateChapterContent(
  novelTitle: string,
  novelDescription: string,
  chapterTitle: string,
  chapterSummary: string,
  chapterIndex: number,
  allChapterSummaries: Array<{ title: string; summary: string }>,
  previousChapterContent: string | null,
  genre: string,
  style: string
): Promise<string> {
  // console.log(`[平行世界API] 调用AI生成第${chapterIndex + 1}章内容...`);
  // console.log(`[平行世界API] chapterIndex: ${chapterIndex}, allChapterSummaries长度: ${allChapterSummaries.length}`);

  const isFirstChapter = chapterIndex === 0;
  const isLastChapter = chapterIndex === allChapterSummaries.length - 1;

  // 构建上下文信息
  let contextInfo = '';
  
  // 添加前一章信息（如果不是第一章）
  if (!isFirstChapter && previousChapterContent) {
    const prevChapterIndex = chapterIndex - 1;
    // console.log(`[平行世界API] 尝试获取前一章信息，索引: ${prevChapterIndex}`);
    
    if (prevChapterIndex >= 0 && prevChapterIndex < allChapterSummaries.length) {
      const prevChapter = allChapterSummaries[prevChapterIndex];
      if (prevChapter && prevChapter.title && prevChapter.summary) {
        const prevEnding = previousChapterContent.slice(-800);
        contextInfo += `\n**前一章信息（必须仔细阅读并衔接）：**
章节标题：${prevChapter.title}
章节简介：${prevChapter.summary}

前一章结尾部分（本章开头必须自然承接以下内容）：
${prevEnding}
`;
        // console.log(`[平行世界API] 成功添加前一章信息: ${prevChapter.title}`);
      } else {
        console.warn(`[平行世界API] 前一章数据不完整:`, prevChapter);
      }
    } else {
      console.warn(`[平行世界API] 前一章索引超出范围: ${prevChapterIndex}, 数组长度: ${allChapterSummaries.length}`);
    }
  }
  
  // 添加后一章信息（如果不是最后一章）
  if (!isLastChapter) {
    const nextChapterIndex = chapterIndex + 1;
    // console.log(`[平行世界API] 尝试获取后一章信息，索引: ${nextChapterIndex}`);
    
    if (nextChapterIndex >= 0 && nextChapterIndex < allChapterSummaries.length) {
      const nextChapter = allChapterSummaries[nextChapterIndex];
      if (nextChapter && nextChapter.title && nextChapter.summary) {
        contextInfo += `\n**后一章信息（为下一章做铺垫）：**
章节标题：${nextChapter.title}
章节简介：${nextChapter.summary}
`;
        // console.log(`[平行世界API] 成功添加后一章信息: ${nextChapter.title}`);
      } else {
        console.warn(`[平行世界API] 后一章数据不完整:`, nextChapter);
      }
    } else {
      console.warn(`[平行世界API] 后一章索引超出范围: ${nextChapterIndex}, 数组长度: ${allChapterSummaries.length}`);
    }
  }

  const prompt = `请根据以下章节规划，创作详细的章节内容：

小说标题：${novelTitle}
小说简介：${novelDescription}

**当前章节信息：**
章节标题：${chapterTitle}
章节简介：${chapterSummary}
${contextInfo}

题材：${genre}
风格：${style}

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
6. 保持与小说整体风格（${style}）一致
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

  let fullResponse = '';
  let hasError = false;
  let errorMessage = '';
  
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
      fullResponse = content;
      // console.log(`[平行世界API] 第${chapterIndex + 1}章内容更新，当前长度: ${content.length}`);
    },
    onComplete: () => {
      // console.log(`[平行世界API] 第${chapterIndex + 1}章内容生成完成，最终长度: ${fullResponse.length}`);
      // 在完成时检查内容是否为空
      if (!fullResponse || fullResponse.trim().length === 0) {
        hasError = true;
        errorMessage = `第${chapterIndex + 1}章生成失败：AI返回内容为空`;
        console.error(`[平行世界API] ${errorMessage}`);
      }
    },
    onError: (error: Error) => {
      hasError = true;
      console.error(`[平行世界API] 第${chapterIndex + 1}章内容生成失败:`, error);
      // 提供更详细的错误信息
      if (error.message.includes('network')) {
        errorMessage = `第${chapterIndex + 1}章生成失败：网络连接中断。请检查网络连接后重试。`;
      } else if (error.message.includes('timeout')) {
        errorMessage = `第${chapterIndex + 1}章生成失败：请求超时。请稍后重试。`;
      } else {
        errorMessage = `第${chapterIndex + 1}章生成失败：${error.message}`;
      }
    }
  });

  // 检查是否有错误
  if (hasError) {
    throw new Error(errorMessage);
  }

  return fullResponse.trim();
}

/**
 * 为平行世界小说生成单个章节的详细内容并保存
 * @param novelId 小说ID
 * @param chapterNumber 章节号
 */
export async function generateParallelChapterContent(
  novelId: string,
  chapterNumber: number
): Promise<void> {
  // console.log(`[平行世界API] 开始生成章节${chapterNumber}的详细内容`);
  
  try {
    // 1. 获取小说数据
    const { data: novel, error: fetchError } = await supabase
      .from('novels')
      .select('*')
      .eq('id', novelId)
      .maybeSingle();

    if (fetchError || !novel) {
      throw new Error('获取小说数据失败');
    }

    // 2. 获取章节简介
    const simpleContext = novel.simple_context as SimpleContext[] || [];
    const chapterSummary = simpleContext.find(ctx => ctx.chapter_number === chapterNumber);
    
    if (!chapterSummary) {
      throw new Error(`未找到第${chapterNumber}章的简介`);
    }

    // console.log(`[平行世界API] 找到章节简介: ${chapterSummary.title}`);

    // 3. 准备生成章节内容所需的数据
    const allChapterSummaries = simpleContext.map(ctx => ({
      title: ctx.title,
      summary: ctx.summary
    }));

    // 获取前一章的内容
    let previousChapterContent: string | null = null;
    const chaptersData = novel.chapters_data as ChapterData[] || [];
    const prevChapter = chaptersData.find(ch => ch.chapter_number === chapterNumber - 1);
    if (prevChapter && prevChapter.content) {
      previousChapterContent = prevChapter.content;
    }

    const chapterIndex = chapterNumber - 1;

    // 4. 生成章节内容
    // console.log(`[平行世界API] ========== 开始生成第${chapterNumber}章内容 ==========`);
    // console.log(`[平行世界API] 章节标题: ${chapterSummary.title}`);
    // console.log(`[平行世界API] 章节简介: ${chapterSummary.summary.substring(0, 100)}...`);
    
    const chapterContent = await generateChapterContent(
      novel.novel_title,
      novel.novel_content || '',
      chapterSummary.title,
      chapterSummary.summary,
      chapterIndex,
      allChapterSummaries,
      previousChapterContent,
      novel.novel_type || '玄幻',
      '网络小说'
    );

    // console.log(`[平行世界API] ========== 第${chapterNumber}章内容生成完成 ==========`);
    // console.log(`[平行世界API] 最终字数: ${chapterContent.length} 字`);

    // 5. 更新章节数据
    // console.log(`[平行世界API] 开始更新章节数据...`);
    const updatedChapters = [...chaptersData];
    const existingChapterIndex = updatedChapters.findIndex(ch => ch.chapter_number === chapterNumber);
    
    if (existingChapterIndex >= 0) {
      // 更新现有章节
      // console.log(`[平行世界API] 更新现有章节，索引: ${existingChapterIndex}`);
      updatedChapters[existingChapterIndex] = {
        ...updatedChapters[existingChapterIndex],
        content: chapterContent,
        optimized: true,
      };
    } else {
      // 添加新章节
      // console.log(`[平行世界API] 添加新章节`);
      updatedChapters.push({
        chapter_number: chapterNumber,
        title: chapterSummary.title,
        content: chapterContent,
        optimized: true,
      });
    }

    // 按章节号排序
    updatedChapters.sort((a, b) => a.chapter_number - b.chapter_number);

    // 6. 保存到数据库
    // console.log(`[平行世界API] 开始保存到数据库...`);
    const { error: updateError } = await supabase
      .from('novels')
      .update({ chapters_data: updatedChapters })
      .eq('id', novelId);

    if (updateError) {
      throw new Error(`保存章节内容失败: ${updateError.message}`);
    }

    // console.log(`[平行世界API] ========== 第${chapterNumber}章保存成功 ==========`);
    // console.log(`[平行世界API] 当前小说共有 ${updatedChapters.length} 章`);
  } catch (error) {
    console.error(`[平行世界API] ========== 第${chapterNumber}章生成失败 ==========`);
    console.error(`[平行世界API] 错误信息:`, error);
    throw error;
  }
}
