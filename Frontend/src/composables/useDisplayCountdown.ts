/**
 * ============================================================================
 * useDisplayCountdown.ts - 展示页/选手页倒计时 Composable
 * ============================================================================
 *
 * 【技术学习 - 这个 Composable 解决什么问题？】
 *
 * 在答题系统中，倒计时需要在多个客户端（展示页、选手页）上同时显示。
 * 问题在于：每个客户端的系统时间可能不同步（偏差可达数秒），
 * 如果各自直接倒计时，不同用户看到的时间会不一致。
 *
 * 【解决方案：服务端时间校准】
 *
 * 1. 服务端发送权威时间：推送包含 serverTime（服务端当前时间）和
 *    endTime（结束时间戳）的状态数据
 *
 * 2. 客户端计算初始剩余：用 (endTime - serverTime) 得到精确的剩余时间，
 *    而不是用本地时间计算，避免了客户端时钟偏差
 *
 * 3. 本地递减：基于初始剩余时间，用本地定时器每 100ms 递减一次，
 *    保证 UI 流畅更新，同时不依赖网络同步
 *
 * 【为什么用 setInterval 而不是 requestAnimationFrame？】
 *
 * - setInterval：时间间隔相对稳定，适合倒计时等需要精确时间的场景
 * - requestAnimationFrame：与屏幕刷新率同步（通常 60fps ≈ 16.6ms），
 *   适合动画渲染，但在后台标签页会被暂停
 *
 * 倒计时需要在用户切换标签页时继续运行（或至少保持正确的剩余时间），
 * setInterval 在后台也能正常工作（虽然可能降频），更适合此场景。
 *
 * 【100ms 精度的选择】
 *
 * - 1000ms：倒计时秒数变化有明显跳跃感
 * - 16ms（60fps）：过于频繁，浪费性能
 * - 100ms：平衡点，既能流畅更新小数秒显示，又不会过度消耗资源
 *
 * ============================================================================
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import type { SyncedGameState } from './useSocket'

// ============================================================================
// Composable 主函数
// ============================================================================

/**
 * useDisplayCountdown - 展示页 / 选手页倒计时逻辑
 *
 * 【功能概述】
 * 1. 从服务端状态同步倒计时的起始参数（结束时间、是否计时中）
 * 2. 基于服务端时间校准，消除客户端时钟偏差
 * 3. 本地每 100ms 更新一次剩余时间，保证 UI 流畅
 * 4. 提供多种格式化输出（整数秒、小数秒、分秒格式）
 *
 * 【使用示例】
 * ```typescript
 * const {
 *   answerRemainingText,
 *   quickAnswerRemainingDecimal,
 *   showAnswerTimer,
 *   showQuickAnswerTimer,
 *   syncFromServer
 * } = useDisplayCountdown()
 *
 * // 监听服务端状态变化
 * watch(serverState, (newState) => {
 *   if (newState) syncFromServer(newState)
 * })
 * ```
 *
 * @returns 包含倒计时状态和格式化计算属性的对象
 */
