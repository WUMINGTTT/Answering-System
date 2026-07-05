/**
 * users.ts —— 用户管理相关的 API 调用函数
 *
 * 【技术学习】
 * 本文件封装了用户相关的所有 HTTP 请求，包括：
 *
 * 1. 认证相关（登录/注册/登出/获取当前用户）
 *    - 注册：创建新账号
 *    - 登录：验证身份并建立会话（通过 Cookie）
 *    - 登出：销毁会话
 *    - getMe：获取当前登录用户信息（通过 Cookie 识别身份）
 *
 * 2. 用户 CRUD（管理员操作）
 *    - 管理员可以创建、查询、修改、删除用户
 *
 * 关于 getMe 的机制：
 *   浏览器在登录成功后会收到后端设置的 Cookie（包含 session id），
 *   之后每次请求都会自动携带这个 Cookie。
 *   GET /users/me 端点根据 Cookie 识别当前用户，
 *   后端从 session 中读取用户信息并返回。
 *   这是基于 Cookie-Session 的认证方式，
 *   与 JWT（JSON Web Token）认证方式不同，无需手动在请求头中添加 token。
 */

import client from './client'
import type { ResBody } from '../types/api'
import type { User, CreateUser, RegisterUser, LoginUser, UpdateUser } from '../types/user'

/**
 * 用户注册（普通选手自行注册）
 *
 * @param data - 注册信息：昵称、用户名、密码
 * @returns 注册成功后的用户信息
 *
 * 【技术学习】
 * 注册使用 RegisterUser 类型，不包含 role 字段，
 * 角色由后端默认设为 'player'。
 *
 * 对应 HTTP 请求：
 *   POST /api/users/register
 *   Body: { nickname, username, password }
 */
export const register = (data: RegisterUser) =>
  client.post<ResBody<User>>('/users/register', data)

/**
 * 获取当前登录用户信息
 *
 * @returns 当前登录用户的完整信息
 *
 * 【技术学习】
 * 这个接口不需要传任何参数，因为它是通过 Cookie 来识别用户身份的。
 * 浏览器会自动在请求中携带 Cookie，后端根据 Cookie 中的 session id
 * 找到对应的用户并返回其信息。
 *
 * 常见用途：
 * - 页面刷新后恢复用户状态（App 初始化时调用）
 * - 检查用户是否仍然处于登录状态
 * - 获取最新的用户信息（如总分变化后）
 *
 * 对应 HTTP 请求：
 *   GET /api/users/me
 */
export const getMe = () =>
  client.get<ResBody<User>>('/users/me')

/**
 * 用户登录
 *
 * @param data - 登录信息：用户名和密码
 * @returns 登录成功后的用户信息
 *
 * 【技术学习】
 * 登录成功后，后端会在响应中设置 Cookie（Set-Cookie 头），
 * 浏览器收到后会自动保存这个 Cookie。
 * 之后的请求（如 getMe、getAllQuestions）都会自动携带这个 Cookie，
 * 实现"已登录"状态的维持。
 *
 * 对应 HTTP 请求：
 *   POST /api/users/login
 *   Body: { username, password }
 */
export const login = (data: LoginUser) =>
  client.post<ResBody<User>>('/users/login', data)

/**
 * 管理员创建用户
 *
 * @param data - 用户信息，包含角色（与注册不同，管理员可以指定角色）
 * @returns 创建成功的用户信息
 *
 * 【技术学习】
 * 与 register 的区别：
 * - register 是选手自行注册，角色固定为 player
 * - createUser 是管理员在后台添加用户，可以指定 role
 *
 * 对应 HTTP 请求：
 *   POST /api/users
 *   Body: { nickname, username, password, role }
 */
export const createUser = (data: CreateUser) =>
  client.post<ResBody<User>>('/users', data)

/**
 * 获取全部用户列表
 *
 * @returns 用户数组
 *
 * 对应 HTTP 请求：
 *   GET /api/users
 */
export const getAllUsers = () =>
  client.get<ResBody<User[]>>('/users')

/**
 * 获取单个用户（根据 id）
 *
 * @param id - 用户唯一标识
 * @returns 单个用户的完整信息
 *
 * 对应 HTTP 请求：
 *   GET /api/users/:id
 */
export const getUser = (id: string) =>
  client.get<ResBody<User>>(`/users/${id}`)

/**
 * 修改用户信息
 *
 * @param id   - 要修改的用户 id
 * @param data - 要修改的字段（Partial，所有字段可选）
 * @returns 修改后的用户信息
 *
 * 对应 HTTP 请求：
 *   PUT /api/users/:id
 */
export const updateUser = (id: string, data: UpdateUser) =>
  client.put<ResBody<User>>(`/users/${id}`, data)

/**
 * 删除单个用户
 *
 * @param id - 要删除的用户 id
 * @returns 响应中 data 为 null
 *
 * 对应 HTTP 请求：
 *   DELETE /api/users/:id
 */
export const deleteUser = (id: string) =>
  client.delete<ResBody<null>>(`/users/${id}`)

/**
 * 删除全部用户
 *
 * @returns 响应中 data 为 null
 *
 * 【技术学习】危险操作！通常需要二次确认。
 *
 * 对应 HTTP 请求：
 *   DELETE /api/users
 */
export const deleteAllUsers = () =>
  client.delete<ResBody<null>>('/users')

/**
 * 用户登出
 *
 * @returns 响应中 data 为 null
 *
 * 【技术学习】
 * 登出时后端会销毁 session 并清除 Cookie。
 * 调用成功后，前端通常需要清除本地的用户状态并跳转到登录页。
 *
 * 对应 HTTP 请求：
 *   POST /api/users/logout
 */
export const logout = () =>
  client.post<ResBody<null>>('/users/logout')
