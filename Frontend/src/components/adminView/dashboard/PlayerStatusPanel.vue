<script setup lang="ts">
import { computed } from 'vue'
import { useSocket, type PlayerAnswerStatus } from '@/composables/useSocket'
import { useGameStatusStore } from '@/stores/gameStatus'

const { serverState } = useSocket({ syncRemote: true, pageType: 'admin' })
const gameStore = useGameStatusStore()

const players = computed<PlayerAnswerStatus[]>(() => {
  if (gameStore.status !== 'required') return []
  return serverState.value?.playerStatuses || []
})

const show = computed(() => players.value.length > 0)

const summary = computed(() => {
  let waiting = 0, answering = 0, submitted = 0
  for (const p of players.value) {
    if (p.status === 'waiting') waiting++
    else if (p.status === 'answering') answering++
    else if (p.status === 'submitted') submitted++
  }
  return { total: players.value.length, waiting, answering, submitted }
})

const STATUS_MAP: Record<string, { text: string; type: string }> = {
  waiting:   { text: '等待中', type: 'info' },
  answering: { text: '答题中', type: 'warning' },
  submitted: { text: '已提交', type: 'primary' },
}

function statusTag(p: PlayerAnswerStatus) {
  return STATUS_MAP[p.status] || { text: '?', type: 'info' }
}
</script>

<template>
  <div v-if="show" class="status-panel">
    <div class="panel-row">
      <div class="panel-info">
        <span class="panel-title">选手状态</span>
        <span class="panel-count">{{ summary.total }} 人</span>
      </div>
      <div class="panel-stats">
        <span class="stat-item stat-waiting">等待 {{ summary.waiting }}</span>
        <span class="stat-item stat-answering">答题中 {{ summary.answering }}</span>
        <span class="stat-item stat-submitted">已提交 {{ summary.submitted }}</span>
      </div>
    </div>
    <div class="player-strip">
      <div
        v-for="p in players"
        :key="p.userId"
        class="player-chip"
        :class="'chip-' + p.status"
      >
        <span class="chip-dot" />
        <span class="chip-name">{{ p.nickname || p.userId }}</span>
        <span class="chip-tag">{{ statusTag(p).text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.panel-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: 8px;
}

.panel-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-item {
  font-size: 11px;
}

.stat-waiting   { color: #909399; }
.stat-answering { color: #e6a23c; }
.stat-submitted { color: #409eff; }

.player-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px;
  overflow-y: auto;
  flex: 1;
  align-content: flex-start;
  scrollbar-width: thin;
}

.player-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background: var(--bg-hover);
  border-radius: 5px;
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #909399;
  flex-shrink: 0;
}

.chip-waiting   .chip-dot { background: #909399; }
.chip-answering .chip-dot { background: #e6a23c; }
.chip-submitted .chip-dot { background: #409eff; }

.chip-name {
  font-size: 12px;
  color: var(--text-regular);
}

.chip-tag {
  font-size: 10px;
  color: var(--text-secondary);
}
</style>
