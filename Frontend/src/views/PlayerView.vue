<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocket, type SyncedGameState, type AnswerResult } from '@/composables/useSocket'
import { useDisplayCountdown } from '@/composables/useDisplayCountdown'
import type { Question } from '@/types/question'
import type { User } from '@/types/user'
import { getMe } from '@/api/users'
import PlayerInfoBar from '@/components/playerView/PlayerInfoBar.vue'
import AnnouncementPanel from '@/components/playerView/AnnouncementPanel.vue'
import AnswerOptions from '@/components/playerView/AnswerOptions.vue'

const router = useRouter()

// ── Socket ──
const {
  connected,
  serverState,
  registerPlayer,
  submitAnswer,
  resetPlayerAnswerState,
  answerResult,
  checkPlayerStatus,
  myStatus,
} = useSocket({ syncRemote: true })

// ── 倒计时 ──
const { answerRemainingText, syncFromServer } = useDisplayCountdown()

// ── 当前用户 ──
const user = ref<User | null>(null)
const userLoading = ref(true)

onMounted(async () => {
  try {
    const { data: res } = await getMe()
    if (res.data.role === 'admin') {
      router.replace('/admin')
      return
    }
    user.value = res.data
    if (connected.value) {
      registerPlayer(res.data.id)
      checkPlayerStatus(res.data.id)
    }
  } catch { /* 稍后重试 */ }
  finally { userLoading.value = false }
})

watch(connected, (val) => {
  if (val && user.value) {
    registerPlayer(user.value.id)
    checkPlayerStatus(user.value.id)
  }
})

// ── 远端状态 ──
const currentQuestion = ref<Question | null>(null)
const isAnswerCounting = ref(false)
const phase = ref('')

watch(serverState, (s: SyncedGameState | null) => {
  if (!s) return
  if (s.currentQuestion?.id !== currentQuestion.value?.id) {
    resetPlayerAnswerState()
    hasSubmitted.value = false
  }
  currentQuestion.value = s.currentQuestion
  isAnswerCounting.value = s.isAnswerCounting
  phase.value = s.status
  syncFromServer(s)
})

// ── 答题流程 ──
const hasSubmitted = ref(false)

// 页面刷新后恢复答题状态（放在 currentQuestion / hasSubmitted 声明之后）
let pendingStatus: { submitted: boolean; result: AnswerResult | null } | null = null

watch(myStatus, (s) => {
  if (!s || !s.questionId) return
  pendingStatus = { submitted: s.submitted, result: s.result }
  tryApplyPendingStatus()
})

watch(() => currentQuestion.value?.id, () => {
  tryApplyPendingStatus()
})

function tryApplyPendingStatus() {
  if (!pendingStatus) return
  if (!myStatus.value?.questionId) { pendingStatus = null; return }
  if (myStatus.value.questionId !== currentQuestion.value?.id) { pendingStatus = null; return }
  hasSubmitted.value = pendingStatus.submitted
  if (pendingStatus.result) {
    answerResult.value = pendingStatus.result as AnswerResult
  }
  pendingStatus = null
}

// 倒计时状态变化时管理提交状态
watch(isAnswerCounting, (val, oldVal) => {
  if (!oldVal && val) {
    // 倒计时重新开始 → 重置，允许作答
    hasSubmitted.value = false
    resetPlayerAnswerState()
  } else if (oldVal && !val) {
    // 倒计时结束（自然或强制）→ 回到未提交的禁用态
    hasSubmitted.value = false
  }
})

const canAnswer = computed(() =>
  phase.value === 'required' && currentQuestion.value !== null && isAnswerCounting.value
)

const showQuestion = computed(() =>
  phase.value === 'required' && currentQuestion.value !== null
)

const showResult = computed(() =>
  phase.value === 'required' && currentQuestion.value !== null && answerResult.value !== null
)

function onSubmitAnswer(answers: string[]) {
  if (!user.value || !currentQuestion.value) return
  hasSubmitted.value = true
  submitAnswer(user.value.id, currentQuestion.value.id, answers)
}

// ── 辅助 ──
const typeLabel = computed(() => {
  if (!currentQuestion.value) return ''
  const map: Record<string, string> = { single: '单选题', multiple: '多选题', subjective: '主观题' }
  return map[currentQuestion.value.type] || ''
})
</script>

