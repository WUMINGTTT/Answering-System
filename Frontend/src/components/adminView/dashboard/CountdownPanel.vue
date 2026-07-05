<!--
  ====================================================================
  CountdownPanel.vue — 倒计时控制面板
  ====================================================================

  【组件职责】
  提供答题和抢答的倒计时控制功能，包括：
  1. 倒计时时长设置（输入框 + 步进按钮）
  2. 开始 / 暂停 / 重置控制
  3. 剩余时间显示（带警告动画）
  4. 本地 250ms 间隔的 tick 计时器

  【技术学习 — 设计思路】
  - 倒计时有两种：答题倒计时（answer）和抢答倒计时（quickAnswer）
  - 必答题阶段只显示答题倒计时
  - 抢答题阶段同时显示抢答和答题两个倒计时
  - 使用 250ms 间隔的 setInterval 实现本地计时（比 1000ms 更精确）
  - 倒计时状态存储在 Pinia Store（countdownStore）中，支持多页面同步

  【互斥逻辑】
  - 答题和抢答倒计时不能同时运行
  - 启动一个时会自动停止另一个

  【状态指示】
  - 剩余 <= 10 秒（答题）或 <= 5 秒（抢答）时，时间显示红色闪烁动画
-->

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, RefreshRight } from '@element-plus/icons-vue'
import { useCountdownStore } from '@/stores/countdown'
import { useGameStatusStore } from '@/stores/gameStatus'

// ====================================================================
// 初始化 Store
// ====================================================================
const gameStore = useGameStatusStore()
const countdownStore = useCountdownStore()

// ====================================================================
// 前置校验函数
// ====================================================================
/**
 * 检查是否已选择题目
 * 【技术学习】没有选择题目时不允许启动倒计时，提前返回并提示
 * 返回 true 表示校验通过，false 表示未通过
 */
function ensureQuestionSelected(): boolean {
  if (!gameStore.currentQuestion) {
    ElMessage.warning('请先选择一道题目')
    return false
  }
  return true
}

// ====================================================================
// 倒计时启动处理（含互斥逻辑）
// ====================================================================
/**
 * 开始答题倒计时
 * 【技术学习】启动前检查：
 * 1. 必须已选择题目
 * 2. 如果抢答倒计时正在运行，自动停止它
 */
function handleStartAnswer() {
  if (!ensureQuestionSelected()) return
  // 互斥：启动答题前停止抢答
  if (countdownStore.isQuickAnswerCounting) {
    countdownStore.stopQuickAnswerCountdown()
    ElMessage.info('已自动停止抢答倒计时')
  }
  countdownStore.startAnswerCountdown()
}

/**
 * 开始抢答倒计时
 * 启动前检查：必须已选题，且自动停止答题倒计时
 */
function handleStartQuickAnswer() {
  if (!ensureQuestionSelected()) return
  // 互斥：启动抢答前停止答题
  if (countdownStore.isAnswerCounting) {
    countdownStore.stopAnswerCountdown()
    ElMessage.info('已自动停止答题倒计时')
  }
  countdownStore.startQuickAnswerCountdown()
}

// ====================================================================
// 本地 tick 定时器
// ====================================================================
// 【技术学习】定时器设计：
// - 使用 250ms 间隔而非 1000ms，让时间显示更平滑
// - 通过 watch 监听计时状态，自动启停定时器
// - onUnmounted 清理定时器，防止内存泄漏

let timerHandle: ReturnType<typeof setInterval> | null = null

/** 启动 tick 定时器 */
function startTicking() {
  if (timerHandle) return  // 已经在运行，不重复启动
  timerHandle = setInterval(() => countdownStore.tick(), 250)
}

/** 停止 tick 定时器 */
function stopTicking() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null }
}

/**
 * 【技术学习】watch 监听"是否有倒计时在运行"
 * 当任一倒计时开始时启动定时器，全部停止时关闭定时器
 * immediate: true 表示组件创建时立即执行一次（处理页面刷新后倒计时仍在运行的情况）
 */
watch(
  () => countdownStore.isAnswerCounting || countdownStore.isQuickAnswerCounting,
  (active) => { if (active) startTicking(); else stopTicking() },
  { immediate: true },
)

// 组件卸载时清理定时器
onUnmounted(() => stopTicking())
</script>

