import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Send, Trash2 } from "lucide-react";
import { sendChatStream } from "@/utils/chatStream";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function TestChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiModel, setAiModel] = useState<'miaoda'>('miaoda');

  const handleSend = async () => {
    if (!input.trim()) {
      toast.error('请输入消息');
      return;
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('🤖 开始调用AI模型:', aiModel);

      let assistantContent = '';

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
        console.log('🤖 使用秒哒自带模型');
      console.log('🤖 使用秒哒自带模型');
      const apiId = import.meta.env.VITE_APP_ID;
      await sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        messages: [{ role: 'user', content: userMessage.content }],
        apiId,
        onUpdate: (content) => {
          assistantContent = content;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content = content;
            }
            return newMessages;
          });
        },
        onComplete: () => {
          console.log('✅ 秒哒模型生成完成');
          toast.success('生成完成');
        },
        onError: (error) => {
          console.error('❌ 秒哒模型生成失败:', error);
          throw error;
        }
      });

    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      toast.error(`发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 移除失败的助手消息
      setMessages(prev => prev.filter(msg => msg.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    toast.success('已清空对话');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI模型测试聊天</CardTitle>
              <CardDescription>测试秒哒自带模型的对话效果</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={aiModel} onValueChange={(value) => setAiModel(value as 'miaoda')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miaoda">秒哒自带</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 对话区域 */}
          <ScrollArea className="h-[500px] border rounded-lg p-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg mb-2">👋 开始对话</p>
                  <p className="text-sm">选择AI模型，输入消息开始测试</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {message.role === 'user' ? '你' : 'AI'}
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {message.content || (
                          <span className="text-muted-foreground">生成中...</span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* 输入区域 */}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Shift+Enter换行，Enter发送)"
              className="min-h-[80px]"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  发送
                </>
              )}
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>💡 提示：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>选择不同的AI模型测试对话效果</li>
              <li>按Enter发送消息，Shift+Enter换行</li>
              <li>查看浏览器控制台可以看到详细的调试日志</li>
              <li>如果谷歌模型报错，说明该接口不可用或需要配置</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
