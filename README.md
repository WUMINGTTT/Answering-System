# Answering-System

**该项目使用 DeepSeekV4 Pro 全程VibeCoding而来**
一个基于 Vue 3 + Node.js 的定制实时知识竞赛答题系统，支持必答题、抢答题、风险题等多种赛制，适用于现场知识竞赛活动。

## 功能特性

- **三种题目阶段**：必答题（全员作答）、抢答题（先到先答）、风险题（高分值博弈）
- **多种题型支持**：单选题、多选题、主观题
- **实时同步**：基于 Socket.IO 的 WebSocket 通信，倒计时服务端校准，多端状态实时同步
- **三种角色**：管理员（控制比赛流程）、选手（答题）、展示屏（大屏展示）
- **自动计分**：倒计时结束自动判分，抢答自动记录先后顺序
- **实时排行榜**：分数变动即时更新排名
- **会话监控**：管理员可查看各页面在线连接数
- **深色/浅色主题**：管理端支持主题切换

## 技术栈

### 前端

| 技术               | 说明                               |
| ------------------ | ---------------------------------- |
| Vue 3              | Composition API + `<script setup>` |
| Vite 8             | 构建工具                           |
| TypeScript         | 类型安全                           |
| Element Plus       | UI 组件库（自动导入）              |
| Pinia 3            | 状态管理                           |
| Vue Router 5       | 路由（含角色守卫）                 |
| Socket.IO Client 4 | WebSocket 通信                     |
| Axios              | HTTP 请求                          |
| xlsx               | Excel 导出                         |

### 后端

| 技术          | 说明                   |
| ------------- | ---------------------- |
| Node.js       | 运行环境（ES Modules） |
| TypeScript    | 类型安全               |
| Express 5     | Web 框架               |
| Socket.IO 4   | WebSocket 服务         |
| LowDB 7       | JSON 文件数据库        |
| nanoid        | ID 生成                |
| cookie-parser | Cookie 管理            |

## 项目结构

```
Answering-System/
├── Backend/                    # 后端服务
│   └── src/
│       ├── index.ts            # Express + Socket.IO 入口
│       ├── controllers/        # 路由控制器
│       ├── data-access/        # 数据访问层（LowDB DAO）
│       ├── data/               # JSON 数据库文件（gitignore）
│       ├── routers/            # Express 路由定义
│       ├── socket/             # Socket.IO 事件处理 & 游戏状态管理
│       └── types/              # TypeScript 类型定义
│
├── Frontend/                   # 前端应用
│   └── src/
│       ├── api/                # Axios API 封装
│       ├── composables/        # 组合式函数（Socket、倒计时）
│       ├── router/             # 路由配置 & 权限守卫
│       ├── stores/             # Pinia 状态仓库
│       ├── types/              # TypeScript 类型定义
│       ├── views/              # 页面视图（首页、登录、管理、展示、选手）
│       └── components/         # 组件（按视图分组）
│
└── API.md                      # REST API 接口文档
```

## 快速开始

### 环境要求

- **Node.js** >= 20.19 或 >= 22.12
- **pnpm** >= 10（推荐）

### 安装依赖

```bash
# 后端
cd Backend
pnpm install

# 前端
cd Frontend
pnpm install
```

### 开发模式

分别启动后端和前端开发服务器：

```bash
# 终端 1 — 启动后端（默认端口 3000）
cd Backend
pnpm dev

# 终端 2 — 启动前端（默认端口 5173）
cd Frontend
pnpm dev
```

启动后访问 `http://localhost:5173/` 进入首页。

### 生产构建

```bash
# 构建后端
cd Backend
pnpm build
pnpm start

# 构建前端
cd Frontend
pnpm build
```

## 使用说明

系统包含以下页面，通过角色权限控制访问：

| 页面   | 路径       | 说明                                 |
| ------ | ---------- | ------------------------------------ |
| 首页   | `/`        | 导航入口                             |
| 登录   | `/login`   | 登录/注册                            |
| 管理端 | `/admin`   | 题目管理、用户管理、比赛控制面板     |
| 选手端 | `/player`  | 选手答题界面                         |
| 展示屏 | `/display` | 大屏展示（当前题目、倒计时、排行榜） |

### 比赛流程

1. 管理员在管理端添加题目和用户
2. 选手登录后进入选手端等待
3. 管理员选择题目并开始，系统自动推送题目到选手端和展示屏
4. 根据题目阶段，选手作答或抢答
5. 倒计时结束自动计分，展示屏实时更新排行榜

## 运行架构

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   前端 SPA   │◄──────────────────►│   后端服务    │
│  (Vite:5173) │     HTTP /api/*    │ (Express:3000)│
└─────────────┘◄──────────────────►└──────┬───────┘
                                          │
                                    ┌─────▼─────┐
                                    │  db.json   │
                                    │ (LowDB)    │
                                    └───────────┘
```

- 前端开发服务器将 `/api/*` 和 `/socket.io/*` 请求代理到后端
- 后端维护内存中的游戏状态（`GameState`），通过 Socket.IO 广播同步到所有客户端
- 数据持久化使用 LowDB 写入 JSON 文件

## API 文档

完整的 REST API 接口文档请参阅 [API.md](API.md)，涵盖：

- 题目管理（CRUD）
- 用户管理（注册、登录、CRUD）
- 成绩管理（查询、修改）
- 统一响应格式：`{ code, message, data }`

## License

MIT
