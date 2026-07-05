/**
 * ========================================================================
 * 用户控制器 (userController.ts)
 * ========================================================================
 *
 * 本控制器处理与用户相关的所有 HTTP 请求，包括：
 *   - 管理员创建用户（POST /api/users）
 *   - 用户自行注册（POST /api/users/register）
 *   - 用户登录（POST /api/users/login）
 *   - 用户登出（POST /api/users/logout）
 *   - 获取当前登录用户信息（GET /api/users/me）
 *   - 用户的 CRUD（增删改查）操作
 *
 * 【用户注册 vs 管理员创建用户的区别】
 *   - 管理员创建用户（create）: 需要提供 role 字段，可以创建 player 或 admin 角色的用户。
 *     通常由管理员在后台管理系统中操作，前端应有权限控制确保只有管理员能调用此接口。
 *   - 用户自行注册（register）: 不需要提供 role 字段，角色固定为 'player'（选手）。
 *     普通用户通过注册页面自行注册，只能注册为选手角色。
 *   这种设计实现了"最小权限原则"——普通用户不能自己提升为管理员。
 *
 * 【密码存储说明 - 教学场景简化】
 * ⚠️ 本项目为了简化学习，密码使用明文存储和比较。
 * 在真实生产环境中，密码必须经过哈希处理（如使用 bcrypt、argon2 等算法），
 * 数据库中存储的应该是哈希值而非明文密码。这样即使数据库泄露，攻击者也无法直接获取用户密码。
 *
 * 【Express 的 Request 和 Response 对象】
 *   - Request (req): 客户端发来的 HTTP 请求对象
 *     - req.body:   请求体中的数据（POST/PUT 的 JSON 数据）
 *     - req.params: URL 路径参数（如 /api/users/:id 中的 id）
 *     - req.cookies: 客户端发送的 Cookie 数据（由 cookie-parser 中间件解析）
 *   - Response (res): 服务端返回的 HTTP 响应对象
 *     - res.status(code): 设置 HTTP 状态码
 *     - res.json(data):   发送 JSON 格式的响应
 *     - res.cookie():     设置 Cookie
 *     - res.clearCookie(): 清除 Cookie
 */

// 导入 Express 的请求和响应类型
import type { Request, Response } from 'express';
// 导入用户数据访问对象，用于数据库操作
import * as userDao from '../data-access/userDao.js';

/**
 * 统一成功响应函数
 *
 * @param res     - Express 响应对象
 * @param data    - 返回给客户端的数据
 * @param message - 提示信息
 * @param code    - HTTP 状态码，默认 200
 */
function ok<T>(res: Response, data: T, message: string, code = 200): void {
  res.status(code).json({ code, message, data });
}

/**
 * 统一失败响应函数
 *
 * 失败时 data 固定为 null，客户端通过 code 和 message 判断错误类型。
 */
function fail(res: Response, code: number, message: string): void {
  res.status(code).json({ code, message, data: null });
}

/**
 * POST /api/users — 管理员创建用户（可指定角色）
 *
 * 【管理员创建 vs 用户注册】
 * 此接口供管理员使用，可以指定用户的 role（角色），包括 'player'（选手）和 'admin'（管理员）。
 * 而用户自行注册的接口（register）不允许指定角色，默认为 'player'。
 *
 * 【用户名唯一性检查】
 * 在创建用户之前，先查询数据库中是否已存在相同用户名。
 * 这是"先查后写"模式——先检查唯一性约束，再执行创建操作。
 * 注意：在高并发场景下，先查后写可能出现竞态条件（Race Condition），
 * 更好的做法是在数据库层面设置唯一索引，由数据库保证唯一性。
 */
export async function create(req: Request, res: Response): Promise<void> {
  // 从请求体中解构出用户信息
  const { nickname, username, password, role } = req.body;

  // 【参数验证】检查所有必填字段
  if (!nickname || !username || !password || !role) {
    return fail(res, 400, '缺少必填字段: nickname, username, password, role');
  }

  // 【角色验证】检查 role 字段的值是否合法
  // Array.includes() 方法检查数组中是否包含指定值
  if (!['player', 'admin'].includes(role)) {
    return fail(res, 400, 'role 字段必须为 player 或 admin');
  }

  // 【用户名唯一性检查】查询是否已有同名用户
  const existing = await userDao.getUserByUsername(username);
  if (existing) {
    // 409 Conflict 表示请求与服务器当前状态冲突（这里是用户名重复）
    return fail(res, 409, '用户名已存在');
  }

  // 所有验证通过，调用 DAO 层创建用户
  // 注意：这里密码是明文存储的，生产环境应使用 bcrypt 等工具加密
  const user = await userDao.createUser({ nickname, username, password, role });
  // 201 Created 表示资源创建成功
  ok(res, user, '用户创建成功', 201);
}

