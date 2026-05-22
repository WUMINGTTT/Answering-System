import client from './client'
import type { ApiResponse } from '../types/api'
import type { Question, CreateQuestion, UpdateQuestion } from '../types/question'

/**
 * POST /api/questions
 * 添加问题
 *  */
export function createQuestion(data: CreateQuestion) {
  return client.post<ApiResponse<Question>>('/questions', data)
}

/**
 * GET /api/questions
 * 获取所有问题
 *  */
export function getAllQuestions() {
  return client.get<ApiResponse<Question[]>>('/questions')
}

/**
 * GET /api/questions/:id
 * 获取问题
 *  */
export function getQuestion(id: string) {
  return client.get<ApiResponse<Question>>(`/questions/${id}`)
}

/**
 * PUT /api/questions/:id
 * 修改问题
 *  */
export function updateQuestion(id: string, data: UpdateQuestion) {
  return client.put<ApiResponse<Question>>(`/questions/${id}`, data)
}

/**
 * DELETE /api/questions/:id
 * 删除问题
 *  */
export function deleteQuestion(id: string) {
  return client.delete<ApiResponse<null>>(`/questions/${id}`)
}

/**
 * DELETE /api/questions
 * 删除所有问题
 *  */
export function deleteAllQuestions() {
  return client.delete<ApiResponse<null>>('/questions')
}
