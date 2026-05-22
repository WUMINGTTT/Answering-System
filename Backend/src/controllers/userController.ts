import type { Request, Response } from 'express';
import * as userDao from '../data-access/userDao.js';

function ok<T>(res: Response, data: T, message: string, code = 200): void {
  res.status(code).json({ code, message, data });
}

function fail(res: Response, code: number, message: string): void {
  res.status(code).json({ code, message, data: null });
}

/** POST /api/users — 新增用户（管理员创建，可指定角色） */
export async function create(req: Request, res: Response): Promise<void> {
  const { nickname, username, password, role } = req.body;

  if (!nickname || !username || !password || !role) {
    return fail(res, 400, '缺少必填字段: nickname, username, password, role');
  }

  if (!['player', 'admin'].includes(role)) {
    return fail(res, 400, 'role 字段必须为 player 或 admin');
  }

  const existing = await userDao.getUserByUsername(username);
  if (existing) {
    return fail(res, 409, '用户名已存在');
  }

  const user = await userDao.createUser({ nickname, username, password, role });
  ok(res, user, '用户创建成功', 201);
}

/** GET /api/users/:id — 获取单个用户 */
export async function getById(req: Request, res: Response): Promise<void> {
  const user = await userDao.getUser(String(req.params.id));
  if (!user) {
    return fail(res, 404, '用户不存在');
  }
  ok(res, user, '用户获取成功');
}

/** GET /api/users — 获取全部用户 */
export async function getAll(_req: Request, res: Response): Promise<void> {
  const users = await userDao.getAllUsers();
  ok(res, users, '全部用户获取成功');
}

/** PUT /api/users/:id — 修改用户信息 */
export async function update(req: Request, res: Response): Promise<void> {
  const { nickname, username, password, role } = req.body;

  const data: Record<string, unknown> = {};
  if (nickname !== undefined) data.nickname = nickname;
  if (username !== undefined) data.username = username;
  if (password !== undefined) data.password = password;
  if (role !== undefined) data.role = role;

  if (Object.keys(data).length === 0) {
    return fail(res, 400, '至少需要提供一个要修改的字段: nickname, username, password, role');
  }

  if (role !== undefined && !['player', 'admin'].includes(role)) {
    return fail(res, 400, 'role 字段必须为 player 或 admin');
  }

  if (username !== undefined) {
    const existing = await userDao.getUserByUsername(username);
    if (existing && existing.id !== String(req.params.id)) {
      return fail(res, 409, '用户名已存在');
    }
  }

  const user = await userDao.updateUser(String(req.params.id), data);
  if (!user) {
    return fail(res, 404, '用户不存在');
  }
  ok(res, user, '用户信息修改成功');
}

/** POST /api/users/register — 用户注册（仅需昵称、用户名、密码，默认角色为选手） */
export async function register(req: Request, res: Response): Promise<void> {
  const { nickname, username, password } = req.body;

  if (!nickname || !username || !password) {
    return fail(res, 400, '缺少必填字段: nickname, username, password');
  }

  const existing = await userDao.getUserByUsername(username);
  if (existing) {
    return fail(res, 409, '用户名已存在');
  }

  const user = await userDao.createUser({ nickname, username, password, role: 'player' });
  ok(res, user, '注册成功', 201);
}

/** DELETE /api/users/:id — 删除单个用户 */
export async function remove(req: Request, res: Response): Promise<void> {
  const deleted = await userDao.deleteUser(String(req.params.id));
  if (!deleted) {
    return fail(res, 404, '用户不存在');
  }
  ok(res, null, '用户删除成功');
}

/** DELETE /api/users — 删除全部用户 */
export async function removeAll(_req: Request, res: Response): Promise<void> {
  await userDao.deleteAllUsers();
  ok(res, null, '全部用户已删除');
}

/** POST /api/users/login — 用户登录（用户名 + 密码） */
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    return fail(res, 400, '缺少必填字段: username, password');
  }

  const user = await userDao.getUserByUsername(username);
  if (!user) {
    return fail(res, 404, '用户不存在');
  }

  if (user.password !== password) {
    return fail(res, 401, '密码错误');
  }

  res.cookie('userId', user.id, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    sameSite: 'lax',
  });
  ok(res, user, '登录成功');
}
