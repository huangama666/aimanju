// 为小说生成封面的脚本
const axios = require('axios');

const APP_ID = process.env.VITE_APP_ID;
const NOVEL_ID = 'ed703416-8c62-47c8-ab7f-6569a6ba56f9';
const NOVEL_TITLE = '《签到修仙：三年杂役逆天成神》';
const NOVEL_TYPE = 'fantasy';
const NOVEL_DESCRIPTION = '穿越修仙世界三年的杂役林逸，在绝望中觉醒签到系统"岁华录"，从洗髓丹逆天改命开始，一路逆袭打脸。';

// 创建封面生成提示词
function createCoverPrompt(title, genre, description) {
  const genreStyles = {
    'fantasy': '仙侠玄幻风格，云雾缭绕，仙山楼阁，金光闪闪',
    '玄幻': '仙侠玄幻风格，云雾缭绕，仙山楼阁，金光闪闪',
    '都市': '现代都市风格，高楼大厦，霓虹灯光，时尚现代',
    '历史': '古代历史风格，古典建筑，传统服饰，水墨画风',
    '科幻': '未来科幻风格，太空场景，机械科技，蓝色光效',
    '武侠': '武侠江湖风格，山水意境，刀剑武器，中国风',
    '言情': '浪漫唯美风格，樱花飞舞，温馨色调，梦幻氛围',
    '悬疑': '神秘悬疑风格，阴暗色调，迷雾重重，紧张氛围',
    '奇幻': '奇幻魔法风格，魔法光效，神秘符文，梦幻色彩'
  };

  const styleDesc = genreStyles[genre] || '精美插画风格，色彩丰富，构图精美';
  
  return `小说封面设计，标题：${title}，${styleDesc}，国漫风格，精美插画，高质量，专业设计，书籍封面，竖版构图，9:16`;
}

// 提交封面生成任务
async function submitCoverTask(prompt) {
  console.log('📝 提交封面生成任务...');
  console.log('提示词:', prompt);
  
  const response = await axios.post(
    'https://miaoda.baidu.com/api/miaoda/runtime/apicenter/source/proxy/iragtextToImageiiVMkBQMEHfZ6rd',
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

  console.log('✅ 任务提交成功，任务ID:', response.data.data.task_id);
  return response.data.data.task_id;
}

// 查询封面生成结果
async function pollCoverResult(taskId) {
  const maxAttempts = 30;
  const pollInterval = 3000;

  console.log('⏳ 开始轮询任务结果...');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.post(
        'https://miaoda.baidu.com/api/miaoda/runtime/apicenter/source/proxy/iraggetImgjWUTzny87hoV6fSaYzr2Rj',
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
      console.log(`🔄 第${attempt + 1}次查询，状态: ${data.task_status}, 进度: ${data.task_progress_detail || 0}%`);
      
      if (data.task_status === 'SUCCESS') {
        const subTaskList = data.sub_task_result_list;
        if (subTaskList && subTaskList.length > 0) {
          const firstSubTask = subTaskList[0];
          if (firstSubTask.final_image_list && firstSubTask.final_image_list.length > 0) {
            const imageUrl = firstSubTask.final_image_list[0].img_url;
            console.log('✅ 封面生成成功！');
            console.log('图片URL:', imageUrl);
            return imageUrl;
          }
        }
        throw new Error('封面生成完成但未找到图片');
      } else if (data.task_status === 'FAILED') {
        throw new Error('封面生成失败');
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('封面生成超时，请稍后重试');
}

// 更新数据库
async function updateNovelCover(novelId, coverUrl) {
  console.log('💾 更新数据库...');
  
  // 这里需要使用 Supabase 更新数据库
  // 由于这是 Node.js 脚本，我们需要输出 SQL 语句
  console.log('请执行以下 SQL 语句更新数据库:');
  console.log(`UPDATE novels SET novel_thumb = '${coverUrl}', updated_at = NOW() WHERE id = '${novelId}';`);
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始生成小说封面...');
    console.log('小说ID:', NOVEL_ID);
    console.log('小说标题:', NOVEL_TITLE);
    console.log('小说类型:', NOVEL_TYPE);
    console.log('---');
    
    // 1. 创建提示词
    const prompt = createCoverPrompt(NOVEL_TITLE, NOVEL_TYPE, NOVEL_DESCRIPTION);
    
    // 2. 提交任务
    const taskId = await submitCoverTask(prompt);
    
    // 3. 轮询结果
    const imageUrl = await pollCoverResult(taskId);
    
    // 4. 更新数据库
    await updateNovelCover(NOVEL_ID, imageUrl);
    
    console.log('---');
    console.log('🎉 封面生成完成！');
    console.log('封面URL:', imageUrl);
    
  } catch (error) {
    console.error('❌ 封面生成失败:', error.message);
    process.exit(1);
  }
}

main();
