import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
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
