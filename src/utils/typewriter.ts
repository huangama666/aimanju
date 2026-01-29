/**
 * 打字机特效工具函数
 * 实现逐字显示文本的动画效果
 */

export interface TypewriterOptions {
  /** 每个字符的延迟时间（毫秒） */
  delay?: number;
  /** 每次更新的回调函数 */
  onUpdate: (currentText: string) => void;
  /** 完成时的回调函数 */
  onComplete?: () => void;
  /** 是否可以被中断 */
  canInterrupt?: boolean;
}

/**
 * 打字机特效类
 */
export class Typewriter {
  private text: string = '';
  private currentIndex: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private options: Required<TypewriterOptions>;

  constructor(text: string, options: TypewriterOptions) {
    this.text = text;
    this.options = {
      delay: options.delay || 30, // 默认30ms，约每秒33个字符
      onUpdate: options.onUpdate,
      onComplete: options.onComplete || (() => {}),
      canInterrupt: options.canInterrupt !== false,
    };
  }

  /**
   * 开始打字机动画
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ [打字机] 动画已在运行中');
      return;
    }

    console.log('⌨️ [打字机] 开始动画，文本长度:', this.text.length);
    this.isRunning = true;
    this.currentIndex = 0;
    this.type();
  }

  /**
   * 停止打字机动画
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('⏹️ [打字机] 动画已停止');
  }

  /**
   * 立即完成动画（显示全部文本）
   */
  complete(): void {
    this.stop();
    this.options.onUpdate(this.text);
    this.options.onComplete();
    console.log('✅ [打字机] 动画已完成（立即）');
  }

  /**
   * 检查是否正在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 执行打字动画
   */
  private type(): void {
    if (this.currentIndex < this.text.length) {
      this.currentIndex++;
      const currentText = this.text.substring(0, this.currentIndex);
      this.options.onUpdate(currentText);

      this.timer = setTimeout(() => {
        this.type();
      }, this.options.delay);
    } else {
      this.isRunning = false;
      this.options.onComplete();
      console.log('✅ [打字机] 动画已完成');
    }
  }
}

/**
 * 简化的打字机函数
 * @param text 要显示的文本
 * @param options 配置选项
 * @returns Typewriter实例
 */
export function createTypewriter(
  text: string,
  options: TypewriterOptions
): Typewriter {
  return new Typewriter(text, options);
}

/**
 * 计算合适的打字速度
 * 根据文本长度自动调整速度，确保用户体验
 * @param textLength 文本长度
 * @returns 延迟时间（毫秒）
 */
export function calculateTypewriterDelay(textLength: number): number {
  if (textLength < 50) {
    return 50; // 短文本：慢速，每秒20字符
  }
  if (textLength < 150) {
    return 30; // 中等文本：中速，每秒33字符
  }
  if (textLength < 300) {
    return 20; // 长文本：快速，每秒50字符
  }
  return 15; // 超长文本：超快速，每秒67字符
}
