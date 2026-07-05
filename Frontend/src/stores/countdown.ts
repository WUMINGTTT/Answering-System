/**
 * 倒计时状态管理 Store
 *
 * 【技术学习 - Pinia 状态管理库】
 * Pinia 是 Vue 3 官方推荐的状态管理库，用于在多个组件之间共享和管理状态。
 * 相比 Vuex，Pinia 更轻量、支持 TypeScript 类型推导、并且没有 mutations 的概念。
 *
 * 【技术学习 - Setup Store 模式 vs Options Store 模式】
 * Pinia 提供两种定义 Store 的方式：
 * 1. Options Store 模式：类似 Vuex，通过 state/getters/actions 分别定义
 *    例：defineStore('id', { state: () => ({...}), getters: {...}, actions: {...} })
 * 2. Setup Store 模式（本文件使用）：使用一个函数，内部直接用 ref/reactive 定义状态，
 *    用 computed 定义计算属性，用普通函数定义方法，更接近 Vue 3 组合式 API 的写法。
 *    例：defineStore('id', () => { const count = ref(0); return { count } })
 *
 * 本模块管理两个独立的倒计时器：
 * - 答题倒计时：用于必答题/抢答题的答题时间限制（默认 30 秒）
 * - 抢答倒计时：用于抢答题阶段的抢答窗口时间（默认 10 秒）
 *
 * 【设计思路】
 * 使用"截止时间戳"的方式计算剩余时间，而不是简单地递减计数器。
 * 这样做的好处是：即使页面切换或 JS 线程短暂阻塞，回来后仍能正确计算剩余时间，
 * 不会出现"卡了几秒然后时间突然跳变"的问题。
 */

// 从 Vue 中导入 ref（响应式引用）和 computed（计算属性）
import { ref, computed } from 'vue'
// 从 Pinia 中导入 defineStore，用于定义一个 Store
import { defineStore } from 'pinia'

/**
 * 【技术学习 - defineStore 的第一个参数】
 * 'countdown' 是这个 Store 的唯一标识符（ID）。
 * 在 Vue DevTools 中会显示这个名称，用于调试。
 * 第二个参数是 Setup 函数，返回的状态和方法会暴露给组件使用。
 */
