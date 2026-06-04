<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSocket, type SyncedGameState } from '@/composables/useSocket'
import { useDisplayCountdown } from '@/composables/useDisplayCountdown'
import type { Question } from '@/types/question'
import CountdownTimers from '@/components/displayView/CountdownTimers.vue'
import QuestionCard from '@/components/displayView/QuestionCard.vue'
import AnswerReveal from '@/components/displayView/AnswerReveal.vue'

// ── Socket 同步 ──
const { connected, serverState } = useSocket({ syncRemote: true })

// ── 倒计时（composable 封装 tick 逻辑） ──
const {
  showQuickAnswerTimer,
  showAnswerTimer,
  isQuickAnswerCounting,
  isAnswerCounting,
  quickAnswerRemaining,
  answerRemaining,
  quickAnswerRemainingText,
  answerRemainingText,
  syncFromServer,
} = useDisplayCountdown()

// ── 题目状态 ──
const currentQuestion = ref<Question | null>(null)
const currentRiskCode = ref<string | null>(null)
const showAnswer = ref(false)
const phase = ref('')

// ── 远端 → 本地 ──
watch(serverState, (s: SyncedGameState | null) => {
  if (!s) return
  currentQuestion.value = s.currentQuestion
  currentRiskCode.value = s.currentRiskCode
  showAnswer.value = s.showAnswer
  phase.value = s.status
  syncFromServer(s)
})

// ── 辅助计算 ──
const categoryLabel = computed(() => {
  const map: Record<string, string> = {
    required: '必答题',
    'quick-answer': '抢答题',
    risk: '风险题',
  }
  return map[phase.value] || ''
})

const categoryColor = computed(() => {
  const map: Record<string, string> = {
    required: '#409eff',
    'quick-answer': '#e6a23c',
    risk: '#f56c6c',
  }
  return map[phase.value] || '#909399'
})

const typeLabel = computed(() => {
  if (!currentQuestion.value) return ''
  const map: Record<string, string> = {
    single: '单选题',
    multiple: '多选题',
    subjective: '主观题',
  }
  return map[currentQuestion.value.type] || ''
})
</script>

<template>
  <div class="display-page">
    <!-- 背景层 -->
    <div class="bg-layer" />

    <!-- 内容层 -->
    <div class="content-layer">
      <!-- 顶部状态栏 -->
      <div class="top-bar">
        <span v-if="categoryLabel" class="phase-tag" :style="{ background: categoryColor }">
          {{ categoryLabel }}
        </span>
        <span v-if="currentRiskCode" class="risk-code-badge">{{ currentRiskCode }}</span>
        <span class="connection-dot" :class="{ connected }" />
      </div>

      <!-- 中间主体 -->
      <div class="main-area">
        <template v-if="currentQuestion">
          <!-- 倒计时（仅管理员启动后展示） -->
          <CountdownTimers
            :show-quick-answer="showQuickAnswerTimer"
            :show-answer="showAnswerTimer"
            :is-quick-answer-counting="isQuickAnswerCounting"
            :is-answer-counting="isAnswerCounting"
            :quick-answer-remaining="quickAnswerRemaining"
            :answer-remaining="answerRemaining"
            :quick-answer-text="quickAnswerRemainingText"
            :answer-text="answerRemainingText"
          />

          <!-- 题目卡片 -->
          <QuestionCard
            :question="currentQuestion"
            :type-label="typeLabel"
          />

          <!-- 答案（后台控制显隐） -->
          <AnswerReveal
            v-if="showAnswer"
            :answers="currentQuestion.answers"
          />
        </template>

        <!-- 等待中 -->
        <div v-else class="waiting-state">
          <div class="waiting-icon">📋</div>
          <div class="waiting-text">等待管理员选题...</div>
          <div class="waiting-sub">题目将在此处展示</div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="bottom-bar">
        <span v-if="!connected" class="disconnected-hint">● 正在连接...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 全屏容器 ========== */
.display-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

/* ========== 背景 ========== */
.bg-layer {
  position: absolute;
  inset: 0;
  background: url('/src/public/bg.jpg') center / cover no-repeat;
}

.bg-layer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

/* ========== 内容层 ========== */
.content-layer {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #fff;
}

/* ========== 顶部栏 ========== */
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  flex-shrink: 0;
}

.phase-tag {
  font-size: 16px;
  font-weight: 600;
  padding: 6px 18px;
  border-radius: 6px;
  letter-spacing: 2px;
}

.risk-code-badge {
  font-size: 22px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  color: #ffa39e;
  letter-spacing: 2px;
}

.connection-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
  margin-left: auto;
  transition: background 0.3s;
}
.connection-dot.connected {
  background: #67c23a;
}

/* ========== 中间主体 ========== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 60px;
  min-height: 0;
}

/* ========== 等待状态 ========== */
.waiting-state {
  text-align: center;
  opacity: 0.7;
}

.waiting-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.waiting-text {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.waiting-sub {
  font-size: 16px;
  opacity: 0.6;
}

/* ========== 底部 ========== */
.bottom-bar {
  display: flex;
  justify-content: center;
  padding: 12px;
  flex-shrink: 0;
}

.disconnected-hint {
  font-size: 13px;
  opacity: 0.5;
  animation: pulse-warn 1.5s ease-in-out infinite alternate;
}

@keyframes pulse-warn {
  from { opacity: 1; }
  to { opacity: 0.5; }
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .main-area {
    padding: 16px 20px;
  }
}
</style>
