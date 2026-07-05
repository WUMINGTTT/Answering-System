<!--
  ====================================================================
  SessionManager.vue — 在线会话监控页面
  ====================================================================

  【组件职责】
  实时监控所有客户端的在线状态，包括：
  1. 各页面类型的在线人数统计（导航页、登录页、管理页、展示页、选手端）
  2. 在线选手列表展示
  3. Socket.IO 连接状态指示器

  【技术学习 — 主要知识点】
  - Socket.IO 会话统计：服务器维护所有连接的客户端信息，按页面类型分类
  - 条件渲染（v-if / v-else）：根据数据是否为空显示不同内容
  - CSS Grid 布局：实现 5 列均匀分布的统计卡片
  - 响应式设计：不同屏幕宽度下的布局自适应

  【数据流】
  useSocket() → sessionData（服务器推送的会话统计数据）
  onMounted → requestSessions()（主动请求服务器发送最新会话数据）
-->

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSocket, type SessionData } from '@/composables/useSocket'
import { Monitor, HomeFilled, Key, UserFilled, Platform, Connection } from '@element-plus/icons-vue'

// 【技术学习】这里 syncRemote 设为 false，表示此页面不接收游戏状态同步
// pageType 设为 'admin'，服务器会将其计入管理页在线人数
const { connected, sessionData, requestSessions } = useSocket({ syncRemote: false, pageType: 'admin' })

// 【技术学习】onMounted 中主动请求一次会话数据
// 因为 sessionData 只在服务器推送时更新，首次加载时可能还没有数据
onMounted(() => requestSessions())

// ====================================================================
// 页面类型卡片定义
// ====================================================================
/**
 * 【技术学习】定义每种页面类型的显示配置
 * - key: sessionData 对象中的属性名（用于读取对应数量）
 * - label: 中文显示名称
 * - icon: Element Plus 图标组件
 * - color: 卡片主题色
 */
interface PageCardDef {
  key: keyof Pick<SessionData, 'home' | 'login' | 'admin' | 'display' | 'player'>
  label: string
  icon: typeof Monitor
  color: string
}

const pageCards: PageCardDef[] = [
  { key: 'home',    label: '导航页', icon: HomeFilled, color: '#909399' },  // 灰色
  { key: 'login',   label: '登录页', icon: Key,        color: '#409eff' },  // 蓝色
  { key: 'admin',   label: '管理页', icon: Monitor,     color: '#e6a23c' },  // 橙色
  { key: 'display', label: '展示页', icon: Platform,    color: '#67c23a' },  // 绿色
  { key: 'player',  label: '选手端', icon: UserFilled,  color: '#f56c6c' },  // 红色
]
</script>