export function useDisplayCountdown() {
  // ============================================================================
  // 响应式状态
  // ============================================================================

  /**
   * 【技术学习 - 为什么需要 endTime 和 remaining 两个变量？】
   *
   * - endTime：服务端推送的结束时间戳，用于时间校准
   * - remaining：本地计算的剩余秒数，用于 UI 展示
   *
   * 两者用途不同：
   * - endTime 在 syncFromServer 时设置，用于校准
   * - remaining 每 100ms 更新一次，驱动倒计时 UI
   */

  /** 答题结束的服务器时间戳（毫秒） */
  const answerEndTime = ref<number | null>(null)

  /** 抢答结束的服务器时间戳（毫秒） */
  const quickAnswerEndTime = ref<number | null>(null)

  /** 普通答题倒计时是否进行中 */
  const isAnswerCounting = ref(false)

  /** 抢答倒计时是否进行中 */
  const isQuickAnswerCounting = ref(false)

  /** 答题剩余秒数（整数，用于分秒格式显示） */
  const answerRemaining = ref(0)

  /** 抢答剩余秒数（整数，用于分秒格式显示） */
  const quickAnswerRemaining = ref(0)

  /**
   * 抢答倒计时精确剩余秒数（浮点数，用于小数点后两位展示）
   *
   * 【为什么需要这个变量？】
   * quickAnswerRemaining 是整数（向上取整），适合显示 "00:05" 格式。
   * 但抢答场景需要显示更精确的时间如 "5.27"，所以需要保留浮点精度。
   */
  const quickAnswerRemainingRaw = ref(0)

  // ============================================================================
  // 计算属性（computed）- 格式化显示
  // ============================================================================

  /**
   * 【技术学习 - computed 计算属性】
   *
   * computed() 创建一个响应式计算属性：
   * - 自动追踪依赖：当依赖的 ref 值变化时自动重新计算
   * - 结果缓存：依赖不变时直接返回缓存值，不重复计算
   * - 只读：不能直接赋值修改
   *
   * 这里用于将数字格式化为 UI 显示的字符串。
   */

  /** 答题剩余时间格式化为 "MM:SS" 格式（如 "02:30"） */
  const answerRemainingText = computed(() => formatTime(answerRemaining.value))

  /** 抢答剩余时间格式化为 "MM:SS" 格式 */
  const quickAnswerRemainingText = computed(() => formatTime(quickAnswerRemaining.value))

  /**
   * 抢答倒计时保留小数点后两位（如 "5.00", "3.27"）
   *
   * 【使用场景】抢答界面需要显示精确到小数点后两位的时间，
   * 给选手更直观的时间感知
   */
  const quickAnswerRemainingDecimal = computed(() => formatDecimal(quickAnswerRemainingRaw.value))

  /** 是否显示答题计时器（直接映射 isAnswerCounting 状态） */
  const showAnswerTimer = computed(() => isAnswerCounting.value)

  /** 是否显示抢答计时器（直接映射 isQuickAnswerCounting 状态） */
  const showQuickAnswerTimer = computed(() => isQuickAnswerCounting.value)

  // ============================================================================
  // 格式化函数
  // ============================================================================

  /**
   * 将秒数格式化为 "MM:SS" 格式
   *
   * 【算法说明】
   * 1. Math.floor(s / 60) - 计算分钟数（向下取整）
   * 2. s % 60 - 计算剩余秒数（取余）
   * 3. padStart(2, '0') - 不足两位前面补零（如 5 → "05"）
   *
   * @param s - 秒数（整数）
   * @returns 格式化的时间字符串，如 "02:30"
   */
  function formatTime(s: number): string {
    if (s <= 0) return '00:00'
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  /**
   * 秒数 → 保留两位小数的秒（如 5.00, 3.25）
   *
   * 【技术学习】Number.toFixed(n) 将数字格式化为 n 位小数的字符串
   * 注意：toFixed 返回的是字符串，不是数字
   *
   * @param s - 秒数（浮点数）
   * @returns 格式化的字符串，如 "5.27"
   */
  function formatDecimal(s: number): string {
    if (s <= 0) return '0.00'
    return s.toFixed(2)
  }

  // ============================================================================
  // 本地计时核心逻辑
  // ============================================================================

  /**
   * 【技术学习 - 本地计时的实现原理】
   *
   * 问题：如何在客户端实现准确的倒计时？
   *
   * 方案：记录初始剩余时间，然后用本地定时器递减
   *
   * 1. syncFromServer 时：
   *    - 用服务端时间计算初始剩余：initialRemaining = (endTime - serverTime) / 1000
   *    - 记录本地开始时间：tickStart = Date.now()
   *
   * 2. 每次 tick 时：
   *    - 计算已流逝时间：elapsed = (Date.now() - tickStart) / 1000
   *    - 当前剩余 = initialRemaining - elapsed
   *
   * 这样做的好处：
   * - 不依赖客户端系统时间的绝对值
   * - 只依赖时间间隔（Date.now() 的差值），间隔是准确的
   * - 即使客户端时钟偏差，倒计时也能正确工作
   */

  /** 初始答题剩余秒数（从服务端校准后记录） */
  let initialAnswerRemaining = 0

  /** 初始抢答剩余秒数（从服务端校准后记录） */
  let initialQuickRemaining = 0

  /**
   * 计时开始的本地时间戳（毫秒）
   *
   * 【注意】这里用 ref 而不是普通变量，是因为 tick 函数中需要访问。
   * 虽然 tickStart 不需要在模板中使用，但为了响应式系统的一致性，使用 ref。
   */
  const tickStart = ref(0)

  /**
   * 从服务端状态同步倒计时参数
   *
   * 【调用时机】
   * - 页面首次加载，收到服务端状态时
   * - 服务端状态更新（如开始新题目）时
   *
   * 【时间校准算法】
   * 1. 用服务端时间计算剩余：(endTime - serverTime) / 1000
   *    这样计算的结果不受客户端时钟偏差影响
   * 2. 记录本地时间作为计时起点
   * 3. 后续 tick 用本地时间差值递减
   *
   * @param s - 服务端同步的游戏状态
   */
  function syncFromServer(s: SyncedGameState) {
    // 同步基础状态
    answerEndTime.value = s.answerEndTime
    quickAnswerEndTime.value = s.quickAnswerEndTime
    isAnswerCounting.value = s.isAnswerCounting
    isQuickAnswerCounting.value = s.isQuickAnswerCounting

    // 普通答题计时校准
    if (s.isAnswerCounting && s.answerEndTime && s.serverTime) {
      // 【关键】用服务端时间计算剩余秒数，消除客户端时钟偏差
      initialAnswerRemaining = Math.max(0, (s.answerEndTime - s.serverTime) / 1000)
      tickStart.value = Date.now()  // 记录本地计时起点
      answerRemaining.value = Math.ceil(initialAnswerRemaining)  // 向上取整显示
    }

    // 抢答计时校准
    if (s.isQuickAnswerCounting && s.quickAnswerEndTime && s.serverTime) {
      initialQuickRemaining = Math.max(0, (s.quickAnswerEndTime - s.serverTime) / 1000)
      tickStart.value = Date.now()
      quickAnswerRemaining.value = Math.ceil(initialQuickRemaining)
      quickAnswerRemainingRaw.value = initialQuickRemaining  // 保留浮点精度
    }
  }

  // ============================================================================
  // 定时器管理
  // ============================================================================

  /**
   * setInterval 返回的定时器句柄
   *
   * 【技术学习】ReturnType<typeof setInterval> 是 TypeScript 工具类型，
   * 自动推断 setInterval 返回值的类型（在浏览器中是 number，在 Node.js 中是 Timeout 对象）
   */
  let timerHandle: ReturnType<typeof setInterval> | null = null

  /**
   * 每 100ms 执行一次的 tick 函数
   *
   * 【核心算法】
   * 1. 计算从计时开始到现在流逝的秒数
   * 2. 用初始剩余时间减去流逝时间，得到当前剩余
   * 3. 如果剩余 <= 0，停止计时
   *
   * 【为什么 Math.ceil 向上取整？】
   * 显示给用户的时间应该是"还有几秒"，即使是 0.1 秒也应该显示为 1 秒，
   * 这样用户体验更好（不会看到 "0 秒" 但倒计时还没结束）
   */
  function tick() {
    // 计算已流逝的秒数
    const elapsed = (Date.now() - tickStart.value) / 1000

    // 更新普通答题倒计时
    if (isAnswerCounting.value) {
      answerRemaining.value = Math.max(0, Math.ceil(initialAnswerRemaining - elapsed))

      // 检查是否倒计时结束
      if (initialAnswerRemaining - elapsed <= 0) {
        isAnswerCounting.value = false
        answerRemaining.value = 0
      }
    }

    // 更新抢答倒计时
    if (isQuickAnswerCounting.value) {
      const rawRemaining = Math.max(0, initialQuickRemaining - elapsed)
      quickAnswerRemaining.value = Math.ceil(rawRemaining)  // 整数显示
      quickAnswerRemainingRaw.value = rawRemaining  // 保留浮点精度

      // 检查是否倒计时结束
      if (rawRemaining <= 0) {
        isQuickAnswerCounting.value = false
        quickAnswerRemaining.value = 0
        quickAnswerRemainingRaw.value = 0
      }
    }
  }

  // ============================================================================
  // 监听器和生命周期
  // ============================================================================

  /**
   * 【技术学习 - watch 监听器】
   *
   * watch() 监听响应式数据的变化，并执行回调函数。
   *
   * 语法：watch(source, callback, options)
   * - source: 要监听的数据（可以是 ref、getter 函数、或数组）
   * - callback: 变化时执行的函数，参数为 (newValue, oldValue)
   * - options: 配置项
   *   - immediate: true 表示立即执行一次（不等待变化）
   *
   * 这里监听 isAnswerCounting || isQuickAnswerCounting：
   * - 任一倒计时开始 → 启动定时器
   * - 两个都停止 → 清除定时器
   */
  watch(
    // 监听源：两个计时状态的或运算
    () => isAnswerCounting.value || isQuickAnswerCounting.value,
    // 回调函数
    (active) => {
      if (active) {
        // 有倒计时在进行，启动定时器（如果还没启动）
        if (!timerHandle) {
          timerHandle = setInterval(tick, 100)  // 每 100ms 执行一次 tick
        }
      } else {
        // 所有倒计时都已停止，清除定时器
        if (timerHandle) {
          clearInterval(timerHandle)
          timerHandle = null
        }
      }
    },
    // 立即执行：页面加载时如果已经在计时中，立即启动定时器
    { immediate: true },
  )

  /**
   * 【技术学习 - onUnmounted 生命周期钩子】
   *
   * 组件卸载时清除定时器，防止内存泄漏。
   *
   * 【为什么这里也要清除？】
   * 虽然 watch 中已经处理了清除逻辑，但以下情况需要手动清除：
   * 1. 组件在倒计时进行中被卸载（如用户切换页面）
   * 2. 确保定时器不会在组件销毁后继续运行
   *
   * 【内存泄漏的危害】
   * 如果定时器未清除，它会：
   * 1. 持续消耗 CPU 资源
   * 2. 阻止组件被垃圾回收（因为回调函数引用了组件的数据）
   * 3. 可能导致报错（访问已销毁的组件数据）
   */
  onUnmounted(() => {
    if (timerHandle) {
      clearInterval(timerHandle)
      timerHandle = null
    }
  })

  // ============================================================================
  // 返回值
  // ============================================================================

  /**
   * 【返回值说明】
   *
   * 响应式状态：
   * - answerEndTime / quickAnswerEndTime: 结束时间戳（用于其他计算）
   * - isAnswerCounting / isQuickAnswerCounting: 计时状态（用于条件渲染）
   * - answerRemaining / quickAnswerRemaining: 剩余整数秒（用于数值显示）
   *
   * 格式化计算属性：
   * - answerRemainingText: "MM:SS" 格式（如 "02:30"）
   * - quickAnswerRemainingText: "MM:SS" 格式
   * - quickAnswerRemainingDecimal: 小数格式（如 "5.27"）
   * - showAnswerTimer / showQuickAnswerTimer: 是否显示计时器
   *
   * 方法：
   * - syncFromServer: 从服务端状态同步（外部调用）
   */
  return {
    // 时间戳状态
    answerEndTime,
    quickAnswerEndTime,
    // 计时状态
    isAnswerCounting,
    isQuickAnswerCounting,
    // 剩余秒数（原始数值）
    answerRemaining,
    quickAnswerRemaining,
    // 格式化显示（用于模板绑定）
    answerRemainingText,
    quickAnswerRemainingText,
    quickAnswerRemainingDecimal,
    // 显示控制
    showAnswerTimer,
    showQuickAnswerTimer,
    // 同步方法
    syncFromServer,
  }
}
