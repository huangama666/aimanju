import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { uploadAvatar, generateAvatarAI, getAvatarGenerationResult, updateUserProfile } from "@/db/api";

interface AvatarEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentAvatarUrl?: string;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

export default function AvatarEditDialog({
  open,
  onOpenChange,
  userId,
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarEditDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setSelectedFile(null);
      setAiPrompt("");
      setUploading(false);
      setGenerating(false);
    }
  }, [open]);

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('不支持的文件格式，请上传 JPEG、PNG、GIF、WEBP 或 AVIF 格式的图片');
      return;
    }

    // 验证文件名（仅包含英文字母和数字）
    const fileName = file.name;
    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    if (!/^[a-zA-Z0-9_-]+$/.test(fileNameWithoutExt)) {
      toast.error('文件名只能包含英文字母、数字、下划线和连字符');
      return;
    }

    setSelectedFile(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 上传本地图片
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('请先选择图片');
      return;
    }

    try {
      setUploading(true);
      
      // 上传图片
      const avatarUrl = await uploadAvatar(userId, selectedFile);
      
      // 更新用户头像
      await updateUserProfile(userId, { avatar_url: avatarUrl });
      
      toast.success('头像上传成功！');
      onAvatarUpdated(avatarUrl);
      onOpenChange(false);
    } catch (error: any) {
      console.error('上传头像失败:', error);
      toast.error(error.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // AI生成头像
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('请输入头像描述');
      return;
    }

    try {
      setGenerating(true);
      
      // 提交AI生成任务
      const taskId = await generateAvatarAI(aiPrompt);
      toast.info('AI正在生成头像，请稍候...');
      
      // 轮询查询结果
      let attempts = 0;
      const maxAttempts = 30; // 最多查询30次（约5分钟）
      
      const pollResult = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error('生成超时，请重试');
        }
        
        attempts++;
        const result = await getAvatarGenerationResult(taskId);
        
        if (result.status === 'SUCCESS' && result.imageUrl) {
          // 显示预览
          setPreviewUrl(result.imageUrl);
          toast.success('AI头像生成成功！');
        } else if (result.status === 'FAILED') {
          throw new Error('AI生成失败，请重试');
        } else {
          // 继续等待
          await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
          await pollResult();
        }
      };
      
      await pollResult();
    } catch (error: any) {
      console.error('AI生成头像失败:', error);
      toast.error(error.message || 'AI生成失败，请重试');
      setPreviewUrl(null);
    } finally {
      setGenerating(false);
    }
  };

  // 确认使用AI生成的头像
  const handleConfirmAIAvatar = async () => {
    if (!previewUrl) return;

    try {
      setUploading(true);
      
      // 将图片URL转换为Blob并上传（禁用缓存，避免跨域问题）
      const response = await fetch(previewUrl, {
        cache: 'no-store', // 禁用缓存
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const blob = await response.blob();
      const file = new File([blob], `ai-avatar-${Date.now()}.png`, { type: 'image/png' });
      
      // 上传图片
      const avatarUrl = await uploadAvatar(userId, file);
      
      // 更新用户头像
      await updateUserProfile(userId, { avatar_url: avatarUrl });
      
      toast.success('头像更新成功！');
      onAvatarUpdated(avatarUrl);
      onOpenChange(false);
    } catch (error: any) {
      console.error('保存头像失败:', error);
      toast.error(error.message || '保存失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>更换头像</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">本地上传</TabsTrigger>
            <TabsTrigger value="ai">AI生成</TabsTrigger>
          </TabsList>

          {/* 本地上传 */}
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>选择图片</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    选择图片
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    支持 JPEG、PNG、GIF、WEBP、AVIF 格式，文件大小不超过 1MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    文件名只能包含英文字母、数字、下划线和连字符
                  </p>
                </div>
              </div>

              {/* 预览 */}
              {previewUrl && (
                <div className="space-y-2">
                  <Label>预览</Label>
                  <div className="flex justify-center">
                    <img
                      src={previewUrl}
                      alt="预览"
                      className="w-48 h-48 object-cover rounded-full border-4 border-primary"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              )}

              {/* 上传按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    '确认上传'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={uploading}
                >
                  取消
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* AI生成 */}
          <TabsContent value="ai" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="ai-prompt">描述你想要的头像</Label>
                <Textarea
                  id="ai-prompt"
                  placeholder="例如：可爱的二次元女孩，粉色头发，大眼睛，微笑"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  请详细描述你想要的头像风格、特征等，AI将根据你的描述生成个性化头像
                </p>
              </div>

              {/* 预览 */}
              {previewUrl && (
                <div className="space-y-2">
                  <Label>AI生成结果</Label>
                  <div className="flex justify-center">
                    <img
                      src={previewUrl}
                      alt="AI生成"
                      className="w-48 h-48 object-cover rounded-full border-4 border-primary"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              )}

              {/* 生成按钮 */}
              <div className="flex gap-2">
                {!previewUrl ? (
                  <>
                    <Button
                      onClick={handleAIGenerate}
                      disabled={!aiPrompt.trim() || generating}
                      className="flex-1"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          AI生成头像
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={generating}
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleConfirmAIAvatar}
                      disabled={uploading}
                      className="flex-1"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        '使用此头像'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewUrl(null)}
                      disabled={uploading}
                    >
                      重新生成
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
