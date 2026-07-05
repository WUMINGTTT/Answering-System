/**
 * 应用入口模块 (Application Entry Point)
 *
 * 【技术学习】Express 应用创建流程：
 *   1. 创建 Express 应用实例（app）
 *   2. 创建 HTTP 服务器，将 app 作为请求处理器传入
 *   3. 初始化 Socket.IO，绑定到同一个 HTTP 服务器
 *   4. 注册中间件（解析 JSON、解析 Cookie 等）
 *   5. 挂载路由（将各模块的路由挂载到对应路径前缀下）
 *   6. 启动服务器监听端口
 *
 * 【技术学习】HTTP 服务器与 Socket.IO 共享端口：
 *   普通 HTTP 请求和 WebSocket 连接都通过同一个端口（如 3000）。
 *   Socket.IO 会在 HTTP 层面拦截 WebSocket 的握手请求，
 *   其余 HTTP 请求继续由 Express 处理。两者互不干扰。
 *
 * 【技术学习】顶层 await：
 *   本文件使用了顶层 await（await initDb()）。
 *   这在 ES Module 中是合法的，它会暂停当前模块的执行，
 *   直到数据库初始化完成后才继续执行后续代码。
 *   这确保了数据库就绪后服务器才开始接受请求。
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';

// 导入各功能模块的路由
import questionRoutes from './routers/questionRoutes.js';
import scoreRoutes from './routers/scoreRoutes.js';
import userRoutes from './routers/userRoutes.js';

// 导入数据库初始化和 Socket.IO 初始化函数
import { initDb } from './data-access/db.js';
import { initSocket } from './socket/index.js';

// ═══════════════════════════════════════════════════════════════════
// 第一步：初始化数据库
// 【技术学习】顶层 await 会阻塞后续代码执行，直到数据库连接建立完成。
// 这比在回调函数中嵌套启动逻辑更清晰、更易读。
// ═══════════════════════════════════════════════════════════════════
await initDb();

// ═══════════════════════════════════════════════════════════════════
// 第二步：创建 Express 应用和 HTTP 服务器
//
// 【技术学习】createServer(app) 的作用：
//   Node.js 原生的 http.createServer() 接受一个请求处理函数。
//   Express 的 app 本身就是一个请求处理函数（签名与 http.createServer 兼容），
//   所以可以直接传入。这样创建的 HTTP 服务器既能处理 HTTP 请求（通过 Express），
//   又能让 Socket.IO 绑定到同一端口处理 WebSocket 连接。
// ═══════════════════════════════════════════════════════════════════
const app = express();
const server = createServer(app);

// ═══════════════════════════════════════════════════════════════════
// 第三步：初始化 Socket.IO
// 将 Socket.IO 绑定到 HTTP 服务器上，实现 HTTP + WebSocket 共用端口
// ═══════════════════════════════════════════════════════════════════
initSocket(server);

// ═══════════════════════════════════════════════════════════════════
// 第四步：注册中间件
//
// 【技术学习】中间件（Middleware）是什么？
//   中间件是 Express 的核心概念。它是一个函数，接收 (req, res, next) 三个参数。
//   每个请求都会按顺序经过所有注册的中间件，中间件可以：
//   - 修改 req/res 对象（如解析请求体、设置响应头）
//   - 终止请求（直接发送响应）
//   - 调用 next() 将控制权交给下一个中间件
//
// 【技术学习】中间件注册顺序很重要！
//   Express 按照 app.use() 的注册顺序依次执行中间件。
//   express.json() 必须在路由之前注册，否则路由中无法读取 req.body。
// ═══════════════════════════════════════════════════════════════════

// express.json() — 解析请求体中的 JSON 数据，将其挂载到 req.body
app.use(express.json());

// cookieParser() — 解析请求中的 Cookie，将其挂载到 req.cookies
app.use(cookieParser());

// ═══════════════════════════════════════════════════════════════════
// 第五步：定义路由
//
// 【技术学习】app.use(path, router) 的作用：
//   将 router 模块挂载到指定路径前缀下。
//   例如 app.use('/api/questions', questionRoutes) 表示：
//   所有以 /api/questions 开头的请求都会交给 questionRoutes 处理。
// ═══════════════════════════════════════════════════════════════════

// 健康检查接口：GET / → 返回服务运行状态
app.get('/', (_req, res) => {
  res.json({ message: '系统API接口正在运行' });
});

// 挂载题目路由：/api/questions/*
app.use('/api/questions', questionRoutes);

// 挂载用户路由：/api/users/*
app.use('/api/users', userRoutes);

// 挂载成绩路由：/api/users/:id/scores/*
// 【技术学习】这里的路径包含 :id 参数，会被传递给 scoreRoutes。
// 配合 scoreRoutes 中的 mergeParams: true，子路由就能访问到 :id 参数。
app.use('/api/users/:id/scores', scoreRoutes);

// ═══════════════════════════════════════════════════════════════════
// 第六步：启动服务器
//
// 【技术学习】server.listen(PORT, callback) 的作用：
//   让 HTTP 服务器开始监听指定端口。当有请求到达时，
//   Express 会接管 HTTP 请求处理，Socket.IO 会接管 WebSocket 连接。
//   callback 在服务器成功启动后执行，通常用来打印启动信息。
// ═══════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
