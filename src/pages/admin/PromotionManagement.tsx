import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Gift, Calendar, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getPromotionSettings, updatePromotionSettings, isPromotionActive } from '@/db/api';
import type { PromotionSettings } from '@/types/database';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PromotionManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PromotionSettings | null>(null);
  const [isActive, setIsActive] = useState(false);
  
  // 表单状态
  const [isEnabled, setIsEnabled] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getPromotionSettings();
      const active = await isPromotionActive();
      
      setSettings(data);
      setIsActive(active);
      
      if (data) {
        setIsEnabled(data.is_enabled);
        setStartTime(data.start_time ? formatDateTimeLocal(data.start_time) : '');
        setEndTime(data.end_time ? formatDateTimeLocal(data.end_time) : '');
        setDescription(data.description || '');
      }
    } catch (error) {
      console.error('加载限免设置失败:', error);
      toast.error('加载限免设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // 验证时间
      if (isEnabled && (!startTime || !endTime)) {
        toast.error('请设置限免开始和结束时间');
        return;
      }

      if (isEnabled && new Date(startTime) >= new Date(endTime)) {
        toast.error('结束时间必须晚于开始时间');
        return;
      }

      setSaving(true);
      
      await updatePromotionSettings({
        is_enabled: isEnabled,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        description: description || null
      });

      toast.success('限免设置保存成功');
      await loadSettings();
    } catch (error) {
      console.error('保存限免设置失败:', error);
      toast.error('保存限免设置失败');
    } finally {
      setSaving(false);
    }
  };

  // 格式化日期时间为本地时间格式（用于datetime-local输入）
  const formatDateTimeLocal = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 格式化显示日期时间
  const formatDisplayDateTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 当前状态提示 */}
      {isActive && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <Gift className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">
            限免活动正在进行中！所有用户都可以免费使用会员功能。
          </AlertDescription>
        </Alert>
      )}

      {!isActive && isEnabled && (
        <Alert className="bg-orange-500/10 border-orange-500/50">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-500">
            限免活动已设置但未生效。请检查时间设置。
          </AlertDescription>
        </Alert>
      )}

      {/* 限免设置卡片 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            会员功能限免设置
          </CardTitle>
          <CardDescription className="text-slate-400">
            设置会员功能限免时间，在限免期间所有用户都可以免费使用会员专属功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 启用开关 */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="enable-promotion" className="text-white font-medium">
                启用限免活动
              </Label>
              <p className="text-sm text-slate-400">
                开启后，在设定的时间范围内所有用户都可以使用会员功能
              </p>
            </div>
            <Switch
              id="enable-promotion"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time" className="text-white flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                开始时间
              </Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white"
                disabled={!isEnabled}
              />
              {settings?.start_time && (
                <p className="text-xs text-slate-400">
                  当前设置: {formatDisplayDateTime(settings.start_time)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time" className="text-white flex items-center gap-2">
                <Clock className="h-4 w-4" />
                结束时间
              </Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-white"
                disabled={!isEnabled}
              />
              {settings?.end_time && (
                <p className="text-xs text-slate-400">
                  当前设置: {formatDisplayDateTime(settings.end_time)}
                </p>
              )}
            </div>
          </div>

          {/* 活动描述 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              活动描述（可选）
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：春节特惠活动，全站会员功能限时免费体验"
              className="bg-slate-900/50 border-slate-600 text-white min-h-[100px]"
              disabled={!isEnabled}
            />
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存设置
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary font-semibold">1</span>
            </div>
            <div>
              <p className="font-medium text-white">启用限免活动</p>
              <p className="text-slate-400">打开"启用限免活动"开关，设置限免的开始和结束时间</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary font-semibold">2</span>
            </div>
            <div>
              <p className="font-medium text-white">限免期间效果</p>
              <p className="text-slate-400">在限免时间范围内，所有用户（包括免费会员）都可以使用所有会员专属功能</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary font-semibold">3</span>
            </div>
            <div>
              <p className="font-medium text-white">前端自动判断</p>
              <p className="text-slate-400">前端会自动检查当前是否在限免期间，无需手动干预</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary font-semibold">4</span>
            </div>
            <div>
              <p className="font-medium text-white">结束后自动恢复</p>
              <p className="text-slate-400">限免时间结束后，系统会自动恢复正常的会员权限判断</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
