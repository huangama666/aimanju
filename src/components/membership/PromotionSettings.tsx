import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getPromotionSettings, updatePromotionSettings } from '@/db/api';
import { Loader2, Save, Calendar, Clock, Info } from 'lucide-react';
import type { PromotionSettings as PromotionSettingsType } from '@/types/database';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * 限免设置组件
 * 用于管理员设置会员功能限免时间
 */
export function PromotionSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PromotionSettingsType | null>(null);

  // 表单状态
  const [isEnabled, setIsEnabled] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  // 加载限免设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getPromotionSettings();
      setSettings(data);

      if (data) {
        setIsEnabled(data.is_enabled);
        setStartTime(data.start_time ? formatDateTimeLocal(data.start_time) : '');
        setEndTime(data.end_time ? formatDateTimeLocal(data.end_time) : '');
        setDescription(data.description || '');
      }
    } catch (error) {
      console.error('加载限免设置失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载限免设置，请刷新页面重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 保存限免设置
  const handleSave = async () => {
    try {
      // 验证时间范围
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
          toast({
            title: '时间设置错误',
            description: '结束时间必须晚于开始时间',
            variant: 'destructive',
          });
          return;
        }
      }

      setSaving(true);

      await updatePromotionSettings({
        is_enabled: isEnabled,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        description: description || null,
      });

      toast({
        title: '保存成功',
        description: '限免设置已更新',
      });

      // 重新加载设置
      await loadSettings();
    } catch (error) {
      console.error('保存限免设置失败:', error);
      toast({
        title: '保存失败',
        description: '无法保存限免设置，请重试',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // 格式化日期时间为本地时间格式（用于 datetime-local input）
  const formatDateTimeLocal = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 获取当前限免状态
  const getCurrentStatus = (): { active: boolean; message: string } => {
    if (!isEnabled) {
      return { active: false, message: '限免未启用' };
    }

    const now = new Date();

    if (!startTime && !endTime) {
      return { active: true, message: '长期限免中' };
    }

    if (startTime) {
      const start = new Date(startTime);
      if (now < start) {
        return { active: false, message: '限免尚未开始' };
      }
    }

    if (endTime) {
      const end = new Date(endTime);
      if (now > end) {
        return { active: false, message: '限免已结束' };
      }
    }

    return { active: true, message: '限免进行中' };
  };

  const status = getCurrentStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 当前状态提示 */}
      <Alert className={status.active ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}>
        <Info className={`w-4 h-4 ${status.active ? 'text-green-500' : 'text-muted-foreground'}`} />
        <AlertDescription className={status.active ? 'text-green-700 dark:text-green-400' : ''}>
          <strong>当前状态：</strong>{status.message}
          {status.active && ' - 所有用户均可使用会员专属功能'}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>限免设置</CardTitle>
          <CardDescription>
            设置会员专属功能的限免时间，限免期间所有用户（包括非会员）都可以使用会员功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 启用开关 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-enabled" className="text-base">启用限免</Label>
              <p className="text-sm text-muted-foreground">
                开启后，限免活动将根据设置的时间范围生效
              </p>
            </div>
            <Switch
              id="is-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* 时间设置 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-time" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                开始时间
              </Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!isEnabled}
              />
              <p className="text-xs text-muted-foreground">
                留空表示立即开始
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                结束时间
              </Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!isEnabled}
              />
              <p className="text-xs text-muted-foreground">
                留空表示长期有效
              </p>
            </div>
          </div>

          {/* 活动描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">活动描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：春节特惠活动，所有会员功能限时免费体验"
              rows={3}
              disabled={!isEnabled}
            />
            <p className="text-xs text-muted-foreground">
              可选，用于记录活动信息
            </p>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存设置
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong>启用限免</strong>：开启后，限免活动将根据设置的时间范围生效</p>
          <p>2. <strong>时间设置</strong>：</p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>如果只设置开始时间，则从开始时间起长期有效</li>
            <li>如果只设置结束时间，则立即开始到结束时间</li>
            <li>如果都不设置，则立即开始且长期有效</li>
            <li>如果都设置，则在指定时间范围内有效</li>
          </ul>
          <p>3. <strong>限免效果</strong>：限免期间，所有用户（包括非会员）都可以使用以下功能：</p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>小说生成功能</li>
            <li>角色生成功能</li>
            <li>漫画分镜生成功能</li>
            <li>其他会员专属功能</li>
          </ul>
          <p>4. <strong>实时生效</strong>：设置保存后立即生效，用户刷新页面即可看到变化</p>
        </CardContent>
      </Card>
    </div>
  );
}
