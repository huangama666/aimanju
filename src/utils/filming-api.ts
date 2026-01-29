// 码上拍戏相关API辅助函数
import axios from 'axios';

const APP_ID = import.meta.env.VITE_APP_ID;

// 重试配置
const MAX_RETRIES = 10;
const RETRY_DELAY = 2000; // 2秒

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== 虚拟试穿API ====================

/**
 * 创建虚拟试穿任务
 */
export async function createTryOnTask(humanImage: string, clothImage: string): Promise<string> {
  const response = await axios.post(
    'https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-l9nZ8EqWRq19/v1/images/kolors-virtual-try-on',
    {
      model_name: 'kolors-virtual-try-on-v1-5',
      human_image: humanImage,
      cloth_image: clothImage
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APP_ID}`,
        'X-App-Id': APP_ID
      }
    }
  );

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '创建虚拟试穿任务失败');
  }

  return response.data.data.task_id;
}

/**
 * 查询虚拟试穿任务状态
 */
export async function queryTryOnTask(taskId: string): Promise<{
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  imageUrl?: string;
  message?: string;
}> {
  const response = await axios.get(
    `https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-Xa6Jx4WMprqa/v1/images/kolors-virtual-try-on/${taskId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APP_ID}`,
        'X-App-Id': APP_ID
      }
    }
  );

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '查询虚拟试穿任务失败');
  }

  const data = response.data.data;
  return {
    status: data.task_status,
    imageUrl: data.task_result?.images?.[0]?.url,
    message: data.task_status_msg
  };
}

/**
 * 虚拟试穿（带重试）
 */
export async function tryOnWithRetry(
  humanImage: string,
  clothImage: string,
  onProgress?: (status: string, retryCount: number) => void
): Promise<string> {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      onProgress?.('创建任务中...', retryCount);
      const taskId = await createTryOnTask(humanImage, clothImage);

      // 轮询查询任务状态
      let pollCount = 0;
      const maxPollCount = 60; // 最多轮询60次（5分钟）

      while (pollCount < maxPollCount) {
        await delay(5000); // 每5秒查询一次
        
        onProgress?.('生成中...', retryCount);
        const result = await queryTryOnTask(taskId);

        if (result.status === 'succeed' && result.imageUrl) {
          return result.imageUrl;
        }

        if (result.status === 'failed') {
          throw new Error(result.message || '虚拟试穿失败');
        }

        pollCount++;
      }

      throw new Error('虚拟试穿超时');
    } catch (error) {
      retryCount++;
      console.error(`虚拟试穿失败（第${retryCount}次尝试）:`, error);

      if (retryCount >= MAX_RETRIES) {
        throw new Error(`虚拟试穿失败，已重试${MAX_RETRIES}次`);
      }

      onProgress?.(`重试中（${retryCount}/${MAX_RETRIES}）...`, retryCount);
      await delay(RETRY_DELAY);
    }
  }

  throw new Error('虚拟试穿失败');
}

// ==================== 图片生成与编辑（高级版）API ====================

/**
 * 将坐标转换为方位描述
 * @param x 横坐标百分比 (0-100)
 * @param y 纵坐标百分比 (0-100)
 * @returns 方位描述，如"左上方"、"正中央"等
 */
function coordinateToPosition(x: number, y: number): string {
  // 横向位置判断
  let horizontal = '';
  if (x < 33) {
    horizontal = '左';
  } else if (x > 67) {
    horizontal = '右';
  } else {
    horizontal = '中';
  }

  // 纵向位置判断
  let vertical = '';
  if (y < 33) {
    vertical = '上';
  } else if (y > 67) {
    vertical = '下';
  } else {
    vertical = '中';
  }

  // 组合方位描述
  if (horizontal === '中' && vertical === '中') {
    return '正中央';
  } else if (horizontal === '中' && vertical === '上') {
    return '正上方';
  } else if (horizontal === '中' && vertical === '下') {
    return '正下方';
  } else if (horizontal === '左' && vertical === '中') {
    return '垂直居左';
  } else if (horizontal === '右' && vertical === '中') {
    return '垂直居右';
  } else if (horizontal === '左' && vertical === '上') {
    return '左上方';
  } else if (horizontal === '右' && vertical === '上') {
    return '右上方';
  } else if (horizontal === '左' && vertical === '下') {
    return '左下方';
  } else if (horizontal === '右' && vertical === '下') {
    return '右下方';
  }

  return '正中央'; // 默认值
}

/**
 * 图片转Base64（浏览器兼容版本）
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  
  // 将ArrayBuffer转换为Base64
  const bytes = new Uint8Array(response.data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  return base64;
}

/**
 * 多图合成（带重试）
 * @param images 图片数组，包含URL、类型和坐标信息
 * @param prompt 基础提示词
 * @param onProgress 进度回调
 */
export async function compositeImagesWithRetry(
  images: Array<{ 
    url: string; 
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
    name?: string;
    type?: 'background' | 'character' | 'prop' | 'costume' | 'makeup';  // 元素类型
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    isBackground?: boolean;  // 标识是否为背景图片
  }>,
  prompt: string,
  onProgress?: (status: string, retryCount: number) => void
): Promise<string> {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      onProgress?.('准备图片数据...', retryCount);

      // 将所有图片转换为Base64
      const imageParts = await Promise.all(
        images.map(async (img) => {
          const base64 = await imageUrlToBase64(img.url);
          return {
            inline_data: {
              mime_type: img.mimeType,
              data: base64
            }
          };
        })
      );

      // 构建包含方位信息的完整提示词
      // 提示词格式：合成图片，图1是场景或背景图片，[用户输入的提示词]，图2的主体位置在[方位]，图3的主体位置在[方位]...
      let fullPrompt = '合成图片，图1是场景或背景图片';
      
      // 添加用户输入的提示词
      if (prompt) {
        fullPrompt += `，${prompt}`;
      }
      
      // 添加图片比例要求（1:1）
      fullPrompt += '，生成1:1比例的正方形图片';
      
      // 只添加角色和道具的方位信息（编号从2开始，因为背景图是图1）
      // 服装(costume)和化妆(makeup)不添加方位信息
      const elementsWithCoordinates = images.filter(img => 
        !img.isBackground && 
        (img.type === 'character' || img.type === 'prop') &&  // 只包含角色和道具
        img.name && 
        img.x !== undefined && 
        img.y !== undefined
      );
      
      if (elementsWithCoordinates.length > 0) {
        const positionInfo = elementsWithCoordinates
          .map((img, index) => {
            const position = coordinateToPosition(img.x!, img.y!);
            return `图${index + 2}的主体位置在${position}`;
          })
          .join('，');
        
        fullPrompt += `，${positionInfo}`;
      }

      // console.log('🎨 完整提示词:', fullPrompt);

      onProgress?.('生成合成图片...', retryCount);

      const response = await axios.post(
        'https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-Xa6JZ58oPMEa/api/miaoda/runtime/apicenter/source/proxy/api-Xa6JZ58oPMEa',
        {
          contents: [
            {
              parts: [
                ...imageParts,
                { text: fullPrompt }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Id': APP_ID
          },
          timeout: 300000 // 5分钟超时
        }
      );

      if (response.data.status !== 0) {
        throw new Error(response.data.msg || '图片合成失败');
      }

      // 提取生成的图片
      const text = response.data.candidates[0].content.parts[0].text;
      const match = text.match(/!\[image\]\((data:image\/[^;]+;base64,[^)]+)\)/);
      
      if (!match) {
        throw new Error('未找到生成的图片');
      }

      return match[1]; // 返回data URL
    } catch (error) {
      retryCount++;
      console.error(`图片合成失败（第${retryCount}次尝试）:`, error);

      if (retryCount >= MAX_RETRIES) {
        throw new Error(`图片合成失败，已重试${MAX_RETRIES}次`);
      }

      onProgress?.(`重试中（${retryCount}/${MAX_RETRIES}）...`, retryCount);
      await delay(RETRY_DELAY);
    }
  }

  throw new Error('图片合成失败');
}

// ==================== 图生视频API ====================

/**
 * 创建图生视频任务
 */
export async function createImage2VideoTask(
  imageUrl: string,
  prompt: string,
  duration: '5' | '10' = '5'
): Promise<string> {
  const response = await axios.post(
    'https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-716LeN8PYOmw/beta/video/generations/kling/image2video',
    {
      prompt,
      image: imageUrl,
      duration
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID
      }
    }
  );

  if (response.data.status !== 0) {
    throw new Error(response.data.msg || '创建图生视频任务失败');
  }

  return response.data.data.task_id;
}

/**
 * 查询图生视频任务状态
 */
export async function queryImage2VideoTask(taskId: string): Promise<{
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
  duration?: string;
  message?: string;
}> {
  const response = await axios.post(
    `https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-GKAa23nB9r0z/beta/video/generations/kling/image2video?task_id=${taskId}`,
    { task_id: taskId },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID
      }
    }
  );

  if (response.data.status !== 0) {
    throw new Error(response.data.msg || '查询图生视频任务失败');
  }

  const data = response.data.data;
  return {
    status: data.task_status,
    videoUrl: data.task_result?.videos?.[0]?.url,
    duration: data.task_result?.videos?.[0]?.duration,
    message: data.task_status_msg
  };
}

/**
 * 图生视频（带重试）
 */
export async function image2VideoWithRetry(
  imageUrl: string,
  prompt: string,
  duration: '5' | '10' = '5',
  onProgress?: (status: string, retryCount: number) => void
): Promise<{ videoUrl: string; duration: string }> {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      onProgress?.('创建视频任务...', retryCount);
      const taskId = await createImage2VideoTask(imageUrl, prompt, duration);

      // 轮询查询任务状态
      let pollCount = 0;
      const maxPollCount = 120; // 最多轮询120次（10分钟）

      while (pollCount < maxPollCount) {
        await delay(5000); // 每5秒查询一次
        
        onProgress?.('生成视频中...', retryCount);
        const result = await queryImage2VideoTask(taskId);

        if (result.status === 'succeed' && result.videoUrl) {
          return {
            videoUrl: result.videoUrl,
            duration: result.duration || duration
          };
        }

        if (result.status === 'failed') {
          throw new Error(result.message || '图生视频失败');
        }

        pollCount++;
      }

      throw new Error('图生视频超时');
    } catch (error) {
      retryCount++;
      console.error(`图生视频失败（第${retryCount}次尝试）:`, error);

      if (retryCount >= MAX_RETRIES) {
        throw new Error(`图生视频失败，已重试${MAX_RETRIES}次`);
      }

      onProgress?.(`重试中（${retryCount}/${MAX_RETRIES}）...`, retryCount);
      await delay(RETRY_DELAY);
    }
  }

  throw new Error('图生视频失败');
}
