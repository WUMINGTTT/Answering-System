import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 响应拦截器：统一提取 data
// client.interceptors.response.use(
//   (response) => response.data,
//   (error) => {
//     const message = error.response?.data?.message || error.message || '请求失败'
//     console.error('[API Error]', message)
//     return Promise.reject(error)
//   },
// )

export default client
