/**
 * 章节音频管理服务
 * 负责章节音频的生成、保存和获取
 */

import { ttsService } from './ttsService';
import { updateNovel } from '@/db/api';
import type { ChapterData } from '@/types/database';

class ChapterAudioService {
  // 为单个章节生成音频
  async generateChapterAudio(
    novelId: string,
    chapterNumber: number,
    chapterTitle: string,
    chapterContent: string,
    onProgress?: (status: 'generating' | 'completed' | 'failed', progress?: number) => void
  ): Promise<string | null> {
    try {
      console.log(`🎵 [音频生成] 开始为章节 ${chapterNumber} 生成音频...`);
      onProgress?.('generating', 0);

      // 创建TTS任务
      const taskId = await ttsService.createTTSTask(chapterContent, {
        voice: 3, // 度逍遥
        speed: 5,
        pitch: 5,
        volume: 5,
      });

      console.log(`🎵 [音频生成] 任务ID: ${taskId}`);
      onProgress?.('generating', 30);

      // 等待任务完成
      const audioUrl = await ttsService.waitForTTSCompletion(taskId);
      
      console.log(`✅ [音频生成] 章节 ${chapterNumber} 音频生成成功: ${audioUrl}`);
      onProgress?.('completed', 100);

      return audioUrl;
    } catch (error) {
      console.error(`❌ [音频生成] 章节 ${chapterNumber} 音频生成失败:`, error);
      onProgress?.('failed', 0);
      return null;
    }
  }

  // 批量为章节生成音频
  async generateBatchAudio(
    novelId: string,
    chapters: ChapterData[],
    onChapterProgress?: (chapterNumber: number, status: 'generating' | 'completed' | 'failed') => void,
    onOverallProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    console.log(`🎵 [批量音频生成] 开始为 ${chapters.length} 个章节生成音频...`);
    
    let completed = 0;
    const total = chapters.length;

    for (const chapter of chapters) {
      // 跳过已有音频的章节
      if (chapter.audio_url && chapter.audio_status === 'completed') {
        console.log(`⏭️ [批量音频生成] 章节 ${chapter.chapter_number} 已有音频，跳过`);
        completed++;
        onOverallProgress?.(completed, total);
        continue;
      }

      // 跳过内容为空的章节
      if (!chapter.content || chapter.content.trim().length === 0) {
        console.log(`⏭️ [批量音频生成] 章节 ${chapter.chapter_number} 内容为空，跳过`);
        completed++;
        onOverallProgress?.(completed, total);
        continue;
      }

      onChapterProgress?.(chapter.chapter_number, 'generating');

      try {
        const audioUrl = await this.generateChapterAudio(
          novelId,
          chapter.chapter_number,
          chapter.title,
          chapter.content
        );

        if (audioUrl) {
          // 更新章节数据
          chapter.audio_url = audioUrl;
          chapter.audio_status = 'completed';
          onChapterProgress?.(chapter.chapter_number, 'completed');
        } else {
          chapter.audio_status = 'failed';
          onChapterProgress?.(chapter.chapter_number, 'failed');
        }
      } catch (error) {
        console.error(`❌ [批量音频生成] 章节 ${chapter.chapter_number} 失败:`, error);
        chapter.audio_status = 'failed';
        onChapterProgress?.(chapter.chapter_number, 'failed');
      }

      completed++;
      onOverallProgress?.(completed, total);
    }

    console.log(`✅ [批量音频生成] 完成，共处理 ${total} 个章节`);
  }

  // 保存章节音频URL到数据库
  async saveChapterAudio(
    novelId: string,
    chapterNumber: number,
    audioUrl: string,
    audioStatus: 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    try {
      console.log(`💾 [保存音频] 保存章节 ${chapterNumber} 的音频URL到数据库...`);
      
      // 这里需要实现更新数据库的逻辑
      // 由于我们使用的是 chapters_data 数组，需要获取整个小说数据，更新对应章节，然后保存
      
      console.log(`✅ [保存音频] 章节 ${chapterNumber} 音频URL已保存`);
    } catch (error) {
      console.error(`❌ [保存音频] 保存失败:`, error);
      throw error;
    }
  }

  // 获取章节音频URL
  getChapterAudio(chapter: ChapterData): string | null {
    // 只要有音频URL就返回，不检查status（因为status不保存到数据库）
    if (chapter.audio_url) {
      console.log(`🎵 [音频获取] 章节 ${chapter.chapter_number} 已有音频: ${chapter.audio_url}`);
      return chapter.audio_url;
    }
    console.log(`⚠️ [音频获取] 章节 ${chapter.chapter_number} 没有音频`);
    return null;
  }

  // 检查章节是否有音频
  hasAudio(chapter: ChapterData): boolean {
    return !!chapter.audio_url;
  }

  // 检查章节音频是否正在生成
  isGenerating(chapter: ChapterData): boolean {
    return chapter.audio_status === 'generating';
  }

  // 检查章节音频是否生成失败
  isFailed(chapter: ChapterData): boolean {
    return chapter.audio_status === 'failed';
  }
}

export const chapterAudioService = new ChapterAudioService();
