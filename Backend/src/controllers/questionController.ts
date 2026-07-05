/**
 * ========================================================================
 * 题目控制器 (questionController.ts)
 * ========================================================================
 *
 * 【MVC 模式中的角色】
 * 本文件是 MVC（Model-View-Controller）架构中 Controller（控制器）层的一部分。
 *
 * 在 MVC 模式中，各层职责如下：
 *   - Model（模型）: 负责数据结构和业务逻辑，对应本项目中的 DAO（Data Access Object，数据访问对象）层。
 *   - View（视图）: 负责展示，本项目是前后端分离，后端没有 View 层，前端独立负责。
 *   - Controller（控制器）: 负责接收 HTTP 请求、参数校验、调用 Model 层处理数据、返回 HTTP 响应。
 *
 * Controller 本身不直接操作数据库，而是通过 DAO 层间接操作，这叫做"关注点分离"（Separation of Concerns）。
 *
 * 【Express 的 Request 和 Response 对象】
 *   - Request（req）: 代表客户端发来的 HTTP 请求，包含请求体(req.body)、URL 参数(req.params)、查询字符串(req.query)、Cookie 等。
 *   - Response（res）: 代表服务端返回给客户端的 HTTP 响应，通过 res.status() 设置状态码，res.json() 返回 JSON 数据。
 *
 * 【统一响应格式】
 * 本控制器所有接口都返回统一的 JSON 格式：{ code, message, data }
 *   - code: HTTP 状态码，表示请求处理结果
 *   - message: 人类可读的提示信息
 *   - data: 实际数据，失败时为 null
 * 这种统一格式让前端更容易处理响应，不需要每次都猜测返回结构。
 *
 * 【async/await 在 Express 路由中的使用】
 * 控制器函数使用 async 关键字标记为异步函数，这样可以在函数内部使用 await 等待数据库操作完成。
 * DAO 层的方法返回 Promise，await 会暂停函数执行，等待 Promise 解析后继续。
 * 注意：Express 不会自动捕获 async 函数中抛出的异常，实际项目中通常需要 try/catch 或全局错误处理中间件。
 */

// 导入 Express 的类型：Request（请求对象）和 Response（响应对象）
import type { Request, Response } from 'express';
// 导入题目相关的数据访问对象（DAO），用于操作数据库
import * as questionDao from '../data-access/questionDao.js';

/**
 * 统一成功响应函数
 *
 * 【技术学习】泛型 <T> 让函数可以接受任意类型的 data 参数，同时保持类型安全。
 * 泛型是 TypeScript 的核心特性之一，让代码既灵活又类型安全。
 *
 * @param res    - Express 的 Response 对象，用于发送 HTTP 响应
 * @param data   - 要返回给客户端的数据（可以是对象、数组、null 等）
 * @param message - 人类可读的提示信息
 * @param code   - HTTP 状态码，默认为 200（表示"OK"，请求成功）
 *
 * 【HTTP 状态码含义】
 *   200 OK           - 请求成功，一般用于 GET / PUT / DELETE
 *   201 Created      - 资源创建成功，一般用于 POST
 *   400 Bad Request  - 客户端请求有误（如缺少必填字段、参数格式错误）
 *   404 Not Found    - 请求的资源不存在
 *   409 Conflict     - 资源冲突（如用户名重复）
 *   500 Internal Server Error - 服务器内部错误
 */
function ok<T>(res: Response, data: T, message: string, code = 200): void {
  // res.status(code) 设置 HTTP 状态码
  // .json() 将 JavaScript 对象序列化为 JSON 字符串并发送给客户端
  res.status(code).json({ code, message, data });
}

/**
 * 统一失败响应函数
 *
 * 失败时 data 固定为 null，前端可以通过 code 和 message 判断错误原因。
 *
 * @param res     - Express 的 Response 对象
 * @param code    - HTTP 错误状态码（400、404、409 等）
 * @param message - 错误描述信息
 */
function fail(
  res: Response,
  code: number,
  message: string,
): void {
  res.status(code).json({ code, message, data: null });
}

/**
 * POST /api/questions — 新增题目
 *
 * 【req.body 的含义】
 * req.body 是 HTTP 请求体（Request Body）中携带的数据。
 * 当客户端使用 POST 或 PUT 方法发送 JSON 数据时，Express 通过中间件（如 express.json()）
 * 将请求体解析为 JavaScript 对象，挂载到 req.body 上。
 *
 * 例如前端发送：
 *   fetch('/api/questions', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ type: 'choice', category: '数学', stem: '1+1=?', ... })
 *   })
 * 那么 req.body 就是 { type: 'choice', category: '数学', stem: '1+1=?', ... }
 *
 * 【参数验证的必要性】
 * 后端必须对客户端传来的数据进行验证，不能信任前端的数据。
 * 原因：
 *   1. 前端验证可以被绕过（用户可以直接调用 API，不经过前端页面）
 *   2. 缺少必填字段会导致数据库写入异常
 *   3. 防止恶意输入攻击
 */
