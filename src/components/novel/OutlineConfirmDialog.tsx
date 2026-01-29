import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, FileText, CheckCircle2 } from 'lucide-react';
import type { NovelOutline } from '@/types/novel';

interface OutlineConfirmDialogProps {
  open: boolean;
  outline: NovelOutline | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const OutlineConfirmDialog: React.FC<OutlineConfirmDialogProps> = ({
  open,
  outline,
  onConfirm,
  onCancel,
}) => {
  if (!outline) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            章节规划确认
          </DialogTitle>
          <DialogDescription>
            请仔细查看生成的章节规划，确认无误后点击"确认并生成详细内容"按钮
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* 小说标题和简介 */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{outline.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>小说简介</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {outline.description}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge variant="outline">
                      共 {outline.chapters.length} 章
                    </Badge>
                    <Badge variant="outline">
                      简介字数: {outline.description.length} 字
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 章节列表 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                章节详情
              </h3>
              
              {outline.chapters.map((chapter, index) => (
                <Card key={chapter.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-semibold">
                        {chapter.title}
                      </CardTitle>
                      <Badge 
                        variant={chapter.summary.length >= 300 ? "default" : "destructive"}
                        className="ml-2"
                      >
                        {chapter.summary.length} 字
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        章节简介
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {chapter.summary}
                      </p>
                      {chapter.summary.length < 300 && (
                        <div className="text-xs text-destructive mt-2">
                          ⚠️ 简介字数不足300字，建议重新生成
                        </div>
                      )}
                    </div>
                  </CardContent>
                  {index < outline.chapters.length - 1 && (
                    <Separator className="mt-2" />
                  )}
                </Card>
              ))}
            </div>

            {/* 统计信息 */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {outline.chapters.length}
                    </div>
                    <div className="text-xs text-muted-foreground">章节总数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {outline.chapters.filter(c => c.summary.length >= 300).length}
                    </div>
                    <div className="text-xs text-muted-foreground">符合要求</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {outline.chapters.filter(c => c.summary.length < 300).length}
                    </div>
                    <div className="text-xs text-muted-foreground">需要优化</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(
                        outline.chapters.reduce((sum, c) => sum + c.summary.length, 0) /
                        outline.chapters.length
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">平均字数</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            取消并重新生成
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            确认并生成详细内容
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OutlineConfirmDialog;
