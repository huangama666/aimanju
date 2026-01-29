import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Check } from 'lucide-react';
import { toast } from 'sonner';
import { extractCharactersFromChapter, type ExtractedCharacter } from '@/services/aiService';
import type { NovelChapter } from '@/types/novel';

interface CharacterSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapters: NovelChapter[];
  onCharacterSelect: (character: ExtractedCharacter) => void;
}

const CharacterSelectorDialog: React.FC<CharacterSelectorDialogProps> = ({
  open,
  onOpenChange,
  chapters,
  onCharacterSelect,
}) => {
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [extractedCharacters, setExtractedCharacters] = useState<ExtractedCharacter[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // 提取角色
  const handleExtractCharacters = async () => {
    if (selectedChapterIndex === undefined || !chapters[selectedChapterIndex]) {
      toast.error('请选择一个章节');
      return;
    }

    const chapter = chapters[selectedChapterIndex];
    if (!chapter.content) {
      toast.error('该章节没有内容');
      return;
    }

    setIsExtracting(true);
    console.log('🔍 开始提取角色，章节:', chapter.title);

    try {
      const characters = await extractCharactersFromChapter(chapter.content);
      
      if (characters.length === 0) {
        toast.warning('未能从该章节中提取到角色信息');
      } else {
        toast.success(`成功提取到 ${characters.length} 个角色`);
        setExtractedCharacters(characters);
      }
    } catch (error) {
      console.error('❌ 角色提取失败:', error);
      toast.error('角色提取失败，请重试');
    } finally {
      setIsExtracting(false);
    }
  };

  // 选择角色
  const handleSelectCharacter = (character: ExtractedCharacter) => {
    onCharacterSelect(character);
    toast.success(`已选择角色：${character.name}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-none w-full"
        style={{ maxWidth: '35rem' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            从章节中提取角色
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
            {/* 章节选择 */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  选择章节
                </label>
                <Select
                  value={selectedChapterIndex.toString()}
                  onValueChange={(value) => setSelectedChapterIndex(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个章节" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        第{index + 1}章：{chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleExtractCharacters}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    提取中...
                  </>
                ) : (
                  '提取角色'
                )}
              </Button>
            </div>

            {/* 角色列表 */}
            {extractedCharacters.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">
                    提取到的角色 ({extractedCharacters.length})
                  </h3>
                  <Badge variant="secondary">
                    点击选中按钮填入表单
                  </Badge>
                </div>
                
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {extractedCharacters.map((character, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              {/* 角色姓名 */}
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <h4 className="font-semibold text-lg">
                                  {character.name}
                                </h4>
                              </div>

                              {/* 外貌描述 */}
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  外貌：
                                </span>
                                <p className="text-sm mt-1">
                                  {character.appearance}
                                </p>
                              </div>

                              {/* 性格特征 */}
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  性格：
                                </span>
                                <p className="text-sm mt-1">
                                  {character.personality}
                                </p>
                              </div>

                              {/* 背景描述 */}
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  背景：
                                </span>
                                <p className="text-sm mt-1">
                                  {character.background}
                                </p>
                              </div>
                            </div>

                            {/* 选中按钮 */}
                            <Button
                              size="sm"
                              onClick={() => handleSelectCharacter(character)}
                              className="shrink-0"
                            >
                              <Check className="mr-1 h-4 w-4" />
                              选中
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* 空状态提示 */}
            {!isExtracting && extractedCharacters.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>请选择章节并点击"提取角色"按钮</p>
                <p className="text-sm mt-2">
                  系统会自动从章节内容中提取角色信息
                </p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CharacterSelectorDialog;
