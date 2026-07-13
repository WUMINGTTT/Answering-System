# Answering-System 项目重构指南

**文档版本**: v1.0
**最后更新**: 2026-07-13

---

## 📋 目录

- [项目概述](#项目概述)
- [重构目标](#重构目标)
- [环境准备](#环境准备)
- [步骤 1：创建项目根目录](#步骤-1创建项目根目录)
- [步骤 2：初始化 Git 仓库](#步骤-2初始化-git-仓库)
- [步骤 3：创建前端 Vue 项目](#步骤-3创建前端-vue-项目)
- [步骤 4：配置前端项目结构](#步骤-4配置前端项目结构)
- [步骤 5：创建后端 Node.js 项目](#步骤-5创建后端-nodejs-项目)
- [步骤 6：配置后端项目结构](#步骤-6配置后端项目结构)
- [步骤 7：配置开发环境](#步骤-7配置开发环境)
- [步骤 8：迁移业务代码](#步骤-8迁移业务代码)
- [步骤 9：测试和验证](#步骤-9测试和验证)
- [步骤 10：优化和完善](#步骤-10优化和完善)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

---

## 项目概述

**Answering-System** 是一个基于 Vue 3 + Node.js 的实时知识竞赛答题系统，支持必答题、抢答题、风险题等多种赛制。

### 当前技术栈

**前端**:
- Vue 3 (Composition API)
- Vite 8
- TypeScript
- Element Plus
- Pinia 3
- Vue Router 5
- Socket.IO Client
- Axios

**后端**:
- Node.js (ES Modules)
- TypeScript
- Express 5
- Socket.IO 4
- LowDB 7
- nanoid

### 项目结构

```
Answering-System/
├── Frontend/          # 前端应用
│   ├── src/
│   │   ├── api/       # API 封装
│   │   ├── components/# Vue 组件
│   │   ├── composables/# 组合式函数
│   │   ├── router/    # 路由配置
│   │   ├── stores/    # Pinia 状态管理
│   │   ├── types/     # TypeScript 类型
│   │   └── views/     # 页面视图
│   ├── package.json
│   └── vite.config.ts
│
├── Backend/           # 后端服务
│   ├── src/
│   │   ├── controllers/# 路由控制器
│   │   ├── data-access/# 数据访问层
│   │   ├── routers/   # Express 路由
│   │   ├── socket/    # Socket.IO 处理
│   │   └── types/     # TypeScript 类型
│   └── package.json
│
├── README.md          # 项目说明
├── API.md             # API 文档
└── .gitignore         # Git 忽略配置
```

---

## 重构目标

1. **提升代码质量**：统一代码风格，增强类型安全
2. **优化项目结构**：更清晰的模块划分和职责分离
3. **改善开发体验**：更好的开发工具链和调试支持
4. **增强可维护性**：完善的文档和测试覆盖
5. **提高性能**：优化构建产物和运行时性能
6. **标准化流程**：规范 Git 工作流和 CI/CD 流程

---

## 环境准备

### 必需软件

1. **Node.js** >= 20.19 或 >= 22.12
   ```bash
   # 检查 Node.js 版本
   node --version

   # 推荐使用 nvm 管理 Node.js 版本
   # Windows: nvm-windows
   # macOS/Linux: nvm
   ```

2. **pnpm** >= 10（推荐）
   ```bash
   # 安装 pnpm
   npm install -g pnpm

   # 检查版本
   pnpm --version
   ```

3. **Git** >= 2.30
   ```bash
   # 检查 Git 版本
   git --version

   # 配置用户信息（如果尚未配置）
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

4. **VS Code**（推荐）或其他现代 IDE
   - 推荐安装扩展：
     - Vue - Official
     - ESLint
     - Prettier
     - TypeScript Vue Plugin (Volar)

### 可选工具

- **nvm-windows** / **nvm**：Node.js 版本管理
- **pnpm**：高性能包管理器
- **GitHub Desktop** 或 **SourceTree**：Git 图形化客户端

---

## 步骤 1：创建项目根目录

### 1.1 创建项目文件夹

```bash
# 创建项目根目录
mkdir Answering-System

# 进入项目目录
cd Answering-System

# 创建基本目录结构
mkdir -p Frontend Backend docs
```

### 1.2 初始化项目配置

在根目录创建以下文件：

**README.md** - 项目说明文档：
```markdown
# Answering-System

一个基于 Vue 3 + Node.js 的实时知识竞赛答题系统。

## 功能特性

- 三种题目阶段：必答题、抢答题、风险题
- 实时同步：基于 Socket.IO 的 WebSocket 通信
- 多种角色：管理员、选手、展示屏
- 自动计分和排行榜

## 技术栈

- 前端：Vue 3 + Vite + TypeScript + Element Plus
- 后端：Node.js + Express + Socket.IO + TypeScript

## 快速开始

### 环境要求

- Node.js >= 20.19 或 >= 22.12
- pnpm >= 10

### 安装依赖

```bash
# 后端
cd Backend
pnpm install

# 前端
cd ../Frontend
pnpm install
```

### 开发模式

```bash
# 终端 1 - 启动后端
cd Backend
pnpm dev

# 终端 2 - 启动前端
cd Frontend
pnpm dev
```

## License

MIT
```

**.gitignore** - Git 忽略配置：
```gitignore
# 依赖目录
node_modules/
.pnpm-store/

# 构建产物
dist/
build/
.output/

# 环境配置
.env
.env.local
.env.*.local

# IDE 配置
.vscode/
.idea/
*.swp
*.swo

# 系统文件
.DS_Store
Thumbs.db

# 日志文件
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# 测试覆盖率
coverage/

# 临时文件
*.tmp
*.temp

# 后端数据文件
Backend/src/data/*.json

# TypeScript 缓存
*.tsbuildinfo
```

**package.json** - 根目录工作区配置（可选，用于 monorepo）：
```json
{
  "name": "answering-system",
  "version": "1.0.0",
  "private": true,
  "description": "实时知识竞赛答题系统",
  "workspaces": [
    "Frontend",
    "Backend"
  ],
  "scripts": {
    "dev:frontend": "cd Frontend && pnpm dev",
    "dev:backend": "cd Backend && pnpm dev",
    "dev": "concurrently \"pnpm dev:backend\" \"pnpm dev:frontend\"",
    "build:frontend": "cd Frontend && pnpm build",
    "build:backend": "cd Backend && pnpm build",
    "build": "pnpm build:backend && pnpm build:frontend"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  },
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  }
}
```

---

## 步骤 2：初始化 Git 仓库

### 2.1 初始化 Git

```bash
# 在项目根目录初始化 Git
git init

# 检查 Git 状态
git status
```

### 2.2 创建初始提交

```bash
# 添加所有文件到暂存区
git add .

# 创建初始提交
git commit -m "feat: 初始化项目结构"

# 查看提交历史
git log
```

### 2.3 配置 Git（可选）

```bash
# 设置默认分支名称
git branch -M main

# 添加远程仓库（如果有）
git remote add origin https://github.com/your-username/Answering-System.git

# 推送到远程仓库
git push -u origin main
```

### 2.4 创建开发分支

```bash
# 创建并切换到开发分支
git checkout -b develop

# 推送开发分支到远程
git push -u origin develop
```

### 2.5 配置 Git 钩子（可选）

安装 husky 和 lint-staged 来自动执行代码检查：

```bash
# 安装 husky
pnpm add -Dw husky

# 初始化 husky
pnpm husky init

# 创建 pre-commit 钩子
echo 'pnpm lint-staged' > .husky/pre-commit
```

在根目录 `package.json` 中添加：
```json
{
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "prettier --write"
    ]
  }
}
```

---

## 步骤 3：创建前端 Vue 项目

### 3.1 使用 Vite 创建 Vue 项目

```bash
# 进入 Frontend 目录
cd Frontend

# 使用 pnpm 创建 Vite + Vue + TypeScript 项目
pnpm create vite . --template vue-ts

# 或者使用 Vue CLI（如果需要更多配置选项）
# pnpm create vue@latest . --typescript --router --pinia
```

### 3.2 安装核心依赖

```bash
# 安装生产依赖
pnpm add vue vue-router pinia axios socket.io-client element-plus @element-plus/icons-vue xlsx

# 安装开发依赖
pnpm add -D @vitejs/plugin-vue @vue/tsconfig typescript vite vue-tsc \
  unplugin-auto-import unplugin-vue-components \
  @tsconfig/node24 @types/node npm-run-all2 prettier \
  vite-plugin-vue-devtools
```

### 3.3 配置 package.json

编辑 `Frontend/package.json`，确保包含以下内容：

```json
{
  "name": "frontend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview",
    "build-only": "vite build",
    "type-check": "vue-tsc --build",
    "format": "prettier --write --experimental-cli src/"
  },
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.2",
    "axios": "^1.16.1",
    "element-plus": "^2.14.0",
    "pinia": "^3.0.4",
    "socket.io-client": "^4.8.3",
    "vue": "^3.5.32",
    "vue-router": "^5.0.4",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tsconfig/node24": "^24.0.4",
    "@types/node": "^24.12.2",
    "@vitejs/plugin-vue": "^6.0.6",
    "@vue/tsconfig": "^0.9.1",
    "npm-run-all2": "^8.0.4",
    "prettier": "3.8.3",
    "typescript": "~6.0.0",
    "unplugin-auto-import": "^21.0.0",
    "unplugin-vue-components": "^32.0.0",
    "vite": "^8.0.8",
    "vite-plugin-vue-devtools": "^8.1.1",
    "vue-tsc": "^3.2.6"
  },
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  }
}
```

---

## 步骤 4：配置前端项目结构

### 4.1 创建目录结构

```bash
# 在 Frontend/src 目录下创建以下结构
mkdir -p src/{api,assets,components/{adminView,displayView,loginView,playerView},composables,router,stores,types,views,utils}
```

完整的目录结构：
```
Frontend/
├── public/                    # 静态资源
├── src/
│   ├── api/                   # API 请求封装
│   │   ├── index.ts           # Axios 实例配置
│   │   ├── question.ts        # 题目相关 API
│   │   ├── score.ts           # 成绩相关 API
│   │   └── user.ts            # 用户相关 API
│   │
│   ├── assets/                # 静态资源（图片、字体等）
│   │   └── styles/            # 全局样式
│   │       └── main.css       # 主样式文件
│   │
│   ├── components/            # Vue 组件
│   │   ├── adminView/         # 管理端组件
│   │   │   ├── dashboard/     # 仪表盘组件
│   │   │   │   ├── BuzzPlayerList.vue
│   │   │   │   ├── CountdownPanel.vue
│   │   │   │   ├── CurrentQuestion.vue
│   │   │   │   ├── PlayerList.vue
│   │   │   │   ├── PlayerStatusPanel.vue
│   │   │   │   ├── QuestionList.vue
│   │   │   │   └── StatusControls.vue
│   │   │   ├── DashboardPanel.vue
│   │   │   ├── QuestionManagement.vue
│   │   │   ├── SessionManager.vue
│   │   │   └── UserManagement.vue
│   │   │
│   │   ├── displayView/       # 展示屏组件
│   │   │   ├── AnswerReveal.vue
│   │   │   ├── BuzzResultPanel.vue
│   │   │   ├── CountdownTimers.vue
│   │   │   ├── DisplayRanking.vue
│   │   │   ├── QuestionCard.vue
│   │   │   └── RiskQuestionGrid.vue
│   │   │
│   │   ├── loginView/         # 登录组件
│   │   │   ├── LoginForm.vue
│   │   │   └── RegisterForm.vue
│   │   │
│   │   └── playerView/        # 选手端组件
│   │       ├── AnswerOptions.vue
│   │       ├── BuzzButton.vue
│   │       ├── PlayerCountdown.vue
│   │       └── QuestionDisplay.vue
│   │
│   ├── composables/           # 组合式函数（Hooks）
│   │   ├── useCountdown.ts    # 倒计时逻辑
│   │   ├── useSocket.ts       # Socket.IO 连接
│   │   └── useTheme.ts        # 主题切换
│   │
│   ├── router/                # Vue Router 配置
│   │   └── index.ts           # 路由定义和守卫
│   │
│   ├── stores/                # Pinia 状态管理
│   │   ├── game.ts            # 游戏状态
│   │   ├── question.ts        # 题目状态
│   │   ├── score.ts           # 成绩状态
│   │   └── user.ts            # 用户状态
│   │
│   ├── types/                 # TypeScript 类型定义
│   │   ├── question.ts        # 题目相关类型
│   │   ├── score.ts           # 成绩相关类型
│   │   ├── socket.ts          # Socket 事件类型
│   │   └── user.ts            # 用户相关类型
│   │
│   ├── utils/                 # 工具函数
│   │   ├── validation.ts      # 表单验证
│   │   └── helpers.ts         # 通用辅助函数
│   │
│   ├── views/                 # 页面视图
│   │   ├── HomeView.vue       # 首页
│   │   ├── LoginView.vue      # 登录页
│   │   ├── AdminView.vue      # 管理端
│   │   ├── DisplayView.vue    # 展示屏
│   │   └── PlayerView.vue     # 选手端
│   │
│   ├── App.vue                # 根组件
│   └── main.ts                # 应用入口
│
├── index.html                 # HTML 入口
├── package.json
├── tsconfig.json              # TypeScript 配置
├── tsconfig.app.json          # 应用 TS 配置
├── tsconfig.node.json         # Node TS 配置
├── vite.config.ts             # Vite 配置
├── .prettierrc.json           # Prettier 配置
└── env.d.ts                   # 环境类型声明
```

### 4.2 配置 Vite

创建 `Frontend/vite.config.ts`：

```typescript
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
})
```

### 4.3 配置 TypeScript

**tsconfig.json**：
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.app.json" }
  ]
}
```

**tsconfig.app.json**：
```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["element-plus/global"]
  },
  "include": [
    "env.d.ts",
    "src/**/*",
    "src/**/*.vue"
  ],
  "exclude": [
    "src/**/__tests__/*"
  ]
}
```

**tsconfig.node.json**：
```json
{
  "extends": "@tsconfig/node24/tsconfig.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  },
  "include": [
    "vite.config.*",
    "vitest.config.*",
    "cypress.config.*",
    "nightwatch.conf.*",
    "playwright.config.*"
  ]
}
```

### 4.4 配置 Prettier

创建 `Frontend/.prettierrc.json`：

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 4.5 创建环境类型声明

创建 `Frontend/env.d.ts`：

```typescript
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

### 4.6 创建应用入口

**main.ts**：
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
```

**App.vue**：
```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif;
}
</style>
```

### 4.7 创建 HTML 入口

编辑 `Frontend/index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>答题系统</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

## 步骤 5：创建后端 Node.js 项目

### 5.1 初始化后端项目

```bash
# 进入 Backend 目录
cd Backend

# 初始化 package.json
pnpm init
```

### 5.2 安装依赖

```bash
# 安装生产依赖
pnpm add express@5 socket.io lowdb@7 nanoid cookie-parser

# 安装开发依赖
pnpm add -D typescript @types/express @types/node @types/cookie-parser \
  tsx nodemon prettier
```

### 5.3 配置 package.json

编辑 `Backend/package.json`：

```json
{
  "name": "answering-system-backend",
  "version": "1.0.0",
  "description": "答题系统后端服务",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "express": "^5.2.1",
    "lowdb": "^7.0.1",
    "nanoid": "^5.1.9",
    "socket.io": "^4.8.3"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.10",
    "@types/express": "^5.0.3",
    "@types/node": "^22.15.21",
    "nodemon": "^3.1.14",
    "prettier": "^3.5.3",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3"
  },
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  }
}
```

---

## 步骤 6：配置后端项目结构

### 6.1 创建目录结构

```bash
# 在 Backend/src 目录下创建以下结构
mkdir -p src/{controllers,data-access,data,routers,socket,types,middleware,utils}
```

完整的目录结构：
```
Backend/
├── src/
│   ├── controllers/           # 路由控制器
│   │   ├── questionController.ts  # 题目控制器
│   │   ├── scoreController.ts     # 成绩控制器
│   │   └── userController.ts      # 用户控制器
│   │
│   ├── data-access/           # 数据访问层（DAO）
│   │   ├── db.ts              # LowDB 数据库配置
│   │   ├── questionDao.ts     # 题目数据访问
│   │   ├── scoreDao.ts        # 成绩数据访问
│   │   └── userDao.ts         # 用户数据访问
│   │
│   ├── data/                  # 数据文件目录（gitignore）
│   │   └── db.json            # LowDB 数据库文件
│   │
│   ├── middleware/            # Express 中间件
│   │   ├── auth.ts            # 认证中间件
│   │   └── errorHandler.ts    # 错误处理中间件
│   │
│   ├── routers/               # Express 路由定义
│   │   ├── index.ts           # 路由入口
│   │   ├── questionRoutes.ts  # 题目路由
│   │   ├── scoreRoutes.ts     # 成绩路由
│   │   └── userRoutes.ts      # 用户路由
│   │
│   ├── socket/                # Socket.IO 处理
│   │   ├── gameState.ts       # 游戏状态管理
│   │   └── index.ts           # Socket 事件处理
│   │
│   ├── types/                 # TypeScript 类型定义
│   │   ├── question.ts        # 题目类型
│   │   ├── score.ts           # 成绩类型
│   │   ├── socket.ts          # Socket 事件类型
│   │   └── user.ts            # 用户类型
│   │
│   ├── utils/                 # 工具函数
│   │   ├── helpers.ts         # 通用辅助函数
│   │   └── validation.ts      # 数据验证
│   │
│   └── index.ts               # 应用入口
│
├── package.json
├── tsconfig.json              # TypeScript 配置
└── .prettierrc                # Prettier 配置
```

### 6.2 配置 TypeScript

创建 `Backend/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 6.3 配置 Prettier

创建 `Backend/.prettierrc`：

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

### 6.4 创建应用入口

创建 `Backend/src/index.ts`：

```typescript
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import { setupRoutes } from './routers/index.js'
import { setupSocketHandlers } from './socket/index.js'
import { initializeDatabase } from './data-access/db.js'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})

const PORT = process.env.PORT || 3000

// 中间件配置
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// 初始化数据库
await initializeDatabase()

// 设置路由
setupRoutes(app)

// 设置 Socket.IO 事件处理
setupSocketHandlers(io)

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
})

export { app, server, io }
```

### 6.5 创建数据库配置

创建 `Backend/src/data-access/db.ts`：

```typescript
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface DatabaseSchema {
  users: any[]
  questions: any[]
  scores: any[]
}

const defaultData: DatabaseSchema = {
  users: [],
  questions: [],
  scores: [],
}

let db: Low<DatabaseSchema>

export async function initializeDatabase() {
  const dataDir = join(__dirname, '..', 'data')
  
  // 确保数据目录存在
  await mkdir(dataDir, { recursive: true })
  
  const dbPath = join(dataDir, 'db.json')
  const adapter = new JSONFile<DatabaseSchema>(dbPath)
  db = new Low<DatabaseSchema>(adapter, defaultData)
  
  await db.read()
  
  console.log('✅ Database initialized')
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}
```

---

## 步骤 7：配置开发环境

### 7.1 配置 ESLint（可选）

如果需要 ESLint 进行代码检查：

```bash
# 在前端目录安装 ESLint
cd Frontend
pnpm add -D eslint @vue/eslint-config-typescript @vue/eslint-config-prettier

# 创建 .eslintrc.cjs 配置文件
cat > .eslintrc.cjs << 'EOF'
module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'vue/multi-word-component-names': 'off',
  },
}
EOF
```

### 7.2 配置 VS Code

创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "vue.server.hybridMode": true
}
```

创建 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "Vue.volar",
    "Vue.vscode-typescript-vue-plugin",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

### 7.3 安装所有依赖

```bash
# 在项目根目录
cd Answering-System

# 安装根目录依赖（如果有工作区配置）
pnpm install

# 或者分别安装
cd Backend && pnpm install
cd ../Frontend && pnpm install
```

---

## 步骤 8：迁移业务代码

### 8.1 迁移前端代码

1. **复制组件文件**：
   ```bash
   # 从备份或原始项目复制组件
   cp -r /path/to/original/Frontend/src/components/* Frontend/src/components/
   ```

2. **复制视图文件**：
   ```bash
   cp -r /path/to/original/Frontend/src/views/* Frontend/src/views/
   ```

3. **复制 Store 文件**：
   ```bash
   cp -r /path/to/original/Frontend/src/stores/* Frontend/src/stores/
   ```

4. **复制路由配置**：
   ```bash
   cp /path/to/original/Frontend/src/router/index.ts Frontend/src/router/
   ```

5. **复制 API 封装**：
   ```bash
   cp -r /path/to/original/Frontend/src/api/* Frontend/src/api/
   ```

6. **复制类型定义**：
   ```bash
   cp -r /path/to/original/Frontend/src/types/* Frontend/src/types/
   ```

7. **复制组合式函数**：
   ```bash
   cp -r /path/to/original/Frontend/src/composables/* Frontend/src/composables/
   ```

### 8.2 迁移后端代码

1. **复制控制器**：
   ```bash
   cp -r /path/to/original/Backend/src/controllers/* Backend/src/controllers/
   ```

2. **复制数据访问层**：
   ```bash
   cp -r /path/to/original/Backend/src/data-access/* Backend/src/data-access/
   ```

3. **复制路由定义**：
   ```bash
   cp -r /path/to/original/Backend/src/routers/* Backend/src/routers/
   ```

4. **复制 Socket 处理**：
   ```bash
   cp -r /path/to/original/Backend/src/socket/* Backend/src/socket/
   ```

5. **复制类型定义**：
   ```bash
   cp -r /path/to/original/Backend/src/types/* Backend/src/types/
   ```

### 8.3 修复导入路径

迁移后，检查并修复所有导入路径：

**前端**：
- 确保使用 `@/` 别名引用 `src/` 目录下的文件
- 检查相对路径是否正确

**后端**：
- 确保使用 `.js` 扩展名（ES Modules 要求）
- 检查相对路径是否正确

示例修复：
```typescript
// 修复前
import { useUserStore } from '../stores/user'

// 修复后
import { useUserStore } from '@/stores/user'
```

### 8.4 更新环境变量

如果项目使用环境变量，创建 `.env` 文件：

**Frontend/.env**：
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

**Backend/.env**：
```env
PORT=3000
NODE_ENV=development
```

---

## 步骤 9：测试和验证

### 9.1 启动开发服务器

```bash
# 终端 1 - 启动后端
cd Backend
pnpm dev

# 终端 2 - 启动前端
cd Frontend
pnpm dev
```

### 9.2 验证功能

1. **访问前端应用**：
   - 打开浏览器访问 `http://localhost:5173/`
   - 检查页面是否正常加载

2. **测试 API 连接**：
   ```bash
   # 测试后端 API
   curl http://localhost:3000/api/health
   ```

3. **测试 WebSocket 连接**：
   - 打开浏览器开发者工具
   - 检查 Network 选项卡中的 WebSocket 连接

4. **测试核心功能**：
   - 用户注册/登录
   - 题目管理
   - 实时答题
   - 成绩统计

### 9.3 运行类型检查

```bash
# 前端类型检查
cd Frontend
pnpm type-check

# 后端类型检查
cd Backend
pnpm lint
```

### 9.4 运行代码格式化

```bash
# 前端格式化
cd Frontend
pnpm format

# 后端格式化
cd Backend
pnpm format
```

---

## 步骤 10：优化和完善

### 10.1 创建 Git 提交

```bash
# 在项目根目录
cd Answering-System

# 添加所有更改
git add .

# 创建提交
git commit -m "feat: 完成项目重构和代码迁移"

# 推送到远程仓库
git push origin main
```

### 10.2 创建文档

1. **API 文档**：
   - 创建详细的 REST API 文档（参考 `API.md`）
   - 包含所有接口的请求/响应格式

2. **开发文档**：
   - 项目架构说明
   - 开发环境配置指南
   - 部署指南

3. **用户文档**：
   - 功能使用说明
   - 常见问题解答

### 10.3 配置 CI/CD（可选）

创建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Run type check
        run: |
          cd Frontend && pnpm type-check
          cd ../Backend && pnpm lint

      - name: Build frontend
        run: cd Frontend && pnpm build

      - name: Build backend
        run: cd Backend && pnpm build
```

### 10.4 配置 Docker（可选）

创建 `Dockerfile`：

```dockerfile
# 后端
FROM node:20-alpine AS backend
WORKDIR /app
COPY Backend/package*.json Backend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY Backend/ .
RUN pnpm build

# 前端
FROM node:20-alpine AS frontend
WORKDIR /app
COPY Frontend/package*.json Frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY Frontend/ .
RUN pnpm build

# 生产环境
FROM node:20-alpine
WORKDIR /app
COPY --from=backend /app/dist ./backend
COPY --from=frontend /app/dist ./frontend
COPY Backend/package*.json Backend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod
EXPOSE 3000
CMD ["node", "backend/index.js"]
```

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - '3000:3000'
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000

  frontend:
    image: nginx:alpine
    ports:
      - '80:80'
    volumes:
      - ./Frontend/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
```

### 10.5 创建部署脚本

创建 `scripts/deploy.sh`：

```bash
#!/bin/bash

echo "🚀 开始部署..."

# 构建后端
echo "📦 构建后端..."
cd Backend
pnpm build
cd ..

# 构建前端
echo "📦 构建前端..."
cd Frontend
pnpm build
cd ..

# 部署到服务器（示例）
echo "📤 上传文件到服务器..."
rsync -avz --delete Backend/dist/ user@server:/app/backend/
rsync -avz --delete Frontend/dist/ user@server:/app/frontend/

# 重启服务
echo "🔄 重启服务..."
ssh user@server 'cd /app && pm2 restart all'

echo "✅ 部署完成！"
```

---

## 常见问题

### Q1: pnpm install 失败

**问题**：依赖安装失败或版本冲突

**解决方案**：
```bash
# 清除缓存
pnpm store prune

# 删除 node_modules 和 lockfile
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### Q2: TypeScript 类型错误

**问题**：编译时出现类型错误

**解决方案**：
1. 检查 `tsconfig.json` 配置是否正确
2. 确保安装了所有必要的 `@types/*` 包
3. 运行 `pnpm type-check` 查看详细错误

### Q3: Socket.IO 连接失败

**问题**：前端无法连接到后端 WebSocket

**解决方案**：
1. 检查后端是否正在运行
2. 检查 Vite 代理配置是否正确
3. 确认 CORS 配置允许前端域名
4. 检查防火墙设置

### Q4: 热更新不工作

**问题**：修改代码后浏览器不会自动刷新

**解决方案**：
1. 确保使用 `pnpm dev` 启动开发服务器
2. 检查 Vite 配置中的 `server.hmr` 设置
3. 尝试手动刷新浏览器
4. 清除浏览器缓存

### Q5: 构建失败

**问题**：生产构建时出现错误

**解决方案**：
1. 先运行类型检查：`pnpm type-check`
2. 检查是否有未使用的导入或变量
3. 确保所有依赖都已正确安装
4. 查看详细错误日志

---

## 参考资料

### 官方文档

- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Socket.IO 文档](https://socket.io/)
- [Express 文档](https://expressjs.com/)
- [LowDB 文档](https://github.com/typicode/lowdb)

### 工具文档

- [pnpm 文档](https://pnpm.io/)
- [ESLint 文档](https://eslint.org/)
- [Prettier 文档](https://prettier.io/)
- [Husky 文档](https://typicode.github.io/husky/)

### 学习资源

- [Vue 3 组合式 API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [TypeScript 入门教程](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [Vite 最佳实践](https://vitejs.dev/guide/)

---

## 附录

### A. 推荐的 VS Code 扩展

1. **Vue - Official** - Vue 3 官方扩展
2. **ESLint** - 代码检查
3. **Prettier** - 代码格式化
4. **TypeScript Vue Plugin (Volar)** - TypeScript 支持
5. **Auto Rename Tag** - 自动重命名标签
6. **Bracket Pair Colorizer** - 括号颜色匹配
7. **GitLens** - Git 增强
8. **Error Lens** - 错误内联显示

### B. 推荐的浏览器扩展

1. **Vue.js devtools** - Vue 开发者工具
2. **React Developer Tools**（如果使用 React）
3. **Redux DevTools**（如果使用 Redux）

### C. 项目检查清单

在完成重构后，检查以下内容：

- [ ] 所有依赖已正确安装
- [ ] 前端可以正常启动（`pnpm dev`）
- [ ] 后端可以正常启动（`pnpm dev`）
- [ ] TypeScript 类型检查通过
- [ ] 代码格式化完成
- [ ] Git 提交历史清晰
- [ ] 文档完整且准确
- [ ] 所有功能正常工作
- [ ] 性能测试通过
- [ ] 安全审查完成

---

**文档维护者**: 开发团队
**最后更新**: 2026-07-13
**版本**: v1.0

如有问题或建议，请提交 Issue 或 Pull Request。
