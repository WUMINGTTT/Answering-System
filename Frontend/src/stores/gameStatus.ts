/**
 * 游戏状态管理 Store
 *
 * 【技术学习 - 状态机设计模式】
 * 本模块实现了一个简单的"有限状态机"（Finite State Machine, FSM）。
 * 状态机是一种编程模型，系统在任意时刻只能处于一个确定的状态，
 * 并根据事件在状态之间进行转换。
 *
 * 本项目的游戏状态流转如下：
 *   waiting（等待中）
 *     ↓ 开始比赛
 *   required（必答题阶段）
 *     ↓ 进入下一阶段
 *   quick-answer（抢答题阶段）
 *     ↓ 进入下一阶段
 *   risk（风险题阶段）
 *     ↓ 比赛结束
 *   ranking（展示排名）
 *
 * 【技术学习 - 常量映射表的好处】
 * STATUS_LABELS 和 STATUS_COLORS 将状态枚举映射为中文标签和颜色值，
 * 这样在模板中直接使用 store.statusLabel 和 store.statusColor 即可，
 * 避免在组件中写大量的 if/else 或 switch 语句。
 */

// 从 Vue 中导入 ref 和 computed
import { ref, computed } from 'vue'
// 从 Pinia 中导入 defineStore
import { defineStore } from 'pinia'
// 导入题目类型定义（TypeScript 的类型导入，不会包含在打包产物中）
import type { Question } from '@/types/question'

/**
 * 比赛题目阶段数组（不包含 waiting 和 ranking）
 *
 * 【技术学习 - as const 断言】
 * 'as const' 让 TypeScript 将数组推导为只读的元组类型（tuple），
 * 而不是宽泛的 string[]。这样 QUESTION_PHASES 的类型是
 * readonly ['required', 'quick-answer', 'risk']，
 * 可以用于精确的类型检查。
 *
 * 用途：遍历比赛阶段、判断当前是否处于某个阶段等。
 */
export const QUESTION_PHASES = ['required', 'quick-answer', 'risk'] as const

/**
 * 游戏状态类型（联合类型）
 *
 * 【技术学习 - TypeScript 联合类型】
 * 用 '|' 将多个字符串字面量组合成一个类型，
 * 变量只能取这几个值之一，赋其他值会报类型错误。
 */
export type GameStatus = 'waiting' | 'required' | 'quick-answer' | 'risk' | 'ranking'

/**
 * 状态中文标签映射表
 *
 * 【技术学习 - Record 工具类型】
 * Record<GameStatus, string> 表示"键是 GameStatus 类型，值是 string 类型"的对象。
 * 这是一种映射类型，确保对象必须包含 GameStatus 中所有键，不能遗漏。
 *
 * 用途：在 UI 中显示当前阶段的中文名称，如 store.statusLabel → "必答题"
 */
export const STATUS_LABELS: Record<GameStatus, string> = {
  waiting: '等待中',       // 灰色 - 比赛尚未开始
  required: '必答题',      // 蓝色 - 必答题阶段
  'quick-answer': '抢答题', // 黄色 - 抢答题阶段
  risk: '风险题',          // 红色 - 风险题阶段
  ranking: '展示排名',     // 绿色 - 展示最终排名
}

/**
 * 状态对应的主题色映射表
 *
 * 【技术学习 - 设计系统中的颜色常量】
 * 将颜色值集中管理，修改时只需改一处，所有使用的地方自动更新。
 * 这些颜色值与 Element Plus 组件库的主题色保持一致：
 * #409eff（Primary 蓝）、#e6a23c（Warning 黄）、#f56c6c（Danger 红）、
 * #67c23a（Success 绿）、#909399（Info 灰）
 */
export const STATUS_COLORS: Record<GameStatus, string> = {
  waiting: '#909399',      // 灰色
  required: '#409eff',     // 蓝色
  'quick-answer': '#e6a23c', // 黄色
  risk: '#f56c6c',         // 红色
  ranking: '#67c23a',      // 绿色
}

