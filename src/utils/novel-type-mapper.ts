// 小说题材映射表
export const NOVEL_GENRE_MAP: Record<string, string> = {
  fantasy: '玄幻',
  urban: '都市',
  historical: '历史',
  romance: '言情',
  scifi: '科幻',
  martial: '武侠',
  mystery: '悬疑',
  adventure: '冒险',
};

/**
 * 将小说题材英文值转换为中文显示
 * @param genreValue 英文题材值
 * @returns 中文题材名称，如果未找到则返回"暂无"
 */
export function getNovelGenreLabel(genreValue: string | null | undefined): string {
  if (!genreValue) {
    return '暂无';
  }
  return NOVEL_GENRE_MAP[genreValue] || '暂无';
}