<template>
  <div class="session-dashboard">
    <!--
      ========== 页面状态统计卡片 ==========
      【技术学习】el-card 是 Element Plus 的卡片组件
      shadow="hover" 表示鼠标悬停时显示阴影效果
    -->
    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <!-- 左侧：标题 + 总在线人数 -->
          <div class="card-title">
            <el-icon :size="18"><Connection /></el-icon>
            <span>页面状态</span>
            <!-- 【技术学习】计算所有页面类型的在线人数总和 -->
            <el-tag size="small" effect="dark" round>
              {{ sessionData.home + sessionData.login + sessionData.admin + sessionData.display + sessionData.player }}
            </el-tag>
          </div>

          <!-- 右侧：Socket.IO 连接状态指示 -->
          <div class="card-header-right">
            <!-- 【技术学习】连接状态圆点：绿色=已连接，红色=断开 -->
            <span class="conn-dot" :class="{ ok: connected }" />
            <span class="conn-label">{{ connected ? '已连接' : '重连中' }}</span>
          </div>
        </div>
      </template>

      <!--
        5 列统计网格
        【技术学习】使用 CSS Grid 实现 5 列均匀分布
        v-for 遍历 pageCards 数组，每种页面类型渲染一个统计项
      -->
      <div class="stat-row">
        <div
          v-for="card in pageCards"
          :key="card.key"
          class="stat-item"
          :style="{ '--c': card.color }"  <!-- CSS 变量，用于自定义颜色 -->
        >
          <!-- 图标圆角方块 -->
          <div class="stat-icon" :style="{ background: card.color }">
            <el-icon :size="18"><component :is="card.icon" /></el-icon>
          </div>
          <!-- 页面类型名称 -->
          <span class="stat-label">{{ card.label }}</span>
          <!-- 在线人数（大于 0 时高亮显示） -->
          <span class="stat-num" :class="{ on: sessionData[card.key] > 0 }">
            {{ sessionData[card.key] }}
          </span>
          <!-- 在线/离线状态文字 -->
          <span class="stat-sub">{{ sessionData[card.key] > 0 ? '在线' : '离线' }}</span>
        </div>
      </div>
    </el-card>

    <!--
      ========== 在线选手列表卡片 ==========
      【技术学习】sessionData.players 是一个数组，每个元素包含 userId 和 nickname
    -->
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
        <!-- 【技术学习】v-if/v-else 条件渲染：有数据显示列表，无数据显示空状态 -->
        <template v-if="sessionData.players.length">
          <div
            v-for="p in sessionData.players"
            :key="p.userId"
            class="list-item"
          >
            <!-- 头像区域 -->
            <div class="item-avatar">
              <el-icon :size="20"><UserFilled /></el-icon>
            </div>
            <!-- 信息区域：昵称 + 用户 ID -->
            <div class="item-info">
              <div class="item-name">{{ p.nickname || p.userId }}</div>
              <div class="item-sub">{{ p.userId }}</div>
            </div>
            <!-- 状态标签 -->
            <div class="item-extra">
              <el-tag type="success" size="small" effect="plain">在线</el-tag>
            </div>
          </div>
        </template>
        <!-- 空状态：el-empty 是 Element Plus 的空数据占位组件 -->
        <el-empty v-else description="暂无选手在线" :image-size="60" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
/* 页面容器 */
.session-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ========== 卡片通用样式 ========== */
.list-card {
  border-radius: 8px;
}

/* 【技术学习】:deep() 穿透 scoped 样式，修改 Element Plus 组件内部样式 */
.list-card :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-base);
  flex-shrink: 0;
}

.list-card :deep(.el-card__body) {
  padding: 0;
}

/* 卡片头部：标题 + 右侧内容 */
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

/* 连接状态圆点 */
.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;     /* 默认红色（断开） */
  flex-shrink: 0;
  transition: background 0.3s;
}

.conn-dot.ok { background: #67c23a; }  /* 绿色（已连接） */

.conn-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ========== 页面状态 5 列网格 ========== */
.stat-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);  /* 【技术学习】CSS Grid：5 列等宽 */
  padding: 16px 18px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-right: 1px solid var(--border-light);  /* 列间分隔线 */
}

.stat-item:last-child { border-right: none; }

/* 图标方块 */
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

/* 数字显示（等宽字体，方便对齐） */
.stat-num {
  font-size: 28px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--text-placeholder);   /* 无数据时灰色 */
  line-height: 1;
  transition: color 0.3s;
}

.stat-num.on { color: var(--text-primary); }  /* 有数据时正常颜色 */

.stat-sub {
  font-size: 11px;
  color: var(--text-placeholder);
}

/* ========== 选手列表 ========== */
.list-body {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

/* 【技术学习】WebKit 浏览器的自定义滚动条样式 */
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

/* ========== 响应式布局 ========== */
@media (max-width: 700px) {
  .session-dashboard {
    gap: 14px;
  }
  .stat-row {
    grid-template-columns: repeat(3, 1fr);  /* 小屏：3 列 */
  }
  .stat-item:nth-child(3n) { border-right: none; }
  .stat-item:nth-child(n+4) { border-top: 1px solid var(--border-light); }  /* 第二行加顶部分隔线 */
}

@media (max-width: 420px) {
  .stat-row {
    grid-template-columns: repeat(2, 1fr);  /* 超小屏：2 列 */
  }
  .stat-item:nth-child(2n) { border-right: none; }
  .stat-item:nth-child(n+3) { border-top: 1px solid var(--border-light); }
}
</style>
