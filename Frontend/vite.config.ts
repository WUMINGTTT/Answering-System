// ============================================================================
// vite.config.ts —— Vite 构建工具的核心配置文件
// ============================================================================
// 【技术学习】Vite（法语"快"的意思）是下一代前端构建工具，由 Vue 作者尤雨溪创建。
//
// Vite 的核心优势：
//   1. 开发阶段：利用浏览器原生的 ES Module 支持，无需打包即可运行项目
//      - 每个模块按需加载，冷启动速度极快（毫秒级）
//      - 热更新（HMR）只更新修改的模块，不受项目大小影响
//   2. 生产阶段：使用 Rollup 打包，输出高度优化的静态资源
//      - 自动代码分割、Tree Shaking（去除未使用的代码）
//
// 本配置文件定义了：插件、路径别名、开发服务器等配置。
// 官方文档：https://vite.dev/config/
// ============================================================================

// 导入 Node.js 内置的 url 模块，用于将 file:// URL 转换为文件系统路径
import { fileURLToPath, URL } from 'node:url'

// 从 Vite 导入 defineConfig 函数，提供 TypeScript 类型提示和自动补全
import { defineConfig } from 'vite'

// 【技术学习】自动导入插件 —— 自动导入 Vue、Vue Router 等库的 API
// 使用后无需在每个文件中手动写 import { ref, computed } from 'vue'
import AutoImport from 'unplugin-auto-import/vite'

// 【技术学习】组件自动注册插件 —— 在模板中使用组件时自动导入和注册
// 使用后无需手动 import 组件并在 components 选项中注册
import Components from 'unplugin-vue-components/vite'

// 【技术学习】Element Plus 的按需导入解析器
// 配合 Components 插件使用，实现 Element Plus 组件的自动按需导入
// - 只打包实际使用的组件，而非整个 Element Plus 库，显著减小打包体积
// - 例如只用了 <el-button>，打包时就只包含 Button 组件的代码
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// Vite 的 Vue 3 插件，让 Vite 能编译 .vue 单文件组件
import vue from '@vitejs/plugin-vue'

// Vue DevTools 的 Vite 集成插件，提供浏览器端的可视化调试功能
import vueDevTools from 'vite-plugin-vue-devtools'

