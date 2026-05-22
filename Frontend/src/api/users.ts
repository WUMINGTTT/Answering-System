import client from './client'
import type { ApiResponse } from '../types/api'
import type { User, CreateUser, RegisterUser, LoginUser, UpdateUser } from '../types/user'
/**
 *  POST /api/users/register
 *  用户注册
 *  */
export function register(data: RegisterUser) {
  return client.post<ApiResponse<User>>('/users/register', data)
}

/**
 * POST /api/users/login
 * 用户登录
 *  */
export function login(data: LoginUser) {
  return client.post<ApiResponse<User>>('/users/login', data)
}

/**
 * POST /api/users
 * 添加用户
 *  */
export function createUser(data: CreateUser) {
  return client.post<ApiResponse<User>>('/users', data)
}

/** 
 * GET /api/users
 * 获取所有用户
 *  */
export function getAllUsers() {
  return client.get<ApiResponse<User[]>>('/users')
}

/** 
 * GET /api/users/:id 
 * 获取用户
 * */
export function getUser(id: string) {
  return client.get<ApiResponse<User>>(`/users/${id}`)
}

/** 
 * PUT /api/users/:id 
 * 修改用户
 * */
export function updateUser(id: string, data: UpdateUser) {
  return client.put<ApiResponse<User>>(`/users/${id}`, data)
}

/** 
 * DELETE /api/users/:id
 * 删除用户
 *  */
export function deleteUser(id: string) {
  return client.delete<ApiResponse<null>>(`/users/${id}`)
}

/** 
 * DELETE /api/users
 * 删除所有用户
 *  */
export function deleteAllUsers() {
  return client.delete<ApiResponse<null>>('/users')
}
