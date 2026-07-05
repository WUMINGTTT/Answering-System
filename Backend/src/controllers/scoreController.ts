/**
 * ========================================================================
 * 得分控制器 (scoreController.ts)
 * ========================================================================
 *
 * 本控制器处理与用户得分相关的 HTTP 请求。
 * 得分是用户的子资源（一个用户可以有多条得分记录），因此使用嵌套路由：
 *   - POST   /api/users/:id/scores          — 为指定用户添加得分
 *   - DELETE /api/users/:id/scores/:scoreId  — 删除指定用户的某条得分
 *   - DELETE /api/users/:id/scores           — 删除指定用户的全部得分
 *
 * 【MVC 模式中的角色】
 * Controller（控制器）负责：
 *   1. 接收并解析 HTTP 请求
 *   2. 验证请求参数
 *   3. 调用 DAO（数据访问对象）层执行数据库操作
 *   4. 返回统一格式的 HTTP 响应
 * Controller 不直接操作数据库，而是通过 DAO 层间接访问，实现职责分离。
 *
 * 【嵌套路由参数（req.params）】
 * 当路由包含多个动态参数时，它们都会出现在 req.params 对象中。
 * 例如路由 '/api/users/:id/scores/:scoreId'：
 *   - 请求 DELETE /api/users/abc123/scores/score456
 *   - req.params = { id: 'abc123', scoreId: 'score456' }
 *
 * 这种设计体现了 RESTful API 的"资源层级"思想：
 *   - 用户（User）是父资源
 *   - 得分（Score）是用户的子资源
 *   - 操作得分时必须指定属于哪个用户
 *
 * 【Express 的 Request 和 Response 对象】
 *   - Request (req): 包含客户端请求的所有信息
 *     - req.body:   POST/PUT 请求的 JSON 请求体
 *     - req.params: URL 路径中的动态参数（如 :id, :scoreId）
 *   - Response (res): 用于构建和发送 HTTP 响应
 *     - res.status(code).json(data): 设置状态码并返回 JSON
 *
 * 【统一响应格式】{ code, message, data }
 *   - code:    HTTP 状态码
 *   - message: 操作结果的描述信息
 *   - data:    业务数据，失败时为 null
 */

// 导入 Express 的请求和响应类型
import type { Request, Response } from 'express';
// 导入得分数据访问对象，用于操作得分相关的数据库记录
import * as scoreDao from '../data-access/scoreDao.js';

/**
 * 统一成功响应函数
 *
 * 【技术学习】泛型 <T> 使 data 参数可以接受任意类型，同时保持 TypeScript 类型推断。
 * 例如 ok(res, user, '成功') 中 T 被推断为 User 类型。
 *
 * @param res     - Express 响应对象
 * @param data    - 响应数据
 * @param message - 提示信息
 * @param code    - HTTP 状态码，默认 200
 */
function ok<T>(res: Response, data: T, message: string, code = 200): void {
  res.status(code).json({ code, message, data });
}

/**
 * 统一失败响应函数
 *
 * @param res     - Express 响应对象
 * @param code    - HTTP 错误状态码（400 / 404 / 409 等）
 * @param message - 错误描述
 */
function fail(res: Response, code: number, message: string): void {
  res.status(code).json({ code, message, data: null });
}

/**
 * POST /api/users/:id/scores — 为指定用户添加得分
 *
 * 【嵌套路由参数】
 * 此接口的 URL 中有两个动态段：
 *   - :id → req.params.id，表示目标用户的 ID
 *   - 请求体中包含 score（分数）和 reason（得分原因）
 *
 * 【类型检查（typeof）的重要性】
 * typeof 运算符返回值的类型字符串。
 * 即使前端表单限制了输入，后端也必须验证数据类型，因为：
 *   1. 前端验证可以被绕过（直接调用 API）
 *   2. 如果传入字符串类型的分数（如 "abc"），会导致数据库数据异常
 *   3. 类型检查是"防御性编程"的重要一环
 *
 * 【DAO 层调用和错误处理】
 * Controller 通过调用 DAO 层的方法来执行数据库操作。
 * DAO 方法返回 null 通常表示"资源不存在"（如用户 ID 无效）。
 * Controller 根据 DAO 的返回值决定返回成功还是失败响应。
 */
export async function add(req: Request, res: Response): Promise<void> {
  // 从请求体中解构出分数和原因
  const { score, reason } = req.body;

  // 【参数验证】检查必填字段是否存在
  // score === undefined 用严格相等检查，区分 undefined 和 0（0 是合法分数）
  if (score === undefined || !reason) {
    return fail(res, 400, '缺少必填字段: score, reason');
  }

  // 【类型检查】typeof 运算符检查 score 是否为数字类型
  // 这是防御性编程：即使前端保证传数字，后端也要再验证一次
  // 如果不检查，传入字符串可能导致数据库写入异常或计算错误
  if (typeof score !== 'number') {
    return fail(res, 400, 'score 字段必须为数字');
  }

  // 调用 DAO 层添加得分记录
  // req.params.id 是嵌套路由中的用户 ID（从 /api/users/:id/scores 中提取）
  const detail = await scoreDao.addScore(String(req.params.id), { score, reason });

  // 如果 DAO 返回 null，说明用户不存在
  if (!detail) {
    return fail(res, 404, '用户不存在');
  }

  // 成功创建得分记录，返回 201 Created
  ok(res, detail, '得分添加成功', 201);
}

/**
 * DELETE /api/users/:id/scores/:scoreId — 删除单条得分记录
 *
 * 【嵌套路由中的多个参数】
 * 这个路由包含两个动态参数：
 *   - :id      → req.params.id      → 目标用户的 ID
 *   - :scoreId → req.params.scoreId → 要删除的得分记录的 ID
 *
 * URL 示例：DELETE /api/users/abc123/scores/score456
 * 含义：删除用户 abc123 的编号为 score456 的得分记录
 *
 * 【DAO 层调用】
 * 将用户 ID 和得分 ID 一起传给 DAO，DAO 负责定位并删除对应记录。
 * 返回 false 表示记录不存在（可能已被删除或 ID 错误）。
 */
export async function remove(req: Request, res: Response): Promise<void> {
  // 从 req.params 中提取两个路由参数
  const deleted = await scoreDao.deleteScore(
    String(req.params.id),       // 用户 ID
    String(req.params.scoreId),  // 得分记录 ID
  );

  // 如果删除失败（记录不存在），返回 404
  if (!deleted) {
    return fail(res, 404, '得分记录不存在');
  }

  // 删除成功，data 为 null（资源已不存在）
  ok(res, null, '得分删除成功');
}

/**
 * DELETE /api/users/:id/scores — 删除指定用户的全部得分
 *
 * 【技术学习】与上面"删除单条"的区别在于 URL：
 *   - 有 :scoreId → 删除单条
 *   - 无 :scoreId → 删除全部
 * 这是 RESTful API 设计中"集合操作 vs 单个操作"的常见模式。
 *
 * 【DAO 层的错误处理】
 * DAO 返回 false 表示用户不存在（无法为不存在的用户删除得分）。
 * 注意：如果用户存在但没有任何得分记录，删除操作仍然"成功"（幂等性），
 * 但本实现中 DAO 可能返回 false，具体取决于 DAO 层的实现。
 */
export async function removeAll(req: Request, res: Response): Promise<void> {
  // 只需要用户 ID，删除该用户的所有得分记录
  const deleted = await scoreDao.deleteAllScores(String(req.params.id));

  // 用户不存在时返回 404
  if (!deleted) {
    return fail(res, 404, '用户不存在');
  }

  ok(res, null, '全部得分已删除');
}
