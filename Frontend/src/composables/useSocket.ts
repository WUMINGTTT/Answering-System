/**
 * ============================================================================
 * useSocket.ts - Socket.IO 通信核心 Composable
 * ============================================================================
 *
 * 【技术学习 - 什么是 Composable（组合式函数）？】
 *
 * Composable 是 Vue 3 组合式 API 的核心复用模式，它是一个以 "use" 开头的函数，
 * 内部封装了可复用的状态逻辑。相比 Vue 2 的 mixin，Composable 有以下优势：
 *
 * 1. 清晰的来源追踪：使用时可以清楚知道变量来自哪个 composable
 * 2. 灵活的参数传递：通过函数参数定制行为
 * 3. 类型安全：TypeScript 可以完美推断类型
 * 4. 无命名冲突：每次调用创建独立的实例
 *
 * 本文件封装了与服务端的所有 Socket.IO 通信逻辑，供展示页、管理页、选手页复用。
 *
 * 【为什么用 Composable 而不是直接在组件中写 socket 逻辑？】
 *
 * 1. 复用性：多个页面（展示页、管理页、选手页）都需要 socket 通信
 * 2. 单一职责：通信逻辑与 UI 渲染分离，便于维护
 * 3. 状态管理：集中管理连接状态、游戏状态等共享数据
 * 4. 生命周期管理：自动在组件挂载时连接、卸载时断开
 *
 * ============================================================================
 */

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { Question } from '@/types/question'

// ============================================================================
// 接口定义区
// ============================================================================

/**
 * 排名条目 - 用于排行榜展示
 *
 * 【技术学习】interface 用于定义对象的结构，确保类型安全
 *
 * @property rank - 排名序号（从 1 开始）
 * @property nickname - 选手昵称
 * @property totalScore - 选手总分
 */
export interface PlayerRanking {
  rank: number
  nickname: string
  totalScore: number
}

/**
 * 选手状态 - 用于页面刷新后恢复状态
 *
 * 【应用场景】当选手刷新页面时，服务端会推送此对象，
 * 帮助选手端恢复到刷新前的答题状态
 *
 * @property questionId - 当前正在答的题目 ID，null 表示没有在答题
 * @property submitted - 是否已提交答案
 * @property result - 答题结果，null 表示还未出结果
 */
export interface PlayerMyStatus {
  questionId: string | null
  submitted: boolean
  result: AnswerResult | null
}

/**
 * 会话在线状态 - 管理页监控各页面连接数
 *
 * 【技术学习】Record<string, number> 表示键为 string、值为 number 的对象
 *
 * @property home - 主页在线人数
 * @property login - 登录页在线人数
 * @property admin - 管理页在线人数
 * @property display - 展示页在线人数
 * @property player - 选手页在线人数
 * @property players - 在线选手列表（包含 userId 和 nickname）
 */
export interface SessionData {
  home: number
  login: number
  admin: number
  display: number
  player: number
  players: { userId: string; nickname: string }[]
}

/**
 * 答题结果 - 服务端评判后推送给选手
 *
 * @property questionId - 题目 ID
 * @property correct - 是否答对
 * @property score - 获得的分数（答错可能为 0 或负分）
 * @property correctAnswers - 正确答案列表（用于选手对照）
 * @property timeout - 是否因超时而判定（超时视为答错）
 */
export interface AnswerResult {
  questionId: string
  correct: boolean
  score: number
  correctAnswers: string[]
  timeout: boolean
}

/**
 * 同步的游戏状态 - 服务端与客户端双向同步的核心数据结构
 *
 * 【技术学习】这是整个应用最重要的数据结构，包含了游戏的所有实时状态。
 * 服务端维护权威状态，通过 Socket.IO 推送给各客户端。
 *
 * @property status - 游戏状态（如 'idle', 'question', 'answering', 'result' 等）
 * @property currentQuestion - 当前题目对象，null 表示没有进行中的题目
 * @property currentRiskCode - 当前风险题代码（风险题专用）
 * @property showAnswer - 是否显示答案
 * @property answerDuration - 答题时长（秒）
 * @property quickAnswerDuration - 抢答时长（秒）
 * @property answerEndTime - 答题结束的服务器时间戳（毫秒），null 表示未在计时
 * @property quickAnswerEndTime - 抢答结束的服务器时间戳（毫秒），null 表示未在计时
 * @property isAnswerCounting - 普通答题倒计时是否进行中
 * @property isQuickAnswerCounting - 抢答倒计时是否进行中
 * @property rankings - 选手排行榜数据
 * @property riskScoreFilter - 风险题分数筛选条件
 * @property usedRiskQuestionIds - 已使用的风险题 ID 列表（防止重复出题）
 * @property serverTime - 服务端当前时间戳（用于客户端时间校准）
 * @property playerStatuses - 所有选手的答题状态列表
 * @property buzzRecords - 抢答记录（按题目 ID 分组）
 * @property buzzWinner - 当前抢答获胜者信息，null 表示还没有人抢答成功
 * @property buzzOpen - 抢答是否开放（允许选手按抢答按钮）
 */
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
  serverTime: number
  playerStatuses: PlayerAnswerStatus[]
  buzzRecords: Record<string, BuzzRecord[]>
  buzzWinner: { userId: string; nickname: string; timestamp: number } | null
  buzzOpen: boolean
}

