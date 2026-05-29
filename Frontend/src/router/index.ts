import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import DisplayView from '@/views/DisplayView.vue'
import PlayerView from '@/views/PlayerView.vue'
import AdminView from '@/views/AdminView.vue'
import { getMe } from '@/api/users'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: '首页',
      component: HomeView,
    },
    {
      path: '/login',
      name: '登录页',
      component: LoginView,
    },
    {
      path: '/display',
      name: '显示页',
      component: DisplayView,
    },
    {
      path: '/player',
      name: '选手页',
      component: PlayerView,
    },
    {
      path: '/admin',
      name: '管理页',
      component: AdminView,
    },
  ],
})

const protectedRoutes = ['/player', '/admin', '/display']

router.beforeEach(async (to) => {
  // 访问受保护页面：未登录则重定向到登录页
  if (protectedRoutes.includes(to.path)) {
    try {
      await getMe()
    } catch {
      ElMessage.error('请先登录')
      return { path: '/login', replace: true }
    }
  }

  // 访问登录页：已登录则根据角色重定向
  if (to.path === '/login') {
    try {
      const { data: res } = await getMe()
      const role = res.data.role
      ElMessage.success(`欢迎回来，${res.data.username}`)
      return { path: role === 'admin' ? '/admin' : '/player', replace: true }
    } catch {
      // 未登录，正常访问登录页
    }
  }
})

export default router
