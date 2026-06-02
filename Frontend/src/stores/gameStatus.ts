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

  const statusLabel = computed(() => STATUS_LABELS[status.value])
  const statusColor = computed(() => STATUS_COLORS[status.value])
  const isActive = computed(() => status.value !== 'waiting' && status.value !== 'ranking')

  function setStatus(s: GameStatus) {
    status.value = s
    // 切换状态阶段时自动清除当前选中题目
    currentQuestion.value = null
  }

  function setCurrentQuestion(q: Question | null) {
    currentQuestion.value = q
  }

  return {
    status,
    currentQuestion,
    statusLabel,
    statusColor,
    isActive,
    setStatus,
    setCurrentQuestion,
  }
})
