import type { Request, Response } from 'express';
import * as scoreDao from '../data-access/scoreDao.js';

function ok<T>(res: Response, data: T, message: string, code = 200): void {
  res.status(code).json({ code, message, data });
}

function fail(res: Response, code: number, message: string): void {
  res.status(code).json({ code, message, data: null });
}

/** POST /api/users/:id/scores — 为用户添加得分 */
export async function add(req: Request, res: Response): Promise<void> {
  const { score, reason } = req.body;

  if (score === undefined || !reason) {
    return fail(res, 400, '缺少必填字段: score, reason');
  }

  if (typeof score !== 'number') {
    return fail(res, 400, 'score 字段必须为数字');
  }

  const detail = await scoreDao.addScore(String(req.params.id), { score, reason });
  if (!detail) {
    return fail(res, 404, '用户不存在');
  }
  ok(res, detail, '得分添加成功', 201);
}

/** DELETE /api/users/:id/scores/:scoreId — 删除单条得分 */
export async function remove(req: Request, res: Response): Promise<void> {
  const deleted = await scoreDao.deleteScore(
    String(req.params.id),
    String(req.params.scoreId),
  );
  if (!deleted) {
    return fail(res, 404, '得分记录不存在');
  }
  ok(res, null, '得分删除成功');
}

/** DELETE /api/users/:id/scores — 删除用户全部得分 */
export async function removeAll(req: Request, res: Response): Promise<void> {
  const deleted = await scoreDao.deleteAllScores(String(req.params.id));
  if (!deleted) {
    return fail(res, 404, '用户不存在');
  }
  ok(res, null, '全部得分已删除');
}