/**
 * GET /api/users/:id — 获取单个用户信息
 *
 * 【req.params 的含义】
 * req.params 是 URL 路径中的动态参数。
 * 路由 '/api/users/:id' 中的 :id 会被 Express 解析为 req.params.id。
 * 例如请求 GET /api/users/abc123 时，req.params.id === 'abc123'。
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const user = await userDao.getUser(String(req.params.id));
  if (!user) {
    return fail(res, 404, '用户不存在');
  }
  ok(res, user, '用户获取成功');
}

/**
 * GET /api/users — 获取全部用户列表
 *
 * 【技术学习】下划线前缀 "_req" 表示该参数未被使用，
 * 但因为 Express 路由回调函数签名要求，必须保留。
 */
export async function getAll(_req: Request, res: Response): Promise<void> {
  const users = await userDao.getAllUsers();
  ok(res, users, '全部用户获取成功');
}

/**
 * PUT /api/users/:id — 修改用户信息
 *
 * 采用"部分更新"模式：只更新客户端传入的字段。
 * 同时会检查用户名唯一性（如果修改了用户名的话）。
 */
export async function update(req: Request, res: Response): Promise<void> {
  const { nickname, username, password, role } = req.body;

  // 构建只包含需要更新字段的对象
  const data: Record<string, unknown> = {};
  if (nickname !== undefined) data.nickname = nickname;
  if (username !== undefined) data.username = username;
  if (password !== undefined) data.password = password;
  if (role !== undefined) data.role = role;

  // 如果没有任何字段需要更新，返回 400
  if (Object.keys(data).length === 0) {
    return fail(res, 400, '至少需要提供一个要修改的字段: nickname, username, password, role');
  }

  // 如果要修改角色，验证角色值是否合法
  if (role !== undefined && !['player', 'admin'].includes(role)) {
    return fail(res, 400, 'role 字段必须为 player 或 admin');
  }

  // 【用户名唯一性检查（更新时）】
  // 如果要修改用户名，需要检查新用户名是否已被其他用户占用
  // existing.id !== String(req.params.id) 排除当前用户自身
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

/**
 * POST /api/users/register — 用户自行注册
 *
 * 【注册 vs 管理员创建的区别】
 *   1. 不需要提供 role 字段，角色固定为 'player'
 *   2. 任何用户都可以调用此接口（无需管理员权限）
 *   3. 这是面向普通用户的开放接口
 *
 * 流程：验证参数 → 检查用户名唯一性 → 创建用户
 */
export async function register(req: Request, res: Response): Promise<void> {
  // 注册只需要昵称、用户名和密码，不需要 role
  const { nickname, username, password } = req.body;

  if (!nickname || !username || !password) {
    return fail(res, 400, '缺少必填字段: nickname, username, password');
  }

  // 检查用户名是否已被注册
  const existing = await userDao.getUserByUsername(username);
  if (existing) {
    return fail(res, 409, '用户名已存在');
  }

  // 角色固定为 'player'，用户不能自行选择管理员角色
  const user = await userDao.createUser({ nickname, username, password, role: 'player' });
  ok(res, user, '注册成功', 201);
}

/**
 * DELETE /api/users/:id — 删除单个用户
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const deleted = await userDao.deleteUser(String(req.params.id));
  if (!deleted) {
    return fail(res, 404, '用户不存在');
  }
  ok(res, null, '用户删除成功');
}

/**
 * DELETE /api/users — 删除全部用户
 *
 * 【技术学习】这是批量删除操作，通常应该有管理员权限保护。
 */
export async function removeAll(_req: Request, res: Response): Promise<void> {
  await userDao.deleteAllUsers();
  ok(res, null, '全部用户已删除');
}

/**
 * GET /api/users/me — 获取当前登录用户信息
 *
 * 【Cookie 认证机制】
 * Cookie 是存储在浏览器端的小型数据，每次向服务器发送请求时会自动携带。
 * 本项目使用 Cookie 存储登录状态（userId 和 userRole）。
 *
 * 认证流程：
 *   1. 用户登录时，服务端通过 res.cookie() 设置 Cookie
 *   2. 浏览器自动保存这些 Cookie
 *   3. 之后每次请求，浏览器自动将 Cookie 放入请求头中发送给服务端
 *   4. 服务端通过 req.cookies 读取 Cookie，识别用户身份
 *
 * 【Cookie 选项说明（在 login 接口中设置）】
 *   - httpOnly: true
 *     设置 Cookie 为 httpOnly，JavaScript（前端脚本）无法通过 document.cookie 读取。
 *     这是安全措施，防止 XSS（跨站脚本攻击）窃取 Cookie。
 *
 *   - maxAge: 7 * 24 * 60 * 60 * 1000（7天，单位毫秒）
 *     Cookie 的有效期。过期后浏览器会自动删除该 Cookie，用户需要重新登录。
 *
 *   - sameSite: 'lax'
 *     限制 Cookie 在跨站请求中的发送行为，防止 CSRF（跨站请求伪造）攻击。
 *     'lax' 模式允许从外部链接导航到本站时携带 Cookie，但禁止跨站表单提交携带。
 *
 * 【技术学习】req.cookies 需要 cookie-parser 中间件才能使用，
 * 在主程序中需要 app.use(cookieParser()) 注册该中间件。
 */
export async function me(req: Request, res: Response): Promise<void> {
  // 从 Cookie 中读取用户 ID
  // 使用可选链操作符 "?." 防止 req.cookies 为 undefined 时报错
  const userId = req.cookies?.userId;

  // 如果没有 userId Cookie，说明用户未登录
  if (!userId) {
    // 401 Unauthorized 表示"未认证"——客户端需要先登录
    return fail(res, 401, '未登录');
  }

  // 根据 userId 查询用户信息
  const user = await userDao.getUser(userId);
  if (!user) {
    // Cookie 中有 userId 但数据库中找不到用户
    // 可能是用户已被删除，但 Cookie 还没过期
    return fail(res, 401, '用户不存在');
  }

  ok(res, user, '当前用户获取成功');
}

/**
 * POST /api/users/logout — 用户登出
 *
 * 【登出流程】
 * 登出的本质就是清除浏览器中的认证 Cookie。
 * 调用 res.clearCookie() 后，服务端会指示浏览器删除指定的 Cookie。
 * 浏览器删除 Cookie 后，后续请求不再携带认证信息，用户就处于"未登录"状态了。
 *
 * 【技术学习】这个函数不是 async，因为它不涉及任何数据库操作，
 * 只需要清除 Cookie 并返回响应即可。
 */
export function logout(_req: Request, res: Response): void {
  // 清除存储用户身份和角色的两个 Cookie
  res.clearCookie('userId');
  res.clearCookie('userRole');
  ok(res, null, '已退出登录');
}

/**
 * POST /api/users/login — 用户登录
 *
 * 【登录流程】
 *   1. 客户端发送用户名和密码
 *   2. 服务端根据用户名查找用户
 *   3. 比对密码是否正确
 *   4. 验证通过后，设置 Cookie 记录登录状态
 *   5. 返回用户信息
 *
 * 【密码明文存储的问题】
 * ⚠️ 本项目为了教学简化，密码使用明文存储和比较（user.password !== password）。
 *
 * 在生产环境中这是非常危险的做法，正确的做法是：
 *   1. 注册时：使用 bcrypt 等算法对密码进行哈希处理，数据库存储哈希值
 *   2. 登录时：对用户输入的密码进行同样的哈希处理，然后比较哈希值
 *   3. 这样即使数据库泄露，攻击者也无法直接获得用户密码
 *
 * 示例（生产环境）：
 *   // 注册时
 *   const hashedPassword = await bcrypt.hash(password, 10); // 10 是 salt rounds
 *   // 登录时
 *   const isMatch = await bcrypt.compare(password, user.hashedPassword);
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  // 验证必填字段
  if (!username || !password) {
    return fail(res, 400, '缺少必填字段: username, password');
  }

  // 根据用户名查询用户
  const user = await userDao.getUserByUsername(username);
  if (!user) {
    // 为了安全，不应该告诉客户端是"用户名不存在"还是"密码错误"
    // 这里分开返回是为了教学演示，生产环境通常统一返回"用户名或密码错误"
    return fail(res, 404, '用户不存在');
  }

  // ⚠️ 明文密码比较，仅适用于教学场景
  if (user.password !== password) {
    // 401 Unauthorized 表示认证失败
    return fail(res, 401, '密码错误');
  }

  // 【Cookie 认证机制】登录成功后，设置两个 Cookie：
  //   - userId: 用户 ID，用于后续请求识别用户身份
  //   - userRole: 用户角色，可用于前端权限控制（如显示/隐藏管理入口）
  //
  // Cookie 选项说明：
  //   httpOnly: true  → 前端 JS 无法读取此 Cookie（防 XSS 攻击）
  //   maxAge: 7天     → Cookie 有效期，过期后需重新登录
  //   sameSite: 'lax' → 限制跨站请求携带 Cookie（防 CSRF 攻击）
  res.cookie('userId', user.id, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天，单位为毫秒
    sameSite: 'lax',
  });
  res.cookie('userRole', user.role, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });

  // 登录成功，返回用户信息
  ok(res, user, '登录成功');
}
