import { ttsService } from './ttsService';
import { AudioCache } from '@/components/novel/AudioPlayer';

// 后台音频生成服务
class BackgroundAudioService {
  private static instance: BackgroundAudioService;
  private generatingQueue = new Set<string>();

  static getInstance(): BackgroundAudioService {
    if (!BackgroundAudioService.instance) {
      BackgroundAudioService.instance = new BackgroundAudioService();
    }
    return BackgroundAudioService.instance;
  }

  // 开始后台生成音频
  async startBackgroundGeneration(chapters: Array<{ id: string; title: string; content: string }>) {
    for (const chapter of chapters) {
      // 如果已经有缓存或正在生成，跳过
      if (AudioCache.has(chapter.id) || AudioCache.isGenerating(chapter.id)) {
        continue;
      }

      // 标记为正在生成
      AudioCache.setGenerating(chapter.id);
      this.generatingQueue.add(chapter.id);

      // 后台生成音频
      this.generateAudioInBackground(chapter.id, chapter.content);
    }
  }

  private async generateAudioInBackground(chapterId: string, content: string) {
    try {
      // 提交语音合成任务
      const taskId = await ttsService.createTTSTask(content);
      
      // 轮询获取结果
      const pollResult = async (): Promise<void> => {
        try {
          const result = await ttsService.queryTTSTask(taskId);
          
          if (result.task_status === 'Success' && result.task_result?.speech_url) {
            // 生成成功，缓存音频URL
            AudioCache.set(chapterId, result.task_result.speech_url);
            this.generatingQueue.delete(chapterId);
          } else if (result.task_status === 'Failure') {
            // 生成失败，停止生成状态
            AudioCache.stopGenerating(chapterId);
            this.generatingQueue.delete(chapterId);
          } else {
            // 继续轮询
            setTimeout(pollResult, 3000);
          }
        } catch (error) {
          // 出错时停止生成状态
          AudioCache.stopGenerating(chapterId);
          this.generatingQueue.delete(chapterId);
        }
      };

      // 开始轮询
      setTimeout(pollResult, 3000);
      
    } catch (error) {
      AudioCache.stopGenerating(chapterId);
      this.generatingQueue.delete(chapterId);
    }
  }

  // 检查是否正在生成
  isGenerating(chapterId: string): boolean {
    return this.generatingQueue.has(chapterId);
  }

  // 清除所有生成任务
  clearAll() {
    this.generatingQueue.clear();
  }
}

export const backgroundAudioService = BackgroundAudioService.getInstance();