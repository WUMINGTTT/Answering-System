import { customAlphabet } from 'nanoid';
import type { ScoreDetail, CreateScore } from '../types/score.js';
import { db } from './db.js';

const generateId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10,
);

/** 为用户添加得分, 同步更新总分, 返回新增的得分记录 */
export async function addScore(
  userId: string,
  data: CreateScore,
): Promise<ScoreDetail | null> {
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) return null;

  const detail: ScoreDetail = { id: generateId(), ...data, createdAt: Date.now() };
  user.scoreDetails.push(detail);
  user.totalScore += data.score;
  await db.write();
  return detail;
}

/** 删除用户单条得分记录, 同步更新总分, 返回是否删除成功 */
export async function deleteScore(
  userId: string,
  scoreId: string,
): Promise<boolean> {
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) return false;

  const index = user.scoreDetails.findIndex((s) => s.id === scoreId);
  if (index === -1) return false;

  user.totalScore -= user.scoreDetails[index].score;
  user.scoreDetails.splice(index, 1);
  await db.write();
  return true;
}

/** 删除用户全部得分记录, 重置总分为 0 */
export async function deleteAllScores(userId: string): Promise<boolean> {
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) return false;

  user.scoreDetails = [];
  user.totalScore = 0;
  await db.write();
  return true;
}
