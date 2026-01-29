/**
 * 测试CORS解决方案
 * 
 * 使用方法：
 * 1. 在浏览器控制台中复制粘贴此代码
 * 2. 调用 testCORSSolution() 函数
 * 3. 查看控制台输出，确认图片上传成功
 */

async function testCORSSolution() {
  console.log('🧪 开始测试CORS解决方案...');
  
  // 测试图片URL（来自百度云存储）
  const testImageUrl = 'https://bj.bcebos.com/v1/ai-picture-creation/watermark_s/9_2218388232_0_final.png?authorization=bce-auth-v1%2FALTAKBvI5HDpIAzJaklvFTUfAz%2F2025-12-17T04%3A11%3A04Z%2F2592000%2F%2F1d9d95efb58d93ac461f9447c2e9f6acd6bf278e126a2363a77909b577f5190a';
  
  // 测试参数
  const bucketName = 'character-images';
  const filePath = `test/${Date.now()}_test.png`;
  
  try {
    console.log('📤 测试参数:');
    console.log('  - 图片URL:', testImageUrl);
    console.log('  - Bucket:', bucketName);
    console.log('  - 文件路径:', filePath);
    
    // 导入uploadImageToStorage函数
    const { uploadImageToStorage } = await import('./src/utils/storage-helper');
    
    console.log('⏳ 正在上传图片...');
    const storageUrl = await uploadImageToStorage(
      testImageUrl,
      bucketName,
      filePath
    );
    
    console.log('✅ 测试成功！');
    console.log('📍 Storage URL:', storageUrl);
    console.log('🎉 CORS问题已解决！图片已成功上传到Supabase Storage');
    
    return {
      success: true,
      storageUrl,
      message: 'CORS问题已解决'
    };
  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: '测试失败，请检查错误信息'
    };
  }
}

// 导出测试函数
if (typeof window !== 'undefined') {
  window.testCORSSolution = testCORSSolution;
  console.log('✅ 测试函数已加载，请在控制台中调用: testCORSSolution()');
}
