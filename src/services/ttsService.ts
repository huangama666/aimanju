import axios from 'axios';

const APP_ID = import.meta.env.VITE_APP_ID;

// 语音合成任务状态
export type TTSTaskStatus = 'Running' | 'Success' | 'Failure';

// 语音合成请求参数
export interface TTSRequest {
  text: string[];
  format?: 'mp3-16k' | 'mp3-48k' | 'wav';
  voice?: number; // 0=度小美, 1=度小宇, 3=度逍遥, 4=度丫丫
  speed?: number; // 0-15, 默认5
  pitch?: number; // 0-15, 默认5
  volume?: number; // 0-15, 默认5
  break?: number; // 0-5000ms, 段落间隔
}

// 语音合成响应
export interface TTSResponse {
  status: number;
  msg: string;
  data: {
    log_id: number;
    task_id: string;
    task_status: TTSTaskStatus;
  };
}

// 查询任务响应
export interface TTSQueryResponse {
  status: number;
  msg: string;
  data: {
    log_id: number;
    tasks_info: Array<{
      task_id: string;
      task_status: TTSTaskStatus;
      task_result?: {
        speech_url: string;
        speech_timestamp?: {
          sentences: Array<{
            paragraph_index: number;
            sentence_texts: string;
            begin_time: number;
            end_time: number;
            characters: Array<{
              character_text: string;
              begin_time: number;
              end_time: number;
            }>;
          }>;
        };
      };
      err_no?: number;
      err_msg?: string;
      sn?: string;
    }>;
    error_info: string[];
  };
}

class TTSService {
  private baseURL = '/api/miaoda/runtime/apicenter/source/proxy';

  // 创建语音合成任务
  async createTTSTask(text: string, options: Partial<TTSRequest> = {}): Promise<string> {
    try {
      // 将长文本分段，每段不超过1000字符
      const textSegments = this.splitText(text, 1000);
      
      const requestData: TTSRequest = {
        text: textSegments,
        format: options.format || 'mp3-16k',
        voice: options.voice || 3, // 默认使用度逍遥
        speed: options.speed || 5,
        pitch: options.pitch || 5,
        volume: options.volume || 5,
        break: options.break || 1000, // 段落间隔1秒
        ...options
      };

      const response = await axios.post<TTSResponse>(
        `${this.baseURL}/ttslongnY1YrenyAFtHN3S38sQFYZ`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Id': APP_ID,
          },
        }
      );

      if (response.data.status !== 0) {
        throw new Error(response.data.msg || '语音合成任务创建失败');
      }

      return response.data.data.task_id;
    } catch (error) {
      console.error('创建TTS任务失败:', error);
      if (axios.isAxiosError(error) && error.response?.data?.status === 999) {
        throw new Error(error.response.data.msg || '语音合成服务暂时不可用');
      }
      throw new Error('语音合成任务创建失败，请重试');
    }
  }

  // 查询语音合成任务状态
  async queryTTSTask(taskId: string): Promise<TTSQueryResponse['data']['tasks_info'][0]> {
    try {
      const response = await axios.post<TTSQueryResponse>(
        `${this.baseURL}/ttsqueryu4r6kyb4kbPKv3ECNYA`,
        {
          task_ids: [taskId]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Id': APP_ID,
          },
        }
      );

      if (response.data.status !== 0) {
        throw new Error(response.data.msg || '查询语音合成任务失败');
      }

      const taskInfo = response.data.data.tasks_info[0];
      if (!taskInfo) {
        throw new Error('任务不存在');
      }

      return taskInfo;
    } catch (error) {
      console.error('查询TTS任务失败:', error);
      if (axios.isAxiosError(error) && error.response?.data?.status === 999) {
        throw new Error(error.response.data.msg || '语音合成服务暂时不可用');
      }
      throw new Error('查询语音合成任务失败，请重试');
    }
  }

  // 轮询查询任务直到完成 - 等待最多10分钟
  async waitForTTSCompletion(taskId: string, maxAttempts: number = 200): Promise<string> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const taskInfo = await this.queryTTSTask(taskId);
        
        if (taskInfo.task_status === 'Success') {
          if (taskInfo.task_result?.speech_url) {
            return taskInfo.task_result.speech_url;
          } else {
            throw new Error('语音文件生成失败');
          }
        } else if (taskInfo.task_status === 'Failure') {
          throw new Error(taskInfo.err_msg || '语音合成失败');
        }
        
        // 任务还在运行中，等待3秒后重试
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }
    }
    
    throw new Error('语音合成超时（超过10分钟），请重试');
  }

  // 将长文本分段
  private splitText(text: string, maxLength: number): string[] {
    const segments: string[] = [];
    let currentSegment = '';
    
    // 按句号、问号、感叹号分割
    const sentences = text.split(/([。！？])/);
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      
      if (currentSegment.length + sentence.length <= maxLength) {
        currentSegment += sentence;
      } else {
        if (currentSegment) {
          segments.push(currentSegment.trim());
        }
        currentSegment = sentence;
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment.trim());
    }
    
    return segments.filter(segment => segment.length > 0);
  }

  // 完整的语音合成流程
  async synthesizeText(text: string, options: Partial<TTSRequest> = {}): Promise<string> {
    // 创建任务
    const taskId = await this.createTTSTask(text, options);
    
    // 等待完成并返回音频URL
    return await this.waitForTTSCompletion(taskId);
  }
}

export const ttsService = new TTSService();