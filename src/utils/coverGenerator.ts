import axios from 'axios';

const APP_ID = import.meta.env.VITE_APP_ID;

interface CoverGenerationTask {
  taskId: string;
  status: 'INIT' | 'WAIT' | 'RUNNING' | 'FAILED' | 'SUCCESS';
  progress: number;
  imageUrl?: string;
  error?: string;
}

/**
 * 生成小说封面图片
 * @param title 小说标题
 * @param genre 小说题材
 * @param description 小说简介
 * @returns Promise<string> 返回封面图片URL
 */
export const generateNovelCover = async (
  title: string,
  genre: string,
  description: string
): Promise<string> => {
  try {
    // 构建封面生成提示词
    const prompt = createCoverPrompt(title, genre, description);
    
    // 提交封面生成任务
    const taskId = await submitCoverTask(prompt);
    
    // 轮询查询结果
    const imageUrl = await pollCoverResult(taskId);
    
    return imageUrl;
  } catch (error) {
    console.error('封面生成失败:', error);
    throw new Error('封面生成失败，请稍后重试');
  }
};

/**
 * 创建封面生成提示词
 */
const createCoverPrompt = (title: string, genre: string, description: string): string => {
  const genreStyles = {
    '玄幻': '仙侠玄幻风格，云雾缭绕，仙山楼阁，金光闪闪',
    '都市': '现代都市风格，高楼大厦，霓虹灯光，时尚现代',
    '历史': '古代历史风格，古典建筑，传统服饰，水墨画风',
    '科幻': '未来科幻风格，太空场景，机械科技，蓝色光效',
    '武侠': '武侠江湖风格，山水意境，刀剑武器，中国风',
    '言情': '浪漫唯美风格，樱花飞舞，温馨色调，梦幻氛围',
    '悬疑': '神秘悬疑风格，阴暗色调，迷雾重重，紧张氛围',
    '奇幻': '奇幻魔法风格，魔法光效，神秘符文，梦幻色彩'
  };

  const styleDesc = genreStyles[genre as keyof typeof genreStyles] || '精美插画风格，色彩丰富，构图精美';
  
  return `小说封面设计，标题：${title}，${styleDesc}，国漫风格，精美插画，高质量，专业设计，书籍封面，竖版构图，9:16`;
};

/**
 * 提交封面生成任务
 */
const submitCoverTask = async (prompt: string): Promise<string> => {
  const response = await axios.post(
    '/api/miaoda/runtime/apicenter/source/proxy/iragtextToImageiiVMkBQMEHfZ6rd',
    {
      prompt: prompt
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID
      }
    }
  );

  if (response.data.status !== 0) {
    throw new Error(response.data.msg || '提交封面生成任务失败');
  }

  return response.data.data.task_id;
};

/**
 * 轮询查询封面生成结果
 */
const pollCoverResult = async (taskId: string): Promise<string> => {
  const maxAttempts = 30; // 最多轮询30次
  const pollInterval = 3000; // 每3秒轮询一次

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.post(
        '/api/miaoda/runtime/apicenter/source/proxy/iraggetImgjWUTzny87hoV6fSaYzr2Rj',
        {
          task_id: taskId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Id': APP_ID
          }
        }
      );

      if (response.data.status !== 0) {
        throw new Error(response.data.msg || '查询封面生成结果失败');
      }

      const data = response.data.data;
      
      if (data.task_status === 'SUCCESS') {
        // 任务成功完成
        const subTaskList = data.sub_task_result_list;
        if (subTaskList && subTaskList.length > 0) {
          const firstSubTask = subTaskList[0];
          if (firstSubTask.final_image_list && firstSubTask.final_image_list.length > 0) {
            return firstSubTask.final_image_list[0].img_url;
          }
        }
        throw new Error('封面生成完成但未找到图片');
      } else if (data.task_status === 'FAILED') {
        throw new Error('封面生成失败');
      }
      
      // 任务还在进行中，继续轮询
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('封面生成超时，请稍后重试');
};

/**
 * 获取封面生成任务状态
 */
export const getCoverTaskStatus = async (taskId: string): Promise<CoverGenerationTask> => {
  try {
    const response = await axios.post(
      '/api/miaoda/runtime/apicenter/source/proxy/iraggetImgjWUTzny87hoV6fSaYzr2Rj',
      {
        task_id: taskId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': APP_ID
        }
      }
    );

    if (response.data.status !== 0) {
      return {
        taskId,
        status: 'FAILED',
        progress: 0,
        error: response.data.msg || '查询失败'
      };
    }

    const data = response.data.data;
    let imageUrl: string | undefined;

    if (data.task_status === 'SUCCESS') {
      const subTaskList = data.sub_task_result_list;
      if (subTaskList && subTaskList.length > 0) {
        const firstSubTask = subTaskList[0];
        if (firstSubTask.final_image_list && firstSubTask.final_image_list.length > 0) {
          imageUrl = firstSubTask.final_image_list[0].img_url;
        }
      }
    }

    return {
      taskId,
      status: data.task_status,
      progress: data.task_progress_detail || 0,
      imageUrl
    };
  } catch (error) {
    return {
      taskId,
      status: 'FAILED',
      progress: 0,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
};