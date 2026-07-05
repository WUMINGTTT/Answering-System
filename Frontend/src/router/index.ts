/**
 * Vue Router 路由配置
 *
 * 【技术学习 - Vue Router 是什么？】
 * Vue Router 是 Vue.js 的官方路由管理器，用于构建单页应用（SPA）。
 * 它的核心功能是：将 URL 路径映射到对应的 Vue 组件，实现"页面切换"效果。
 * 在 SPA 中，页面切换不会真正刷新浏览器，而是动态替换组件内容。
 *
 * 【技术学习 - 路由的核心概念】
 * - 路由（Route）：一个 URL 路径与组件的映射关系，如 '/login' → LoginView
 * - 路由器（Router）：管理所有路由规则的实例
 * - 导航守卫（Navigation Guard）：在路由跳转前后执行的钩子函数，用于鉴权、日志等
 * - 路由模式：决定 URL 的表现形式（HTML5 History 模式 vs Hash 模式）
 */

// 从 vue-router 中导入路由创建函数
// createRouter：创建路由器实例
// createWebHistory：创建 HTML5 History 模式的路由历史
import { createRouter, createWebHistory } from 'vue-router'

// 导入各个页面组件
// 【技术学习 - 静态导入 vs 懒加载】
// 这里使用的是静态导入（直接 import），组件会在应用启动时就全部加载。
// 如果项目较大，可以改用懒加载：component: () => import('@/views/HomeView.vue')
// 懒加载的好处：只有访问对应路由时才加载组件，减少首屏加载时间。
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import DisplayView from '@/views/DisplayView.vue'
import PlayerView from '@/views/PlayerView.vue'
import AdminView from '@/views/AdminView.vue'

// 导入 API 函数和 Store，用于路由守卫中的鉴权逻辑
import { getMe } from '@/api/users'           // 获取当前登录用户信息的 API
import { useThemeStore } from '@/stores/theme' // 主题 Store（用于控制深色模式）

/**
 * 创建路由器实例
 *
 * 【技术学习 - createRouter 参数】
 * - history: 路由模式，决定 URL 的显示方式
 * - routes: 路由配置数组，每个对象定义一条路由规则
 *
 * 【技术学习 - HTML5 History 模式 vs Hash 模式】
 *
 * History 模式（本项目使用）：
 *   URL 形式：https://example.com/login
 *   优点：URL 简洁美观，没有 '#' 号
 *   缺点：需要服务器配置支持（所有路径都返回 index.html）
 *   原理：使用 HTML5 的 pushState/replaceState API
 *
 * Hash 模式：
 *   URL 形式：https://example.com/#/login
 *   优点：不需要服务器配置，兼容性好
 *   缺点：URL 中有 '#' 号，不够美观
 *   原理：使用 URL 的 hash 部分（#后面的内容）
 *
 * import.meta.env.BASE_URL 是 Vite 提供的环境变量，
 * 对应 vite.config.ts 中的 base 配置，默认值为 '/'
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    /**
     * 【技术学习 - 路由配置对象的属性】
     * - path: URL 路径（必须以 '/' 开头）
     * - name: 路由名称，用于编程式导航（如 router.push({ name: '首页' })）
     * - component: 对应的 Vue 组件，访问该路径时渲染此组件
     */
    {
      path: '/',          // 根路径，即网站首页
      name: '首页',        // 路由名称（中文名在本项目中用于展示）
      component: HomeView, // 对应 HomeView.vue 组件
    },
    {
      path: '/login',      // 登录页路径
      name: '登录页',
      component: LoginView,
    },
    {
      path: '/display',    // 比赛展示页路径（大屏幕展示用）
      name: '显示页',
      component: DisplayView,
    },
    {
      path: '/player',     // 选手操作页路径
      name: '选手页',
      component: PlayerView,
    },
    {
      path: '/admin',      // 管理员控制台路径
      name: '管理页',
      component: AdminView,
    },
  ],
})

/**
 * 需要登录才能访问的路由路径列表
 *
 * 【技术学习 - 集中管理受保护路由】
 * 将所有需要鉴权的路径提取到一个数组中，方便维护。
 * 如果新增需要鉴权的页面，只需在此数组中添加路径即可。
 */
const protectedRoutes = ['/player', '/admin', '/display']

/**
 * 角色可访问的路由映射表
 *
 * 【技术学习 - 基于角色的访问控制（RBAC）】
 * Role-Based Access Control（RBAC）是一种常见的权限管理模型：
 * - player（选手）：只能访问选手页
 * - admin（管理员）：可以访问管理页和展示页
 *
 * Record<string, string[]> 表示键和值都是字符串数组的映射对象。
 */
const roleRouteMap: Record<string, string[]> = {
  player: ['/player'],           // 选手只能访问选手页
  admin: ['/admin', '/display'], // 管理员可以访问管理页和展示页
}

/**
 * 各角色的默认首页
 *
 * 用途：当用户访问了无权限的页面时，重定向到其角色对应的默认页面。
 * 例如：选手访问 /admin 时，会被重定向到 /player。
 */
const roleDefaultPage: Record<string, string> = {
  player: '/player',  // 选手的默认页
  admin: '/admin',    // 管理员的默认页
}

