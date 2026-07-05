/**
 * 用户路由模块 (User Routes)
 *
 * 【技术学习】路由注册顺序的重要性：
 *   Express 按照路由注册的先后顺序进行匹配，一旦匹配成功就停止。
 *   因此，**具体的固定路径必须放在参数路径 (:id) 之前**。
 *
 *   为什么？假设顺序是：
 *     1. GET /:id       ← 会匹配所有路径，包括 /me、/register、/login
 *     2. GET /me        ← 永远不会被匹配到！
 *
 *   正确的顺序应该是：
 *     1. GET /me        ← 先匹配具体的固定路径
 *     2. GET /:id       ← 最后才匹配通配的参数路径
 *
 *   简单记忆：**先具体，后模糊**。
 */

import { Router, type IRouter } from 'express';
import * as userController from '../controllers/userController.js';

const router: IRouter = Router();

// ── 以下为具体路由（必须在 /:id 之前注册） ──

/**
 * POST /api/users/register — 用户注册
 * 注册是特殊操作，路径是固定的 /register
 */
router.post('/register', userController.register);

/**
 * POST /api/users/login — 用户登录
 * 登录也是特殊操作，路径是固定的 /login
 */
router.post('/login', userController.login);

/**
 * POST /api/users/logout — 用户登出
 */
router.post('/logout', userController.logout);

/**
 * POST /api/users — 新增用户（管理员创建）
 * 注意：这个路由不会和 /register、/login 冲突，
 * 因为它们的完整路径不同（/register vs /）
 */
router.post('/', userController.create);

/**
 * GET /api/users/me — 获取当前登录用户（通过 cookie）
 * 【重要】/me 是固定路径，必须放在 /:id 之前！
 * 如果放在 /:id 后面，请求 GET /me 时 Express 会把 "me" 当作 id 参数，
 * 导致路由匹配错误。
 */
router.get('/me', userController.me);

/**
 * GET /api/users — 获取全部用户
 */
router.get('/', userController.getAll);

// ── 以下为参数路由（通配性强，放在最后） ──

/**
 * GET /api/users/:id — 获取单个用户
 * :id 会匹配任意字符串，所以放在 /me 等固定路径之后
 */
router.get('/:id', userController.getById);

/**
 * DELETE /api/users — 删除全部用户
 */
router.delete('/', userController.removeAll);

/**
 * DELETE /api/users/:id — 删除单个用户
 */
router.delete('/:id', userController.remove);

/**
 * PUT /api/users/:id — 修改用户信息
 */
router.put('/:id', userController.update);

export default router;
