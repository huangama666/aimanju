import axios from "axios";

const APP_ID = import.meta.env.VITE_APP_ID;

const apiClient = axios.create({
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    'X-App-Id': APP_ID
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error);
    if (error.response?.data?.status === 999) {
      throw new Error(error.response.data.msg);
    }
    return Promise.reject(error);
  }
);

const api = {
  // AI作画-iRAG版接口
  createImageTask: (data: {
    prompt: string;
    image?: string;
    url?: string;
    text_content?: string;
  }) => {
    console.log('🌐 [API] createImageTask 被调用');
    console.log('📦 [API] 请求数据:', data);
    console.log('🔑 [API] APP_ID:', APP_ID);
    return apiClient.post('/api/miaoda/runtime/apicenter/source/proxy/iragtextToImageiiVMkBQMEHfZ6rd', data);
  },

  // AI作画-iRAG版查询结果接口
  getImageResult: (taskId: string) => 
    apiClient.post('/api/miaoda/runtime/apicenter/source/proxy/iraggetImgjWUTzny87hoV6fSaYzr2Rj', { task_id: taskId }),

  get: (url: string) => apiClient.get(url),
  post: (url: string, data: any) => apiClient.post(url, data),
  put: (url: string, data: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),
};

export default api;