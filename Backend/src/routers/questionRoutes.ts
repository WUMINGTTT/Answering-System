/**
 * 题目路由模块 (Question Routes)
 *
 * 【技术学习】Express Router 概念：
 *   - Router 是 Express 提供的"迷你应用"，专门用来管理一组相关路由。
 *   - 它可以像乐高积木一样被挂载到主应用的某个路径前缀下（见 index.ts 中的 app.use）。
 *   - 这样做的好处是：把路由按功能模块拆分，保持代码整洁、易于维护。
 *
 * 【技术学习】HTTP 方法与 CRUD 对应关系：
 *   - POST   → Create  （创建资源）
 *   - GET    → Read    （读取资源）
 *   - PUT    → Update  （更新资源）
 *   - DELETE → Delete  （删除资源）
 *
 * 【技术学习】路由路径匹配规则：
 *   - '/' 匹配根路径（即 /api/questions）
 *   - '/:id' 匹配带参数的路径（如 /api/questions/123），其中 :id 是动态参数
 *   - Express 按照代码书写顺序依次匹配，第一个匹配成功的路由会被执行
 */

import { Router, type IRouter } from 'express';
import * as questionController from '../controllers/questionController.js';

// 创建题目路由实例
const router: IRouter = Router();

/**
 * POST /api/questions — 新增题目
 * 对应 CRUD 中的 Create 操作
 */
router.post('/', questionController.create);

/**
 * GET /api/questions — 获取全部题目
 * 对应 CRUD 中的 Read（列表）操作
 */
router.get('/', questionController.getAll);

/**
 * GET /api/questions/:id — 获取单个题目
 * :id 是路由参数，Express 会自动解析并放入 req.params.id 中
 */
router.get('/:id', questionController.getById);

/**
 * PUT /api/questions/:id — 修改题目
 * PUT 语义：完整替换或修改指定资源
 */
router.put('/:id', questionController.update);

/**
 * DELETE /api/questions — 删除全部题目
 * 注意：这是删除整个集合，没有 :id 参数
 */
router.delete('/', questionController.removeAll);

/**
 * DELETE /api/questions/:id — 删除单个题目
 * 注意：Express 按顺序匹配，DELETE '/' 和 DELETE '/:id' 是两个不同的路由
 */
router.delete('/:id', questionController.remove);

export default router;
