// 可拖拽的画布组件
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Move, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCacheBuster } from "@/utils/cache-buster";

// 画布元素类型
export interface CanvasElement {
  id: string;
  type: 'background' | 'character' | 'prop' | 'costume' | 'makeup';
  name: string;
  imageUrl: string;
  x: number; // 相对于画布的x坐标（百分比）
  y: number; // 相对于画布的y坐标（百分比）
  width: number; // 宽度（百分比）
  height: number; // 高度（百分比）
  zIndex: number; // 层级
}

interface DraggableCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onDrop: (imageUrl: string, name: string, type: string) => void;
  className?: string;
}

export function DraggableCanvas({ 
  elements, 
  onElementsChange, 
  onDrop,
  className 
}: DraggableCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // 处理从外部拖入图片
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const imageUrl = e.dataTransfer.getData('imageUrl');
    const name = e.dataTransfer.getData('name');
    const type = e.dataTransfer.getData('type');

    if (imageUrl && name && type) {
      // 检查是否已有背景
      const hasBackground = elements.some(el => el.type === 'background');
      
      if (!hasBackground && type !== 'scene') {
        alert('请先拖入布景图片作为背景！');
        return;
      }

      onDrop(imageUrl, name, type);
    }
  };

  // 处理画布内元素拖动开始
  const handleElementDragStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    
    const element = elements.find(el => el.id === elementId);
    if (!element || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const elementX = (element.x / 100) * rect.width;
    const elementY = (element.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - elementX,
      y: e.clientY - rect.top - elementY
    });

    setDraggingElement(elementId);
    setSelectedElement(elementId);
  };

  // 处理画布内元素拖动
  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingElement || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

    // 限制在画布范围内
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    const updatedElements = elements.map(el =>
      el.id === draggingElement
        ? { ...el, x: clampedX, y: clampedY }
        : el
    );

    onElementsChange(updatedElements);
  };

  // 处理画布内元素拖动结束
  const handleMouseUp = () => {
    setDraggingElement(null);
  };

  // 添加全局事件监听
  useEffect(() => {
    if (draggingElement) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingElement, dragOffset, elements]);

  // 删除元素
  const handleRemoveElement = (elementId: string) => {
    const updatedElements = elements.filter(el => el.id !== elementId);
    onElementsChange(updatedElements);
    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  };

  // 调整元素大小
  const handleResizeElement = (elementId: string, delta: number) => {
    const updatedElements = elements.map(el => {
      if (el.id === elementId) {
        const newWidth = Math.max(10, Math.min(100, el.width + delta));
        const newHeight = Math.max(10, Math.min(100, el.height + delta));
        return { ...el, width: newWidth, height: newHeight };
      }
      return el;
    });
    onElementsChange(updatedElements);
  };

  // 调整元素层级
  const handleChangeZIndex = (elementId: string, direction: 'up' | 'down') => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const updatedElements = elements.map(el => {
      if (el.id === elementId) {
        return { ...el, zIndex: direction === 'up' ? el.zIndex + 1 : el.zIndex - 1 };
      }
      return el;
    });

    onElementsChange(updatedElements);
  };

  // 获取背景元素
  const backgroundElement = elements.find(el => el.type === 'background');
  const foregroundElements = elements.filter(el => el.type !== 'background');

  // 计算元素的图片编号（用于提示词）
  // 背景是图1，角色和道具按添加顺序编号为图2、图3等
  // 服装和化妆不编号
  const getElementNumber = (element: CanvasElement): number | null => {
    if (element.type === 'background') {
      return 1;
    }
    
    // 服装和化妆不显示编号
    if (element.type === 'costume' || element.type === 'makeup') {
      return null;
    }
    
    // 角色和道具按添加顺序编号
    const numberedElements = elements.filter(el => 
      el.type === 'character' || el.type === 'prop'
    );
    
    const index = numberedElements.findIndex(el => el.id === element.id);
    return index >= 0 ? index + 2 : null; // 从2开始编号（因为背景是1）
  };

  return (
    <div className={cn("relative", className)}>
      {/* 画布 - 改为1:1比例，宽度为原来的50% */}
      <div
        ref={canvasRef}
        className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-dashed border-orange-300 dark:border-orange-700"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 背景图片 */}
        {backgroundElement ? (
          <div 
            className={cn(
              "absolute inset-0 w-full h-full cursor-pointer transition-shadow",
              selectedElement === backgroundElement.id && "ring-2 ring-[#FF5724] shadow-lg"
            )}
            onClick={() => setSelectedElement(backgroundElement.id)}
          >
            <img
              src={addCacheBuster(backgroundElement.imageUrl)}
              alt="背景"
              className="w-full h-full object-cover"
            />
            {/* 背景图片的编号标签 */}
            <div className="absolute top-2 left-2 bg-[#FF5724] text-white font-bold text-lg rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-10 pointer-events-none">
              1
            </div>
            
            {/* 背景控制按钮 */}
            {selectedElement === backgroundElement.id && (
              <div className="absolute top-2 right-2 flex gap-1 bg-white dark:bg-gray-800 rounded-md shadow-lg p-1 z-10">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveElement(backgroundElement.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">请先拖入布景图片</p>
              <p className="text-sm">从左侧"布景"选项卡拖拽图片到此处</p>
            </div>
          </div>
        )}

        {/* 前景元素 */}
        {foregroundElements
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(element => {
            const elementNumber = getElementNumber(element);
            
            return (
              <div
                key={element.id}
                className={cn(
                  "absolute cursor-move transition-shadow",
                  selectedElement === element.id && "ring-2 ring-[#FF5724] shadow-lg",
                  draggingElement === element.id && "opacity-70"
                )}
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  width: `${element.width}%`,
                  height: `${element.height}%`,
                  zIndex: element.zIndex
                }}
                onMouseDown={(e) => handleElementDragStart(e, element.id)}
                onClick={() => setSelectedElement(element.id)}
              >
                <img
                  src={addCacheBuster(element.imageUrl)}
                  alt={element.name}
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />

                {/* 元素编号标签 - 只显示角色和道具的编号 */}
                {elementNumber !== null && (
                  <div className="absolute top-1 left-1 bg-[#FF5724] text-white font-bold text-sm rounded-full w-6 h-6 flex items-center justify-center shadow-lg pointer-events-none">
                    {elementNumber}
                  </div>
                )}

                {/* 元素控制按钮 */}
                {selectedElement === element.id && (
                  <div className="absolute -top-8 left-0 flex gap-1 bg-white dark:bg-gray-800 rounded-md shadow-lg p-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResizeElement(element.id, 5);
                      }}
                    >
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResizeElement(element.id, -5);
                      }}
                    >
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeZIndex(element.id, 'up');
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeZIndex(element.id, 'down');
                      }}
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveElement(element.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* 画布信息 */}
      <div className="mt-2 text-sm text-muted-foreground">
        <p>已添加 {elements.length} 个元素</p>
        {selectedElement && (
          <p className="text-[#FF5724]">
            已选中: {elements.find(el => el.id === selectedElement)?.name}
          </p>
        )}
      </div>
    </div>
  );
}
