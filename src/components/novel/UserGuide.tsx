import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, User, Image, Download, Clock, AlertCircle } from 'lucide-react';

const UserGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            使用指南
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 小说创作步骤 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              第一步：小说创作
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. 选择小说题材（玄幻、都市、历史等）</p>
              <p>2. 设定写作风格（古典、现代、幽默等）</p>
              <p>3. 描述主要情节和关键要素</p>
              <p>4. 点击"开始创作"，系统将自动生成小说内容</p>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4" />
                <span>预计生成时间：30-60秒</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 角色生成步骤 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              第二步：角色生成
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. 输入角色姓名和基本描述</p>
              <p>2. 详细描述角色外貌特征</p>
              <p>3. 设定角色性格特点</p>
              <p>4. 选择生成风格（国漫、写实等）</p>
              <p>5. 点击"生成角色"，系统将创建角色形象</p>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4" />
                <span>预计生成时间：1-3分钟</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 分镜生成步骤 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Image className="h-4 w-4" />
              第三步：分镜生成
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. 选择要生成分镜的章节</p>
              <p>2. 设置每章分镜数量（建议3-8个）</p>
              <p>3. 点击"开始生成漫画分镜"，系统将<strong>按顺序逐个生成</strong>分镜</p>
              <p>4. 每次只生成1个分镜，确保质量和稳定性</p>
              <p>5. 可以随时停止生成，或对不满意的分镜进行重新生成</p>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4" />
                <span>预计生成时间：每个分镜1-3分钟，按顺序依次完成</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 导出功能 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              第四步：导出作品
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. 完成所有创作后，可以导出完整作品</p>
              <p>2. 支持多种格式：PDF、图片集、压缩包</p>
              <p>3. 可以保存项目版本，方便后续修改</p>
            </div>
          </div>

          <Separator />

          {/* 注意事项 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              注意事项
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">提示</Badge>
                <span className="text-sm text-muted-foreground">
                  图片生成需要时间，请耐心等待。生成过程中可以继续其他操作。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">提示</Badge>
                <span className="text-sm text-muted-foreground">
                  如果生成失败，可以点击重新生成按钮重试。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">提示</Badge>
                <span className="text-sm text-muted-foreground">
                  建议先完成小说创作，再进行角色和分镜生成，这样效果更好。
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="destructive" className="mt-0.5">注意</Badge>
                <span className="text-sm text-muted-foreground">本项目仅以mvp形式展示，由于AI篇幅限制，小说生成效果稍打折扣。</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserGuide;