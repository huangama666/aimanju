/**
 * AI服务工具类
 * 提供文本生成和优化功能
 */

const APP_ID = import.meta.env.VITE_APP_ID;
const API_ENDPOINT = 'https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-2bk93oeO9NlE/v2/chat/completions';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 调用AI生成文本（非流式）
 */
export async function generateText(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
      },
      body: JSON.stringify({
        messages,
        enable_thinking: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [AI服务] API调用失败:', errorData);
      throw new Error(errorData.error?.message || '生成失败');
    }

    // 读取流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder('utf-8');
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // 处理SSE格式的数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一行不完整的数据

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              fullContent += parsed.choices[0].delta.content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error('❌ [AI服务] 生成失败:', error);
    throw error;
  }
}

/**
 * 随机生成小说情节
 */
export interface PlotGenerationResult {
  plot: string;
  characters: string;
  setting: string;
}

export async function generatePlot(genre: string, style: string): Promise<PlotGenerationResult> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一位专业的小说创作助手，擅长构思各种类型的小说情节。请严格按照JSON格式返回结果。',
    },
    {
      role: 'user',
      content: `请为一部${genre}题材、${style}风格的小说随机生成完整的创作要素。

要求：
1. 情节要有吸引力和创新性，冲突要激烈且合理，发展方向要清晰且有悬念
2. 主要角色要包含主角和关键配角的简要描述（姓名、身份、性格特点）
3. 背景设定要描述故事发生的时代、地点、世界观等核心设定
4. 情节字数控制在200字左右，角色和背景各100字左右

请严格按照以下JSON格式返回，不要有任何其他文字：
{
  "plot": "情节内容",
  "characters": "主要角色描述",
  "setting": "背景设定描述"
}`,
    },
  ];

  const responseText = await generateText(messages);
  
  try {
    // 尝试解析JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        plot: result.plot || '',
        characters: result.characters || '',
        setting: result.setting || '',
      };
    }
  } catch (error) {
    console.error('❌ [随机生成] JSON解析失败，使用原始文本:', error);
  }
  
  // 如果解析失败，返回原始文本作为情节
  return {
    plot: responseText,
    characters: '',
    setting: '',
  };
}

/**
 * 优化小说情节描述
 */
export async function optimizePlot(originalPlot: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一位资深小说家，擅长优化和润色小说情节描述。',
    },
    {
      role: 'user',
      content: `请以专业小说家的角度优化以下小说情节描述，使其更具文学性、吸引力和逻辑性：

${originalPlot}

要求：
1. 保持原有核心情节不变
2. 增强语言表达的文学性
3. 优化情节的逻辑性和连贯性
4. 增加细节描写和悬念设置
5. 字数控制在250字左右
6. 直接输出优化后的内容，不要有任何前缀说明`,
    },
  ];

  return await generateText(messages);
}

/**
 * 从章节内容中提取角色信息
 */
export interface ExtractedCharacter {
  name: string;
  appearance: string;
  personality: string;
  background: string;
}

export async function extractCharactersFromChapter(chapterContent: string): Promise<ExtractedCharacter[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一位专业的小说分析助手，擅长从小说内容中提取角色信息。请严格按照JSON格式返回结果。',
    },
    {
      role: 'user',
      content: `请从以下小说章节内容中提取所有出现的角色信息：

${chapterContent}

要求：
1. 提取所有在章节中出现的角色（包括主角、配角）
2. 对每个角色提供：姓名、外貌描述、性格特征、背景描述
3. 外貌描述要详细具体（身高、发色、眼色、服装、特征等）
4. 性格特征要准确（勇敢、冷静、温柔、狡猾等）
5. 背景描述要简洁（身份、来历、关系等）
6. 每项描述控制在50-100字

请严格按照以下JSON格式返回，不要有任何其他文字：
[
  {
    "name": "角色姓名",
    "appearance": "外貌描述",
    "personality": "性格特征",
    "background": "背景描述"
  }
]`,
    },
  ];

  const responseText = await generateText(messages);
  
  try {
    // 尝试解析JSON
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return result;
    }
  } catch (error) {
    console.error('❌ [角色提取] JSON解析失败:', error);
  }
  
  // 如果解析失败，返回空数组
  console.warn('⚠️ [角色提取] 解析失败，返回空数组');
  return [];
}
