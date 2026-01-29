import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CostumeItem, MakeupItem, PropItem, SceneItem, StylingLogicItem, OverallAnalysisItem } from "@/types/database";
import { Loader2, Image as ImageIcon, CheckCircle2, Edit } from "lucide-react";
import { useState } from "react";
import { AnalysisItemEditor } from "./AnalysisItemEditor";
import { addCacheBuster } from "@/utils/cache-buster";

interface ChapterAnalysisDisplayProps {
  chapterNum: number;
  chapterTitle?: string;
  costume: CostumeItem[];
  makeup: MakeupItem[];
  props: PropItem[];
  scene: SceneItem[];
  stylingLogic: StylingLogicItem[];
  overallAnalysis: OverallAnalysisItem[];
  generatingImages: { [key: string]: boolean };
  generatedImages: { [key: string]: string[] };
  onGenerateImages: (category: string, items: unknown[]) => void;
  onPreviewImage: (url: string) => void;
  onUpdateItem?: (type: 'costume' | 'makeup' | 'props' | 'scene', itemIndex: number, updates: any) => Promise<void>;
}

export function ChapterAnalysisDisplay({
  chapterNum,
  chapterTitle,
  costume,
  makeup,
  props,
  scene,
  stylingLogic,
  overallAnalysis,
  generatingImages,
  generatedImages,
  onGenerateImages,
  onPreviewImage,
  onUpdateItem
}: ChapterAnalysisDisplayProps) {
  const [editingItem, setEditingItem] = useState<{ type: 'costume' | 'makeup' | 'props' | 'scene', index: number, data: any } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditItem = (type: 'costume' | 'makeup' | 'props' | 'scene', index: number, data: any) => {
    setEditingItem({ type, index, data });
    setIsEditDialogOpen(true);
  };

  const handleSaveItem = async (updates: any) => {
    if (!editingItem || !onUpdateItem) return;
    
    await onUpdateItem(editingItem.type, editingItem.index, updates);
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };
  return (
    <div className="space-y-6">
      {/* 章节标题 */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-[#FF5724]">
          第{chapterNum}章{chapterTitle ? ` - ${chapterTitle}` : ''}
        </h3>
      </div>

      {/* 服装分析 */}
      {costume.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">
                  👔 服装分析
                </CardTitle>
                <CardDescription>角色服装设计要求</CardDescription>
              </div>
              <Button
                onClick={() => onGenerateImages(`costume_${chapterNum}`, costume)}
                disabled={generatingImages[`costume_${chapterNum}`] || costume.length === 0}
                variant="outline"
                className="border-[#FF5724] bg-[#FF5724] text-white w-full sm:w-auto"
              >
                {generatingImages[`costume_${chapterNum}`] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : generatedImages[`costume_${chapterNum}`]?.length > 0 ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    已生成
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    生成图片
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {costume.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-[#FF5724]">{item.character}</h4>
                    {onUpdateItem && (
                      <Button
                        onClick={() => handleEditItem('costume', index, item)}
                        variant="ghost"
                        size="sm"
                        className="text-[#FF5724] hover:bg-orange-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>描述：</strong>{item.description}</p>
                    <p><strong>材质：</strong>{item.material}</p>
                    <p><strong>颜色：</strong>{item.color}</p>
                    <p><strong>风格：</strong>{item.style}</p>
                    <p><strong>用途：</strong>{item.purpose}</p>
                  </div>
                </div>
              ))}
            </div>
            {generatedImages[`costume_${chapterNum}`] && generatedImages[`costume_${chapterNum}`].length > 0 && (
              <div className="mt-6">
                <Separator className="my-4 bg-orange-200" />
                <h4 className="font-semibold mb-4 text-[#FF5724] flex items-center gap-2">
                  🖼️ 参考图片
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {generatedImages[`costume_${chapterNum}`].map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-800 hover:border-[#FF5724] transition-all cursor-pointer group shadow-md hover:shadow-xl"
                      onClick={() => onPreviewImage(url)}
                    >
                      <img
                        src={addCacheBuster(url)}
                        alt={`服装参考${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 化妆分析 */}
      {makeup.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">💄 化妆分析</CardTitle>
                <CardDescription>角色化妆效果要求</CardDescription>
              </div>
              {/* 化妆分析不提供图片生成功能 */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {makeup.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-[#FF5724]">{item.character}</h4>
                    {onUpdateItem && (
                      <Button
                        onClick={() => handleEditItem('makeup', index, item)}
                        variant="ghost"
                        size="sm"
                        className="text-[#FF5724] hover:bg-orange-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>描述：</strong>{item.description}</p>
                    <p><strong>风格：</strong>{item.style}</p>
                    <p><strong>细节：</strong>{item.details}</p>
                    <p><strong>情绪：</strong>{item.emotion}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* 化妆分析不显示参考图片 */}
          </CardContent>
        </Card>
      )}

      {/* 道具分析 */}
      {props.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">🎭 道具分析</CardTitle>
                <CardDescription>拍摄所需道具清单</CardDescription>
              </div>
              <Button
                onClick={() => onGenerateImages(`props_${chapterNum}`, props)}
                disabled={generatingImages[`props_${chapterNum}`] || props.length === 0}
                variant="outline"
                className="border-[#FF5724] bg-[#FF5724] text-white w-full sm:w-auto"
              >
                {generatingImages[`props_${chapterNum}`] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : generatedImages[`props_${chapterNum}`]?.length > 0 ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    已生成
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    生成图片
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {props.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-[#FF5724]">{item.name}</h4>
                    {onUpdateItem && (
                      <Button
                        onClick={() => handleEditItem('props', index, item)}
                        variant="ghost"
                        size="sm"
                        className="text-[#FF5724] hover:bg-orange-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>描述：</strong>{item.description}</p>
                    <p><strong>功能：</strong>{item.function}</p>
                    <p><strong>剧情关联：</strong>{item.plot_relevance}</p>
                  </div>
                </div>
              ))}
            </div>
            {generatedImages[`props_${chapterNum}`] && generatedImages[`props_${chapterNum}`].length > 0 && (
              <div className="mt-6">
                <Separator className="my-4 bg-orange-200" />
                <h4 className="font-semibold mb-4 text-[#FF5724] flex items-center gap-2">
                  🖼️ 参考图片
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {generatedImages[`props_${chapterNum}`].map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-800 hover:border-[#FF5724] transition-all cursor-pointer group shadow-md hover:shadow-xl"
                      onClick={() => onPreviewImage(url)}
                    >
                      <img
                        src={addCacheBuster(url)}
                        alt={`道具参考${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 布景分析 */}
      {scene.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">🏛️ 布景分析</CardTitle>
                <CardDescription>场景布置与氛围营造</CardDescription>
              </div>
              <Button
                onClick={() => onGenerateImages(`scene_${chapterNum}`, scene)}
                disabled={generatingImages[`scene_${chapterNum}`] || scene.length === 0}
                variant="outline"
                className="border-[#FF5724] bg-[#FF5724] text-white w-full sm:w-auto"
              >
                {generatingImages[`scene_${chapterNum}`] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : generatedImages[`scene_${chapterNum}`]?.length > 0 ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    已生成
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    生成图片
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scene.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-[#FF5724]">{item.location}</h4>
                    {onUpdateItem && (
                      <Button
                        onClick={() => handleEditItem('scene', index, item)}
                        variant="ghost"
                        size="sm"
                        className="text-[#FF5724] hover:bg-orange-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>布局：</strong>{item.layout}</p>
                    <p><strong>装饰：</strong>{item.decoration}</p>
                    <p><strong>氛围：</strong>{item.atmosphere}</p>
                    <p><strong>光源：</strong>{item.lighting}</p>
                  </div>
                </div>
              ))}
            </div>
            {generatedImages[`scene_${chapterNum}`] && generatedImages[`scene_${chapterNum}`].length > 0 && (
              <div className="mt-6">
                <Separator className="my-4 bg-orange-200" />
                <h4 className="font-semibold mb-4 text-[#FF5724] flex items-center gap-2">
                  🖼️ 参考图片
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {generatedImages[`scene_${chapterNum}`].map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-800 hover:border-[#FF5724] transition-all cursor-pointer group shadow-md hover:shadow-xl"
                      onClick={() => onPreviewImage(url)}
                    >
                      <img
                        src={addCacheBuster(url)}
                        alt={`布景参考${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 造型逻辑分析 */}
      {stylingLogic.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">🎨 造型逻辑分析</CardTitle>
            <CardDescription>造型设计的内在逻辑与关联</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stylingLogic.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold mb-2 text-[#FF5724]">{item.aspect}</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>逻辑说明：</strong>{item.logic}</p>
                    <p><strong>角色反映：</strong>{item.character_reflection}</p>
                    <p><strong>剧情联系：</strong>{item.plot_connection}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 综合分析 */}
      {overallAnalysis.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-[#FF5724] dark:text-orange-400 flex items-center gap-2">📊 综合分析</CardTitle>
            <CardDescription>整体制作建议与协调要求</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overallAnalysis.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold mb-2 text-[#FF5724]">{item.category}</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>建议：</strong>{item.suggestion}</p>
                    <p><strong>协调要求：</strong>{item.coordination}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#FF5724] flex items-center gap-2">
              <Edit className="h-5 w-5" />
              编辑分析内容
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {editingItem && (
              <AnalysisItemEditor
                type={editingItem.type}
                item={editingItem.data}
                onSave={handleSaveItem}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setEditingItem(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
