import client from './client'
import type { ResBody } from '../types/api'
import type { ScoreDetail, CreateScore } from '../types/score'

/**
 * 添加得分
 */
export const addScore = (userId: string, data: CreateScore) =>
  client.post<ResBody<ScoreDetail>>(`/users/${userId}/scores`, data)

/**
 * 删除单条得分
 */
export const deleteScore = (userId: string, scoreId: string) =>
  client.delete<ResBody<null>>(`/users/${userId}/scores/${scoreId}`)

/**
 * 删除全部得分
 */
export const deleteAllScores = (userId: string) =>
  client.delete<ResBody<null>>(`/users/${userId}/scores`)
