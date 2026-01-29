import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { VipBadge } from '@/components/ui/vip-badge';
import { MemberFeatureButton } from '@/components/membership/MemberFeatureButton';
import { toast } from 'sonner';
import { ArrowLeft, Save, Wand2, Sparkles, RefreshCw } from 'lucide-react';
import { getNovelById, updateNovelChapter, getCurrentUser, getUserProfile } from '@/db/api';
import { sendChatStream } from '@/utils/chatStream';
import type { DbNovel, DbUser } from '@/types/database';

// 智能写作辅助类型
type WritingAssistType = 'expand' | 'continue' | 'polish' | 'rewrite';

const NovelEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [novel, setNovel] = useState<DbNovel | null>(null);
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null); // 添加用户状态
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  // 智能写作辅助对话框状态
  const [assistDialogOpen, setAssistDialogOpen] = useState(false);
  const [assistType, setAssistType] = useState<WritingAssistType>('expand');
  const [assistRequirement, setAssistRequirement] = useState('');
  const [assisting, setAssisting] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(''); // AI生成的内容
  const [isGenerating, setIsGenerating] = useState(false); // 是否正在生成
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载用户数据
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          setCurrentUser(profile);
        }
      } catch (error) {
        console.error('加载用户数据失败:', error);
      }
    };
    loadUser();
  }, []);

  // 加载小说数据
  useEffect(() => {
    const loadNovel = async () => {
      if (!id) {
        toast.error('小说ID无效');
        navigate('/profile');
        return;
      }

      try {
        setLoading(true);
        const novelData = await getNovelById(id);
        
        if (!novelData) {
          toast.error('小说不存在');
          navigate('/profile');
          return;
        }

        setNovel(novelData);
        
        // 加载第一个章节
        if (novelData.chapters_data && novelData.chapters_data.length > 0) {
          const firstChapter = novelData.chapters_data[0];
          setChapterTitle(firstChapter.title || '');
          setChapterContent(firstChapter.content || '');
        }
      } catch (error) {
        console.error('加载小说失败:', error);
        toast.error('加载小说失败');
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    loadNovel();
  }, [id, navigate]);

  // 处理文本选择 - 使用简单直接的方式
  const handleTextSelection = () => {
    if (!textareaRef.current) {
      return;
    }
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const content = textareaRef.current.value;
    
    if (start !== end) {
      const selected = content.substring(start, end);
      
      setHasSelection(true);
      setSelectedText(selected);
      setSelectionStart(start);
      setSelectionEnd(end);
    } else {
      setHasSelection(false);
      setSelectedText('');
      setSelectionStart(start);
      setSelectionEnd(end);
    }
  };

  // 切换章节
  const handleChapterChange = (index: number) => {
    if (!novel || !novel.chapters_data) return;
    
    const chapter = novel.chapters_data[index];
    setSelectedChapterIndex(index);
    setChapterTitle(chapter.title || '');
    setChapterContent(chapter.content || '');
    setHasSelection(false);
    setSelectedText('');
  };

  // 保存章节
  const handleSaveChapter = async () => {
    if (!novel || !id) return;

    try {
      setSaving(true);
      console.log('保存章节:', { novelId: id, chapterIndex: selectedChapterIndex, title: chapterTitle });

      // 更新章节数据
      const updatedChapters = [...(novel.chapters_data || [])];
      updatedChapters[selectedChapterIndex] = {
        ...updatedChapters[selectedChapterIndex],
        title: chapterTitle,
        content: chapterContent
      };

      // 调用API更新
      await updateNovelChapter(id, selectedChapterIndex, chapterTitle, chapterContent);

      // 更新本地状态
      setNovel({
        ...novel,
        chapters_data: updatedChapters
      });

      toast.success('章节保存成功');
      console.log('章节保存成功');
    } catch (error) {
      console.error('保存章节失败:', error);
      toast.error('保存章节失败');
    } finally {
      setSaving(false);
    }
  };

  // 打开智能写作辅助对话框
  const handleOpenAssist = (type: WritingAssistType) => {
    if (!hasSelection && type !== 'continue') {
      toast.error('请先选中要处理的文字');
      return;
    }
    
    setAssistType(type);
    setAssistRequirement('');
    setGeneratedContent(''); // 重置生成的内容
    setIsGenerating(false); // 重置生成状态
    setAssistDialogOpen(true);
  };

  // 执行智能写作辅助 - 生成内容
  const handleExecuteAssist = async () => {
    if (!assistRequirement.trim()) {
      toast.error('请输入您的需求');
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedContent(''); // 清空之前的内容

      // 构建提示词
      let prompt = '';
      switch (assistType) {
        case 'expand':
          prompt = `请根据以下需求，对选中的文字进行扩写：\n\n需求：${assistRequirement}\n\n选中的文字：\n${selectedText}\n\n请直接输出扩写后的内容，不要包含任何解释或说明。`;
          break;
        case 'continue':
          prompt = `请根据以下需求，在当前位置续写内容：\n\n需求：${assistRequirement}\n\n当前内容：\n${chapterContent}\n\n请直接输出续写的内容，不要包含任何解释或说明。`;
          break;
        case 'polish':
          prompt = `请根据以下需求，对选中的文字进行润色优化：\n\n需求：${assistRequirement}\n\n选中的文字：\n${selectedText}\n\n请直接输出润色后的内容，不要包含任何解释或说明。`;
          break;
        case 'rewrite':
          prompt = `请根据以下需求，对选中的文字进行改写：\n\n需求：${assistRequirement}\n\n选中的文字：\n${selectedText}\n\n请直接输出改写后的内容，不要包含任何解释或说明。`;
          break;
      }

      // 使用文心文本生成大模型接口
      const APP_ID = import.meta.env.VITE_APP_ID;

      await sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        apiId: APP_ID,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        onUpdate: (content: string) => {
          // 实时更新生成的内容，产生打字机效果
          setGeneratedContent(content);
        },
        onComplete: () => {
          setIsGenerating(false);
          toast.success('内容生成完成，请确认后插入');
        },
        onError: (error: Error) => {
          console.error('AI生成失败:', error);
          setIsGenerating(false);
          toast.error('智能写作辅助失败，请重试');
        }
      });

    } catch (error) {
      console.error('智能写作辅助失败:', error);
      toast.error('智能写作辅助失败，请重试');
      setIsGenerating(false);
    }
  };

  // 确认插入生成的内容
  const handleConfirmInsert = () => {
    if (!generatedContent) {
      toast.error('没有可插入的内容');
      return;
    }

    // 根据操作类型更新内容
    let newContent = chapterContent;
    if (assistType === 'continue') {
      // 续写：在光标位置插入
      const cursorPos = textareaRef.current?.selectionStart || chapterContent.length;
      newContent = chapterContent.slice(0, cursorPos) + '\n\n' + generatedContent + '\n\n' + chapterContent.slice(cursorPos);
    } else {
      // 扩写、润色、改写：替换选中文字
      newContent = chapterContent.slice(0, selectionStart) + generatedContent + chapterContent.slice(selectionEnd);
    }

    setChapterContent(newContent);
    setAssistDialogOpen(false);
    setGeneratedContent('');
    setIsGenerating(false);
    toast.success('内容已插入');
  };

  // 获取辅助类型标题
  const getAssistTitle = (type: WritingAssistType) => {
    switch (type) {
      case 'expand': return '扩写';
      case 'continue': return '续写';
      case 'polish': return '润色';
      case 'rewrite': return '改写';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return null;
  }

  const chapters = novel.chapters_data || [];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 顶部导航 */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回个人中心
          </Button>
          <Button
            onClick={handleSaveChapter}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存章节'}
          </Button>
        </div>

        {/* 页面标题 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">
              编辑作品 - {novel.novel_title}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* 章节选项卡 */}
        {chapters.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>章节列表</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedChapterIndex.toString()} onValueChange={(value) => handleChapterChange(Number.parseInt(value))}>
                <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent">
                  {chapters.map((chapter, index) => (
                    <TabsTrigger
                      key={index}
                      value={index.toString()}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {chapter.title || `第${index + 1}章`}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {chapters.map((_, index) => (
                  <TabsContent key={index} value={index.toString()} className="mt-6">
                    {/* 章节标题 */}
                    <div className="mb-4">
                      <Label htmlFor="chapter-title" className="text-base font-semibold mb-2 block">
                        章节标题
                      </Label>
                      <Input
                        id="chapter-title"
                        value={chapterTitle}
                        onChange={(e) => setChapterTitle(e.target.value)}
                        placeholder="请输入章节标题"
                        className="text-lg"
                      />
                    </div>

                    {/* 智能写作辅助按钮 */}
                    <div className="mb-4">
                      <div className="flex gap-2 flex-wrap items-center">
                        {currentUser && (
                          <>
                            <MemberFeatureButton
                              membershipLevel={currentUser.membership_level}
                              featureName="扩写"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssist('expand')}
                              disabled={!hasSelection}
                              className="gap-2"
                            >
                              <Wand2 className="h-4 w-4" />
                              扩写
                            </MemberFeatureButton>
                            
                            <MemberFeatureButton
                              membershipLevel={currentUser.membership_level}
                              featureName="润色"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssist('polish')}
                              disabled={!hasSelection}
                              className="gap-2"
                            >
                              <Sparkles className="h-4 w-4" />
                              润色
                            </MemberFeatureButton>
                            
                            <MemberFeatureButton
                              membershipLevel={currentUser.membership_level}
                              featureName="改写"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssist('rewrite')}
                              disabled={!hasSelection}
                              className="gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              改写
                            </MemberFeatureButton>
                          </>
                        )}
                        {hasSelection && (
                          <span className="text-sm text-muted-foreground">
                            已选中 {selectedText.length} 个字符
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 章节内容编辑器 */}
                    <div>
                      <Label htmlFor="chapter-content" className="text-base font-semibold mb-2 block">
                        章节内容
                      </Label>
                      <Textarea
                        ref={textareaRef}
                        id="chapter-content"
                        value={chapterContent}
                        onChange={(e) => setChapterContent(e.target.value)}
                        onMouseUp={handleTextSelection}
                        onKeyUp={handleTextSelection}
                        onSelect={handleTextSelection}
                        onClick={handleTextSelection}
                        onTouchEnd={handleTextSelection}
                        placeholder="请输入章节内容"
                        className="min-h-[500px] font-mono text-base leading-relaxed"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        字数统计: {chapterContent.length} 字
                      </p>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">该小说暂无章节内容</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 智能写作辅助对话框 */}
      <Dialog open={assistDialogOpen} onOpenChange={setAssistDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{getAssistTitle(assistType)} - 智能写作辅助</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            {/* 选中的文字 */}
            {assistType !== 'continue' && selectedText && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-1">选中的文字：</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedText}</p>
              </div>
            )}
            
            {/* 需求输入 */}
            <div>
              <Label htmlFor="assist-requirement" className="mb-2 block">
                您的需求
              </Label>
              <Textarea
                id="assist-requirement"
                value={assistRequirement}
                onChange={(e) => setAssistRequirement(e.target.value)}
                placeholder={`例如：${
                  assistType === 'expand' ? '增加更多细节描写，让场景更生动' :
                  assistType === 'continue' ? '继续发展剧情，增加一些冲突' :
                  assistType === 'polish' ? '让语言更优美流畅' :
                  '用不同的方式表达，保持原意'
                }`}
                className="min-h-[100px]"
                disabled={isGenerating || generatedContent.length > 0}
              />
            </div>

            {/* 生成按钮 */}
            {!generatedContent && (
              <Button
                onClick={handleExecuteAssist}
                disabled={isGenerating || !assistRequirement.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-pulse">生成中...</span>
                  </>
                ) : (
                  '开始生成'
                )}
              </Button>
            )}

            {/* 生成的内容预览 */}
            {(isGenerating || generatedContent) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    生成的内容：
                  </Label>
                  {isGenerating && (
                    <span className="text-sm text-muted-foreground animate-pulse">
                      正在生成中...
                    </span>
                  )}
                  {!isGenerating && generatedContent && (
                    <span className="text-sm text-green-600">
                      ✓ 生成完成（{generatedContent.length} 字）
                    </span>
                  )}
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border-2 border-blue-200 dark:border-blue-800 min-h-[200px] max-h-[400px] overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {generatedContent || '等待生成...'}
                    {isGenerating && (
                      <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse"></span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setAssistDialogOpen(false);
                setGeneratedContent('');
                setIsGenerating(false);
              }}
              disabled={isGenerating}
            >
              取消
            </Button>
            {generatedContent && !isGenerating && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedContent('');
                    setAssistRequirement('');
                  }}
                >
                  重新生成
                </Button>
                <Button
                  onClick={handleConfirmInsert}
                  className="bg-green-600 hover:bg-green-700"
                >
                  确认插入
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NovelEditPage;