/**
 * 全局前置守卫（Navigation Guard - beforeEach）
 *
 * 【技术学习 - 导航守卫是什么？】
 * 导航守卫是 Vue Router 提供的钩子函数，可以在路由跳转的各个阶段执行逻辑。
 * beforeEach 是"全局前置守卫"，在每次路由跳转之前执行。
 *
 * 【技术学习 - beforeEach 的参数】
 * 接收一个回调函数，参数为：
 * - to: 即将进入的目标路由对象（包含 path、name 等信息）
 * - from: 当前正要离开的路由对象
 * - 返回值控制导航行为：
 *   - undefined/void: 允许导航继续
 *   - { path: '...' }: 重定向到指定路径
 *   - false: 取消导航
 *
 * 【技术学习 - async/await 异步处理】
 * 鉴权需要调用后端 API（getMe()），这是一个异步操作。
 * 使用 async/await 可以像写同步代码一样处理异步逻辑，
 * await 会暂停函数执行，等待 Promise 完成后继续。
 *
 * 鉴权逻辑：
 * 1. 访问受保护页面 → 检查是否登录 → 检查角色权限 → 允许或重定向
 * 2. 访问登录页 → 检查是否已登录 → 已登录则重定向到角色默认页
 */
router.beforeEach(async (to) => {
  // ========== 场景一：访问受保护的页面 ==========

  /**
   * 【技术学习 - includes 方法】
   * Array.includes() 检查数组中是否包含某个元素，返回布尔值。
   * 这里检查目标路径是否在受保护路由列表中。
   */
  if (protectedRoutes.includes(to.path)) {
    try {
      /**
       * 【技术学习 - 调用 API 验证登录状态】
       * getMe() 向后端发送请求，获取当前登录用户的信息。
       * 如果用户未登录，API 会抛出异常（被 catch 捕获）。
       *
       * 解构赋值：{ data: res } 从响应对象中提取 data 字段并重命名为 res。
       * 通常后端返回的数据结构为 { code: 200, data: { username, role, ... } }
       */
      const { data: res } = await getMe()
      const role = res.data.role  // 获取用户角色（'player' 或 'admin'）

      /**
       * 【技术学习 - 角色权限检查】
       * 1. 从 roleRouteMap 中获取该角色可以访问的路由列表
       * 2. 检查目标路由是否在允许列表中
       * 3. 如果不在，重定向到该角色的默认页面
       *
       * 【技术学习 - replace: true】
       * replace: true 表示使用 replace 而不是 push 进行导航，
       * 即不会在浏览器历史记录中留下当前页面的记录，
       * 用户点击"后退"按钮时不会回到被拒绝的页面。
       */
      const allowedRoutes = roleRouteMap[role]
      if (allowedRoutes && !allowedRoutes.includes(to.path)) {
        // 【技术学习 - ElMessage 是 Element Plus 的消息提示组件】
        // 这里应该是通过全局注册使用的（代码中未显式 import）
        ElMessage.warning('您没有权限访问该页面')
        return { path: roleDefaultPage[role] || '/login', replace: true }
      }
    } catch {
      // API 调用失败（未登录或网络错误），重定向到登录页
      ElMessage.error('请先登录')
      return { path: '/login', replace: true }
    }
  }

  // ========== 场景二：访问登录页 ==========

  /**
   * 【技术学习 - 已登录用户访问登录页的处理】
   * 如果用户已经登录，再访问登录页没有意义，应该直接跳转到其角色对应的页面。
   * 这是一种"智能重定向"，提升用户体验。
   */
  if (to.path === '/login') {
    try {
      const { data: res } = await getMe()  // 尝试获取用户信息
      const role = res.data.role
      // 已登录，显示欢迎消息并重定向
      ElMessage.success(`欢迎回来，${res.data.username}`)
      // 根据角色决定重定向目标：管理员→管理页，其他→选手页
      return { path: role === 'admin' ? '/admin' : '/player', replace: true }
    } catch {
      // 未登录，正常显示登录页（不做任何操作，让导航继续）
    }
  }

  // 不需要特殊处理的路由，正常放行（不返回任何值）
})

/**
 * 全局后置钩子（Navigation Guard - afterEach）
 *
 * 【技术学习 - beforeEach vs afterEach】
 * - beforeEach: 在导航**之前**执行，可以取消或重定向导航
 * - afterEach: 在导航**之后**执行，不能取消导航，通常用于副作用处理
 *   （如设置页面标题、记录访问日志、应用主题等）
 *
 * 【技术学习 - 深色模式的路由联动】
 * 本项目的深色模式仅在管理页生效。
 * 每次路由切换后，检查当前页面是否为管理页，如果是且用户偏好深色模式，
 * 则给 <html> 添加 'dark' class；否则移除。
 *
 * 【技术学习 - document.documentElement.classList.toggle】
 * toggle(className, force) 方法：
 * - 如果 force 为 true，添加 class
 * - 如果 force 为 false，移除 class
 * 这比手动 add/remove 更简洁。
 */
router.afterEach((to) => {
  const theme = useThemeStore()                      // 获取主题 Store
  const isAdmin = to.path === '/admin'               // 判断是否为管理页
  document.documentElement.classList.toggle('dark', isAdmin && theme.isDark)
  // 只有在管理页 且 用户偏好深色模式时，才启用深色模式
})

// 导出路由器实例，供 main.ts 中的 app.use(router) 使用
export default router
