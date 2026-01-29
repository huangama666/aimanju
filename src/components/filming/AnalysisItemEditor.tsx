import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, X, Loader2 } from 'lucide-react';

interface AnalysisItemEditorProps {
  type: 'costume' | 'makeup' | 'props' | 'scene';
  item: any;
  onSave: (updates: any) => Promise<void>;
  onCancel: () => void;
}

export function AnalysisItemEditor({ type, item, onSave, onCancel }: AnalysisItemEditorProps) {
  const [formData, setFormData] = useState(item);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const renderFields = () => {
    switch (type) {
      case 'costume':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="character">角色名称</Label>
              <Input
                id="character"
                value={formData.character || ''}
                onChange={(e) => handleChange('character', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">服装描述</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-[100px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">材质</Label>
              <Input
                id="material"
                value={formData.material || ''}
                onChange={(e) => handleChange('material', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">颜色</Label>
              <Input
                id="color"
                value={formData.color || ''}
                onChange={(e) => handleChange('color', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="style">风格</Label>
              <Input
                id="style"
                value={formData.style || ''}
                onChange={(e) => handleChange('style', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">用途</Label>
              <Textarea
                id="purpose"
                value={formData.purpose || ''}
                onChange={(e) => handleChange('purpose', e.target.value)}
                className="min-h-[80px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
          </>
        );

      case 'makeup':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="character">角色名称</Label>
              <Input
                id="character"
                value={formData.character || ''}
                onChange={(e) => handleChange('character', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">化妆描述</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-[100px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="style">妆容风格</Label>
              <Input
                id="style"
                value={formData.style || ''}
                onChange={(e) => handleChange('style', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">细节要求</Label>
              <Textarea
                id="details"
                value={formData.details || ''}
                onChange={(e) => handleChange('details', e.target.value)}
                className="min-h-[80px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
          </>
        );

      case 'props':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">道具名称</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">道具描述</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-[100px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="function">功能用途</Label>
              <Textarea
                id="function"
                value={formData.function || ''}
                onChange={(e) => handleChange('function', e.target.value)}
                className="min-h-[80px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
          </>
        );

      case 'scene':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="location">场景位置</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                className="border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="layout">空间布局</Label>
              <Textarea
                id="layout"
                value={formData.layout || ''}
                onChange={(e) => handleChange('layout', e.target.value)}
                className="min-h-[80px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decoration">装饰风格</Label>
              <Textarea
                id="decoration"
                value={formData.decoration || ''}
                onChange={(e) => handleChange('decoration', e.target.value)}
                className="min-h-[80px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atmosphere">氛围营造</Label>
              <Textarea
                id="atmosphere"
                value={formData.atmosphere || ''}
                onChange={(e) => handleChange('atmosphere', e.target.value)}
                className="min-h-[80px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lighting">光源设置</Label>
              <Textarea
                id="lighting"
                value={formData.lighting || ''}
                onChange={(e) => handleChange('lighting', e.target.value)}
                className="min-h-[80px] border-orange-200 focus:border-[#FF5724]"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-[#FF5724] shadow-lg">
      <CardHeader className="bg-gradient-to-r from-[#FF5724]/10 to-[#FFE8E0]">
        <CardTitle className="text-[#FF5724] flex items-center gap-2">
          ✏️ 编辑分析内容
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {renderFields()}
        
        <div className="flex gap-4 justify-end pt-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="border-gray-300"
            disabled={isSaving}
          >
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#FF5724] text-white hover:bg-[#E64A1F]"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存修改
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
