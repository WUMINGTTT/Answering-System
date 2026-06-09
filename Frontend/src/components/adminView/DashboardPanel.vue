<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import StatusControls from './dashboard/StatusControls.vue'
import CurrentQuestion from './dashboard/CurrentQuestion.vue'
import PlayerList from './dashboard/PlayerList.vue'
import QuestionList from './dashboard/QuestionList.vue'
import PlayerStatusPanel from './dashboard/PlayerStatusPanel.vue'
import { useSocket, type PlayerRanking, type PlayerAnswerStatus, type BuzzRecord } from '@/composables/useSocket'
import { useGameStatusStore } from '@/stores/gameStatus'
import { useCountdownStore } from '@/stores/countdown'
import { getAllUsers } from '@/api/users'
import type { Question } from '@/types/question'

const gameStore = useGameStatusStore()
const countdownStore = useCountdownStore()

// ── Socket 同步（管理页不监听远端广播，避免回环） ──
const { connected, serverState, pushState } = useSocket({ syncRemote: true, pageType: 'admin' })

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

  if (s.rankings) rankings.value = s.rankings
  if (s.usedRiskQuestionIds) usedRiskQuestionIds.value = [...s.usedRiskQuestionIds]
  if (s.riskScoreFilter !== undefined) riskScoreFilter.value = s.riskScoreFilter
  if (s.playerStatuses) playerStatuses.value = [...s.playerStatuses]
  if (s.buzzOpen !== undefined) buzzOpen.value = s.buzzOpen
  if (s.buzzWinner !== undefined) buzzWinner.value = s.buzzWinner
  if (s.buzzRecords) buzzRecordsMap.value = { ...s.buzzRecords }

  nextTick(() => { syncingRemote = false })
})

// ── 阶段切换时重置倒计时（远程同步时跳过，防覆盖还原值） ──
watch(() => gameStore.status, () => {
  if (syncingRemote) return
  countdownStore.resetAll()
})

// ── 切换题目时自动停止倒计时（远程同步时跳过） ──
watch(() => gameStore.currentQuestion, () => {
  if (syncingRemote) return
  if (countdownStore.isAnswerCounting || countdownStore.isQuickAnswerCounting) {
    countdownStore.resetAll()
    ElMessage.info('已切换题目，倒计时已自动停止')
  }
  // 风险题选中时记录为已使用
  if (
    gameStore.status === 'risk' &&
    gameStore.currentQuestion &&
    gameStore.currentQuestion.category === 'risk'
  ) {
    const id = gameStore.currentQuestion.id
    if (!usedRiskQuestionIds.value.includes(id)) {
      usedRiskQuestionIds.value.push(id)
    }
  }
})

// ── 排名数据 ──
const rankings = ref<PlayerRanking[]>([])

/** 从 API 拉取选手列表并计算排名 */
async function fetchRankings() {
  try {
    const { data: res } = await getAllUsers()
    const players = res.data
      .filter((u) => u.role === 'player')
      .sort((a, b) => b.totalScore - a.totalScore)
    rankings.value = players.map((p, i) => ({
      rank: i + 1,
      nickname: p.nickname,
      totalScore: p.totalScore,
    }))
  } catch {
    ElMessage.error('获取排名数据失败')
  }
}

// 进入排名阶段时拉取最新排名
watch(() => gameStore.status, (s) => {
  if (syncingRemote) return
  if (s === 'ranking') fetchRankings()
})

// ── 风险题数据（从 QuestionList 子组件接收） ──
const riskScoreFilter = ref(0)
const usedRiskQuestionIds = ref<string[]>([])
const playerStatuses = ref<PlayerAnswerStatus[]>([])
const buzzOpen = ref(false)
const buzzWinner = ref<{ userId: string; nickname: string; timestamp: number } | null>(null)
const buzzRecordsMap = ref<Record<string, BuzzRecord[]>>({})

/** QuestionList 子组件通知风险题数据变化 */
function onRiskDataChanged(payload: {
  riskQuestions: Question[]
  riskCodeMap: Map<string, string>
  riskScoreFilter: number
}) {
  riskScoreFilter.value = payload.riskScoreFilter
}

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
  rankings: rankings.value,
  riskScoreFilter: riskScoreFilter.value,
  usedRiskQuestionIds: [...usedRiskQuestionIds.value],
}))

watch(syncPayload, (val) => {
  if (syncingRemote) return
  pushState(val)
}, { deep: true })
</script>

<template>
  <div class="dashboard">
    <!-- 状态控制 -->
    <StatusControls :connected="connected" @reset-used-questions="usedRiskQuestionIds = []" />

    <!-- 必答题阶段：选手答题状态 -->
    <PlayerStatusPanel />

    <!-- 当前题目 | 选手列表 | 题目列表 -->
    <el-row :gutter="16" class="list-row">
      <el-col :xs="24" :sm="24" :md="6" :lg="5">
        <CurrentQuestion />
      </el-col>
      <el-col :xs="24" :sm="12" :md="9" :lg="9">
        <PlayerList />
      </el-col>
      <el-col :xs="24" :sm="12" :md="9" :lg="10">
        <QuestionList @risk-data-changed="onRiskDataChanged" />
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

/* 平板及以下：纵向堆叠，列表区限制高度内部滚动 */
@media (max-width: 991px) {
  .dashboard {
    height: auto;
  }

  .list-row {
    flex: none;
    min-height: auto;
  }

  .list-row :deep(.el-col) {
    overflow: visible;
    height: auto;
  }

  .list-row .el-col {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 16px;
  }

  .list-row .el-col:last-child {
    margin-bottom: 0;
  }

  /* 列表区限制高度，内部滚动（当前题目卡片除外） */
  .list-row .el-col {
    max-height: 360px;
  }
  .list-row .el-col:first-child {
    max-height: none;
  }
}
</style>
