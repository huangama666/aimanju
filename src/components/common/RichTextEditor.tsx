import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X, Loader2 } from 'lucide-react';

interface RichTextEditorProps {
  title: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
}

export function RichTextEditor({
  title,
  initialContent,
  onSave,
  onCancel,
  placeholder = '请输入内容...'
}: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-[#FF5724] shadow-lg">
      <CardHeader className="bg-gradient-to-r from-[#FF5724]/10 to-[#FFE8E0]">
        <CardTitle className="text-[#FF5724] flex items-center gap-2">
          ✏️ {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[400px] font-mono text-sm border-orange-200 focus:border-[#FF5724] focus:ring-[#FF5724]"
        />
        
        <div className="flex gap-4 justify-end">
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
            disabled={isSaving || !content.trim()}
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
