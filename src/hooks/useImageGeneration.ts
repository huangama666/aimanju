import { useState, useCallback } from 'react';
import api from '@/utils/api';
import type { ImageTask } from '@/types/novel';

export const useImageGeneration = () => {
  const [tasks, setTasks] = useState<Map<string, ImageTask>>(new Map());

  const createImageTask = useCallback(async (prompt: string, referenceImage?: string) => {
    try {
      console.log('📤 [useImageGeneration] 准备发送请求');
      console.log('📝 [useImageGeneration] prompt参数:', prompt);
      console.log('🖼️ [useImageGeneration] referenceImage参数:', referenceImage);
      console.log('📦 [useImageGeneration] 请求数据:', {
        prompt,
        image: referenceImage,
      });

      const response = await api.createImageTask({
        prompt,
        image: referenceImage,
      });

      console.log('📥 [useImageGeneration] API响应:', response);

      if (response.status === 0 && response.data?.task_id) {
        const taskId = response.data.task_id;
        const newTask: ImageTask = {
          taskId,
          status: 'INIT',
          progress: 0,
        };

        setTasks(prev => new Map(prev.set(taskId, newTask)));
        
        // 开始轮询任务状态
        pollTaskStatus(taskId);
        
        return taskId;
      } else {
        throw new Error((response as any).msg || 'invalid parameter prompt');
      }
    } catch (error) {
      console.error('创建图片生成任务失败:', error);
      throw error;
    }
  }, []);

  const pollTaskStatus = useCallback(async (taskId: string) => {
    const maxAttempts = 60; // 最多轮询60次（10分钟）
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`轮询任务 ${taskId} 状态，第 ${attempts} 次尝试`);
        
        const response = await api.getImageResult(taskId);
        console.log('任务状态响应:', response);

        if (response.status === 0 && response.data) {
          const { task_status, task_progress_detail, sub_task_result_list } = response.data;
          
          const updatedTask: ImageTask = {
            taskId,
            status: task_status,
            progress: task_progress_detail || 0,
          };

          // 检查是否有生成的图片
          if (task_status === 'SUCCESS' && sub_task_result_list?.[0]?.final_image_list?.[0]) {
            updatedTask.imageUrl = sub_task_result_list[0].final_image_list[0].img_url;
            console.log('图片生成成功:', updatedTask.imageUrl);
          } else if (task_status === 'FAILED') {
            updatedTask.error = sub_task_result_list?.[0]?.sub_task_error_code === '501' 
              ? '内容违规，请修改描述' 
              : '图片生成失败';
            console.log('图片生成失败:', updatedTask.error);
          }

          setTasks(prev => new Map(prev.set(taskId, updatedTask)));

          // 如果任务未完成且未达到最大尝试次数，继续轮询
          if (task_status !== 'SUCCESS' && task_status !== 'FAILED' && attempts < maxAttempts) {
            console.log(`任务未完成，${task_status}，10秒后继续轮询`);
            setTimeout(poll, 10000); // 10秒后再次轮询
          } else if (attempts >= maxAttempts && task_status !== 'SUCCESS') {
            // 超时处理
            console.log('任务超时');
            setTasks(prev => new Map(prev.set(taskId, {
              ...updatedTask,
              status: 'FAILED',
              error: '生成超时，请重试'
            })));
          }
        } else {
          throw new Error((response as any).msg || '查询任务状态失败');
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
        
        // 如果是QPS限制错误，继续重试
        if (error instanceof Error && (error.message.includes('QPS') || error.message.includes('18'))) {
          if (attempts < maxAttempts) {
            console.log('QPS限制，15秒后重试');
            setTimeout(poll, 15000); // QPS限制时等待更长时间
          }
          return;
        }

        // 其他错误，标记任务失败
        setTasks(prev => new Map(prev.set(taskId, {
          taskId,
          status: 'FAILED',
          progress: 0,
          error: error instanceof Error ? error.message : '未知错误'
        })));
      }
    };

    // 开始轮询
    setTimeout(poll, 5000); // 5秒后开始第一次轮询
  }, []);

  const getTaskStatus = useCallback((taskId: string) => {
    return tasks.get(taskId);
  }, [tasks]);

  const clearTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const newTasks = new Map(prev);
      newTasks.delete(taskId);
      return newTasks;
    });
  }, []);

  return {
    createImageTask,
    getTaskStatus,
    clearTask,
    tasks: Array.from(tasks.values()),
  };
};