export async function create(req: Request, res: Response): Promise<void> {
  // 从请求体中解构出各个字段
  // 解构赋值是 ES6 语法，等价于 const type = req.body.type; const category = req.body.category; ...
  const { type, category, stem, options, answers, score } = req.body;

  // 【参数验证】检查所有必填字段是否存在
  // "!" 是逻辑非运算符，!type 当 type 为 undefined / null / 空字符串时返回 true
  // score == null 使用宽松相等（==），同时匹配 null 和 undefined
  if (!type || !category || !stem || !options || !answers || score == null) {
    // 如果缺少字段，返回 400 Bad Request，告知客户端缺少哪些字段
    return fail(res, 400, '缺少必填字段: type, category, stem, options, answers, score');
  }

  // 调用 DAO 层将题目数据写入数据库
  // DAO 层封装了数据库操作，Controller 不直接写 SQL 或操作 ORM
  const question = await questionDao.createQuestion({
    type,
    category,
    stem,
    options,
    answers,
    score,
  });

  // 成功创建资源后返回 201 Created 状态码
  // 【技术学习】201 和 200 的区别：201 表示"服务器成功创建了新资源"
  ok(res, question, '题目创建成功', 201);
}

/**
 * GET /api/questions/:id — 获取单个题目
 *
 * 【req.params 的含义】
 * req.params 是 URL 路径中的动态参数。
 * 当路由定义为 '/api/questions/:id' 时，:id 是一个占位符。
 * 如果客户端请求 GET /api/questions/abc123，那么 req.params 就是 { id: 'abc123' }。
 *
 * 【req.body vs req.params 区别】
 *   - req.body:  请求体中的数据，用于 POST / PUT 等需要传递大量数据的场景
 *   - req.params: URL 路径中的参数，用于标识具体资源（如 id），用于 GET / PUT / DELETE
 *   - req.query:  URL 查询字符串参数（如 ?page=1&limit=10），用于过滤、分页等
 */
export async function getById(req: Request, res: Response): Promise<void> {
  // req.params.id 是字符串类型，使用 String() 确保类型一致
  const question = await questionDao.getQuestion(String(req.params.id));

  // 如果查询结果为空，说明该题目不存在，返回 404
  if (!question) {
    return fail(res, 404, '题目不存在');
  }

  // 查询成功，返回题目数据
  ok(res, question, '题目获取成功');
}

/**
 * GET /api/questions — 获取全部题目
 *
 * 【技术学习】参数名前加下划线 "_" 前缀（_req）是 TypeScript/JavaScript 的约定，
 * 表示这个参数在函数体内不会被使用，但因为函数签名需要保留它。
 */
export async function getAll(_req: Request, res: Response): Promise<void> {
  const questions = await questionDao.getAllQuestions();
  ok(res, questions, '全部题目获取成功');
}

/**
 * PUT /api/questions/:id — 修改题目
 *
 * 【技术学习】PUT 语义是"替换"或"更新"指定资源。
 * 这里采用的是"部分更新"模式：只更新客户端传入的字段，未传入的字段保持不变。
 */
export async function update(req: Request, res: Response): Promise<void> {
  const { type, category, stem, options, answers, score } = req.body;

  // 构建一个只包含"需要更新的字段"的对象
  // Record<string, unknown> 是 TypeScript 类型，表示键为字符串、值为任意类型的对象
  const data: Record<string, unknown> = {};

  // 【技术学习】"!== undefined" 判断：区分"客户端没有传这个字段"和"客户端传了 null"
  // 如果客户端传了 null，说明要将该字段设为 null；如果没有传，则不更新该字段
  if (type !== undefined) data.type = type;
  if (category !== undefined) data.category = category;
  if (stem !== undefined) data.stem = stem;
  if (options !== undefined) data.options = options;
  if (answers !== undefined) data.answers = answers;
  if (score !== undefined) data.score = score;

  // 如果一个字段都没传，说明请求无效
  // Object.keys(data) 返回对象所有键组成的数组，.length === 0 表示空对象
  if (Object.keys(data).length === 0) {
    return fail(res, 400, '至少需要提供一个要修改的字段');
  }

  // 调用 DAO 层执行更新操作
  const question = await questionDao.updateQuestion(String(req.params.id), data);
  if (!question) {
    return fail(res, 404, '题目不存在');
  }
  ok(res, question, '题目修改成功');
}

/**
 * DELETE /api/questions/:id — 删除单个题目
 *
 * HTTP DELETE 方法用于删除指定资源。
 * 返回 200 状态码表示删除成功。
 */
export async function remove(req: Request, res: Response): Promise<void> {
  // DAO 返回布尔值，表示是否成功删除（false 可能意味着资源不存在）
  const okResult = await questionDao.deleteQuestion(String(req.params.id));
  if (!okResult) {
    return fail(res, 404, '题目不存在');
  }
  // 删除成功时 data 为 null，因为资源已经不存在了
  ok(res, null, '题目删除成功');
}

/**
 * DELETE /api/questions — 删除全部题目
 *
 * 【技术学习】这是一个"批量操作"接口，与上面的"删除单个"共用同一个 HTTP 方法（DELETE），
 * 通过不同的 URL 路径区分：有 :id 参数的是删除单个，没有的是删除全部。
 * RESTful API 设计中，这种模式很常见。
 */
export async function removeAll(_req: Request, res: Response): Promise<void> {
  await questionDao.deleteAllQuestions();
  ok(res, null, '全部题目已删除');
}