/**
 * 选手答题状态 - 用于展示页显示各选手的答题进度
 *
 * @property userId - 选手用户 ID
 * @property nickname - 选手昵称
 * @property status - 答题状态：
 *   - 'waiting'：等待出题
 *   - 'answering'：正在答题（倒计时中）
 *   - 'submitted'：已提交答案
 */
export interface PlayerAnswerStatus {
  userId: string
  nickname: string
  status: 'waiting' | 'answering' | 'submitted'
}

/**
 * 抢答记录 - 记录每次抢答的详细信息
 *
 * @property userId - 抢答者用户 ID
 * @property nickname - 抢答者昵称
 * @property timestamp - 抢答时间戳（毫秒）
 * @property early - 是否为抢跑（在抢答开始前就按下）
 */
export interface BuzzRecord {
  userId: string
  nickname: string
  timestamp: number
  early: boolean
}

/**
 * 抢答结果 - 服务端推送给选手的抢答判定结果
 *
 * @property questionId - 题目 ID
 * @property valid - 本次抢答是否有效（非抢跑）
 * @property early - 是否为抢跑
 * @property winner - 抢答获胜者信息，null 表示无效抢答
 */
export interface BuzzResult {
  questionId: string
  valid: boolean
  early: boolean
  winner: { userId: string; nickname: string } | null
}

/**
 * useSocket 的配置选项
 *
 * 【技术学习】通过 options 对象传递配置参数，比多个独立参数更清晰，
 * 也便于扩展新配置项而不破坏现有调用代码
 *
 * @property syncRemote - 是否监听远端推送：
 *   - true（展示页/选手页）：持续接收服务端的状态广播
 *   - false（管理页）：只接收初始状态，避免管理页自己推送的状态又被广播回来造成回环
 * @property pageType - 页面类型，用于会话管理
 * @property playerInfo - 选手信息，仅 player 页面需要传入
 */
interface UseSocketOptions {
  /** 是否监听远端推送（展示页为 true，管理页为 false 避免回环） */
  syncRemote?: boolean
  /** 页面类型（用于会话管理） */
  pageType?: 'home' | 'login' | 'admin' | 'display' | 'player'
  /** 选手信息（player 页面时传入） */
  playerInfo?: { userId: string; nickname: string }
}

// ============================================================================
// Composable 主函数
// ============================================================================

/**
 * useSocket - Socket.IO 通信核心 Composable
 *
 * 【功能概述】
 * 封装了与服务端的所有 Socket.IO 通信，提供：
 * 1. 连接管理（自动连接/断开/重连）
 * 2. 状态同步（客户端 ↔ 服务端双向同步）
 * 3. 选手功能（注册、提交答案、抢答）
 * 4. 管理功能（推送状态变更、重置游戏）
 *
 * 【使用示例】
 * ```typescript
 * // 展示页使用
 * const { serverState, connected } = useSocket({
 *   syncRemote: true,
 *   pageType: 'display'
 * })
 *
 * // 管理页使用
 * const { serverState, pushState } = useSocket({
 *   syncRemote: false,
 *   pageType: 'admin'
 * })
 *
 * // 选手页使用
 * const { submitAnswer, answerResult } = useSocket({
 *   syncRemote: true,
 *   pageType: 'player',
 *   playerInfo: { userId: 'xxx', nickname: '张三' }
 * })
 * ```
 *
 * @param opts - 配置选项
 * @returns 包含响应式状态和操作函数的对象
 */
