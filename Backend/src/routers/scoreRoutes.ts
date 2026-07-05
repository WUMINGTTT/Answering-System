/**
 * 成绩路由模块 (Score Routes)
 *
 * 【技术学习】嵌套路由（Nested Routes）：
 *   本模块的路由会被挂载到 /api/users/:id/scores 前缀下（见 index.ts）。
 *   这意味着：
 *     - POST   /api/users/:id/scores            → 添加得分
 *     - DELETE  /api/users/:id/scores            → 删除全部得分
 *     - DELETE  /api/users/:id/scores/:scoreId   → 删除单条得分
 *
 *   这种设计体现了 RESTful API 的嵌套资源思想：
 *   "成绩"是"用户"的子资源，路径自然地表达了这种从属关系。
 *
 * 【技术学习】mergeParams: true 的作用：
 *   当路由被挂载到父级路径时（如 /api/users/:id/scores），
 *   默认情况下，子路由的 req.params 只包含子路由自己定义的参数（如 :scoreId）。
 *
 *   设置 mergeParams: true 后，Express 会将父级路由的参数也合并进来，
 *   这样在子路由的 controller 中就能通过 req.params.id 访问到父级路径中的用户 ID。
 *
 *   举例：DELETE /api/users/123/scores/456
 *     - 没有 mergeParams: req.params = { scoreId: '456' }         ← 缺少 id！
 *     - 有 mergeParams:    req.params = { id: '123', scoreId: '456' }  ← 完整参数
 */

import { Router, type IRouter } from 'express';
import * as scoreController from '../controllers/scoreController.js';

// 创建成绩路由实例，启用 mergeParams 以获取父级路由参数（:id）
const router: IRouter = Router({ mergeParams: true });

/**
 * POST /api/users/:id/scores — 添加得分
 * 路径中的 '/' 实际对应 /api/users/:id/scores（因为挂载时已有前缀）
 */
router.post('/', scoreController.add);

/**
 * DELETE /api/users/:id/scores — 删除该用户的全部得分
 */
router.delete('/', scoreController.removeAll);

/**
 * DELETE /api/users/:id/scores/:scoreId — 删除单条得分
 * :scoreId 是成绩记录的唯一标识
 */
router.delete('/:scoreId', scoreController.remove);

export default router;
