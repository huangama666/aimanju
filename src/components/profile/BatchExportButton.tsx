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
import { Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { exportMultipleNovelsToPDF } from '@/utils/pdf-export';
import { toast } from 'sonner';
import type { DbNovel } from '@/types/database';
import { Progress } from '@/components/ui/progress';

interface BatchExportButtonProps {
  novels: DbNovel[];
}

/**
 * 批量导出按钮组件
 * 支持一次性导出多个小说作品
 */
export default function BatchExportButton({ novels }: BatchExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentNovel, setCurrentNovel] = useState('');

  const handleBatchExport = async () => {
    try {
      setExporting(true);
      setProgress(0);

      const totalNovels = novels.length;
      
      for (let i = 0; i < novels.length; i++) {
        const novel = novels[i];
        setCurrentNovel(novel.novel_title);
        setProgress(((i + 1) / totalNovels) * 100);

        // 准备导出数据
        const exportData = {
          novel_title: novel.novel_title,
          novel_type: novel.novel_type,
          novel_content: novel.novel_content,
          chapters_data: novel.chapters_data,
          characters_data: novel.characters_data,
          panels_data: novel.panels_data,
          scripts_data: novel.scripts_data,
          costume_data: novel.costume_data,
          makeup_data: novel.makeup_data,
          props_data: novel.props_data,
          scene_data: novel.scene_data,
          overall_analysis_data: novel.overall_analysis_data,
        };

        // 导出单个小说
        await exportMultipleNovelsToPDF([exportData]);
        
        // 添加延迟避免浏览器阻止多个下载
        if (i < novels.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      toast.success('批量导出成功', {
        description: `已成功导出 ${totalNovels} 部作品`,
      });

      setOpen(false);
    } catch (error) {
      console.error('批量导出失败:', error);
      toast.error('批量导出失败', {
        description: '导出PDF时发生错误，请稍后重试',
      });
    } finally {
      setExporting(false);
      setProgress(0);
      setCurrentNovel('');
    }
  };

  if (!novels || novels.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          批量导出 ({novels.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#FF5724]" />
            批量导出作品
          </DialogTitle>
          <DialogDescription>
            将所有作品导出为PDF文件，每部作品生成一个独立的PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!exporting ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      准备导出 {novels.length} 部作品
                    </p>
                    <p className="text-xs text-blue-700">
                      每部作品将包含：小说内容、角色信息、分镜图文、剧本内容、拍戏分析等完整信息
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">作品列表：</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-3">
                  {novels.map((novel, index) => (
                    <div key={novel.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span className="flex-1 truncate">{novel.novel_title}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  ⚠️ 注意：批量导出可能需要较长时间，请耐心等待。浏览器可能会提示允许多个文件下载，请点击允许。
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">导出进度</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      正在导出...
                    </p>
                    <p className="text-xs text-blue-700 mt-1 truncate">
                      {currentNovel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exporting}
          >
            {exporting ? '导出中...' : '取消'}
          </Button>
          {!exporting && (
            <Button
              onClick={handleBatchExport}
              className="bg-[#FF5724] hover:bg-[#FF5724]/90"
            >
              <Download className="h-4 w-4 mr-2" />
              开始导出
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
