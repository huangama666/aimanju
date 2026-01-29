/**
 * 通用OpenAI兼容接口调用工具
 * 支持任何遵循OpenAI API规范的接口
 */

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenAIStreamOptions {
  /** 消息列表 */
  messages: OpenAIMessage[];
  /** API URL（完整的endpoint地址，如 https://api.openai.com/v1/chat/completions） */
  apiUrl: string;
  /** API Key */
  apiKey: string;
  /** 模型名称（如 gpt-3.5-turbo） */
  model: string;
  /** 流式返回更新回调 */
  onUpdate: (content: string) => void;
  /** 模型调用完成回调 */
  onComplete: () => void;
  /** 模型调用错误回调 */
  onError: (error: Error) => void;
  /** 中断控制 */
  signal?: AbortSignal;
}

/**
 * 调用OpenAI兼容接口
 */
export async function sendOpenAIStream(options: OpenAIStreamOptions): Promise<void> {
  const { messages, apiUrl, apiKey, model, onUpdate, onComplete, onError, signal } = options;

  console.log('🤖 [OpenAIStream] 开始调用OpenAI兼容接口');
  console.log('🤖 [OpenAIStream] API URL:', apiUrl);
  console.log('🤖 [OpenAIStream] Model:', model);
  console.log('🤖 [OpenAIStream] Messages:', messages.length);
  console.log('🤖 [OpenAIStream] API Key前缀:', apiKey ? apiKey.substring(0, 10) + '...' : '未提供');

  try {
    // 调用OpenAI兼容接口
    const requestBody = {
      model: model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    console.log('🤖 [OpenAIStream] 请求体:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: signal
    });

    console.log('🤖 [OpenAIStream] 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🤖 [OpenAIStream] API错误响应:', errorText);
      
      // 尝试解析错误信息
      let errorMessage = `API调用失败: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    // 解析响应
    const data = await response.json();
    console.log('🤖 [OpenAIStream] 收到响应');

    // 提取AI回复内容（OpenAI标准格式）
    let content = '';

    // 格式1: OpenAI标准格式 {choices: [{message: {content: "..."}}]}
    if (data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content;
      console.log('🤖 [OpenAIStream] 使用OpenAI标准格式解析');
    }
    // 格式2: 简单格式 {result: "..."}
    else if (data.result) {
      content = data.result;
      console.log('🤖 [OpenAIStream] 使用简单格式解析');
    }
    // 格式3: 直接返回文本 {content: "..."}
    else if (data.content) {
      content = data.content;
      console.log('🤖 [OpenAIStream] 使用content字段解析');
    }
    // 格式4: 文本字段 {text: "..."}
    else if (data.text) {
      content = data.text;
      console.log('🤖 [OpenAIStream] 使用text字段解析');
    }
    // 格式5: 响应本身就是字符串
    else if (typeof data === 'string') {
      content = data;
      console.log('🤖 [OpenAIStream] 响应本身是字符串');
    }
    else {
      console.error('🤖 [OpenAIStream] 无法识别的响应格式:', data);
      throw new Error('无法识别的响应格式');
    }

    if (!content) {
      console.error('🤖 [OpenAIStream] 响应中没有内容');
      throw new Error('响应中没有内容');
    }

    console.log('🤖 [OpenAIStream] 解析到的内容长度:', content.length);
    console.log('🤖 [OpenAIStream] 内容预览:', content.substring(0, 200));

    // 更新内容
    onUpdate(content);
    onComplete();

  } catch (error) {
    console.error('🤖 [OpenAIStream] 请求失败:', error);
    if (!signal?.aborted) {
      onError(error as Error);
      throw error;
    }
  }
}
