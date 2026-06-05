import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { Question } from '@/types/question'

/** 排名条目 */
export interface PlayerRanking {
  rank: number
  nickname: string
  totalScore: number
}

/** 选手状态（刷新恢复用） */
export interface PlayerMyStatus {
  questionId: string | null
  submitted: boolean
  result: AnswerResult | null
}

/** 答题结果 */
export interface AnswerResult {
  questionId: string
  correct: boolean
  score: number
  correctAnswers: string[]
  timeout: boolean
}

/** 与服务端同步的游戏状态 */
export interface SyncedGameState {
  status: string
  currentQuestion: Question | null
  currentRiskCode: string | null
  showAnswer: boolean
  answerDuration: number
  quickAnswerDuration: number
  answerEndTime: number | null
  quickAnswerEndTime: number | null
  isAnswerCounting: boolean
  isQuickAnswerCounting: boolean
  rankings: PlayerRanking[]
  riskScoreFilter: number
  usedRiskQuestionIds: string[]
}

interface UseSocketOptions {
  /** 是否监听远端推送（展示页为 true，管理页为 false 避免回环） */
  syncRemote?: boolean
}

/** 与服务端 Socket.IO 同步游戏状态
 *
 * - 管理页（syncRemote=false）：仅请求初始状态，主动推送变更
 * - 展示页（syncRemote=true）：请求初始状态 + 持续监听远端推送
 */
export function useSocket(opts: UseSocketOptions = {}) {
  const { syncRemote = false } = opts

  const connected = ref(false)
  const serverState = ref<SyncedGameState | null>(null)

  let socket: Socket | null = null
  /** 防回环：收到远端状态时置位，阻止本地 watcher 重复推送 */
  let applyingRemote = false

  function connect() {
    // 优先使用环境变量，未设置则连接当前页面同源（开发时经 Vite 代理到后端）
    const url = import.meta.env.VITE_SOCKET_URL || ''

    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    socket.on('connect', () => {
      connected.value = true
      // 首次连接 / 刷新时请求当前持久化状态
      socket?.emit('client:requestState')
    })

    socket.on('disconnect', () => {
      connected.value = false
    })

    // 服务端返回当前状态（响应 client:requestState）
    socket.on('state:current', (state: SyncedGameState) => {
      applyingRemote = true
      serverState.value = state
      nextTick(() => { applyingRemote = false })
    })

    // 仅展示页 / 选手页监听远端广播更新
    if (syncRemote) {
      socket.on('state:updated', (state: SyncedGameState) => {
        applyingRemote = true
        serverState.value = state
        nextTick(() => { applyingRemote = false })
      })
    }

    // 选手端专属事件
    socket.on('player:answerReceived', () => {
      answerReceived.value = true
    })

    socket.on('player:answerResult', (result: AnswerResult) => {
      answerResult.value = result
    })

    socket.on('player:myStatus', (status: PlayerMyStatus) => {
      myStatus.value = status
    })
  }

  /** 推送状态变更到服务端（管理页调用） */
  function pushState(patch: Partial<SyncedGameState>) {
    if (applyingRemote) return
    socket?.emit('admin:syncState', patch)
  }

  /** 重置游戏状态 */
  function resetState() {
    socket?.emit('admin:resetState')
  }

  /** 展示页：点击风险题卡片，选中题目 */
  function selectRiskQuestion(questionId: string, riskCode: string) {
    socket?.emit('display:selectRiskQuestion', { questionId, riskCode })
  }

  /** 展示页：返回风险题列表（清除当前题目） */
  function clearQuestion() {
    socket?.emit('display:clearQuestion')
  }

  // ── 选手端功能 ──

  /** 已提交确认（服务端收到答案后返回） */
  const answerReceived = ref(false)

  /** 答题结果（倒计时结束后服务端推送） */
  const answerResult = ref<AnswerResult | null>(null)

  /** 选手状态（页面刷新后从服务端恢复） */
  const myStatus = ref<PlayerMyStatus | null>(null)

  /** 选手注册：将 userId 关联到当前 socket */
  function registerPlayer(userId: string) {
    socket?.emit('player:register', userId)
  }

  /** 查询当前答题状态（页面刷新后恢复） */
  function checkPlayerStatus(userId: string) {
    socket?.emit('player:checkStatus', userId)
  }

  /** 选手提交答案 */
  function submitAnswer(userId: string, questionId: string, answers: string[]) {
    answerReceived.value = false
    answerResult.value = null
    socket?.emit('player:submitAnswer', { userId, questionId, answers })
  }

  /** 重置选手答题状态（新题目时调用） */
  function resetPlayerAnswerState() {
    answerReceived.value = false
    answerResult.value = null
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  onMounted(() => connect())
  onUnmounted(() => disconnect())

  return {
    connected, serverState, pushState, resetState, selectRiskQuestion, clearQuestion,
    registerPlayer, submitAnswer, resetPlayerAnswerState, answerReceived, answerResult, checkPlayerStatus, myStatus,
  }
}
