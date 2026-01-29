import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateUserProfile } from "@/db/api";

interface NicknameEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentNickname: string;
  onNicknameUpdated: (newNickname: string) => void;
}

export default function NicknameEditDialog({
  open,
  onOpenChange,
  userId,
  currentNickname,
  onNicknameUpdated,
}: NicknameEditDialogProps) {
  const [nickname, setNickname] = useState(currentNickname);
  const [updating, setUpdating] = useState(false);

  // 重置状态
  useEffect(() => {
    if (open) {
      setNickname(currentNickname);
    }
  }, [open, currentNickname]);

  // 更新昵称
  const handleUpdate = async () => {
    const trimmedNickname = nickname.trim();
    
    if (!trimmedNickname) {
      toast.error('昵称不能为空');
      return;
    }

    if (trimmedNickname.length > 20) {
      toast.error('昵称不能超过20个字符');
      return;
    }

    if (trimmedNickname === currentNickname) {
      toast.info('昵称未修改');
      onOpenChange(false);
      return;
    }

    try {
      setUpdating(true);
      
      // 更新用户昵称
      await updateUserProfile(userId, { nickname: trimmedNickname });
      
      toast.success('昵称更新成功！');
      onNicknameUpdated(trimmedNickname);
      onOpenChange(false);
    } catch (error: any) {
      console.error('更新昵称失败:', error);
      toast.error(error.message || '更新失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改昵称</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">新昵称</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入新昵称"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              昵称长度不超过20个字符
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updating}
          >
            取消
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updating || !nickname.trim()}
          >
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              '确认修改'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
