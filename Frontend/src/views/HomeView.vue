<script setup lang="ts">
import { useRouter } from 'vue-router'
import { User, Setting, Monitor, Key } from '@element-plus/icons-vue'
import { useSocket } from '@/composables/useSocket'

const router = useRouter()

// 会话注册（仅用于在线状态追踪）
useSocket({ syncRemote: false, pageType: 'home' })

interface NavCard {
  title: string
  description: string
  icon: typeof User
  url: string
  color: string
}

const cards: NavCard[] = [
  {
    title: '登录页',
    description: '选手注册与登录入口',
    icon: Key,
    url: '/login',
    color: '#409eff',
  },
  {
    title: '选手页',
    description: '答题与得分查看',
    icon: User,
    url: '/player',
    color: '#67c23a',
  },
  {
    title: '管理页',
    description: '题目与用户管理后台',
    icon: Setting,
    url: '/admin',
    color: '#e6a23c',
  },
  {
    title: '显示页',
    description: '实时得分公开展示',
    icon: Monitor,
    url: '/display',
    color: '#f56c6c',
  },
]

function navigateTo(url: string): void {
  router.replace(url)
}
</script>

<template>
  <div class="home-page">
    <div class="hero">
      <h1 class="hero-title">答题系统</h1>
      <p class="hero-subtitle">知识竞赛 · 在线答题 · 实时排名</p>
    </div>

    <div class="card-grid">
      <el-card
        v-for="card in cards"
        :key="card.url"
        class="nav-card"
        shadow="hover"
        :body-style="{ padding: '0' }"
        @click="navigateTo(card.url)"
      >
        <div class="card-inner">
          <div class="card-icon" :style="{ background: card.color }">
            <el-icon :size="36">
              <component :is="card.icon" />
            </el-icon>
          </div>
          <div class="card-body">
            <h3 class="card-title">{{ card.title }}</h3>
            <p class="card-desc">{{ card.description }}</p>
          </div>
          <div class="card-arrow">
            <el-icon><component :is="card.icon" /></el-icon>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  padding: 40px 20px;
  box-sizing: border-box;
}

.hero {
  text-align: center;
  margin-bottom: 48px;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px 0;
  letter-spacing: 2px;
}

.hero-subtitle {
  font-size: 16px;
  color: #909399;
  margin: 0;
  letter-spacing: 4px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 280px);
  gap: 24px;
  max-width: 585px;
  width: 100%;
}

.nav-card {
  cursor: pointer;
  border-radius: 12px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border: 1px solid #ebeef5;
}

.nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-inner {
  display: flex;
  align-items: center;
  padding: 24px 20px;
  gap: 16px;
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

.card-arrow {
  color: #c0c4cc;
  flex-shrink: 0;
  transition: transform 0.25s ease, color 0.25s ease;
}

.nav-card:hover .card-arrow {
  transform: translateX(4px);
  color: #409eff;
}

@media (max-width: 640px) {
  .card-grid {
    grid-template-columns: 1fr;
    max-width: 320px;
  }

  .hero-title {
    font-size: 30px;
  }

  .hero {
    margin-bottom: 32px;
  }
}
</style>
