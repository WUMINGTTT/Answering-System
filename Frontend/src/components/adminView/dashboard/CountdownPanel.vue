<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, RefreshRight } from '@element-plus/icons-vue'
import { useCountdownStore } from '@/stores/countdown'
import { useGameStatusStore } from '@/stores/gameStatus'

const gameStore = useGameStatusStore()
const countdownStore = useCountdownStore()

// ---------- 定时器 ----------
let timerHandle: ReturnType<typeof setInterval> | null = null

function startTicking() {
  if (timerHandle) return
  timerHandle = setInterval(() => countdownStore.tick(), 250)
}

function stopTicking() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null }
}

watch(
  () => countdownStore.isAnswerCounting || countdownStore.isQuickAnswerCounting,
  (active) => { if (active) startTicking(); else stopTicking() },
  { immediate: true },
)

onUnmounted(() => stopTicking())
</script>

<template>
  <div
    v-if="gameStore.status === 'required' || gameStore.status === 'quick-answer'"
    class="countdown-inline"
  >
    <!-- ========== 必答题：答题倒计时 ========== -->
    <template v-if="gameStore.status === 'required'">
      <div class="timer-row">
        <span class="timer-label">答题</span>
        <el-input-number
          :model-value="countdownStore.answerDuration"
          :min="1" :max="3600" :step="5"
          size="small"
          :disabled="countdownStore.isAnswerCounting"
          class="duration-input"
          @change="countdownStore.setAnswerDuration"
        />
        <span class="unit">秒</span>
        <el-button
          v-if="!countdownStore.isAnswerCounting"
          type="primary" size="small" :icon="VideoPlay"
          @click="countdownStore.startAnswerCountdown()"
        />
        <el-button
          v-else
          type="danger" size="small" :icon="VideoPause"
          @click="countdownStore.stopAnswerCountdown()"
        />
        <el-button
          size="small" :icon="RefreshRight"
          :disabled="!countdownStore.isAnswerCounting && countdownStore.answerRemaining <= 0"
          @click="countdownStore.startAnswerCountdown()"
        />
        <span
          class="timer-value"
          :class="{ 'timer-warn': countdownStore.isAnswerCounting && countdownStore.answerRemaining <= 10 }"
        >{{ countdownStore.answerRemainingText }}</span>
      </div>
    </template>

    <!-- ========== 抢答题：抢答 + 答题 ========== -->
    <template v-if="gameStore.status === 'quick-answer'">
      <div class="timer-row">
        <span class="timer-label">抢答</span>
        <el-input-number
          :model-value="countdownStore.quickAnswerDuration"
          :min="1" :max="300" :step="5"
          size="small"
          :disabled="countdownStore.isQuickAnswerCounting"
          class="duration-input"
          @change="countdownStore.setQuickAnswerDuration"
        />
        <span class="unit">秒</span>
        <el-button
          v-if="!countdownStore.isQuickAnswerCounting"
          type="primary" size="small" :icon="VideoPlay"
          @click="countdownStore.startQuickAnswerCountdown()"
        />
        <el-button
          v-else
          type="danger" size="small" :icon="VideoPause"
          @click="countdownStore.stopQuickAnswerCountdown()"
        />
        <el-button
          size="small" :icon="RefreshRight"
          :disabled="!countdownStore.isQuickAnswerCounting && countdownStore.quickAnswerRemaining <= 0"
          @click="countdownStore.startQuickAnswerCountdown()"
        />
        <span
          class="timer-value"
          :class="{ 'timer-warn': countdownStore.isQuickAnswerCounting && countdownStore.quickAnswerRemaining <= 5 }"
        >{{ countdownStore.quickAnswerRemainingText }}</span>
      </div>
      <div class="timer-row">
        <span class="timer-label">答题</span>
        <el-input-number
          :model-value="countdownStore.answerDuration"
          :min="1" :max="3600" :step="5"
          size="small"
          :disabled="countdownStore.isAnswerCounting"
          class="duration-input"
          @change="countdownStore.setAnswerDuration"
        />
        <span class="unit">秒</span>
        <el-button
          v-if="!countdownStore.isAnswerCounting"
          type="primary" size="small" :icon="VideoPlay"
          @click="countdownStore.startAnswerCountdown()"
        />
        <el-button
          v-else
          type="danger" size="small" :icon="VideoPause"
          @click="countdownStore.stopAnswerCountdown()"
        />
        <el-button
          size="small" :icon="RefreshRight"
          :disabled="!countdownStore.isAnswerCounting && countdownStore.answerRemaining <= 0"
          @click="countdownStore.startAnswerCountdown()"
        />
        <span
          class="timer-value"
          :class="{ 'timer-warn': countdownStore.isAnswerCounting && countdownStore.answerRemaining <= 10 }"
        >{{ countdownStore.answerRemainingText }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.countdown-inline {
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.timer-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
}

.timer-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-regular);
  min-width: 28px;
}

.duration-input {
  width: 85px;
}

.duration-input :deep(.el-input__inner) {
  text-align: center;
}

.unit {
  font-size: 12px;
  color: var(--text-secondary);
}

.timer-value {
  font-size: 18px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  letter-spacing: 1px;
  margin-left: auto;
  color: var(--text-primary);
  min-width: 56px;
  text-align: right;
}

.timer-warn {
  color: #f56c6c;
  animation: pulse-warn 0.8s ease-in-out infinite alternate;
}

@keyframes pulse-warn {
  from { opacity: 1; }
  to   { opacity: 0.5; }
}
</style>
