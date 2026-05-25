import client from './client'
import type { ResBody } from '../types/api'
import type { Question, CreateQuestion, UpdateQuestion } from '../types/question'

/**
 * 新增题目
 */
export const createQuestion = (data: CreateQuestion) =>
  client.post<ResBody<Question>>('/questions', data)

/**
 * 获取全部题目
 */
export const getAllQuestions = () =>
  client.get<ResBody<Question[]>>('/questions')

/**
 * 获取单个题目
 */
export const getQuestion = (id: string) =>
  client.get<ResBody<Question>>(`/questions/${id}`)

/**
 * 修改题目
 */
export const updateQuestion = (id: string, data: UpdateQuestion) =>
  client.put<ResBody<Question>>(`/questions/${id}`, data)

/**
 * 删除单个题目
 */
export const deleteQuestion = (id: string) =>
  client.delete<ResBody<null>>(`/questions/${id}`)

/**
 * 删除全部题目
 */
export const deleteAllQuestions = () =>
  client.delete<ResBody<null>>('/questions')
