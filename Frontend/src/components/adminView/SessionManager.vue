<script setup lang="ts">
import { onMounted } from 'vue'
import { useSocket, type SessionData } from '@/composables/useSocket'
import { Monitor, HomeFilled, Key, UserFilled, Platform, Connection } from '@element-plus/icons-vue'

const { connected, sessionData, requestSessions } = useSocket({ syncRemote: false, pageType: 'admin' })

onMounted(() => requestSessions())

interface PageCardDef {
  key: keyof Pick<SessionData, 'home' | 'login' | 'admin' | 'display' | 'player'>
  label: string
  icon: typeof Monitor
  color: string
}

const pageCards: PageCardDef[] = [
  { key: 'home',    label: '导航页', icon: HomeFilled, color: '#909399' },
  { key: 'login',   label: '登录页', icon: Key,        color: '#409eff' },
  { key: 'admin',   label: '管理页', icon: Monitor,     color: '#e6a23c' },
  { key: 'display', label: '展示页', icon: Platform,    color: '#67c23a' },
  { key: 'player',  label: '选手端', icon: UserFilled,  color: '#f56c6c' },
]
</script>

<template>
  <div class="session-dashboard">
    <!-- ════ 页面状态卡 ════ -->
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="card-title">
            <el-icon :size="18"><Connection /></el-icon>
            <span>页面状态</span>
            <el-tag size="small" effect="dark" round>
              {{ sessionData.home + sessionData.login + sessionData.admin + sessionData.display + sessionData.player }}
            </el-tag>
          </div>
          <div class="card-header-right">
            <span class="conn-dot" :class="{ ok: connected }" />
            <span class="conn-label">{{ connected ? '已连接' : '重连中' }}</span>
          </div>
        </div>
      </template>

      <div class="stat-row">
        <div
          v-for="card in pageCards"
          :key="card.key"
          class="stat-item"
          :style="{ '--c': card.color }"
        >
          <div class="stat-icon" :style="{ background: card.color }">
            <el-icon :size="18"><component :is="card.icon" /></el-icon>
          </div>
          <span class="stat-label">{{ card.label }}</span>
          <span class="stat-num" :class="{ on: sessionData[card.key] > 0 }">
            {{ sessionData[card.key] }}
          </span>
          <span class="stat-sub">{{ sessionData[card.key] > 0 ? '在线' : '离线' }}</span>
        </div>
      </div>
    </el-card>

    <!-- ════ 在线选手卡 ════ -->
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="card-title">
            <el-icon :size="18"><UserFilled /></el-icon>
            <span>在线选手</span>
            <span class="card-count">{{ sessionData.players.length }} 人</span>
          </div>
        </div>
      </template>

      <div class="list-body">
        <template v-if="sessionData.players.length">
          <div
            v-for="p in sessionData.players"
            :key="p.userId"
            class="list-item"
          >
            <div class="item-avatar">
              <el-icon :size="20"><UserFilled /></el-icon>
            </div>
            <div class="item-info">
              <div class="item-name">{{ p.nickname || p.userId }}</div>
              <div class="item-sub">{{ p.userId }}</div>
            </div>
            <div class="item-extra">
              <el-tag type="success" size="small" effect="plain">在线</el-tag>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无选手在线" :image-size="60" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.session-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ════ 卡片（复用管理页通用样式） ════ */
.list-card {
  border-radius: 8px;
}

.list-card :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-base);
  flex-shrink: 0;
}

.list-card :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.card-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
  flex-shrink: 0;
  transition: background 0.3s;
}

.conn-dot.ok { background: #67c23a; }

.conn-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ════ 页面状态行（5 列均匀分布） ════ */
.stat-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 16px 18px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-right: 1px solid var(--border-light);
}

.stat-item:last-child { border-right: none; }

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-num {
  font-size: 28px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--text-placeholder);
  line-height: 1;
  transition: color 0.3s;
}

.stat-num.on { color: var(--text-primary); }

.stat-sub {
  font-size: 11px;
  color: var(--text-placeholder);
}

/* ════ 选手列表（复用 PlayerList 样式） ════ */
.list-body {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

.list-body::-webkit-scrollbar { width: 6px; }
.list-body::-webkit-scrollbar-track { background: transparent; }
.list-body::-webkit-scrollbar-thumb { background: #c4c4c4; border-radius: 3px; }
.list-body::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
}

.list-item:last-child { border-bottom: none; }

.item-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.item-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.item-extra {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* ════ 响应式 ════ */
@media (max-width: 700px) {
  .stat-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .stat-item:nth-child(3n) { border-right: none; }
}

@media (max-width: 420px) {
  .stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-item:nth-child(2n) { border-right: none; }
}
</style>
