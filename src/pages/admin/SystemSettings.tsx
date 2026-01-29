import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllSystemSettings, 
  batchUpdateSystemSettings, 
  getCurrentUser,
  clearCreditCostCache,
  getAllMembershipPackages,
  batchUpdateMembershipPackages,
  getAIModelConfig,
  updateAIModelConfig
} from '@/db/api';
import { checkIsAdmin } from '@/db/admin-api';
import { clearMembershipConfigCache } from '@/config/membership';
import { MembershipPackageManager } from '@/components/admin/MembershipPackageManager';
import type { SystemSetting, MembershipPackage, MembershipLevel } from '@/types/database';
import { Settings, Save, Loader2, Brain } from 'lucide-react';

export default function SystemSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPackages, setSavingPackages] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  // AI模型配置相关state
  const [aiModelProvider, setAiModelProvider] = useState<'miaoda' | 'custom'>('miaoda');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [savingAIConfig, setSavingAIConfig] = useState(false);

  useEffect(() => {
    checkAdminAndLoadSettings();
  }, []);

  const checkAdminAndLoadSettings = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const isAdmin = await checkIsAdmin();
      if (!isAdmin) {
        toast({
          title: '权限不足',
          description: '您没有权限访问此页面',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      await loadSettings();
    } catch (error) {
      console.error('检查权限失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载系统设置',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      // 加载系统设置
      const data = await getAllSystemSettings();
      setSettings(data);
      
      // 初始化表单数据（排除ai_model_config，因为它单独管理）
      const initialData: Record<string, string> = {};
      data.forEach(setting => {
        if (setting.key !== 'ai_model_config') {
          initialData[setting.key] = setting.value;
        }
      });
      setFormData(initialData);

      // 加载会员套餐
      console.log('开始加载会员套餐...');
      const packagesData = await getAllMembershipPackages();
      console.log('会员套餐数据:', packagesData);
      setPackages(packagesData);
      
      // 加载AI模型配置
      const aiConfig = await getAIModelConfig();
      setAiModelProvider(aiConfig.provider);
      setCustomApiUrl(aiConfig.customApiUrl || '');
      setCustomApiKey(aiConfig.customApiKey || '');
      setCustomModel(aiConfig.customModel || '');
    } catch (error) {
      console.error('加载系统设置失败:', error);
      throw error;
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // 验证输入
      const updates = Object.entries(formData).map(([key, value]) => {
        // URL类型的设置不需要验证为数字
        if (!isUrlSetting(key)) {
          const numValue = parseInt(value, 10);
          if (isNaN(numValue) || numValue < 0) {
            throw new Error(`${getSettingLabel(key)} 的值必须是非负整数`);
          }
        }
        return { key: key as any, value };
      });

      await batchUpdateSystemSettings(updates, user.id);
      
      // 清除缓存
      clearCreditCostCache();

      // 重新加载设置
      await loadSettings();

      // 显示成功提示
      toast({
        title: '✅ 保存成功',
        description: '系统设置已更新，新配置已生效',
        duration: 3000
      });
    } catch (error: any) {
      console.error('保存系统设置失败:', error);
      toast({
        title: '保存失败',
        description: error.message || '无法保存系统设置',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePackages = async (
    packagesData: Array<{
      level: MembershipLevel;
      name: string;
      monthly_credits: number;
      color: string;
      price: number;
      original_price: number;
      benefits: string[];
    }>
  ) => {
    try {
      setSavingPackages(true);
      
      // 验证输入
      for (const pkg of packagesData) {
        if (!pkg.name || pkg.name.trim().length === 0) {
          throw new Error(`${pkg.level} 的套餐名称不能为空`);
        }
        if (pkg.monthly_credits < 0) {
          throw new Error(`${pkg.level} 的每月码分不能为负数`);
        }
        if (pkg.price < 0 || pkg.original_price < 0) {
          throw new Error(`${pkg.level} 的价格不能为负数`);
        }
        if (pkg.benefits.length === 0) {
          throw new Error(`${pkg.level} 至少需要一个会员权益`);
        }
      }

      await batchUpdateMembershipPackages(packagesData);
      
      // 清除会员配置缓存
      clearMembershipConfigCache();
      
      // 重新加载设置
      await loadSettings();

      // 显示成功提示
      toast({
        title: '✅ 保存成功',
        description: '会员套餐设置已更新，新配置已生效',
        duration: 3000
      });
    } catch (error: any) {
      console.error('保存会员套餐失败:', error);
      toast({
        title: '保存失败',
        description: error.message || '无法保存会员套餐设置',
        variant: 'destructive'
      });
    } finally {
      setSavingPackages(false);
    }
  };

  // 保存AI模型配置
  const handleSaveAIConfig = async () => {
    try {
      setSavingAIConfig(true);
      
      // 验证自定义接口配置
      if (aiModelProvider === 'custom') {
        if (!customApiUrl || !customApiKey || !customModel) {
          toast({
            title: '配置不完整',
            description: '请填写完整的API URL、API Key和模型名称',
            variant: 'destructive'
          });
          return;
        }
        
        // 验证URL格式
        try {
          new URL(customApiUrl);
        } catch {
          toast({
            title: 'URL格式错误',
            description: '请输入有效的API URL（如 https://api.openai.com/v1/chat/completions）',
            variant: 'destructive'
          });
          return;
        }
      }
      
      await updateAIModelConfig({
        provider: aiModelProvider,
        customApiUrl: aiModelProvider === 'custom' ? customApiUrl : undefined,
        customApiKey: aiModelProvider === 'custom' ? customApiKey : undefined,
        customModel: aiModelProvider === 'custom' ? customModel : undefined
      });
      
      toast({
        title: '✅ 保存成功',
        description: 'AI模型配置已更新',
        duration: 3000
      });
    } catch (error: any) {
      console.error('保存AI模型配置失败:', error);
      toast({
        title: '保存失败',
        description: error.message || '无法保存AI模型配置',
        variant: 'destructive'
      });
    } finally {
      setSavingAIConfig(false);
    }
  };

  const getSettingLabel = (key: string): string => {
    const labels: Record<string, string> = {
      novel_generation_cost: '小说生成消耗',
      character_generation_cost: '角色生成消耗',
      comic_generation_cost: '分镜生成消耗（每张）',
      script_generation_cost: '剧本生成消耗（每章节）',
      filming_analysis_cost: '分析剧本消耗（每章节）',
      parallel_world_cost: '平行世界创作消耗',
      script_image_generation_cost: '剧本分析图片生成消耗（每张）',
      video_merge_tool_url: '视频合成工具网址'
    };
    return labels[key] || key;
  };
  
  const isUrlSetting = (key: string): boolean => {
    return key === 'video_merge_tool_url';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="flex items-center justify-center py-20">
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">正在加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          系统设置
        </h1>
        <p className="text-muted-foreground">管理码分消耗配置和会员套餐设置</p>
      </div>

      <div className="space-y-6">
        {/* 码分消耗设置 */}
        <Card>
          <CardHeader>
            <CardTitle>码分消耗设置</CardTitle>
            <CardDescription>
              设置各个功能模块消耗的码分数量
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings.map(setting => (
              <div key={setting.id} className="space-y-2">
                <Label htmlFor={setting.key}>
                  {getSettingLabel(setting.key)}
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id={setting.key}
                    type={isUrlSetting(setting.key) ? 'text' : 'number'}
                    min={isUrlSetting(setting.key) ? undefined : '0'}
                    value={formData[setting.key] || ''}
                    onChange={(e) => handleInputChange(setting.key, e.target.value)}
                    className="max-w-xs"
                    placeholder={isUrlSetting(setting.key) ? '请输入网址' : undefined}
                  />
                  {!isUrlSetting(setting.key) && (
                    <span className="text-sm text-muted-foreground">码分</span>
                  )}
                </div>
                {setting.description && (
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                )}
              </div>
            ))}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存设置
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI模型配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI模型配置
            </CardTitle>
            <CardDescription>
              配置小说解说生成使用的AI模型
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 模型选择 */}
            <div className="space-y-2">
              <Label htmlFor="ai-model-provider">AI模型提供商</Label>
              <Select
                value={aiModelProvider}
                onValueChange={(value: 'miaoda' | 'custom') => setAiModelProvider(value)}
              >
                <SelectTrigger id="ai-model-provider" className="max-w-xs">
                  <SelectValue placeholder="选择AI模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miaoda">秒哒自带（文心一言）</SelectItem>
                  <SelectItem value="custom">自定义OpenAI接口</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                选择用于生成小说解说的AI模型。自定义接口需遵循OpenAI API规范。
              </p>
            </div>

            {/* 自定义接口配置 */}
            {aiModelProvider === 'custom' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm">自定义OpenAI接口配置</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="custom-api-url">API URL *</Label>
                  <Input
                    id="custom-api-url"
                    type="url"
                    placeholder="https://api.openai.com/v1/chat/completions"
                    value={customApiUrl}
                    onChange={(e) => setCustomApiUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    完整的API端点地址，必须遵循OpenAI API规范
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-api-key">API Key *</Label>
                  <Input
                    id="custom-api-key"
                    type="password"
                    placeholder="sk-..."
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    API访问密钥
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-model">模型名称 *</Label>
                  <Input
                    id="custom-model"
                    type="text"
                    placeholder="gpt-3.5-turbo"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    要使用的模型名称（如 gpt-3.5-turbo、gpt-4等）
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveAIConfig}
                disabled={savingAIConfig}
                className="min-w-[120px]"
              >
                {savingAIConfig ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存配置
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 会员套餐管理 */}
        <MembershipPackageManager
          packages={packages}
          onSave={handleSavePackages}
          saving={savingPackages}
        />
      </div>
    </div>
  );
}
