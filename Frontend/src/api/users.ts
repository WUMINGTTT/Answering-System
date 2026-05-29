import client from './client'
import type { ResBody } from '../types/api'
import type { User, CreateUser, RegisterUser, LoginUser, UpdateUser } from '../types/user'

/**
 * 用户注册
 */
export const register = (data: RegisterUser) =>
  client.post<ResBody<User>>('/users/register', data)

/**
 * 获取当前登录用户（通过 cookie）
 */
export const getMe = () =>
  client.get<ResBody<User>>('/users/me')

/**
 * 用户登录
 */
export const login = (data: LoginUser) =>
  client.post<ResBody<User>>('/users/login', data)

/**
 * 新增用户（管理员创建）
 */
export const createUser = (data: CreateUser) =>
  client.post<ResBody<User>>('/users', data)

/**
 * 获取全部用户
 */
export const getAllUsers = () =>
  client.get<ResBody<User[]>>('/users')

/**
 * 获取单个用户
 */
export const getUser = (id: string) =>
  client.get<ResBody<User>>(`/users/${id}`)

/**
 * 修改用户信息
 */
export const updateUser = (id: string, data: UpdateUser) =>
  client.put<ResBody<User>>(`/users/${id}`, data)

/**
 * 删除单个用户
 */
export const deleteUser = (id: string) =>
  client.delete<ResBody<null>>(`/users/${id}`)

/**
 * 删除全部用户
 */
export const deleteAllUsers = () =>
  client.delete<ResBody<null>>('/users')
