/**
 * 小说二创辅助工具
 * 用于分析小说简介并提取关键信息
 */

/**
 * 分析小说简介，提取主要情节、冲突和发展方向
 * @param description 小说简介
 * @returns 格式化后的关键情节描述
 */
export function analyzeNovelDescription(description: string | null): string {
  if (!description || description.trim() === '') {
    return '请描述小说的主要情节、冲突和发展方向...';
  }

  // 简单的文本分析和格式化
  // 将简介内容整理成结构化的格式
  const lines = description.split(/[。！？\n]+/).filter(line => line.trim());
  
  if (lines.length === 0) {
    return description;
  }

  // 构建格式化的关键情节描述
  let formattedPlot = '';
  
  // 主要情节（取前面的内容）
  if (lines.length >= 1) {
    formattedPlot += `【主要情节】\n${lines.slice(0, Math.ceil(lines.length / 3)).join('。')}\n\n`;
  }
  
  // 冲突（取中间的内容）
  if (lines.length >= 2) {
    const conflictStart = Math.ceil(lines.length / 3);
    const conflictEnd = Math.ceil(lines.length * 2 / 3);
    if (conflictStart < lines.length) {
      formattedPlot += `【核心冲突】\n${lines.slice(conflictStart, conflictEnd).join('。')}\n\n`;
    }
  }
  
  // 发展方向（取后面的内容）
  if (lines.length >= 3) {
    const developmentStart = Math.ceil(lines.length * 2 / 3);
    if (developmentStart < lines.length) {
      formattedPlot += `【发展方向】\n${lines.slice(developmentStart).join('。')}`;
    }
  }
  
  // 如果内容太短，直接返回原文
  if (formattedPlot.trim() === '') {
    return `【故事梗概】\n${description}`;
  }
  
  return formattedPlot;
}

/**
 * 将数据库中的小说类型转换为表单中的题材类型
 * @param novelType 数据库中的小说类型
 * @returns 表单中的题材类型
 */
export function mapNovelTypeToGenre(novelType: string | null): string {
  if (!novelType) return '';
  
  // 映射关系
  const typeMap: Record<string, string> = {
    'fantasy': 'fantasy',      // 玄幻
    'urban': 'urban',          // 都市
    'historical': 'historical', // 历史
    'romance': 'romance',      // 言情
    'scifi': 'scifi',          // 科幻
    'martial': 'martial',      // 武侠
    'mystery': 'mystery',      // 悬疑
    'adventure': 'adventure',  // 冒险
  };
  
  return typeMap[novelType.toLowerCase()] || '';
}
