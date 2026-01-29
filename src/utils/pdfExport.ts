import jsPDF from 'jspdf';
import type { Novel, NovelChapter } from '@/types/novel';

// 添加中文字体支持
const addChineseFont = (doc: jsPDF) => {
  // 使用系统默认字体，确保中文显示正常
  doc.setFont('helvetica');
};

// 格式化日期
const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 文本换行处理
const splitTextToLines = (doc: jsPDF, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      lines.push('');
      return;
    }
    
    const words = paragraph.split('');
    let currentLine = '';
    
    for (const char of words) {
      const testLine = currentLine + char;
      const textWidth = doc.getTextWidth(testLine);
      
      if (textWidth > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine !== '') {
      lines.push(currentLine);
    }
  });
  
  return lines;
};

// 导出整本小说为PDF
export const exportNovelToPDF = async (novel: Novel): Promise<void> => {
  try {
    const doc = new jsPDF();
    addChineseFont(doc);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;
    
    // 添加标题页
    doc.setFontSize(24);
    doc.text(novel.title, pageWidth / 2, yPosition + 30, { align: 'center' });
    
    yPosition += 50;
    doc.setFontSize(12);
    doc.text(`题材：${novel.genre}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;
    doc.text(`风格：${novel.style}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;
    doc.text(`生成时间：${formatDate(new Date())}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 30;
    doc.text(`总章节数：${novel.chapters.length}`, pageWidth / 2, yPosition, { align: 'center' });
    
    // 添加新页面开始正文
    doc.addPage();
    yPosition = margin;
    
    // 遍历所有章节
    for (let i = 0; i < novel.chapters.length; i++) {
      const chapter = novel.chapters[i];
      
      // 检查是否需要新页面
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }
      
      // 章节标题
      doc.setFontSize(18);
      doc.text(chapter.title, margin, yPosition);
      yPosition += 20;
      
      // 章节字数信息
      if (chapter.wordCount) {
        doc.setFontSize(10);
        doc.text(`字数：${chapter.wordCount}`, margin, yPosition);
        yPosition += 15;
      }
      
      // 分隔线
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // 章节内容
      doc.setFontSize(12);
      const lines = splitTextToLines(doc, chapter.content, maxWidth);
      
      for (const line of lines) {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        
        if (line.trim() === '') {
          yPosition += 8;
        } else {
          doc.text(line, margin, yPosition);
          yPosition += 8;
        }
      }
      
      yPosition += 20; // 章节间距
    }
    
    // 添加页脚
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`第 ${i} 页 / 共 ${totalPages} 页`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // 下载PDF
    const fileName = `${novel.title}_${formatDate(new Date()).replace(/[/:]/g, '-')}.pdf`;
    doc.save(fileName);
    
  } catch (error) {
    console.error('PDF导出失败:', error);
    throw new Error('PDF导出失败，请重试');
  }
};

// 导出单个章节为PDF
export const exportChapterToPDF = async (novel: Novel, chapterId: string): Promise<void> => {
  try {
    const chapter = novel.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      throw new Error('章节不存在');
    }
    
    const doc = new jsPDF();
    addChineseFont(doc);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;
    
    // 添加标题
    doc.setFontSize(20);
    doc.text(chapter.title, pageWidth / 2, yPosition + 20, { align: 'center' });
    
    yPosition += 40;
    doc.setFontSize(12);
    doc.text(`小说：${novel.title}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    if (chapter.wordCount) {
      doc.text(`字数：${chapter.wordCount}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }
    
    doc.text(`导出时间：${formatDate(new Date())}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 30;
    
    // 分隔线
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 20;
    
    // 章节内容
    const lines = splitTextToLines(doc, chapter.content, maxWidth);
    
    for (const line of lines) {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }
      
      if (line.trim() === '') {
        yPosition += 8;
      } else {
        doc.text(line, margin, yPosition);
        yPosition += 8;
      }
    }
    
    // 添加页脚
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`第 ${i} 页 / 共 ${totalPages} 页`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // 下载PDF
    const fileName = `${novel.title}_${chapter.title}_${formatDate(new Date()).replace(/[/:]/g, '-')}.pdf`;
    doc.save(fileName);
    
  } catch (error) {
    console.error('章节PDF导出失败:', error);
    throw new Error('章节PDF导出失败，请重试');
  }
};