<template>
  <div class="player-page">
    <!-- 顶部信息栏 -->
    <PlayerInfoBar
      v-if="user"
      :nickname="user.nickname"
      :total-score="user.totalScore"
      :connected="connected"
    />

    <!-- 主体：占满剩余高度 -->
    <div class="main-area">
      <!-- ======== 答题结果 ======== -->
      <div v-if="showResult" class="result-card">
        <div
          class="result-icon"
          :class="answerResult!.timeout ? 'timeout' : (answerResult!.correct ? 'correct' : 'wrong')"
        >
          {{ answerResult!.timeout ? '⏰' : (answerResult!.correct ? '✓' : '✗') }}
        </div>
        <div class="result-title">
          {{ answerResult!.timeout ? '超时未答' : (answerResult!.correct ? '回答正确' : '回答错误') }}
        </div>
        <div
          class="result-score"
          :class="{ correct: answerResult!.correct, timeout: answerResult!.timeout }"
        >
          {{ answerResult!.correct ? `+${answerResult!.score} 分` : '+0 分' }}
        </div>
      </div>

      <!-- ======== 答题区 ======== -->
      <div v-else-if="showQuestion" class="question-area">
        <div class="q-header">
          <span class="q-type">{{ typeLabel }}</span>
          <span class="q-score">{{ currentQuestion!.score }} 分</span>
          <!-- 倒计时 -->
          <span v-if="isAnswerCounting" class="q-timer" :class="{ warn: isAnswerCounting }">
            {{ answerRemainingText }}
          </span>
          <span v-else-if="!isAnswerCounting" class="q-timer off">等待开始</span>
        </div>
        <div class="q-stem">{{ currentQuestion!.stem }}</div>

        <!-- 已提交提示 -->
        <div v-if="hasSubmitted && isAnswerCounting" class="notice submitted-notice">
          ✓ 已提交，等待结束...
        </div>

        <!-- 选项 + 提交 -->
        <AnswerOptions
          :question="currentQuestion!"
          :can-answer="canAnswer && !hasSubmitted"
          :submitted="hasSubmitted"
          @submit="onSubmitAnswer"
        />
      </div>

      <!-- ======== 等待状态 ======== -->
      <div v-else class="waiting-card">
        <div class="waiting-icon">📋</div>
        <div class="waiting-text">等待出题</div>
      </div>
    </div>

    <!-- 底部公告条 -->
    <AnnouncementPanel />
  </div>
</template>

<style>
/* 全局：禁用页面滚动 / 下拉 */
html, body {
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: manipulation;
  -webkit-overflow-scrolling: auto;
}
</style>

<style scoped>
/* ========== 页面容器：固定视口 ========== */
.player-page {
  height: 100dvh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
  overscroll-behavior: none;
}

/* ========== 主体区：flex-1 填满 ========== */
.main-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  overflow: hidden;
}

/* ========== 答题区 ========== */
.question-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 18px;
}

.q-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.q-type {
  font-size: 12px;
  padding: 3px 10px;
  background: rgba(64, 158, 255, 0.2);
  border-radius: 5px;
  color: #409eff;
  font-weight: 500;
}

.q-score {
  font-size: 16px;
  font-weight: 700;
  color: #ffd666;
  margin-right: auto;
}

/* 倒计时 */
.q-timer {
  font-size: 20px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: 2px;
  color: #fff;
}

.q-timer.warn {
  color: #e6a23c;
  animation: timer-pulse 1s ease-in-out infinite alternate;
}

.q-timer.off {
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
}

@keyframes timer-pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.q-stem {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 4px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 已提交提示条 */
.notice {
  text-align: center;
  padding: 4px;
  border-radius: 6px;
  font-size: 13px;
  flex-shrink: 0;
}

.submitted-notice {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

/* ========== 结果卡片 ========== */
.result-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 24px;
}

.result-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  font-weight: 700;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.result-icon.correct {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}

.result-icon.wrong {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.result-icon.timeout {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.result-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

.result-score {
  font-size: 30px;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  margin-bottom: 16px;
}

.result-score.correct { color: #67c23a; }
.result-score.timeout { color: #e6a23c; }
.result-score:not(.correct):not(.timeout) { color: #909399; }

.result-correct {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
}

/* ========== 等待卡片 ========== */
.waiting-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
}

.waiting-icon { font-size: 48px; margin-bottom: 12px; }
.waiting-text { font-size: 20px; font-weight: 600; opacity: 0.6; }

/* ========== 响应式 ========== */
@media (min-width: 768px) {
  .main-area {
    padding: 16px 24px;
  }
  .q-stem {
    font-size: 20px;
  }
}

@media (max-width: 380px) {
  .main-area {
    padding: 8px 10px;
  }
  .question-area {
    padding: 12px;
  }
  .q-stem {
    font-size: 16px;
  }
}
</style>
