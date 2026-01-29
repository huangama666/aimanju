import { sendChatStream } from './ai-chat';

const APP_ID = import.meta.env.VITE_APP_ID;

/**
 * AI 分析结果接口
 */
export interface NovelAnalysisResult {
  plot: string;        // 关键情节
  conflict: string;    // 主要冲突
  development: string; // 发展方向
}

/**
 * 使用 AI 分析小说简介，提取关键情节、冲突和发展方向
 * @param novelDescription 小说简介
 * @param novelTitle 小说标题
 * @param novelType 小说类型
 * @returns Promise<NovelAnalysisResult>
 */
export const analyzeNovelWithAI = async (
  novelDescription: string | null | undefined,
  novelTitle: string,
  novelType: string | null | undefined
): Promise<NovelAnalysisResult> => {
  console.log('========================================');
  console.log('🤖 [AI分析] 开始分析小说内容');
  console.log('📚 小说标题:', novelTitle);
  console.log('📖 小说类型:', novelType);
  console.log('📝 小说简介:', novelDescription);

  return new Promise((resolve, reject) => {
    // 构建 AI 提示词
    const systemPrompt = `你是一位专业的小说分析专家，擅长提取小说的核心要素。请分析用户提供的小说信息，并以JSON格式返回分析结果。

返回格式要求：
{
  "plot": "关键情节描述（100-200字，包含主要故事线和核心事件）",
  "conflict": "主要冲突描述（50-100字，说明故事的核心矛盾）",
  "development": "发展方向描述（50-100字，预测或总结故事的走向）"
}

注意：
1. 只返回JSON格式，不要有其他文字
2. 内容要具体、有针对性
3. 如果信息不足，基于小说类型和标题进行合理推测`;

    const userPrompt = `请分析以下小说：

【小说标题】${novelTitle}
【小说类型】${novelType || '未知'}
【小说简介】${novelDescription || '暂无简介'}

请提取关键情节、主要冲突和发展方向，以JSON格式返回。`;

    let fullContent = '';

    sendChatStream({
      endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
      apiId: APP_ID,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      onUpdate: (content: string) => {
        fullContent = content;
        console.log('🔄 [AI分析] 接收中...', content.length, '字');
      },
      onComplete: () => {
        console.log('✅ [AI分析] 完成');
        console.log('📄 完整内容:', fullContent);

        try {
          // 尝试解析 JSON
          // 移除可能的 markdown 代码块标记
          let jsonStr = fullContent.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
          }

          const result = JSON.parse(jsonStr);

          // 验证结果格式
          if (!result.plot || !result.conflict || !result.development) {
            throw new Error('AI返回的数据格式不完整');
          }

          console.log('✨ [AI分析] 解析成功:');
          console.log('  - 关键情节:', result.plot);
          console.log('  - 主要冲突:', result.conflict);
          console.log('  - 发展方向:', result.development);
          console.log('========================================');

          resolve(result);
        } catch (error) {
          console.error('❌ [AI分析] JSON解析失败:', error);
          console.error('原始内容:', fullContent);

          // 如果解析失败，返回一个基于原文的简单分析
          const fallbackResult: NovelAnalysisResult = {
            plot: novelDescription || `这是一部${novelType || ''}类型的小说《${novelTitle}》，讲述了一个精彩的故事。`,
            conflict: '主角面临重重挑战，需要克服困难实现目标。',
            development: '故事将围绕主角的成长和冒险展开，最终走向高潮。'
          };

          console.log('⚠️ [AI分析] 使用备用分析结果');
          console.log('========================================');
          resolve(fallbackResult);
        }
      },
      onError: (error: Error) => {
        console.error('❌ [AI分析] 调用失败:', error);
        console.log('========================================');

        // 返回一个基于原文的简单分析
        const fallbackResult: NovelAnalysisResult = {
          plot: novelDescription || `这是一部${novelType || ''}类型的小说《${novelTitle}》，讲述了一个精彩的故事。`,
          conflict: '主角面临重重挑战，需要克服困难实现目标。',
          development: '故事将围绕主角的成长和冒险展开，最终走向高潮。'
        };

        console.log('⚠️ [AI分析] 使用备用分析结果');
        resolve(fallbackResult);
      }
    });
  });
};
