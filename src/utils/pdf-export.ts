import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * PDF导出工具类
 * 使用html2canvas + jsPDF生成PDF，完美支持中文显示
 * 
 * 注意：为了确保中文正常显示，我们将HTML内容渲染为图片后嵌入PDF
 */

interface NovelExportData {
  novel_title: string;
  novel_content: string;
  novel_type?: string;
  chapters_data?: any;
  characters_data?: any;
  panels_data?: any;
  scripts_data?: any;
  costume_data?: any;
  makeup_data?: any;
  props_data?: any;
  scene_data?: any;
  overall_analysis_data?: any;
}

/**
 * HTML转义函数
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

/**
 * 创建HTML内容
 */
function createHTMLContent(novel: NovelExportData): string {
  let html = `
    <div style="font-family: 'Microsoft YaHei', 'SimSun', 'Arial', sans-serif; padding: 40px; background: white; color: #333; line-height: 1.8;">
      <!-- 封面 -->
      <div style="text-align: center; padding: 100px 0; page-break-after: always;">
        <h1 style="font-size: 48px; margin-bottom: 20px; color: #1a1a1a; font-weight: bold;">
          ${escapeHtml(novel.novel_title || '未命名作品')}
        </h1>
        ${novel.novel_type ? `<p style="font-size: 24px; color: #666; margin-top: 20px;">类型：${escapeHtml(novel.novel_type)}</p>` : ''}
        <p style="font-size: 18px; color: #999; margin-top: 40px;">
          导出时间：${new Date().toLocaleString('zh-CN')}
        </p>
      </div>

      <!-- 小说内容 -->
      <div style="page-break-after: always;">
        <h2 style="font-size: 32px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 3px solid #FF5724; padding-bottom: 10px;">
          小说内容
        </h2>
        <div style="font-size: 16px; text-align: justify; white-space: pre-wrap; word-wrap: break-word;">
          ${escapeHtml(novel.novel_content)}
        </div>
      </div>
  `;

  // 添加章节
  if (novel.chapters_data && Array.isArray(novel.chapters_data) && novel.chapters_data.length > 0) {
    html += `
      <div style="page-break-before: always;">
        <h2 style="font-size: 32px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 3px solid #FF5724; padding-bottom: 10px;">
          章节详情
        </h2>
    `;
    
    novel.chapters_data.forEach((chapter: any, index: number) => {
      html += `
        <div style="margin-bottom: 40px; ${index > 0 ? 'page-break-before: always;' : ''}">
          <h3 style="font-size: 24px; margin-bottom: 15px; color: #333;">
            ${escapeHtml(chapter.title || `第${index + 1}章`)}
          </h3>
          <div style="font-size: 16px; text-align: justify; white-space: pre-wrap; word-wrap: break-word;">
            ${escapeHtml(chapter.content || '')}
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // 添加角色信息
  if (novel.characters_data && Array.isArray(novel.characters_data) && novel.characters_data.length > 0) {
    html += `
      <div style="page-break-before: always;">
        <h2 style="font-size: 32px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 3px solid #FF5724; padding-bottom: 10px;">
          角色信息
        </h2>
    `;
    
    novel.characters_data.forEach((character: any) => {
      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3 style="font-size: 20px; margin-bottom: 10px; color: #FF5724;">
            ${escapeHtml(character.name || '未命名角色')}
          </h3>
          ${character.description ? `
            <p style="margin: 10px 0;"><strong>描述：</strong>${escapeHtml(character.description)}</p>
          ` : ''}
          ${character.personality ? `
            <p style="margin: 10px 0;"><strong>性格：</strong>${escapeHtml(character.personality)}</p>
          ` : ''}
          ${character.imageUrl ? `
            <p style="margin: 10px 0; color: #666;"><strong>角色图片：</strong>${character.imageUrl}</p>
          ` : ''}
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // 添加分镜图文
  if (novel.panels_data && Array.isArray(novel.panels_data) && novel.panels_data.length > 0) {
    html += `
      <div style="page-break-before: always;">
        <h2 style="font-size: 32px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 3px solid #FF5724; padding-bottom: 10px;">
          分镜图文
        </h2>
    `;
    
    novel.panels_data.forEach((panel: any, index: number) => {
      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3 style="font-size: 18px; margin-bottom: 10px; color: #FF5724;">
            分镜 ${index + 1}
          </h3>
          ${panel.description ? `
            <p style="margin: 10px 0;"><strong>场景描述：</strong>${escapeHtml(panel.description)}</p>
          ` : ''}
          ${panel.dialogue ? `
            <p style="margin: 10px 0;"><strong>对话：</strong>${escapeHtml(panel.dialogue)}</p>
          ` : ''}
          ${panel.imageUrl ? `
            <p style="margin: 10px 0; color: #666;"><strong>分镜图片：</strong>${panel.imageUrl}</p>
          ` : ''}
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // 添加剧本
  if (novel.scripts_data && Array.isArray(novel.scripts_data) && novel.scripts_data.length > 0) {
    html += `
      <div style="page-break-before: always;">
        <h2 style="font-size: 32px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 3px solid #FF5724; padding-bottom: 10px;">
          剧本内容
        </h2>
    `;
    
    novel.scripts_data.forEach((script: any, index: number) => {
      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3 style="font-size: 18px; margin-bottom: 10px; color: #FF5724;">
            场景 ${index + 1}${script.scene ? `: ${escapeHtml(script.scene)}` : ''}
          </h3>
          ${script.content ? `
            <div style="margin: 10px 0; white-space: pre-wrap; word-wrap: break-word;">
              ${escapeHtml(script.content)}
            </div>
          ` : ''}
          ${script.characters && Array.isArray(script.characters) && script.characters.length > 0 ? `
            <p style="margin: 10px 0;"><strong>角色：</strong>${script.characters.map((c: string) => escapeHtml(c)).join('、')}</p>
          ` : ''}
        </div>
      `;
    });
    
    html += `</div>`;
  }

  // 添加拍戏分析
  const analysisData = [
    { key: 'costume_data', title: '服装设计' },
    { key: 'makeup_data', title: '化妆设计' },
    { key: 'props_data', title: '道具设计' },
    { key: 'scene_data', title: '场景设计' },
  ];

  analysisData.forEach(({ key, title }) => {
    const data = (novel as any)[key];
    if (data && (data.analysis || (data.items && data.items.length > 0))) {
      html += `
        <div style="page-break-before: always;">
          <h2 style="font-size: 32px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 3px solid #FF5724; padding-bottom: 10px;">
            ${title}
          </h2>
          ${data.analysis ? `
            <div style="margin-bottom: 20px; padding: 15px; background: #f0f8ff; border-left: 4px solid #FF5724;">
              <strong>分析：</strong>${escapeHtml(data.analysis)}
            </div>
          ` : ''}
          ${data.items && Array.isArray(data.items) && data.items.length > 0 ? `
            <div>
              ${data.items.map((item: any) => `
                <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                  <h3 style="font-size: 18px; margin-bottom: 10px; color: #FF5724;">
                    ${escapeHtml(item.name || '未命名')}
                  </h3>
                  ${item.description ? `
                    <p style="margin: 5px 0;">${escapeHtml(item.description)}</p>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }
  });

  // 添加整体分析
  if (novel.overall_analysis_data) {
    html += `
      <div style="page-break-before: always;">
        <h2 style="font-size: 32px; margin-bottom: 20px; color: #1a1a1a; border-bottom: 3px solid #FF5724; padding-bottom: 10px;">
          整体分析
        </h2>
        <div style="font-size: 16px; text-align: justify; white-space: pre-wrap; word-wrap: break-word; padding: 20px; background: #f0f8ff; border-left: 4px solid #FF5724;">
          ${escapeHtml(novel.overall_analysis_data)}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

/**
 * 导出单个小说为PDF
 */
export async function exportNovelToPDF(novel: NovelExportData): Promise<void> {
  try {
    // 创建临时容器
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4宽度
    container.style.background = 'white';
    document.body.appendChild(container);

    // 生成HTML内容
    container.innerHTML = createHTMLContent(novel);

    // 等待渲染完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 使用html2canvas转换为图片
    const canvas = await html2canvas(container, {
      scale: 2, // 提高清晰度
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });

    // 移除临时容器
    document.body.removeChild(container);

    // 创建PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 计算图片尺寸
    const imgWidth = 210; // A4宽度（mm）
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4高度（mm）

    let heightLeft = imgHeight;
    let position = 0;

    // 将canvas转换为图片
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // 添加第一页
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 如果内容超过一页，添加更多页
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 下载PDF
    const fileName = `${novel.novel_title || '未命名作品'}_导出.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('导出PDF失败:', error);
    throw new Error('导出PDF时发生错误，请稍后重试');
  }
}

/**
 * 批量导出多个小说为PDF
 */
export async function exportMultipleNovelsToPDF(
  novels: NovelExportData[]
): Promise<void> {
  for (const novel of novels) {
    await exportNovelToPDF(novel);
    // 添加延迟避免浏览器阻止多个下载
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
