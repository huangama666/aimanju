import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Crown, Save, Loader2 } from 'lucide-react';
import type { MembershipPackage, MembershipLevel } from '@/types/database';

interface MembershipPackageManagerProps {
  packages: MembershipPackage[];
  onSave: (packages: Array<{
    level: MembershipLevel;
    name: string;
    monthly_credits: number;
    color: string;
    price: number;
    original_price: number;
    benefits: string[];
  }>) => Promise<void>;
  saving: boolean;
}

export function MembershipPackageManager({ packages, onSave, saving }: MembershipPackageManagerProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    packages.forEach(pkg => {
      initial[pkg.level] = {
        name: pkg.name,
        monthly_credits: pkg.monthly_credits,
        color: pkg.color,
        price: pkg.price,
        original_price: pkg.original_price,
        benefits: pkg.benefits.join('\n')
      };
    });
    return initial;
  });

  const handleInputChange = (level: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      const updates = packages.map(pkg => ({
        level: pkg.level,
        name: formData[pkg.level].name,
        monthly_credits: parseInt(formData[pkg.level].monthly_credits, 10),
        color: formData[pkg.level].color,
        price: parseFloat(formData[pkg.level].price),
        original_price: parseFloat(formData[pkg.level].original_price),
        benefits: formData[pkg.level].benefits
          .split('\n')
          .map((b: string) => b.trim())
          .filter((b: string) => b.length > 0)
      }));

      await onSave(updates);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const getLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      free: '免费会员',
      basic: '初级会员',
      intermediate: '中级会员',
      premium: '高级会员'
    };
    return labels[level] || level;
  };

  const getLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      free: 'bg-gray-500',
      basic: 'bg-blue-500',
      intermediate: 'bg-purple-500',
      premium: 'bg-amber-500'
    };
    return colors[level] || 'bg-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <CardTitle>会员套餐管理</CardTitle>
        </div>
        <CardDescription>
          配置各个会员等级的名称、价格、码分和权益
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {packages.map((pkg, index) => (
          <div key={pkg.level}>
            {index > 0 && <Separator className="my-6" />}
            
            <div className="space-y-4">
              {/* 套餐标题 */}
              <div className="flex items-center gap-3">
                <Badge className={`${getLevelColor(pkg.level)} text-white`}>
                  {getLevelLabel(pkg.level)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Level: {pkg.level}
                </span>
              </div>

              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 套餐名称 */}
                <div className="space-y-2">
                  <Label htmlFor={`${pkg.level}-name`}>套餐名称</Label>
                  <Input
                    id={`${pkg.level}-name`}
                    value={formData[pkg.level]?.name || ''}
                    onChange={(e) => handleInputChange(pkg.level, 'name', e.target.value)}
                    placeholder="例如：初级会员"
                  />
                </div>

                {/* 每月码分 */}
                <div className="space-y-2">
                  <Label htmlFor={`${pkg.level}-credits`}>每月码分</Label>
                  <Input
                    id={`${pkg.level}-credits`}
                    type="number"
                    min="0"
                    value={formData[pkg.level]?.monthly_credits || 0}
                    onChange={(e) => handleInputChange(pkg.level, 'monthly_credits', e.target.value)}
                  />
                </div>

                {/* 价格 */}
                <div className="space-y-2">
                  <Label htmlFor={`${pkg.level}-price`}>价格（元）</Label>
                  <Input
                    id={`${pkg.level}-price`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData[pkg.level]?.price || 0}
                    onChange={(e) => handleInputChange(pkg.level, 'price', e.target.value)}
                  />
                </div>

                {/* 原价 */}
                <div className="space-y-2">
                  <Label htmlFor={`${pkg.level}-original-price`}>原价（元）</Label>
                  <Input
                    id={`${pkg.level}-original-price`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData[pkg.level]?.original_price || 0}
                    onChange={(e) => handleInputChange(pkg.level, 'original_price', e.target.value)}
                  />
                </div>

                {/* 主题颜色 */}
                <div className="space-y-2">
                  <Label htmlFor={`${pkg.level}-color`}>主题颜色</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${pkg.level}-color`}
                      type="text"
                      value={formData[pkg.level]?.color || ''}
                      onChange={(e) => handleInputChange(pkg.level, 'color', e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                    <div
                      className="w-12 h-10 rounded border"
                      style={{ backgroundColor: formData[pkg.level]?.color || '#ccc' }}
                    />
                  </div>
                </div>
              </div>

              {/* 会员权益 */}
              <div className="space-y-2">
                <Label htmlFor={`${pkg.level}-benefits`}>会员权益（每行一个）</Label>
                <Textarea
                  id={`${pkg.level}-benefits`}
                  value={formData[pkg.level]?.benefits || ''}
                  onChange={(e) => handleInputChange(pkg.level, 'benefits', e.target.value)}
                  placeholder="每月500码分&#10;高级小说创作&#10;高级角色生成"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  每行输入一个权益，空行将被忽略
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* 保存按钮 */}
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
  );
}
