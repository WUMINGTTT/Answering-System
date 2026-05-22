import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import DisplayView from '@/views/DisplayView.vue'
import PlayerView from '@/views/PlayerView.vue'
import AdminView from '@/views/AdminView.vue'

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

export default router
