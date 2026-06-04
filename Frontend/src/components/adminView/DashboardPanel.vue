<script setup lang="ts">
import { watch, computed, nextTick } from 'vue'
import StatusControls from './dashboard/StatusControls.vue'
import CurrentQuestion from './dashboard/CurrentQuestion.vue'
import PlayerList from './dashboard/PlayerList.vue'
import QuestionList from './dashboard/QuestionList.vue'
import { useSocket } from '@/composables/useSocket'
import { useGameStatusStore } from '@/stores/gameStatus'
import { useCountdownStore } from '@/stores/countdown'

const gameStore = useGameStatusStore()
const countdownStore = useCountdownStore()

// ── Socket 同步（管理页不监听远端广播，避免回环） ──
const { connected, serverState, pushState } = useSocket({ syncRemote: false })

/** 防回环：正在从远端同步时跳过本地推送 */
let syncingRemote = false

// ── 远端 → 本地：页面加载时恢复持久化状态 ──
watch(serverState, (s) => {
  if (!s) return
  syncingRemote = true

  gameStore.status = s.status as typeof gameStore.status
  gameStore.currentQuestion = s.currentQuestion
  gameStore.currentRiskCode = s.currentRiskCode
  gameStore.showAnswer = s.showAnswer

  countdownStore.answerDuration = s.answerDuration
  countdownStore.quickAnswerDuration = s.quickAnswerDuration
  countdownStore.answerEndTime = s.answerEndTime
  countdownStore.quickAnswerEndTime = s.quickAnswerEndTime
  countdownStore.isAnswerCounting = s.isAnswerCounting
  countdownStore.isQuickAnswerCounting = s.isQuickAnswerCounting
  // 根据 endTime 反推 remaining
  if (s.isAnswerCounting && s.answerEndTime) {
    countdownStore.answerRemaining = Math.max(0, Math.ceil((s.answerEndTime - Date.now()) / 1000))
  }
  if (s.isQuickAnswerCounting && s.quickAnswerEndTime) {
    countdownStore.quickAnswerRemaining = Math.max(0, Math.ceil((s.quickAnswerEndTime - Date.now()) / 1000))
  }

  nextTick(() => { syncingRemote = false })
})

// ── 阶段切换时重置倒计时（远程同步时跳过，防覆盖还原值） ──
watch(() => gameStore.status, () => {
  if (syncingRemote) return
  countdownStore.resetAll()
})

// ── 本地 → 远端：管理员操作时推送关键状态变更 ──
/** 提取需同步的最小状态集（不含高频变化的 remaining） */
const syncPayload = computed(() => ({
  status: gameStore.status,
  currentQuestion: gameStore.currentQuestion,
  currentRiskCode: gameStore.currentRiskCode,
  showAnswer: gameStore.showAnswer,
  answerDuration: countdownStore.answerDuration,
  quickAnswerDuration: countdownStore.quickAnswerDuration,
  answerEndTime: countdownStore.answerEndTime,
  quickAnswerEndTime: countdownStore.quickAnswerEndTime,
  isAnswerCounting: countdownStore.isAnswerCounting,
  isQuickAnswerCounting: countdownStore.isQuickAnswerCounting,
}))

watch(syncPayload, (val) => {
  if (syncingRemote) return
  pushState(val)
}, { deep: true })
</script>

<template>
  <div class="dashboard">
    <!-- 状态控制 -->
    <StatusControls />

    <!-- 当前题目 | 选手列表 | 题目列表 -->
    <el-row :gutter="16" class="list-row">
      <el-col :xs="24" :sm="24" :md="4">
        <CurrentQuestion />
      </el-col>
      <el-col :xs="24" :sm="12" :md="10">
        <PlayerList />
      </el-col>
      <el-col :xs="24" :sm="12" :md="10">
        <QuestionList />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.list-row {
  flex: 1;
  min-height: 0;
}

.list-row :deep(.el-col) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* 小屏堆叠 */
@media (max-width: 992px) {
  .list-row {
    min-height: auto;
  }

  .list-row :deep(.el-col) {
    overflow: visible;
  }

  .list-row .el-col {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 20px;
  }

  .list-row .el-col:last-child {
    margin-bottom: 0;
  }
}
</style>
