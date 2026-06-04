import { ref, computed, watch, onUnmounted } from 'vue'
import type { SyncedGameState } from './useSocket'

/** 展示页倒计时逻辑：从服务端状态同步 + 本地独立 tick */
export function useDisplayCountdown() {
  // ── 状态 ──
  const answerEndTime = ref<number | null>(null)
  const quickAnswerEndTime = ref<number | null>(null)
  const isAnswerCounting = ref(false)
  const isQuickAnswerCounting = ref(false)
  const answerRemaining = ref(0)
  const quickAnswerRemaining = ref(0)

  // ── 格式化 ──
  const answerRemainingText = computed(() => formatTime(answerRemaining.value))
  const quickAnswerRemainingText = computed(() => formatTime(quickAnswerRemaining.value))
  const showAnswerTimer = computed(() => isAnswerCounting.value)
  const showQuickAnswerTimer = computed(() => isQuickAnswerCounting.value)

  function formatTime(s: number): string {
    if (s <= 0) return '00:00'
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  // ── 从服务端状态同步 ──
  function syncFromServer(s: SyncedGameState) {
    answerEndTime.value = s.answerEndTime
    quickAnswerEndTime.value = s.quickAnswerEndTime
    isAnswerCounting.value = s.isAnswerCounting
    isQuickAnswerCounting.value = s.isQuickAnswerCounting

    if (s.isAnswerCounting && s.answerEndTime) {
      answerRemaining.value = Math.max(0, Math.ceil((s.answerEndTime - Date.now()) / 1000))
    }
    if (s.isQuickAnswerCounting && s.quickAnswerEndTime) {
      quickAnswerRemaining.value = Math.max(0, Math.ceil((s.quickAnswerEndTime - Date.now()) / 1000))
    }
  }

  // ── 本地 tick 定时器 ──
  let timerHandle: ReturnType<typeof setInterval> | null = null

  function tick() {
    const now = Date.now()
    if (isAnswerCounting.value && answerEndTime.value) {
      const r = Math.max(0, Math.ceil((answerEndTime.value - now) / 1000))
      answerRemaining.value = r
      if (r <= 0) {
        isAnswerCounting.value = false
        answerEndTime.value = null
        answerRemaining.value = 0
      }
    }
    if (isQuickAnswerCounting.value && quickAnswerEndTime.value) {
      const r = Math.max(0, Math.ceil((quickAnswerEndTime.value - now) / 1000))
      quickAnswerRemaining.value = r
      if (r <= 0) {
        isQuickAnswerCounting.value = false
        quickAnswerEndTime.value = null
        quickAnswerRemaining.value = 0
      }
    }
  }

  watch(
    () => isAnswerCounting.value || isQuickAnswerCounting.value,
    (active) => {
      if (active) {
        if (!timerHandle) timerHandle = setInterval(tick, 250)
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
    showAnswerTimer,
    showQuickAnswerTimer,
    syncFromServer,
  }
}
