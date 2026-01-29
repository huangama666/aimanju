import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  FolderOpen, 
  Download, 
  Trash2, 
  Copy, 
  FileText, 
  Image as ImageIcon,
  User
} from 'lucide-react';
import type { ProjectVersion, Novel, Character, ComicPanel } from '@/types/novel';

interface ProjectManagerProps {
  currentProject: {
    novel?: Novel;
    characters: Character[];
    comicPanels: ComicPanel[];
  };
  onSaveVersion: (version: ProjectVersion) => void;
  onLoadVersion: (version: ProjectVersion) => void;
  onExportProject: (format: 'pdf' | 'images' | 'zip') => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  currentProject,
  onSaveVersion,
  onLoadVersion,
  onExportProject,
}) => {
  const [savedVersions, setSavedVersions] = useState<ProjectVersion[]>([]);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDescription, setVersionDescription] = useState('');

  const handleSaveVersion = () => {
    if (!currentProject.novel || !versionName.trim()) return;

    const newVersion: ProjectVersion = {
      id: `version-${Date.now()}`,
      name: versionName.trim(),
      description: versionDescription.trim(),
      novel: currentProject.novel,
      characters: currentProject.characters,
      comicPanels: currentProject.comicPanels,
      createdAt: new Date(),
    };

    setSavedVersions(prev => [...prev, newVersion]);
    onSaveVersion(newVersion);
    
    setVersionName('');
    setVersionDescription('');
    setIsVersionDialogOpen(false);
  };

  const handleLoadVersion = (version: ProjectVersion) => {
    onLoadVersion(version);
  };

  const handleDeleteVersion = (versionId: string) => {
    setSavedVersions(prev => prev.filter(v => v.id !== versionId));
  };

  const handleDuplicateVersion = (version: ProjectVersion) => {
    const duplicatedVersion: ProjectVersion = {
      ...version,
      id: `version-${Date.now()}`,
      name: `${version.name} (副本)`,
      createdAt: new Date(),
    };

    setSavedVersions(prev => [...prev, duplicatedVersion]);
  };

  const getProjectStats = () => {
    return {
      chapters: currentProject.novel?.chapters.length || 0,
      characters: currentProject.characters.length,
      comicPanels: currentProject.comicPanels.length,
      completedPanels: currentProject.comicPanels.filter(p => p.status === 'completed').length,
    };
  };

  const stats = getProjectStats();
  
  // 检查是否有任何内容
  const hasAnyContent = stats.chapters > 0 || stats.characters > 0 || stats.comicPanels > 0;

  return (
    <div className="space-y-6">
      {/* 当没有任何内容时显示空状态 */}
      {!hasAnyContent ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="relative">
            <img 
              src="https://miaoda-site-img.cdn.bcebos.com/18cecfd7-9fcb-4f61-a133-7771691fdc4c/images/3dd1f3c6-a7f1-11f0-b42d-8af640abeb71_0.jpg"
              alt="可爱的二次元小女孩趴在地上闹腾哭泣并用丝巾擦眼泪表情包"
              className="w-32 h-32 object-contain animate-bounce-gentle rounded-[30px]"
            />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-[#FF5724] animate-pulse-soft">阿巴阿巴</h3>
            <p className="text-lg text-muted-foreground">木有任何内容</p>
            <p className="text-sm text-muted-foreground max-w-md">
              快去创作页面生成一些小说、角色或分镜吧！✨
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 项目概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">项目统计</CardTitle>
            </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.chapters}</div>
              <div className="text-sm text-muted-foreground">章节数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.characters}</div>
              <div className="text-sm text-muted-foreground">角色数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.comicPanels}</div>
              <div className="text-sm text-muted-foreground">分镜数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.completedPanels}</div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </div>
          </div>

        </CardContent>
      </Card>
      {/* 版本历史 */}
      {savedVersions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              版本历史
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {savedVersions.map((version) => (
                  <Card key={version.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{version.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {version.description || '无描述'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>创建时间: {version.createdAt.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadVersion(version)}
                          >
                            <FolderOpen className="h-3 w-3 mr-1" />
                            加载
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateVersion(version)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            复制
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVersion(version.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">{version.novel.chapters.length}</div>
                            <div className="text-xs text-muted-foreground">章节</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium">{version.characters.length}</div>
                            <div className="text-xs text-muted-foreground">角色</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="font-medium">{version.comicPanels.length}</div>
                            <div className="text-xs text-muted-foreground">分镜</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {version.novel.genre}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {/* 版本对比功能 */}
      {savedVersions.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">版本对比</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              选择两个版本进行对比分析
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 版本对比选择器可以在这里实现 */}
              <div className="text-center text-muted-foreground py-8">
                版本对比功能开发中...
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
};

export default ProjectManager;