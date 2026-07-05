/**
 * questions.ts —— 题目管理相关的 API 调用函数
 *
 * 【技术学习】
 * 本文件封装了与"题目"资源相关的所有 HTTP 请求，遵循 RESTful 风格：
 *
 *   HTTP 方法     端点                   用途           对应函数
 *   ─────────────────────────────────────────────────────────────
 *   POST         /questions            创建题目        createQuestion
 *   GET          /questions            获取全部题目     getAllQuestions
 *   GET          /questions/:id        获取单个题目     getQuestion
 *   PUT          /questions/:id        修改题目        updateQuestion
 *   DELETE       /questions/:id        删除单个题目     deleteQuestion
 *   DELETE       /questions            删除全部题目     deleteAllQuestions
 *
 * RESTful 设计原则：
 * - 用 HTTP 方法（GET/POST/PUT/DELETE）表示"做什么操作"
 * - 用 URL 路径表示"操作哪个资源"
 * - 相同的 URL 路径 + 不同的 HTTP 方法 = 不同的操作
 *
 * 每个函数都是 async 风格（返回 Promise），
 * 调用时可以用 .then()/.catch() 或 async/await 来处理结果。
 */

import client from './client'
import type { ResBody } from '../types/api'
import type { Question, CreateQuestion, UpdateQuestion } from '../types/question'

/**
 * 新增题目
 *
 * @param data - 创建题目所需的数据（不包含 id，id 由后端自动生成）
 * @returns 包含新建题目完整信息的响应
 *
 * 【技术学习】
 * client.post<ResBody<Question>>() 中的泛型参数告诉 TypeScript：
 * - 请求返回的响应体结构是 ResBody<Question>
 * - 即 response.data 的类型是 { code, message, data: Question }
 * 这样在 await 调用后，IDE 可以自动补全 Question 的属性。
 *
 * 对应 HTTP 请求：
 *   POST /api/questions
 *   Body: { type, category, stem, options, answers, score }
 */
export const createQuestion = (data: CreateQuestion) =>
  client.post<ResBody<Question>>('/questions', data)

/**
 * 获取全部题目列表
 *
 * @returns 包含题目数组的响应
 *
 * 【技术学习】
 * 泛型参数 ResBody<Question[]> 表示返回的 data 是一个 Question 数组。
 * 不需要传参，所以函数体只有 client.get 一行。
 * 箭头函数省略了 return 和花括号（隐式返回）。
 *
 * 对应 HTTP 请求：
 *   GET /api/questions
 */
export const getAllQuestions = () =>
  client.get<ResBody<Question[]>>('/questions')

/**
 * 获取单个题目（根据 id）
 *
 * @param id - 题目的唯一标识
 * @returns 包含单个题目信息的响应
 *
 * 【技术学习】
 * 模板字符串（反引号 + ${id}）用于动态拼接 URL 路径。
 * 例如 id 为 'abc123' 时，实际请求路径为 '/questions/abc123'。
 *
 * 对应 HTTP 请求：
 *   GET /api/questions/:id
 */
export const getQuestion = (id: string) =>
  client.get<ResBody<Question>>(`/questions/${id}`)

/**
 * 修改题目
 *
 * @param id   - 要修改的题目 id
 * @param data - 要修改的字段（只传需要改的部分即可）
 * @returns 修改后的完整题目信息
 *
 * 【技术学习】
 * 使用 PUT 方法表示"替换/更新资源"。
 * UpdateQuestion 是 Partial 类型，所有字段可选，
 * 所以可以只传 { score: 20 } 来单独修改分值。
 *
 * 对应 HTTP 请求：
 *   PUT /api/questions/:id
 *   Body: { 需要修改的字段 }
 */
export const updateQuestion = (id: string, data: UpdateQuestion) =>
  client.put<ResBody<Question>>(`/questions/${id}`, data)

/**
 * 删除单个题目
 *
 * @param id - 要删除的题目 id
 * @returns 响应中 data 为 null（删除操作不返回业务数据）
 *
 * 【技术学习】
 * DELETE 请求的响应体通常没有有意义的业务数据，
 * 所以泛型参数使用 ResBody<null>，表示 data 字段为空。
 *
 * 对应 HTTP 请求：
 *   DELETE /api/questions/:id
 */
export const deleteQuestion = (id: string) =>
  client.delete<ResBody<null>>(`/questions/${id}`)

/**
 * 删除全部题目
 *
 * @returns 响应中 data 为 null
 *
 * 【技术学习】
 * 这是一个"危险操作"，删除后不可恢复。
 * 在实际项目中，通常需要二次确认弹窗来防止误操作。
 *
 * 对应 HTTP 请求：
 *   DELETE /api/questions
 */
export const deleteAllQuestions = () =>
  client.delete<ResBody<null>>('/questions')
