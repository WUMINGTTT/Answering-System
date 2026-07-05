/**
 * 得分数据访问对象 (DAO - Data Access Object)
 *
 * 【技术学习】嵌套数据操作的特点：
 * - 得分记录（ScoreDetail）不是独立的集合，而是嵌套在用户对象内部
 * - 操作得分时需要先找到对应的用户
 * - 添加/删除得分时需要同步更新用户的总分（totalScore）
 * - 这种设计避免了跨集合关联查询，简化了数据结构
 *
 * 数据结构示意：
 * User {
 *   id: "user123",
 *   username: "张三",
 *   totalScore: 85,              <- 总分，需要同步更新
 *   scoreDetails: [              <- 得分记录数组
 *     { id: "score1", score: 10, questionId: "q1", createdAt: 1234567890 },
 *     { id: "score2", score: 15, questionId: "q2", createdAt: 1234567891 }
 *   ]
 * }
 */

import { customAlphabet } from 'nanoid';
import type { ScoreDetail, CreateScore } from '../types/score.js';
import { db } from './db.js';

/**
 * 创建自定义 ID 生成器
 *
 * 【技术学习】与其他 DAO 使用相同的 ID 生成策略
 * 生成 10 位纯字母的唯一标识符
 */
const generateId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10,
);

/**
 * 为用户添加得分记录
 *
 * 【技术学习】嵌套数据的添加操作步骤：
 * 1. 先通过 userId 找到用户对象
 * 2. 创建新的得分记录（包含 ID 和时间戳）
 * 3. 将得分记录添加到用户的 scoreDetails 数组
 * 4. 同步更新用户的 totalScore（累加新分数）
 * 5. 持久化到文件
 *
 * Date.now() 的作用：
 * - 返回当前时间的毫秒级时间戳（自 1970-01-01 00:00:00 UTC 起）
 * - 用于记录得分的创建时间
 * - 例如：1672531200000 表示 2023-01-01 08:00:00
 *
 * 返回值：
 * - 成功：返回新创建的得分记录
 * - 失败：用户不存在时返回 null
 */
export async function addScore(
  userId: string,
  data: CreateScore,
): Promise<ScoreDetail | null> {
  // 先查找用户，用户是得分记录的"父级"
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) return null;

  // 创建得分记录，包含自动生成的 ID 和当前时间戳
  const detail: ScoreDetail = { id: generateId(), ...data, createdAt: Date.now() };

  // 将得分记录添加到用户的 scoreDetails 数组
  user.scoreDetails.push(detail);

  // 【重要】同步更新总分：原总分 + 新增分数
  // 这确保了 totalScore 始终是所有 scoreDetails 的分数之和
  user.totalScore += data.score;

  await db.write();
  return detail;
}

/**
 * 删除用户单条得分记录
 *
 * 【技术学习】嵌套数据的删除操作步骤：
 * 1. 先找到用户（父级对象）
 * 2. 在用户的 scoreDetails 中找到要删除的记录
 * 3. 先扣减总分，再删除记录（顺序很重要！）
 * 4. 持久化到文件
 *
 * 为什么先扣减总分再删除？
 * - 如果先删除记录，就无法获取该记录的分数值
 * - 先用 user.scoreDetails[index].score 获取分数
 * - 扣减总分后，再 splice 删除该记录
 *
 * 返回值：
 * - true: 成功删除
 * - false: 用户不存在或得分记录不存在
 */
export async function deleteScore(
  userId: string,
  scoreId: string,
): Promise<boolean> {
  // 第一步：找到用户
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) return false;

  // 第二步：在用户的得分记录中查找
  const index = user.scoreDetails.findIndex((s) => s.id === scoreId);
  if (index === -1) return false;

  // 第三步：先扣减总分（此时还能访问被删除记录的分数）
  user.totalScore -= user.scoreDetails[index].score;

  // 第四步：删除得分记录
  user.scoreDetails.splice(index, 1);

  await db.write();
  return true;
}

/**
 * 删除用户全部得分记录
 *
 * 【技术学习】批量删除的简化处理：
 * - 直接将 scoreDetails 重置为空数组
 * - 将 totalScore 重置为 0
 * - 无需遍历数组逐个删除，更高效
 *
 * 使用场景：
 * - 用户重置成绩
 * - 管理员清空某个用户的所有得分
 *
 * 返回值：
 * - true: 成功清空
 * - false: 用户不存在
 */
export async function deleteAllScores(userId: string): Promise<boolean> {
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) return false;

  // 直接重置为空数组，比逐个删除更高效
  user.scoreDetails = [];
  // 总分也重置为 0，保持数据一致性
  user.totalScore = 0;

  await db.write();
  return true;
}
