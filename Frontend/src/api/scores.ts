import client from './client'
import type { ApiResponse } from '../types/api'
import type { ScoreDetail, CreateScore } from '../types/score'

/**
 * POST /api/users/:id/scores
 * 添加用户分数
 *  */
export function addScore(userId: string, data: CreateScore) {
  return client.post<ApiResponse<ScoreDetail>>(`/users/${userId}/scores`, data)
}

/**
 * DELETE /api/users/:id/scores/:scoreId
 * 删除用户分数
 *  */
export function deleteScore(userId: string, scoreId: string) {
  return client.delete<ApiResponse<null>>(`/users/${userId}/scores/${scoreId}`)
}

/**
 * DELETE /api/users/:id/scores
 * 删除用户所有分数
 *  */
export function deleteAllScores(userId: string) {
  return client.delete<ApiResponse<null>>(`/users/${userId}/scores`)
}
