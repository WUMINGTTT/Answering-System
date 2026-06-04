<script setup lang="ts">
defineProps<{
  showQuickAnswer: boolean
  showAnswer: boolean
  isQuickAnswerCounting: boolean
  isAnswerCounting: boolean
  quickAnswerRemaining: number
  answerRemaining: number
  quickAnswerText: string
  answerText: string
}>()
</script>

<template>
  <div v-if="showQuickAnswer || showAnswer" class="timers-row">
    <!-- 抢答倒计时 -->
    <div v-if="showQuickAnswer" class="timer-block timer--quick">
      <div class="timer-label">抢答倒计时</div>
      <div
        class="timer-value"
        :class="{ warn: isQuickAnswerCounting && quickAnswerRemaining <= 5 }"
      >
        {{ quickAnswerText }}
      </div>
    </div>
    <!-- 答题倒计时 -->
    <div v-if="showAnswer" class="timer-block timer--answer">
      <div class="timer-label">答题倒计时</div>
      <div
        class="timer-value"
        :class="{ warn: isAnswerCounting && answerRemaining <= 10 }"
      >
        {{ answerText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.timers-row {
  display: flex;
  gap: 40px;
  margin-bottom: 30px;
}

.timer-block {
  text-align: center;
}

.timer-label {
  font-size: 16px;
  opacity: 0.8;
  margin-bottom: 6px;
  letter-spacing: 2px;
}

.timer-value {
  font-size: 72px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  letter-spacing: 4px;
  line-height: 1;
}

.timer-value.warn {
  color: #f56c6c;
  animation: pulse-warn 0.8s ease-in-out infinite alternate;
}

@keyframes pulse-warn {
  from { opacity: 1; }
  to { opacity: 0.4; }
}

@media (max-width: 768px) {
  .timer-value {
    font-size: 48px;
  }
}
</style>