export function useSocket(opts: UseSocketOptions = {}) {
  // 解构配置选项，设置默认值
  const { syncRemote = false, pageType, playerInfo } = opts

  // ============================================================================
  // 响应式状态（ref）
  // ============================================================================

  /**
   * 【技术学习】ref() 是 Vue 3 创建响应式数据的方式
   * - ref() 创建的变量在 JS 中访问需要用 .value
   * - 在模板中会自动解包，不需要 .value
   * - 适合包装基本类型或单个对象
   */

  /** 当前 Socket 连接状态（true=已连接，false=断开） */
  const connected = ref(false)

  /**
   * 服务端同步的游戏状态
   * 这是整个应用最核心的响应式数据，所有页面的游戏状态都来自这里
   */
  const serverState = ref<SyncedGameState | null>(null)

  // ============================================================================
  // 内部变量（非响应式）
  // ============================================================================

  /**
   * Socket.IO 客户端实例
   * 【技术学习】这里不使用 ref 包装，因为 socket 实例不需要在模板中使用
   * 使用普通变量可以避免 .value 的麻烦
   */
  let socket: Socket | null = null

  /**
   * 【重要】防回环标记
   *
   * 【技术学习 - 什么是回环保护？】
   *
   * 想象这个场景：
   * 1. 服务端推送状态到管理页
   * 2. 管理页收到后更新 serverState
   * 3. 如果有 watcher 监听 serverState 变化并推送到服务端
   * 4. 服务端收到推送后又广播给所有客户端
   * 5. 回到步骤 1，形成无限循环！
   *
   * 解决方案：收到远端推送时设置 applyingRemote = true，
   * 在 watcher 中检查此标记，如果为 true 则跳过推送。
   * 使用 nextTick 确保在当前同步代码执行完毕后重置标记。
   *
   * 【为什么用 nextTick？】
   * nextTick 确保在 Vue 更新 DOM 后才执行回调，此时 watcher 已经被触发过了。
   */
  let applyingRemote = false

  // ============================================================================
  // Socket 连接与事件监听
  // ============================================================================

  /**
   * 建立 Socket.IO 连接并注册所有事件监听器
   *
   * 【技术学习 - Socket.IO 事件模型】
   *
   * Socket.IO 使用发布/订阅模式进行通信：
   * - socket.emit('事件名', 数据) - 向服务端发送事件
   * - socket.on('事件名', 回调) - 监听服务端发来的事件
   * - socket.off('事件名') - 取消监听
   *
   * 这种模式解耦了发送方和接收方，使代码更灵活。
   */
  function connect() {
    // 获取 Socket 服务器地址
    // 优先使用环境变量 VITE_SOCKET_URL（生产环境）
    // 未设置时使用空字符串，表示连接当前页面同源地址（开发时由 Vite 代理转发到后端）
    const url = import.meta.env.VITE_SOCKET_URL || ''

    /**
     * 创建 Socket.IO 客户端实例
     *
     * 【配置项说明】
     * - transports: 传输方式优先级，先尝试 WebSocket，失败则降级到 HTTP 轮询
     * - reconnection: 启用自动重连
     * - reconnectionDelay: 重连间隔 1 秒
     * - reconnectionAttempts: 无限次重连尝试
     */
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    // ── 连接生命周期事件 ──

    /**
     * 连接成功事件
     *
     * 【事件流程】
     * 1. 设置 connected 状态为 true
     * 2. 请求服务端当前游戏状态（用于页面刷新后恢复）
     * 3. 注册会话（告诉服务端我是哪个页面）
     */
    socket.on('connect', () => {
      connected.value = true

      // 请求当前持久化状态（响应事件：state:current）
      socket?.emit('client:requestState')

      // 注册会话，告诉服务端当前页面类型和用户信息
      if (pageType) {
        socket?.emit('session:register', {
          pageType,
          userId: playerInfo?.userId,
          nickname: playerInfo?.nickname,
        })
      }
    })

    /** 断开连接事件 */
    socket.on('disconnect', () => {
      connected.value = false
    })

    // ── 状态同步事件 ──

    /**
     * 服务端返回当前状态（响应 client:requestState 请求）
     *
     * 【防回环处理】
     * 收到远端状态时，先设置 applyingRemote = true 阻止本地 watcher 推送，
     * 然后更新 serverState，最后在 nextTick 中重置标记。
     */
    socket.on('state:current', (state: SyncedGameState) => {
      applyingRemote = true
      serverState.value = state
      // nextTick 确保 watcher 回调执行完毕后再重置标记
      nextTick(() => { applyingRemote = false })
    })

    /**
     * 仅展示页 / 选手页监听远端广播更新
     *
     * 【为什么管理页不监听？】
     * 管理页是状态的发起者，如果也监听广播，会形成：
     * 管理页修改 → 服务端广播 → 管理页收到 → 又认为需要修改 → 回环
     * 所以管理页设置 syncRemote = false，不监听 state:updated
     */
    if (syncRemote) {
      socket.on('state:updated', (state: SyncedGameState) => {
        applyingRemote = true
        serverState.value = state
        nextTick(() => { applyingRemote = false })
      })
    }

    // ── 选手端专属事件 ──

    /**
     * 服务端确认收到答案
     * 用于选手端显示"已提交"状态
     */
    socket.on('player:answerReceived', () => {
      answerReceived.value = true
    })

    /**
     * 服务端推送答题结果
     * 在倒计时结束后，服务端评判答案并推送结果
     */
    socket.on('player:answerResult', (result: AnswerResult) => {
      answerResult.value = result
    })

    /**
     * 服务端推送选手个人状态（用于页面刷新后恢复）
     * 当选手刷新页面时，服务端会推送此事件帮助恢复状态
     */
    socket.on('player:myStatus', (status: PlayerMyStatus) => {
      myStatus.value = status
    })

    /**
     * 服务端推送抢答结果
     * 抢答结束后，服务端判定结果并推送给所有参与抢答的选手
     */
    socket.on('player:buzzResult', (result: BuzzResult) => {
      buzzResult.value = result
    })

    // ── 管理页专属事件 ──

    /**
     * 管理页：接收会话状态更新
     * 服务端定期推送各页面的在线人数统计
     */
    if (pageType === 'admin') {
      socket.on('admin:sessionUpdate', (data: SessionData) => {
        sessionData.value = data
      })
    }
  }

  // ============================================================================
  // 管理页功能函数
  // ============================================================================

  /**
   * 推送状态变更到服务端（仅管理页调用）
   *
   * 【防回环保护】
   * 如果当前正在应用远端状态（applyingRemote = true），
   * 则跳过推送，避免回环
   *
   * 【技术学习】Partial<T> 是 TypeScript 工具类型，
   * 表示 T 的所有属性都是可选的，允许只传部分字段
   *
   * @param patch - 要更新的状态字段（只需传变化的部分）
   */
  function pushState(patch: Partial<SyncedGameState>) {
    if (applyingRemote) return  // 防回环：正在应用远端状态时不推送
    socket?.emit('admin:syncState', patch)
  }

  /**
   * 重置游戏状态（仅管理页调用）
   * 会清空所有游戏数据，回到初始状态
   */
  function resetState() {
    socket?.emit('admin:resetState')
  }

  /**
   * 请求会话状态（仅管理页调用）
   * 主动向服务端请求当前各页面的在线人数
   */
  function requestSessions() {
    socket?.emit('admin:requestSessions')
  }

  // ============================================================================
  // 选手端功能函数和状态
  // ============================================================================

  /**
   * 【技术学习 - 为什么选手端的状态变量声明在这里而不是文件顶部？】
   *
   * 在 JavaScript/TypeScript 中，函数内部的变量声明会被"提升"（hoisting），
   * 但 ref() 的调用发生在函数执行时。将这些状态声明放在 connect() 函数之后
   * 是为了代码组织更清晰，将相关的状态和函数放在一起。
   *
   * 这些变量虽然在 connect() 函数之后声明，但在 connect() 的回调中使用时，
   * connect() 函数已经执行完毕，这些变量已经初始化了。
   */

  /** 已提交确认（服务端收到答案后返回 true） */
  const answerReceived = ref(false)

  /** 答题结果（倒计时结束后服务端推送） */
  const answerResult = ref<AnswerResult | null>(null)

  /** 选手状态（页面刷新后从服务端恢复） */
  const myStatus = ref<PlayerMyStatus | null>(null)

  /** 抢答结果（服务端推送） */
  const buzzResult = ref<BuzzResult | null>(null)

  /** 会话在线状态（管理页使用） */
  const sessionData = ref<SessionData>({
    home: 0,
    login: 0,
    admin: 0,
    display: 0,
    player: 0,
    players: []
  })

  /**
   * 选手注册：将 userId 关联到当前 Socket 连接
   *
   * 【事件流程】
   * 1. 选手页调用 registerPlayer(userId, nickname)
   * 2. 向服务端发送 player:register 事件
   * 3. 服务端记录此 socket 连接对应的用户信息
   * 4. 后续可以向特定选手推送个性化数据
   *
   * @param userId - 选手用户 ID
   * @param nickname - 选手昵称（可选）
   */
  function registerPlayer(userId: string, nickname?: string) {
    socket?.emit('player:register', userId, nickname)
  }

  /**
   * 查询当前答题状态（页面刷新后恢复）
   *
   * 【应用场景】选手刷新页面后，需要知道自己之前在答什么题、是否已提交
   * 服务端会通过 player:myStatus 事件返回状态
   *
   * @param userId - 选手用户 ID
   */
  function checkPlayerStatus(userId: string) {
    socket?.emit('player:checkStatus', userId)
  }

  /**
   * 选手提交答案
   *
   * 【事件流程】
   * 1. 选手调用 submitAnswer(userId, questionId, answers)
   * 2. 重置上一次的提交状态和结果
   * 3. 向服务端发送 player:submitAnswer 事件
   * 4. 服务端收到后返回 player:answerReceived 确认
   * 5. 倒计时结束后，服务端评判并推送 player:answerResult
   *
   * @param userId - 选手用户 ID
   * @param questionId - 题目 ID
   * @param answers - 答案数组（如 ["A", "C"] 表示多选）
   */
  function submitAnswer(userId: string, questionId: string, answers: string[]) {
    // 重置上一次的状态，避免显示旧数据
    answerReceived.value = false
    answerResult.value = null
    socket?.emit('player:submitAnswer', { userId, questionId, answers })
  }

  /**
   * 选手抢答
   *
   * 【事件流程】
   * 1. 选手按下抢答按钮，调用 sendBuzz(userId, questionId)
   * 2. 重置上一次的抢答结果
   * 3. 向服务端发送 player:buzz 事件
   * 4. 服务端判定是否为第一个抢答者
   * 5. 推送 player:buzzResult 告知结果
   *
   * @param userId - 选手用户 ID
   * @param questionId - 题目 ID
   */
  function sendBuzz(userId: string, questionId: string) {
    buzzResult.value = null
    socket?.emit('player:buzz', { userId, questionId })
  }

  /**
   * 重置选手答题状态（新题目时调用）
   *
   * 【使用场景】当服务端推送新题目时，需要清除上一题的所有状态
   */
  function resetPlayerAnswerState() {
    answerReceived.value = false
    answerResult.value = null
    buzzResult.value = null
  }

  // ============================================================================
  // 连接管理
  // ============================================================================

  /**
   * 断开 Socket 连接
   *
   * 【技术学习】断开后将 socket 设为 null，释放资源引用
   */
  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  // ============================================================================
  // 生命周期管理
  // ============================================================================

  /**
   * 【技术学习 - Vue 生命周期钩子】
   *
   * onMounted: 组件挂载到 DOM 后执行（类似 React 的 useEffect 空依赖）
   * onUnmounted: 组件从 DOM 移除前执行（类似 React 的 useEffect 返回的清理函数）
   *
   * 在 Composable 中使用生命周期钩子，可以自动管理资源的创建和释放，
   * 使用者无需手动调用 connect/disconnect。
   */
  onMounted(() => connect())
  onUnmounted(() => disconnect())

  // ============================================================================
  // 返回值
  // ============================================================================

  /**
   * 【技术学习 - Composable 的返回值约定】
   *
   * Composable 通常返回一个对象，包含：
   * 1. 响应式状态（ref/reactive）- 供模板绑定
   * 2. 操作函数 - 供事件处理调用
   *
   * 使用者通过解构获取需要的部分：
   * const { serverState, connected, pushState } = useSocket({ ... })
   *
   * 返回的对象属性说明：
   * - connected: Socket 连接状态（响应式）
   * - serverState: 游戏状态（响应式，展示页/选手页会自动更新）
   * - pushState: 推送状态变更到服务端（管理页使用）
   * - resetState: 重置游戏状态（管理页使用）
   * - registerPlayer: 选手注册（选手页使用）
   * - submitAnswer: 提交答案（选手页使用）
   * - resetPlayerAnswerState: 重置选手状态（新题目时使用）
   * - answerReceived: 答案已接收确认（响应式）
   * - answerResult: 答题结果（响应式）
   * - checkPlayerStatus: 查询选手状态（刷新后恢复）
   * - myStatus: 选手个人状态（响应式）
   * - requestSessions: 请求会话数据（管理页使用）
   * - sessionData: 会话在线数据（响应式）
   * - sendBuzz: 发送抢答（选手页使用）
   * - buzzResult: 抢答结果（响应式）
   */
  return {
    // 连接状态
    connected,
    // 游戏状态
    serverState,
    // 管理页功能
    pushState,
    resetState,
    requestSessions,
    sessionData,
    // 选手页功能
    registerPlayer,
    submitAnswer,
    resetPlayerAnswerState,
    checkPlayerStatus,
    sendBuzz,
    // 选手端响应式状态
    answerReceived,
    answerResult,
    myStatus,
    buzzResult,
  }
}