/**
 * 游戏状态 Store
 *
 * 管理比赛的整体状态、当前题目、答案显示等。
 * 使用 Setup Store 模式（Pinia 的组合式 API 写法）。
 */
export const useGameStatusStore = defineStore('gameStatus', () => {
  // ========================================================================
  // State（响应式状态）
  // ========================================================================

  /**
   * 当前游戏状态，默认为 'waiting'（等待中）
   * 【技术学习】泛型 ref<GameStatus> 限制了只能赋值 GameStatus 类型的值
   */
  const status = ref<GameStatus>('waiting')

  /**
   * 当前正在展示的题目对象，null 表示没有选中任何题目
   * 【技术学习】Question 是从 @/types/question 导入的类型接口
   */
  const currentQuestion = ref<Question | null>(null)

  /**
   * 当前风险题的代号（如 "A5"、"C13"）
   * 仅在风险题阶段使用，其他阶段为 null
   */
  const currentRiskCode = ref<string | null>(null)

  /**
   * 控制展示页是否显示答案
   * 由管理员手动控制，切换题目时会自动隐藏
   */
  const showAnswer = ref(false)

  // ========================================================================
  // Computed（计算属性）
  // ========================================================================

  /**
   * 当前状态的中文标签
   * 【技术学习】当 status 变化时，statusLabel 会自动重新计算
   * 例如 status 为 'required' 时，statusLabel 为 '必答题'
   */
  const statusLabel = computed(() => STATUS_LABELS[status.value])

  /** 当前状态对应的主题色 */
  const statusColor = computed(() => STATUS_COLORS[status.value])

  /**
   * 比赛是否处于"活跃进行中"状态
   * 【技术学习】排除了等待中和排名展示两个"非比赛"状态
   * 用途：控制某些 UI 元素（如计时器）仅在比赛进行中显示
   */
  const isActive = computed(() => status.value !== 'waiting' && status.value !== 'ranking')

  // ========================================================================
  // Actions（操作方法）
  // ========================================================================

  /**
   * 设置游戏状态
   *
   * 【技术学习 - 状态转换时的副作用处理】
   * 切换到新的阶段时，自动清除当前题目（因为不同阶段题目不同）。
   * 这是一种"防御性编程"——防止旧阶段的题目残留在新阶段中。
   *
   * @param s 新的游戏状态
   */
  function setStatus(s: GameStatus) {
    status.value = s
    currentQuestion.value = null  // 切换阶段时自动清除当前题目
  }

  /**
   * 设置当前正在展示的题目
   *
   * @param q 题目对象，null 表示清除选中
   * @param riskCode 可选的风险题代号，仅风险题阶段使用
   *
   * 【技术学习 - 可选参数】
   * riskCode 后面的 '?' 表示这是可选参数，调用时可以不传。
   * 不传时 riskCode 为 undefined，赋值时会自动转为 null。
   */
  function setCurrentQuestion(q: Question | null, riskCode?: string) {
    currentQuestion.value = q
    currentRiskCode.value = riskCode || null  // 如果没传或为空字符串，设为 null
    showAnswer.value = false                   // 切换题目时自动隐藏答案
  }

  /**
   * 设置是否显示答案
   *
   * 【技术学习】这是管理员控制的功能——在展示页上决定是否显示正确答案。
   * 切换题目时会自动调用 setShowAnswer(false) 隐藏答案。
   */
  function setShowAnswer(v: boolean) {
    showAnswer.value = v
  }

  // ========================================================================
  // 返回暴露的状态和方法
  // ========================================================================
  return {
    // State
    status,              // 当前游戏状态
    currentQuestion,     // 当前题目
    currentRiskCode,     // 风险题代号
    showAnswer,          // 是否显示答案
    // Computed
    statusLabel,         // 状态中文标签
    statusColor,         // 状态主题色
    isActive,            // 是否处于活跃比赛状态
    // Actions
    setStatus,           // 设置游戏状态
    setCurrentQuestion,  // 设置当前题目
    setShowAnswer,       // 设置答案显示
  }
})
