import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileText, Loader2 } from 'lucide-react';
import { exportNovelToPDF } from '@/utils/pdf-export';
import { toast } from 'sonner';
import type { DbNovel } from '@/types/database';

interface NovelExportButtonProps {
  novel: DbNovel;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * 小说导出按钮组件
 * 支持选择性导出小说的各个部分
 */
export default function NovelExportButton({ novel, variant = 'outline', size = 'sm' }: NovelExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    content: true,
    chapters: true,
    characters: true,
    panels: true,
    scripts: true,
    filming: true,
  });

  const handleExport = async () => {
    try {
      setExporting(true);

      // 根据选项准备导出数据
      const exportData: any = {
        novel_title: novel.novel_title,
        novel_type: novel.novel_type,
      };

      if (exportOptions.content) {
        exportData.novel_content = novel.novel_content;
      }

      if (exportOptions.chapters) {
        exportData.chapters_data = novel.chapters_data;
      }

      if (exportOptions.characters) {
        exportData.characters_data = novel.characters_data;
      }

      if (exportOptions.panels) {
        exportData.panels_data = novel.panels_data;
      }

      if (exportOptions.scripts) {
        exportData.scripts_data = novel.scripts_data;
      }

      if (exportOptions.filming) {
        exportData.costume_data = novel.costume_data;
        exportData.makeup_data = novel.makeup_data;
        exportData.props_data = novel.props_data;
        exportData.scene_data = novel.scene_data;
        exportData.overall_analysis_data = novel.overall_analysis_data;
      }

      // 导出PDF
      await exportNovelToPDF(exportData);

      toast.success('导出成功', {
        description: `《${novel.novel_title}》已成功导出为PDF文件`,
      });

      setOpen(false);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败', {
        description: '导出PDF时发生错误，请稍后重试',
      });
    } finally {
      setExporting(false);
    }
  };

  const toggleOption = (option: keyof typeof exportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  // 检查是否有可导出的内容
  const hasContent = novel.novel_content;
  const hasChapters = novel.chapters_data && Array.isArray(novel.chapters_data) && novel.chapters_data.length > 0;
  const hasCharacters = novel.characters_data && Array.isArray(novel.characters_data) && novel.characters_data.length > 0;
  const hasPanels = novel.panels_data && Array.isArray(novel.panels_data) && novel.panels_data.length > 0;
  const hasScripts = novel.scripts_data && Array.isArray(novel.scripts_data) && novel.scripts_data.length > 0;
  const hasFilming = novel.costume_data || novel.makeup_data || novel.props_data || novel.scene_data || novel.overall_analysis_data;

  const hasAnyContent = hasContent || hasChapters || hasCharacters || hasPanels || hasScripts || hasFilming;

  if (!hasAnyContent) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          导出PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#FF5724]" />
            导出作品
          </DialogTitle>
          <DialogDescription>
            选择要导出的内容，将生成包含所选内容的PDF文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {hasContent && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="content"
                  checked={exportOptions.content}
                  onCheckedChange={() => toggleOption('content')}
                />
                <Label
                  htmlFor="content"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  小说内容
                </Label>
              </div>
            )}

            {hasChapters && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chapters"
                  checked={exportOptions.chapters}
                  onCheckedChange={() => toggleOption('chapters')}
                />
                <Label
                  htmlFor="chapters"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  章节详情 ({novel.chapters_data?.length || 0}章)
                </Label>
              </div>
            )}

            {hasCharacters && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="characters"
                  checked={exportOptions.characters}
                  onCheckedChange={() => toggleOption('characters')}
                />
                <Label
                  htmlFor="characters"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  角色信息 ({novel.characters_data?.length || 0}个角色)
                </Label>
              </div>
            )}

            {hasPanels && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="panels"
                  checked={exportOptions.panels}
                  onCheckedChange={() => toggleOption('panels')}
                />
                <Label
                  htmlFor="panels"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  分镜图文 ({novel.panels_data?.length || 0}个分镜)
                </Label>
              </div>
            )}

            {hasScripts && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="scripts"
                  checked={exportOptions.scripts}
                  onCheckedChange={() => toggleOption('scripts')}
                />
                <Label
                  htmlFor="scripts"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  剧本内容 ({novel.scripts_data?.length || 0}个场景)
                </Label>
              </div>
            )}

            {hasFilming && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filming"
                  checked={exportOptions.filming}
                  onCheckedChange={() => toggleOption('filming')}
                />
                <Label
                  htmlFor="filming"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  拍戏分析（服装/化妆/道具/场景）
                </Label>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 提示：导出的PDF文件将包含所选的所有内容，方便您保存和分享作品
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exporting}
          >
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || !Object.values(exportOptions).some(v => v)}
            className="bg-[#FF5724] hover:bg-[#FF5724]/90"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                确认导出
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