export const useCountdownStore = defineStore('countdown', () => {
  // ========================================================================
  // 状态（State）- 使用 ref() 定义响应式数据
  // 【技术学习】在 Setup Store 中，ref() 定义的变量就是 state，
  // 组件中通过 store.xxx 访问时会自动解包（不需要 .value）
  // ========================================================================

  // ---------- 时长设置（秒） ----------

  /** 答题倒计时时长（必答题 / 抢答题共用），默认 30 秒 */
  const answerDuration = ref(30)

  /** 抢答倒计时时长（仅抢答题阶段使用），默认 10 秒 */
  const quickAnswerDuration = ref(10)

  // ---------- 倒计时截止时间戳（毫秒） ----------

  /**
   * 【技术学习 - 截止时间戳设计】
   * 不用"剩余秒数递减"的方式，而是存储一个未来的"截止时刻"。
   * 剩余时间 = 截止时间戳 - 当前时间戳，这样即使 JS 被阻塞也不会丢失时间。
   *
   * answerEndTime: 答题倒计时的截止时间戳（Date.now() + 时长*1000）
   * null 表示倒计时未开始或已结束
   */
  const answerEndTime = ref<number | null>(null)

  /** 抢答倒计时的截止时间戳，null 表示未开始或已结束 */
  const quickAnswerEndTime = ref<number | null>(null)

  // ---------- 是否正在倒计时的标志位 ----------

  /** 答题倒计时是否正在进行 */
  const isAnswerCounting = ref(false)

  /** 抢答倒计时是否正在进行 */
  const isQuickAnswerCounting = ref(false)

  // ---------- 当前剩余秒数 ----------

  /**
   * 【技术学习 - 为什么需要单独的剩余秒数变量？】
   * 虽然可以通过 endTime - Date.now() 实时计算，但那样不会触发 Vue 的响应式更新。
   * 所以我们用一个 ref 变量存储剩余秒数，由外部定时器（如 setInterval）周期性调用
   * tick() 方法来更新它，从而触发视图重新渲染。
   */
  const answerRemaining = ref(0)
  const quickAnswerRemaining = ref(0)

  // ========================================================================
  // 计算属性（Computed）- 使用 computed() 定义派生数据
  // 【技术学习】computed 会根据依赖自动缓存和更新，依赖不变时不会重新计算
  // ========================================================================

  /** 将答题剩余秒数格式化为 "MM:SS" 格式的文本 */
  const answerRemainingText = computed(() => formatRemaining(answerRemaining.value))

  /** 将抢答剩余秒数格式化为 "MM:SS" 格式的文本 */
  const quickAnswerRemainingText = computed(() => formatRemaining(quickAnswerRemaining.value))

  /**
   * 将秒数格式化为 "MM:SS" 字符串
   * 【技术学习 - 时间格式化技巧】
   * - Math.floor(seconds / 60) 取整得到分钟数
   * - seconds % 60 取余得到剩余秒数
   * - String(n).padStart(2, '0') 将数字补零为两位字符串（如 5 → "05"）
   *
   * @param seconds 剩余总秒数
   * @returns 格式化后的时间字符串，如 "02:30"
   */
  function formatRemaining(seconds: number): string {
    if (seconds <= 0) return '00:00'
    const m = Math.floor(seconds / 60)   // 分钟部分
    const s = seconds % 60               // 秒数部分
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ========================================================================
  // 操作方法（Actions）- 普通函数，用于修改状态
  // 【技术学习】在 Setup Store 中，普通函数就是 action，可以直接修改 ref 的值
  // ========================================================================

  /** 设置答题倒计时时长，最少 1 秒 */
  function setAnswerDuration(seconds: number) {
    // Math.max(1, seconds) 确保时长至少为 1 秒，防止设置为 0 或负数
    answerDuration.value = Math.max(1, seconds)
  }

  /** 设置抢答倒计时时长，最少 1 秒 */
  function setQuickAnswerDuration(seconds: number) {
    quickAnswerDuration.value = Math.max(1, seconds)
  }

  /**
   * 开始答题倒计时
   * 【技术学习 - 计算截止时间】
   * Date.now() 返回当前时间的毫秒数，加上时长*1000（秒转毫秒）得到截止时间戳。
   * 同时设置剩余秒数为完整时长，并将标志位置为 true。
   */
  function startAnswerCountdown() {
    answerEndTime.value = Date.now() + answerDuration.value * 1000  // 计算截止时间
    answerRemaining.value = answerDuration.value                     // 初始化剩余时间
    isAnswerCounting.value = true                                    // 标记为正在计时
  }

  /** 开始抢答倒计时，逻辑同上 */
  function startQuickAnswerCountdown() {
    quickAnswerEndTime.value = Date.now() + quickAnswerDuration.value * 1000
    quickAnswerRemaining.value = quickAnswerDuration.value
    isQuickAnswerCounting.value = true
  }

  /**
   * 停止答题倒计时
   * 清除截止时间戳、重置剩余时间为 0、标记为未计时状态
   */
  function stopAnswerCountdown() {
    isAnswerCounting.value = false    // 停止计时标志
    answerEndTime.value = null         // 清除截止时间
    answerRemaining.value = 0          // 重置剩余时间
  }

  /** 停止抢答倒计时，逻辑同上 */
  function stopQuickAnswerCountdown() {
    isQuickAnswerCounting.value = false
    quickAnswerEndTime.value = null
    quickAnswerRemaining.value = 0
  }

  /** 重置所有倒计时（同时停止答题和抢答倒计时） */
  function resetAll() {
    stopAnswerCountdown()
    stopQuickAnswerCountdown()
  }

  /**
   * 心跳更新方法 - 由外部定时器（如 setInterval）周期性调用
   *
   * 【技术学习 - tick 模式】
   * 这是一种常见的"游戏循环"设计模式：
   * 1. 外部设置一个 setInterval(timer.tick, 1000) 每秒调用一次 tick()
   * 2. tick() 内部根据当前时间与截止时间的差值，计算剩余秒数
   * 3. 更新 ref 变量 → 触发 Vue 响应式系统 → 视图自动更新
   *
   * 【技术学习 - 时间计算】
   * - Date.now() 获取当前时间戳（毫秒）
   * - (endTime - now) / 1000 将毫秒差转换为秒
   * - Math.ceil() 向上取整，确保即使只剩 0.1 秒也显示为 1 秒
   * - Math.max(0, ...) 确保不会出现负数
   *
   * 【技术学习 - 自动停止】
   * 当剩余时间 <= 0 时，自动调用 stop 方法停止倒计时，
   * 避免定时器持续运行浪费资源。
   */
  function tick() {
    const now = Date.now()

    // 更新答题倒计时
    if (isAnswerCounting.value && answerEndTime.value) {
      const remaining = Math.max(0, Math.ceil((answerEndTime.value - now) / 1000))
      answerRemaining.value = remaining
      if (remaining <= 0) {
        stopAnswerCountdown()  // 时间到了，自动停止
      }
    }

    // 更新抢答倒计时（两个计时器独立运行，互不影响）
    if (isQuickAnswerCounting.value && quickAnswerEndTime.value) {
      const remaining = Math.max(0, Math.ceil((quickAnswerEndTime.value - now) / 1000))
      quickAnswerRemaining.value = remaining
      if (remaining <= 0) {
        stopQuickAnswerCountdown()  // 时间到了，自动停止
      }
    }
  }

  // ========================================================================
  // 返回值 - 暴露给外部使用的状态和方法
  // 【技术学习】Setup Store 必须 return 一个对象，里面包含所有需要暴露的
  // state、computed 和 actions。未 return 的变量是 Store 的私有变量。
  // ========================================================================
  return {
    // State（响应式状态）
    answerDuration,            // 答题时长设置
    quickAnswerDuration,       // 抢答时长设置
    answerEndTime,             // 答题截止时间戳
    quickAnswerEndTime,        // 抢答截止时间戳
    isAnswerCounting,          // 答题是否在计时
    isQuickAnswerCounting,     // 抢答是否在计时
    answerRemaining,           // 答题剩余秒数
    quickAnswerRemaining,      // 抢答剩余秒数
    // Computed（计算属性）
    answerRemainingText,       // 答题剩余时间格式化文本
    quickAnswerRemainingText,  // 抢答剩余时间格式化文本
    // Actions（操作方法）
    setAnswerDuration,         // 设置答题时长
    setQuickAnswerDuration,    // 设置抢答时长
    startAnswerCountdown,      // 开始答题倒计时
    startQuickAnswerCountdown, // 开始抢答倒计时
    stopAnswerCountdown,       // 停止答题倒计时
    stopQuickAnswerCountdown,  // 停止抢答倒计时
    resetAll,                  // 重置所有倒计时
    tick,                      // 心跳更新（由外部定时器调用）
  }
})
