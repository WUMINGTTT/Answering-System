import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Question } from '@/types/question'

/** 与题目 category 对应的状态 */
export const QUESTION_PHASES = ['required', 'quick-answer', 'risk'] as const

export type GameStatus = 'waiting' | 'required' | 'quick-answer' | 'risk' | 'ranking'

export const STATUS_LABELS: Record<GameStatus, string> = {
  waiting: '等待中',
  required: '必答题',
  'quick-answer': '抢答题',
  risk: '风险题',
  ranking: '展示排名',
}

export const STATUS_COLORS: Record<GameStatus, string> = {
  waiting: '#909399',
  required: '#409eff',
  'quick-answer': '#e6a23c',
  risk: '#f56c6c',
  ranking: '#67c23a',
}

export const useGameStatusStore = defineStore('gameStatus', () => {
  const status = ref<GameStatus>('waiting')
  const currentQuestion = ref<Question | null>(null)
  /** 当前风险题代号（如 A5、C13），非风险题为 null */
  const currentRiskCode = ref<string | null>(null)
  /** 展示页是否展示答案（管理员控制，切换题目时自动隐藏） */
  const showAnswer = ref(false)

  const statusLabel = computed(() => STATUS_LABELS[status.value])
  const statusColor = computed(() => STATUS_COLORS[status.value])
  const isActive = computed(() => status.value !== 'waiting' && status.value !== 'ranking')

  function setStatus(s: GameStatus) {
    status.value = s
    // 切换状态阶段时自动清除当前选中题目
    currentQuestion.value = null
  }

  function setCurrentQuestion(q: Question | null, riskCode?: string) {
    currentQuestion.value = q
    currentRiskCode.value = riskCode || null
    // 切换题目时重置答案显隐
    showAnswer.value = false
  }

  function setShowAnswer(v: boolean) {
    showAnswer.value = v
  }

  return {
    status,
    currentQuestion,
    currentRiskCode,
    showAnswer,
    statusLabel,
    statusColor,
    isActive,
    setStatus,
    setCurrentQuestion,
    setShowAnswer,
  }
})
