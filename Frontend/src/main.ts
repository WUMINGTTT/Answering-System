/**
 * 【技术学习】Vue 3 应用入口文件
 *
 * 这是整个前端应用的起点，负责：
 * 1. 创建 Vue 应用实例
 * 2. 注册必要的插件（状态管理、路由）
 * 3. 将应用挂载到 HTML 页面中的 DOM 元素上
 */

// ==================== 第一步：导入依赖 ====================

// 从 Vue 3 核心库中导入 createApp 函数
// 【技术学习】createApp 是 Vue 3 的工厂函数，用于创建应用实例
import { createApp } from 'vue'

// 导入 Pinia 状态管理库的创建函数
// 【技术学习】Pinia 是 Vue 3 官方推荐的状态管理库，替代了 Vue 2 的 Vuex
import { createPinia } from 'pinia'

// 导入根组件 App.vue
// 【技术学习】App.vue 是整个应用的根组件，所有其他组件都是它的子组件
import App from './App.vue'

// 导入路由配置
// 【技术学习】Vue Router 负责管理页面导航，实现单页应用(SPA)的页面切换
import router from './router'

// 导入 Element Plus 的暗色主题 CSS 变量
// 【技术学习】这行代码会加载暗色模式所需的 CSS 变量
// 当 HTML 元素添加 .dark 类名时，这些变量会自动生效
import 'element-plus/theme-chalk/dark/css-vars.css'

// ==================== 第二步：创建应用实例 ====================

// 使用 createApp 函数创建 Vue 应用实例
// 参数 App 是根组件，整个应用从这里开始渲染
// 【技术学习】app 对象包含了应用的核心方法：use()、mount() 等
const app = createApp(App)

// ==================== 第三步：注册插件 ====================

// 使用 app.use() 方法注册 Pinia 状态管理插件
// 【技术学习】createPinia() 返回 Pinia 实例，注册后可在任何组件中使用 store
app.use(createPinia())

// 注册 Vue Router 路由插件
// 【技术学习】注册路由后，就可以在应用中使用 <RouterView> 和 router-link 等组件
app.use(router)

// ==================== 第四步：挂载应用 ====================

// 将应用挂载到 HTML 页面中 id="app" 的 DOM 元素上
// 【技术学习】这个 div 通常在 index.html 中定义，Vue 会用根组件替换它的内容
// 挂载完成后，页面就会显示 Vue 应用的内容了
app.mount('#app')
