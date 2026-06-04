import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCountdownStore = defineStore('countdown', () => {
  // ---------- 时长设置（秒） ----------
  /** 答题倒计时时长（必答题 / 抢答题共用） */
  const answerDuration = ref(30)
  /** 抢答倒计时时长（仅抢答题阶段） */
  const quickAnswerDuration = ref(10)

  // ---------- 倒计时截止时间戳（ms） ----------
  const answerEndTime = ref<number | null>(null)
  const quickAnswerEndTime = ref<number | null>(null)

  // ---------- 是否正在倒计时 ----------
  const isAnswerCounting = ref(false)
  const isQuickAnswerCounting = ref(false)

  // ---------- 当前剩余秒数（由外部定时器驱动更新） ----------
  const answerRemaining = ref(0)
  const quickAnswerRemaining = ref(0)

  // ---------- 格式化剩余时间 ----------
  const answerRemainingText = computed(() => formatRemaining(answerRemaining.value))
  const quickAnswerRemainingText = computed(() => formatRemaining(quickAnswerRemaining.value))

  function formatRemaining(seconds: number): string {
    if (seconds <= 0) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ---------- Actions ----------

  /** 设置答题倒计时时长（秒） */
  function setAnswerDuration(seconds: number) {
    answerDuration.value = Math.max(1, seconds)
  }

  /** 设置抢答倒计时时长（秒） */
  function setQuickAnswerDuration(seconds: number) {
    quickAnswerDuration.value = Math.max(1, seconds)
  }

  /** 开始答题倒计时 */
  function startAnswerCountdown() {
    answerEndTime.value = Date.now() + answerDuration.value * 1000
    answerRemaining.value = answerDuration.value
    isAnswerCounting.value = true
  }

  /** 开始抢答倒计时 */
  function startQuickAnswerCountdown() {
    quickAnswerEndTime.value = Date.now() + quickAnswerDuration.value * 1000
    quickAnswerRemaining.value = quickAnswerDuration.value
    isQuickAnswerCounting.value = true
  }

  /** 停止答题倒计时 */
  function stopAnswerCountdown() {
    isAnswerCounting.value = false
    answerEndTime.value = null
    answerRemaining.value = 0
  }

  /** 停止抢答倒计时 */
  function stopQuickAnswerCountdown() {
    isQuickAnswerCounting.value = false
    quickAnswerEndTime.value = null
    quickAnswerRemaining.value = 0
  }

  /** 重置所有倒计时 */
  function resetAll() {
    stopAnswerCountdown()
    stopQuickAnswerCountdown()
  }

  /** 由定时器调用：根据当前时间更新剩余秒数 */
  function tick() {
    const now = Date.now()
    if (isAnswerCounting.value && answerEndTime.value) {
      const remaining = Math.max(0, Math.ceil((answerEndTime.value - now) / 1000))
      answerRemaining.value = remaining
      if (remaining <= 0) {
        stopAnswerCountdown()
      }
    }
    if (isQuickAnswerCounting.value && quickAnswerEndTime.value) {
      const remaining = Math.max(0, Math.ceil((quickAnswerEndTime.value - now) / 1000))
      quickAnswerRemaining.value = remaining
      if (remaining <= 0) {
        stopQuickAnswerCountdown()
      }
    }
  }

  return {
    // state
    answerDuration,
    quickAnswerDuration,
    answerEndTime,
    quickAnswerEndTime,
    isAnswerCounting,
    isQuickAnswerCounting,
    answerRemaining,
    quickAnswerRemaining,
    // computed
    answerRemainingText,
    quickAnswerRemainingText,
    // actions
    setAnswerDuration,
    setQuickAnswerDuration,
    startAnswerCountdown,
    startQuickAnswerCountdown,
    stopAnswerCountdown,
    stopQuickAnswerCountdown,
    resetAll,
    tick,
  }
})
