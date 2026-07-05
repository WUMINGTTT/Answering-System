/**
 * client.ts —— Axios HTTP 客户端实例
 *
 * 【技术学习】
 * Axios 是一个基于 Promise 的 HTTP 客户端库，用于浏览器和 Node.js。
 * 它比原生 fetch() 更方便，提供了：
 * - 自动 JSON 序列化/反序列化
 * - 请求/响应拦截器（统一处理 token、错误等）
 * - 更简洁的 API（get/post/put/delete）
 * - 超时控制、取消请求等内置功能
 *
 * 项目中所有的 API 请求都通过这个文件导出的 client 实例发出，
 * 这样只需在一个地方配置 baseURL、超时、请求头等公共参数。
 */

import axios from 'axios'

/**
 * 创建 Axios 实例并配置默认参数
 *
 * 【技术学习】各配置项的作用：
 *
 * 1. baseURL: '/api'
 *    - 设置请求的基础路径前缀
 *    - 所有请求 URL 会自动拼接此前缀，例如
 *      client.get('/questions') 实际请求的是 '/api/questions'
 *    - 在开发环境中，Vite 的 devServer.proxy 会把 /api 开头的请求
 *      代理到后端服务器（通常在 vite.config.ts 中配置），
 *      这样前端可以直接用相对路径，不需要硬编码后端地址
 *    - 在生产环境中，Nginx 等反向代理同样会处理 /api 前缀
 *
 * 2. timeout: 10000
 *    - 请求超时时间，单位是毫秒（这里设置为 10 秒）
 *    - 超过此时间未收到响应，Axios 会自动取消请求并抛出错误
 *    - 防止请求长时间挂起导致用户界面卡住
 *
 * 3. headers: { 'Content-Type': 'application/json' }
 *    - 告诉后端"请求体的格式是 JSON"
 *    - 这是前后端 JSON 通信的标准配置
 *    - 后端据此使用 JSON 解析器来读取请求体
 */
const client = axios.create({
  /** API 基础路径，与 Vite 代理配置配合使用 */
  baseURL: '/api',

  /** 请求超时时间：10 秒 */
  timeout: 10000,

  /** 默认请求头，声明请求体为 JSON 格式 */
  headers: { 'Content-Type': 'application/json' },
})

/**
 * 【技术学习】请求拦截器（Request Interceptor）
 *
 * 如果需要在每次请求前做一些统一处理（例如添加 Authorization token），
 * 可以在这里配置：
 *
 *   client.interceptors.request.use((config) => {
 *     const token = localStorage.getItem('token')
 *     if (token) {
 *       config.headers.Authorization = `Bearer ${token}`
 *     }
 *     return config
 *   })
 *
 * 本项目使用 Cookie 认证，所以不需要手动添加 token 头，
 * 浏览器会自动在请求中携带 Cookie。
 */

/**
 * 【技术学习】响应拦截器（Response Interceptor）
 *
 * 如果需要在每次响应后做统一处理（例如全局错误提示、401 跳转登录），
 * 可以在这里配置：
 *
 *   client.interceptors.response.use(
 *     (response) => response,        // 成功时直接返回
 *     (error) => {
 *       if (error.response?.status === 401) {
 *         // 未授权，跳转到登录页
 *         window.location.href = '/login'
 *       }
 *       return Promise.reject(error)
 *     }
 *   )
 */

export default client
