import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { Question } from '@/types/question'

/** 排名条目 */
export interface PlayerRanking {
  rank: number
  nickname: string
  totalScore: number
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
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

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

    // 仅展示页监听远端广播更新
    if (syncRemote) {
      socket.on('state:updated', (state: SyncedGameState) => {
        applyingRemote = true
        serverState.value = state
        nextTick(() => { applyingRemote = false })
      })
    }
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

  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  onMounted(() => connect())
  onUnmounted(() => disconnect())

  return { connected, serverState, pushState, resetState, selectRiskQuestion, clearQuestion }
}
