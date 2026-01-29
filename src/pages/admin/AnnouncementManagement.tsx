import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Loader2, Pin, PinOff, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/db/admin-api';
import type { Announcement, CreateAnnouncementInput, AnnouncementType } from '@/types/community';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface AnnouncementManagementProps {
  onAnnouncementChange?: () => void;
}

export default function AnnouncementManagement({ onAnnouncementChange }: AnnouncementManagementProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState<CreateAnnouncementInput>({
    title: '',
    content: '',
    type: 'system',
    is_pinned: false,
    is_active: true,
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setIsLoading(true);
      const data = await getAllAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('加载公告失败:', error);
      toast.error('加载公告失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      type: 'system',
      is_pinned: false,
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const handleEditClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      is_pinned: announcement.is_pinned,
      is_active: announcement.is_active,
      start_date: announcement.start_date,
      end_date: announcement.end_date,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入公告标题');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('请输入公告内容');
      return;
    }

    try {
      setIsSaving(true);
      if (selectedAnnouncement) {
        await updateAnnouncement(selectedAnnouncement.id, formData);
        toast.success('公告更新成功');
      } else {
        await createAnnouncement(formData);
        toast.success('公告创建成功');
      }
      setEditDialogOpen(false);
      await loadAnnouncements();
      onAnnouncementChange?.();
    } catch (error) {
      console.error('保存公告失败:', error);
      toast.error('保存公告失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAnnouncement) return;

    try {
      await deleteAnnouncement(selectedAnnouncement.id);
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      await loadAnnouncements();
      onAnnouncementChange?.();
    } catch (error) {
      console.error('删除公告失败:', error);
      toast.error('删除失败');
    }
  };

  const getTypeLabel = (type: AnnouncementType) => {
    const labels: Record<AnnouncementType, string> = {
      system: '系统通知',
      activity: '活动公告',
      rule: '规则更新',
    };
    return labels[type];
  };

  const getTypeBadgeVariant = (type: AnnouncementType): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<AnnouncementType, "default" | "secondary" | "destructive" | "outline"> = {
      system: 'default',
      activity: 'secondary',
      rule: 'outline',
    };
    return variants[type];
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">公告管理</CardTitle>
          <Button onClick={handleCreateClick} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            创建公告
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 公告列表 */}
          <div className="rounded-md border border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-700/50 hover:bg-slate-700/50">
                  <TableHead className="text-slate-300">标题</TableHead>
                  <TableHead className="text-slate-300">类型</TableHead>
                  <TableHead className="text-slate-300 text-center">状态</TableHead>
                  <TableHead className="text-slate-300">创建时间</TableHead>
                  <TableHead className="text-slate-300 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                      暂无公告数据
                    </TableCell>
                  </TableRow>
                ) : (
                  announcements.map((announcement) => (
                    <TableRow key={announcement.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white max-w-md">
                        <div className="space-y-1">
                          <div className="font-medium">{announcement.title}</div>
                          <div className="text-sm text-slate-400 line-clamp-2">
                            {announcement.content}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(announcement.type)}>
                          {getTypeLabel(announcement.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {announcement.is_pinned && (
                            <Badge variant="destructive" className="bg-orange-500">
                              <Pin className="h-3 w-3 mr-1" />
                              置顶
                            </Badge>
                          )}
                          {announcement.is_active ? (
                            <Badge variant="default" className="bg-green-600">
                              <Eye className="h-3 w-3 mr-1" />
                              显示中
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <EyeOff className="h-3 w-3 mr-1" />
                              已隐藏
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDistanceToNow(new Date(announcement.created_at), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(announcement)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(announcement)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 统计信息 */}
          <div className="text-sm text-slate-400">
            共 {announcements.length} 条公告
          </div>
        </CardContent>
      </Card>

      {/* 编辑/创建对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedAnnouncement ? '编辑公告' : '创建公告'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedAnnouncement ? '修改公告信息' : '填写公告信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300">
                公告标题 *
              </Label>
              <Input
                id="title"
                placeholder="请输入公告标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="text-slate-300">
                公告内容 *
              </Label>
              <Textarea
                id="content"
                placeholder="请输入公告内容"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-slate-300">
                  公告类型
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AnnouncementType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="system">系统通知</SelectItem>
                    <SelectItem value="activity">活动公告</SelectItem>
                    <SelectItem value="rule">规则更新</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">显示设置</Label>
                <div className="flex items-center gap-4 h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                      className="rounded border-slate-600"
                    />
                    <span className="text-sm text-slate-300">置顶</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-600"
                    />
                    <span className="text-sm text-slate-300">显示</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              确定要删除公告「{selectedAnnouncement?.title}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
