import { ref, computed, watch, onUnmounted } from 'vue'
import type { SyncedGameState } from './useSocket'

/** 展示页 / 选手页倒计时逻辑：从服务端状态同步 + 本地独立 tick */
export function useDisplayCountdown() {
  const answerEndTime = ref<number | null>(null)
  const quickAnswerEndTime = ref<number | null>(null)
  const isAnswerCounting = ref(false)
  const isQuickAnswerCounting = ref(false)
  const answerRemaining = ref(0)
  const quickAnswerRemaining = ref(0)
  /** 抢答倒计时精确剩余秒数（浮点数，用于小数点后两位展示） */
  const quickAnswerRemainingRaw = ref(0)

  // ── 格式化 ──
  const answerRemainingText = computed(() => formatTime(answerRemaining.value))
  const quickAnswerRemainingText = computed(() => formatTime(quickAnswerRemaining.value))
  /** 抢答倒计时保留小数点后两位（如 5.00, 3.27） */
  const quickAnswerRemainingDecimal = computed(() => formatDecimal(quickAnswerRemainingRaw.value))
  const showAnswerTimer = computed(() => isAnswerCounting.value)
  const showQuickAnswerTimer = computed(() => isQuickAnswerCounting.value)

  function formatTime(s: number): string {
    if (s <= 0) return '00:00'
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  /** 秒数 → 保留两位小数的秒（如 5.00, 3.25） */
  function formatDecimal(s: number): string {
    if (s <= 0) return '0.00'
    return s.toFixed(2)
  }

  // ── 本地 tick：基于服务端初始剩余时间 + 本地流逝时间，不依赖绝对时间戳 ──
  let initialAnswerRemaining = 0
  let initialQuickRemaining = 0
  const tickStart = ref(0)

  function syncFromServer(s: SyncedGameState) {
    answerEndTime.value = s.answerEndTime
    quickAnswerEndTime.value = s.quickAnswerEndTime
    isAnswerCounting.value = s.isAnswerCounting
    isQuickAnswerCounting.value = s.isQuickAnswerCounting

    if (s.isAnswerCounting && s.answerEndTime && s.serverTime) {
      // 用服务端时间计算剩余秒数，消除客户端时钟偏差
      initialAnswerRemaining = Math.max(0, (s.answerEndTime - s.serverTime) / 1000)
      tickStart.value = Date.now()
      answerRemaining.value = Math.ceil(initialAnswerRemaining)
    }
    if (s.isQuickAnswerCounting && s.quickAnswerEndTime && s.serverTime) {
      initialQuickRemaining = Math.max(0, (s.quickAnswerEndTime - s.serverTime) / 1000)
      tickStart.value = Date.now()
      quickAnswerRemaining.value = Math.ceil(initialQuickRemaining)
      quickAnswerRemainingRaw.value = initialQuickRemaining
    }
  }

  // ── 本地 tick 定时器（基于流逝时间递减，不受时钟偏差影响） ──
  let timerHandle: ReturnType<typeof setInterval> | null = null

  function tick() {
    const elapsed = (Date.now() - tickStart.value) / 1000
    if (isAnswerCounting.value) {
      answerRemaining.value = Math.max(0, Math.ceil(initialAnswerRemaining - elapsed))
      if (initialAnswerRemaining - elapsed <= 0) {
        isAnswerCounting.value = false
        answerRemaining.value = 0
      }
    }
    if (isQuickAnswerCounting.value) {
      const rawRemaining = Math.max(0, initialQuickRemaining - elapsed)
      quickAnswerRemaining.value = Math.ceil(rawRemaining)
      quickAnswerRemainingRaw.value = rawRemaining
      if (rawRemaining <= 0) {
        isQuickAnswerCounting.value = false
        quickAnswerRemaining.value = 0
        quickAnswerRemainingRaw.value = 0
      }
    }
  }

  watch(
    () => isAnswerCounting.value || isQuickAnswerCounting.value,
    (active) => {
      if (active) {
        if (!timerHandle) timerHandle = setInterval(tick, 100)
      } else {
        if (timerHandle) { clearInterval(timerHandle); timerHandle = null }
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (timerHandle) clearInterval(timerHandle)
  })

  return {
    answerEndTime,
    quickAnswerEndTime,
    isAnswerCounting,
    isQuickAnswerCounting,
    answerRemaining,
    quickAnswerRemaining,
    answerRemainingText,
    quickAnswerRemainingText,
    quickAnswerRemainingDecimal,
    showAnswerTimer,
    showQuickAnswerTimer,
    syncFromServer,
  }
}
