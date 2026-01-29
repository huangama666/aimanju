export interface NovelRequest {
  genre: string;
  style: string;
  plot: string;
  length: 'short' | 'medium' | 'long';
  characters?: string;
  setting?: string;
}

export interface ChapterOutline {
  id: string;
  title: string;
  summary: string; // 章节简介，不少于300字
  order: number;
}

export interface NovelOutline {
  title: string;
  description: string;
  chapters: ChapterOutline[];
}

export interface NovelChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount?: number;
  audioUrl?: string; // 章节音频URL
  createdAt: Date;
}

export interface Novel {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  coverImageUrl?: string;
  chapters: NovelChapter[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterRequest {
  name: string;
  description: string;
  appearance: string;
  personality: string;
  style?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  appearance: string;
  personality: string;
  imageUrl?: string;
  taskId?: string;
  status?: 'generating' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
}

export interface ComicPanel {
  id: string;
  chapterId: string;
  order: number;
  description: string;
  imageUrl?: string;
  taskId?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
}

export interface ImageTask {
  taskId: string;
  status: 'INIT' | 'WAIT' | 'RUNNING' | 'FAILED' | 'SUCCESS';
  progress: number;
  imageUrl?: string;
  error?: string;
}

export interface ProjectVersion {
  id: string;
  name: string;
  description: string;
  novel: Novel;
  characters: Character[];
  comicPanels: ComicPanel[];
  createdAt: Date;
}

// 章节生成状态
export interface ChapterGenerationStatus {
  status: 'pending' | 'generating' | 'success' | 'failed' | 'retrying';
  retryCount: number; // 重试次数
  error?: string; // 错误信息
}