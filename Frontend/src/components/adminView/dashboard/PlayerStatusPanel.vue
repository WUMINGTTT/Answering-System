<!--
  ====================================================================
  PlayerStatusPanel.vue — 选手答题状态面板
  ====================================================================

  【组件职责】
  在必答题阶段实时展示所有选手的答题状态，包括：
  1. 状态统计摘要（等待中/答题中/已提交 各多少人）
  2. 每个选手的状态芯片（Chip），用不同颜色标识状态
  3. 彩色圆点指示器

  【技术学习 — 设计思路】
  - 只在必答题阶段（status === 'required'）显示
  - 数据来源：Socket.IO 实时推送的 playerStatuses 数组
  - 三种状态：waiting（等待中）、answering（答题中）、submitted（已提交）
  - 使用 computed 从 serverState 中提取和统计数据

  【状态颜色编码】
  - waiting（等待中）：灰色 #909399
  - answering（答题中）：橙色 #e6a23c
  - submitted（已提交）：蓝色 #409eff
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useSocket, type PlayerAnswerStatus } from '@/composables/useSocket'
import { useGameStatusStore } from '@/stores/gameStatus'

// ====================================================================
// 初始化
// ====================================================================
// 【技术学习】这里也使用 useSocket 获取 serverState
// 虽然父组件 DashboardPanel 已经连接了 Socket，
// 但每个组件需要独立声明它使用的 composable（Vue 的组合式 API 设计）
const { serverState } = useSocket({ syncRemote: true, pageType: 'admin' })
const gameStore = useGameStatusStore()

// ====================================================================
// 计算属性
// ====================================================================

/**
 * 选手列表（仅在必答题阶段显示）
 * 【技术学习】当游戏状态不是 'required' 时返回空数组，面板会隐藏
 */
const players = computed<PlayerAnswerStatus[]>(() => {
  if (gameStore.status !== 'required') return []
  return serverState.value?.playerStatuses || []
})

/** 是否显示面板（有选手数据时才显示） */
const show = computed(() => players.value.length > 0)

/**
 * 状态统计
 * 【技术学习】遍历一次数组，同时统计三种状态的数量
 * 这比调用三次 filter 更高效（O(n) vs O(3n)）
 */
const summary = computed(() => {
  let waiting = 0, answering = 0, submitted = 0
  for (const p of players.value) {
    if (p.status === 'waiting') waiting++
    else if (p.status === 'answering') answering++
    else if (p.status === 'submitted') submitted++
  }
  return { total: players.value.length, waiting, answering, submitted }
})

/**
 * 状态文本和标签类型映射
 * 【技术学习】Record 类型用于定义键值对映射表
 */
const STATUS_MAP: Record<string, { text: string; type: string }> = {
  waiting:   { text: '等待中', type: 'info' },     // 灰色标签
  answering: { text: '答题中', type: 'warning' },   // 橙色标签
  submitted: { text: '已提交', type: 'primary' },   // 蓝色标签
}

/** 获取选手状态对应的标签信息 */
function statusTag(p: PlayerAnswerStatus) {
  return STATUS_MAP[p.status] || { text: '?', type: 'info' }
}
</script>

<template>
  <!--
    【技术学习】v-if 控制整个面板的显示/隐藏
    只有在必答题阶段且有选手数据时才渲染
  -->
  <div v-if="show" class="status-panel">
    <!-- 顶部信息栏：标题 + 统计 -->
    <div class="panel-row">
      <div class="panel-info">
        <span class="panel-title">选手状态</span>
        <span class="panel-count">{{ summary.total }} 人</span>
      </div>
      <!-- 三种状态的统计数字 -->
      <div class="panel-stats">
        <span class="stat-item stat-waiting">等待 {{ summary.waiting }}</span>
        <span class="stat-item stat-answering">答题中 {{ summary.answering }}</span>
        <span class="stat-item stat-submitted">已提交 {{ summary.submitted }}</span>
      </div>
    </div>

    <!--
      选手状态芯片条
      【技术学习】v-for 遍历所有选手，每人渲染一个"芯片"（chip）
      芯片包含：彩色圆点 + 昵称 + 状态标签
      :class="'chip-' + p.status" 根据状态动态添加样式类
    -->
    <div class="player-strip">
      <div
        v-for="p in players"
        :key="p.userId"
        class="player-chip"
        :class="'chip-' + p.status"
      >
        <!-- 彩色圆点（颜色由 CSS 类控制） -->
        <span class="chip-dot" />
        <!-- 选手昵称（如果昵称为空则显示 userId） -->
        <span class="chip-name">{{ p.nickname || p.userId }}</span>
        <!-- 状态文字 -->
        <span class="chip-tag">{{ statusTag(p).text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 面板容器 */
.status-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 8px;
  max-height: 140px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

/* 顶部信息栏 */
.panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-light);
  gap: 12px;
  flex-shrink: 0;
}

.panel-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 人数标签 */
.panel-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: 8px;
}

/* 状态统计 */
.panel-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-item {
  font-size: 11px;
}

/* 三种状态颜色 */
.stat-waiting   { color: #909399; }  /* 灰色 */
.stat-answering { color: #e6a23c; }  /* 橙色 */
.stat-submitted { color: #409eff; }  /* 蓝色 */

/* ========== 选手芯片条 ========== */
.player-strip {
  display: flex;
  flex-wrap: wrap;        /* 自动换行 */
  gap: 6px;
  padding: 8px 14px;
  overflow-y: auto;       /* 内容过多时可滚动 */
  flex: 1;
  align-content: flex-start;
  scrollbar-width: thin;
}

/* 单个芯片 */
.player-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background: var(--bg-hover);
  border-radius: 5px;
}

/* 彩色圆点 */
.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #909399;     /* 默认灰色 */
  flex-shrink: 0;
}

/* 【技术学习】根据状态类名设置圆点颜色 */
.chip-waiting   .chip-dot { background: #909399; }  /* 灰色 */
.chip-answering .chip-dot { background: #e6a23c; }  /* 橙色 */
.chip-submitted .chip-dot { background: #409eff; }  /* 蓝色 */

.chip-name {
  font-size: 12px;
  color: var(--text-regular);
}

.chip-tag {
  font-size: 10px;
  color: var(--text-secondary);
}
</style>