<template>
  <!--
    【技术学习】v-if 条件渲染：只在必答或抢答阶段显示倒计时面板
    其他阶段（等待、风险、排名）不显示
  -->
  <div
    v-if="gameStore.status === 'required' || gameStore.status === 'quick-answer'"
    class="countdown-inline"
  >
    <!-- ============================================================ -->
    <!-- 必答题阶段：只显示答题倒计时                                    -->
    <!-- ============================================================ -->
    <template v-if="gameStore.status === 'required'">
      <div class="timer-row">
        <span class="timer-label">答题</span>

        <!-- 倒计时时长设置（秒） -->
        <!--
          【技术学习】el-input-number 组件：
          - :model-value 双向绑定时长值
          - :min/:max 限制输入范围
          - :step 步进值（每次点击 +/- 按钮变化 5 秒）
          - :disabled 计时中禁止修改时长
          - @change 值变化时调用 store 的设置方法
        -->
        <el-input-number
          :model-value="countdownStore.answerDuration"
          :min="1" :max="3600" :step="5"
          size="small"
          :disabled="countdownStore.isAnswerCounting"
          class="duration-input"
          @change="countdownStore.setAnswerDuration"
        />
        <span class="unit">秒</span>

        <!-- 开始 / 暂停按钮（根据计时状态切换） -->
        <el-button
          v-if="!countdownStore.isAnswerCounting"
          type="primary" size="small" :icon="VideoPlay"
          @click="handleStartAnswer()"
        />
        <el-button
          v-else
          type="danger" size="small" :icon="VideoPause"
          @click="countdownStore.stopAnswerCountdown()"
        />

        <!-- 重置按钮（重新从设置的时长开始倒计时） -->
        <el-button
          size="small" :icon="RefreshRight"
          :disabled="!countdownStore.isAnswerCounting && countdownStore.answerRemaining <= 0"
          @click="handleStartAnswer()"
        />

        <!-- 剩余时间显示 -->
        <!--
          【技术学习】:class 动态样式绑定：
          当倒计时运行中且剩余 <= 10 秒时，添加 timer-warn 类（红色闪烁）
        -->
        <span
          class="timer-value"
          :class="{ 'timer-warn': countdownStore.isAnswerCounting && countdownStore.answerRemaining <= 10 }"
        >{{ countdownStore.answerRemainingText }}</span>
      </div>
    </template>

    <!-- ============================================================ -->
    <!-- 抢答题阶段：同时显示抢答和答题两个倒计时                        -->
    <!-- ============================================================ -->
    <template v-if="gameStore.status === 'quick-answer'">
      <!-- 抢答倒计时行 -->
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
          @click="handleStartQuickAnswer()"
        />
        <el-button
          v-else
          type="danger" size="small" :icon="VideoPause"
          @click="countdownStore.stopQuickAnswerCountdown()"
        />
        <el-button
          size="small" :icon="RefreshRight"
          :disabled="!countdownStore.isQuickAnswerCounting && countdownStore.quickAnswerRemaining <= 0"
          @click="handleStartQuickAnswer()"
        />
        <!-- 抢答倒计时：剩余 <= 5 秒时警告 -->
        <span
          class="timer-value"
          :class="{ 'timer-warn': countdownStore.isQuickAnswerCounting && countdownStore.quickAnswerRemaining <= 5 }"
        >{{ countdownStore.quickAnswerRemainingText }}</span>
      </div>

      <!-- 答题倒计时行 -->
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
          @click="handleStartAnswer()"
        />
        <el-button
          v-else
          type="danger" size="small" :icon="VideoPause"
          @click="countdownStore.stopAnswerCountdown()"
        />
        <el-button
          size="small" :icon="RefreshRight"
          :disabled="!countdownStore.isAnswerCounting && countdownStore.answerRemaining <= 0"
          @click="handleStartAnswer()"
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
/* 倒计时面板容器 */
.countdown-inline {
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* 每行倒计时：标签 + 输入框 + 按钮 + 时间显示 */
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

/* 时长输入框 */
.duration-input {
  width: 85px;
}

/* 【技术学习】:deep() 穿透修改输入框内部的文本对齐方式 */
.duration-input :deep(.el-input__inner) {
  text-align: center;
}

.unit {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 剩余时间数字显示（等宽字体，右对齐） */
.timer-value {
  font-size: 18px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  letter-spacing: 1px;
  margin-left: auto;          /* 推到最右侧 */
  color: var(--text-primary);
  min-width: 56px;
  text-align: right;
}

/* 【技术学习】警告样式：红色 + 闪烁动画 */
.timer-warn {
  color: #f56c6c;
  animation: pulse-warn 0.8s ease-in-out infinite alternate;
}

/* 闪烁动画：在透明度 1 和 0.5 之间交替 */
@keyframes pulse-warn {
  from { opacity: 1; }
  to   { opacity: 0.5; }
}
</style>
