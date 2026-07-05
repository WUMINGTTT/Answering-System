/**
 * score.ts —— 得分记录相关的类型定义
 *
 * 【技术学习】
 * 得分是挂在用户（User）下面的子资源，采用嵌套路由设计：
 *   POST   /users/:userId/scores          添加得分
 *   DELETE /users/:userId/scores/:scoreId  删除单条得分
 *   DELETE /users/:userId/scores           删除该用户全部得分
 *
 * 一个用户可以有多条得分记录（scoreDetails），
 * 每条记录包含加了多少分以及原因说明。
 */

/**
 * 单条得分记录（对应后端返回的得分明细对象）
 *
 * 【技术学习】
 * createdAt 使用 number 类型存储时间戳（毫秒），
 * 这是 JavaScript 中常见的日期表示方式。
 * 可以用 new Date(createdAt) 转为 Date 对象来格式化显示。
 */
export interface ScoreDetail {
  /** 得分记录唯一标识 */
  id: string

  /** 本次加/减的分值（正数为加分，负数为扣分） */
  score: number

  /** 加分/扣分的原因说明（例如"抢答正确"、"风险题答错"） */
  reason: string

  /** 创建时间（Unix 时间戳，单位：毫秒） */
  createdAt: number
}

/**
 * 创建得分记录时使用的类型
 *
 * 【技术学习】
 * 创建时不需要 id 和 createdAt：
 * - id 由后端自动生成
 * - createdAt 由后端自动设置为当前时间
 * 前端只需提供 score（分值）和 reason（原因）即可。
 */
export interface CreateScore {
  /** 本次加/减的分值 */
  score: number

  /** 加分/扣分的原因说明 */
  reason: string
}