// ============================================================================
// 导出 Vite 配置对象
// ============================================================================
export default defineConfig({
  // ========================================================================
  // plugins —— 插件数组
  // 【技术学习】Vite 的插件系统基于 Rollup 插件接口，并扩展了 Vite 特有的功能。
  // 插件可以拦截和转换模块、注入代码、修改构建行为等。
  // ========================================================================
  plugins: [
    // 【技术学习】Vue 3 编译插件
    // - 将 .vue 文件中的 <template> 编译为渲染函数
    // - 处理 <script> 和 <style> 中的代码
    // - 这是 Vue 项目必须启用的核心插件
    vue(),

    // 【技术学习】Vue DevTools 插件
    // - 在浏览器中按 F12 打开开发者工具，可以看到 "Vue" 面板
    // - 可视化查看组件树、组件状态（props/data/computed）、路由信息等
    // - 仅在开发模式下启用，生产构建时自动禁用
    vueDevTools(),

    // 【技术学习】AutoImport —— API 自动导入插件
    // 工作原理：
    //   1. 在编译阶段扫描代码中使用的 API（如 ref、computed、useRouter）
    //   2. 自动在文件顶部生成对应的 import 语句
    //   3. 生成 TypeScript 类型声明文件（auto-imports.d.ts），确保类型正确
    // 效果：开发者无需手动编写 import，减少样板代码
    AutoImport({
      // 配置解析器，让 AutoImport 也支持 Element Plus 的 API 自动导入
      // 例如使用 ElMessage() 时无需手动导入
      resolvers: [ElementPlusResolver()],

      // 指定需要自动导入的库
      // 'vue'：自动导入 ref、reactive、computed、watch、onMounted 等
      // 'vue-router'：自动导入 useRouter、useRoute、onBeforeRouteLeave 等
      imports: ['vue', 'vue-router'],

      // 【技术学习】生成 TypeScript 全局类型声明文件
      // - 输出到 src/auto-imports.d.ts
      // - 告诉 TypeScript 这些 API 是全局可用的，避免"找不到名称"的类型错误
      // - 此文件应提交到版本控制（git），确保团队成员类型一致
      dts: 'src/auto-imports.d.ts',

      // 【技术学习】生成 ESLint 配置文件
      // - ESLint 不知道 AutoImport 自动导入了哪些变量，会报 "no-undef" 错误
      // - 启用此选项后会生成 .eslintrc-auto-import.json，告诉 ESLint 这些变量是合法的
      eslintrc: {
        enabled: true,
      },
    }),

    // 【技术学习】Components —— 组件自动注册插件
    // 工作原理：
    //   1. 扫描 <template> 中使用的自定义组件标签（如 <el-button>、<MyComponent>）
    //   2. 自动找到对应的组件文件并生成 import 语句
    //   3. 无需在 <script> 中手动 import 和在 components 中注册
    // 效果：直接在模板中使用 <el-button> 即可，无需任何额外代码
    Components({
      // 【技术学习】ElementPlusResolver —— Element Plus 组件的按需导入解析器
      // - 当检测到 <el-xxx> 标签时，自动从 element-plus 中导入对应组件
      // - 同时自动导入组件所需的 CSS 样式
      // - 实现"用什么引什么"，避免打包整个 Element Plus（约 1MB+）
      resolvers: [ElementPlusResolver()],
    }),
  ],

  // ========================================================================
  // resolve —— 模块解析配置
  // ========================================================================
  resolve: {
    // 【技术学习】路径别名（alias）配置
    // - 将 '@' 映射到 './src' 目录
    // - 使用后可以用 import xxx from '@/utils/xxx' 代替 import xxx from '../../../utils/xxx'
    // - 避免深层目录的相对路径地狱，代码更清晰易维护
    // - fileURLToPath 将 URL 格式（file:///d:/...）转换为文件系统路径（d:\...）
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // ========================================================================
  // server —— 开发服务器配置
  // 【技术学习】Vite 开发服务器（Dev Server）在开发阶段提供本地 HTTP 服务
  // ========================================================================
  server: {
    // 【技术学习】host: '0.0.0.0' 允许局域网中的其他设备访问开发服务器
    // - 默认值是 'localhost'，只能本机访问
    // - 设置为 '0.0.0.0' 后，手机、平板等同一局域网的设备也可以访问
    // - 方便在不同设备上测试页面的响应式布局和功能
    host: '0.0.0.0',

    // 开发服务器的端口号，默认是 5173
    port: 5173,

    // 【技术学习】代理（Proxy）配置 —— 解决开发环境的跨域问题
    //
    // 背景：浏览器的同源策略（Same-Origin Policy）禁止网页向不同域名/端口发送请求。
    //   - 前端运行在 http://localhost:5173
    //   - 后端 API 运行在 http://localhost:3000
    //   - 直接请求会因为跨域（CORS）被浏览器拦截
    //
    // 解决方案：Vite 代理会将前端的请求转发到后端服务器
    //   - 前端请求 /api/users → Vite 代理转发到 http://localhost:3000/api/users
    //   - 对浏览器来说，请求始终发往同一个源（localhost:5173），不触发跨域
    proxy: {
      // 代理所有以 /api 开头的请求到后端服务器
      '/api': {
        target: 'http://localhost:3000',  // 后端 API 服务器地址
        changeOrigin: true,  // 修改请求头中的 Host 为目标地址，模拟同源请求
      },
      // 【技术学习】代理 Socket.IO 的 WebSocket 连接
      // - Socket.IO 默认使用 /socket.io 路径进行 WebSocket 握手和通信
      // - ws: true 表示同时支持 WebSocket 协议升级
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,  // 启用 WebSocket 代理
      },
    },
  },
})
