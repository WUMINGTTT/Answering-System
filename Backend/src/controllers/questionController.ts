import type { Request, Response } from 'express';
import * as questionDao from '../data-access/questionDao.js';

function ok<T>(res: Response, data: T, message: string, code = 200): void {
  res.status(code).json({ code, message, data });
}

function fail(
  res: Response,
  code: number,
  message: string,
): void {
  res.status(code).json({ code, message, data: null });
}

/** POST /api/questions — 新增题目 */
export async function create(req: Request, res: Response): Promise<void> {
  const { type, category, stem, options, answers, score } = req.body;

  if (!type || !category || !stem || !options || !answers || score == null) {
    return fail(res, 400, '缺少必填字段: type, category, stem, options, answers, score');
  }

  const question = await questionDao.createQuestion({
    type,
    category,
    stem,
    options,
    answers,
    score,
  });
  ok(res, question, '题目创建成功', 201);
}

/** GET /api/questions/:id — 获取单个题目 */
export async function getById(req: Request, res: Response): Promise<void> {
  const question = await questionDao.getQuestion(String(req.params.id));
  if (!question) {
    return fail(res, 404, '题目不存在');
  }
  ok(res, question, '题目获取成功');
}

/** GET /api/questions — 获取全部题目 */
export async function getAll(_req: Request, res: Response): Promise<void> {
  const questions = await questionDao.getAllQuestions();
  ok(res, questions, '全部题目获取成功');
}

/** PUT /api/questions/:id — 修改题目 */
export async function update(req: Request, res: Response): Promise<void> {
  const { type, category, stem, options, answers, score } = req.body;

  const data: Record<string, unknown> = {};
  if (type !== undefined) data.type = type;
  if (category !== undefined) data.category = category;
  if (stem !== undefined) data.stem = stem;
  if (options !== undefined) data.options = options;
  if (answers !== undefined) data.answers = answers;
  if (score !== undefined) data.score = score;

  if (Object.keys(data).length === 0) {
    return fail(res, 400, '至少需要提供一个要修改的字段');
  }

  const question = await questionDao.updateQuestion(String(req.params.id), data);
  if (!question) {
    return fail(res, 404, '题目不存在');
  }
  ok(res, question, '题目修改成功');
}

/** DELETE /api/questions/:id — 删除单个题目 */
export async function remove(req: Request, res: Response): Promise<void> {
  const okResult = await questionDao.deleteQuestion(String(req.params.id));
  if (!okResult) {
    return fail(res, 404, '题目不存在');
  }
  ok(res, null, '题目删除成功');
}

/** DELETE /api/questions — 删除全部题目 */
export async function removeAll(_req: Request, res: Response): Promise<void> {
  await questionDao.deleteAllQuestions();
  ok(res, null, '全部题目已删除');
}
