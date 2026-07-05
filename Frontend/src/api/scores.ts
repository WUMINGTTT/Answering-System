/**
 * scores.ts —— 得分管理相关的 API 调用函数
 *
 * 【技术学习】
 * 得分是挂在用户下面的"子资源"，采用嵌套路由设计：
 *   /users/:userId/scores          表示"某个用户的所有得分"
 *   /users/:userId/scores/:scoreId 表示"某个用户的某条得分"
 *
 * 这种嵌套路由设计体现了资源之间的从属关系：
 * 得分记录属于某个用户，不能脱离用户独立存在。
 *
 * 操作概览：
 *   HTTP 方法     端点                                  用途
 *   ─────────────────────────────────────────────────────────────
 *   POST         /users/:userId/scores                 添加得分
 *   DELETE       /users/:userId/scores/:scoreId        删除单条得分
 *   DELETE       /users/:userId/scores                 删除该用户全部得分
 *
 * 注意：得分的查询通常通过获取用户信息（getUser / getMe）时
 * 一并返回（User 对象中包含 scoreDetails 数组），
 * 所以本文件没有单独的"获取得分列表"接口。
 */

import client from './client'
import type { ResBody } from '../types/api'
import type { ScoreDetail, CreateScore } from '../types/score'

/**
 * 为指定用户添加得分记录
 *
 * @param userId - 目标用户的 id
 * @param data   - 得分数据，包含分值和原因
 * @returns 新创建的得分记录（包含 id 和 createdAt）
 *
 * 【技术学习】
 * 这个接口通常在比赛过程中调用，例如：
 * - 选手抢答正确，加 10 分 → addScore(userId, { score: 10, reason: '抢答正确' })
 * - 选手风险题答错，扣 5 分 → addScore(userId, { score: -5, reason: '风险题答错' })
 *
 * 添加得分后，后端会自动更新用户的 totalScore 字段。
 *
 * 对应 HTTP 请求：
 *   POST /api/users/:userId/scores
 *   Body: { score, reason }
 */
export const addScore = (userId: string, data: CreateScore) =>
  client.post<ResBody<ScoreDetail>>(`/users/${userId}/scores`, data)

/**
 * 删除指定用户的某条得分记录
 *
 * @param userId  - 目标用户的 id
 * @param scoreId - 要删除的得分记录 id
 * @returns 响应中 data 为 null
 *
 * 【技术学习】
 * 删除单条得分时，后端通常会重新计算用户的 totalScore。
 * 路径中有两个动态参数（userId 和 scoreId），
 * 用模板字符串分别插入。
 *
 * 对应 HTTP 请求：
 *   DELETE /api/users/:userId/scores/:scoreId
 */
export const deleteScore = (userId: string, scoreId: string) =>
  client.delete<ResBody<null>>(`/users/${userId}/scores/${scoreId}`)

/**
 * 删除指定用户的全部得分记录
 *
 * @param userId - 目标用户的 id
 * @returns 响应中 data 为 null
 *
 * 【技术学习】
 * 与 deleteScore 的区别在于 URL 路径：
 * - DELETE /users/:userId/scores/:scoreId  → 删除一条
 * - DELETE /users/:userId/scores           → 删除全部
 * 同样的 HTTP 方法 + 不同的路径 = 不同的操作，这是 RESTful 的设计精髓。
 *
 * 执行后用户的 totalScore 会被重置为 0。
 *
 * 对应 HTTP 请求：
 *   DELETE /api/users/:userId/scores
 */
export const deleteAllScores = (userId: string) =>
  client.delete<ResBody<null>>(`/users/${userId}/scores`)
