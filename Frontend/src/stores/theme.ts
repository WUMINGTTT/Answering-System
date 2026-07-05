/**
 * 主题切换状态管理 Store
 *
 * 【技术学习 - 深色/浅色主题切换的实现思路】
 * 主题切换的核心是：维护一个 isDark 响应式状态，当它变化时：
 * 1. 持久化到 localStorage，下次打开页面时读取用户偏好
 * 2. 在 DOM 的 <html> 元素上添加/移除 'dark' class
 * 3. CSS 通过 .dark 选择器切换颜色变量（如 --bg-color、--text-color）
 *
 * 【技术学习 - localStorage 持久化】
 * localStorage 是浏览器提供的键值对存储，数据不会因页面刷新而丢失。
 * 它是同步 API，只能存储字符串，所以布尔值需要转换（'dark'/'light'）。
 *
 * 【技术学习 - 系统主题偏好检测】
 * window.matchMedia('(prefers-color-scheme: dark)') 可以检测用户操作系统的
 * 主题设置。如果用户没有手动选择过主题，就跟随系统偏好，提供更好的默认体验。
 */

// 从 Vue 中导入 ref（响应式引用）和 watch（侦听器）
import { ref, watch } from 'vue'
// 从 Pinia 中导入 defineStore
import { defineStore } from 'pinia'

/**
 * localStorage 的存储键名
 *
 * 【技术学习 - 常量提取】
 * 将字符串键名定义为常量，避免魔法字符串（magic string）散布在代码中。
 * 如果需要修改键名，只需改这一处即可。
 */
const STORAGE_KEY = 'app-theme'

/**
 * 获取初始主题状态（读取 localStorage 或跟随系统偏好）
 *
 * 【技术学习 - 初始化策略（优先级从高到低）】
 * 1. 读取 localStorage 中保存的用户偏好（用户手动选择过的）
 * 2. 检测操作系统的主题偏好（prefers-color-scheme）
 * 3. 默认为浅色模式（false）
 *
 * 【技术学习 - try/catch 容错】
 * localStorage 在某些情况下可能抛出异常（如隐私模式、存储被禁用），
 * 用 try/catch 包裹可以确保即使存储不可用，程序也不会崩溃。
 *
 * @returns true 表示深色模式，false 表示浅色模式
 */
function getInitial(): boolean {
  try {
    // 尝试从 localStorage 读取之前保存的主题偏好
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored === 'dark'  // 'dark' → true, 'light' → false
  } catch {
    // localStorage 不可用时静默忽略（如隐私模式）
  }

  // 没有保存的偏好时，跟随操作系统的主题设置
  // 【技术学习 - 可选链操作符 ?.】
  // window.matchMedia 可能不存在（极少数环境），?. 防止报错
  // ?? 是空值合并运算符，左侧为 null/undefined 时使用右侧的默认值
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/**
 * 主题 Store
 *
 * 管理深色/浅色主题的切换、持久化和 DOM 应用。
 */
export const useThemeStore = defineStore('theme', () => {
  // ========================================================================
  // State
  // ========================================================================

  /**
   * 是否为深色模式
   * 初始化时调用 getInitial() 读取存储值或系统偏好
   */
  const isDark = ref(getInitial())

  // ========================================================================
  // Watch（侦听器）- 监听状态变化并执行副作用
  // ========================================================================

  /**
   * 【技术学习 - watch 侦听器】
   * watch(source, callback) 会在 source 发生变化时执行 callback。
   * 这里监听 isDark 的变化，每次切换主题时将偏好保存到 localStorage。
   *
   * 【技术学习 - 为什么不在 toggle() 里保存？】
   * 因为 isDark 可能通过多种方式改变（不仅是 toggle 函数），
   * 用 watch 可以确保无论通过什么方式改变都能自动持久化，
   * 这是"单一数据源"和"响应式编程"的最佳实践。
   */
  watch(isDark, (val) => {
    try {
      // 将布尔值转为字符串后存储
      localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
    } catch {
      // 存储失败时静默忽略
    }
  })

  // ========================================================================
  // Actions
  // ========================================================================

  /**
   * 切换主题（深色 ↔ 浅色）
   *
   * 【技术学习 - no-transition 防闪烁技巧】
   * 问题：切换主题时，页面上几十个元素同时变化颜色，
   * 如果每个元素都有 CSS transition，它们的变化时间会有微小差异，
   * 导致页面出现短暂的"闪烁"或"错位"现象。
   *
   * 解决方案：
   * 1. 先给 <html> 添加 'no-transition' class（该 class 会禁用所有过渡动画）
   * 2. 切换 isDark（此时颜色瞬间变化，没有过渡动画，所以不会闪烁）
   * 3. 在下一帧移除 'no-transition' class（恢复正常的过渡动画）
   *
   * 【技术学习 - 为什么用两次 requestAnimationFrame？】
   * requestAnimationFrame 会在浏览器下一次重绘前执行回调。
   * 用两次嵌套是为了确保：
   * - 第一次 rAF：浏览器已经应用了 no-transition 和新的颜色
   * - 第二次 rAF：浏览器已经完成了渲染，此时移除 no-transition 是安全的
   * 这比 setTimeout 更可靠，因为它与浏览器的渲染周期同步。
   *
   * 【技术学习 - document.documentElement】
   * 指向 <html> 元素。classList.add/remove 用于添加/移除 CSS class。
   * 对应的 CSS 中需要定义：
   * .no-transition, .no-transition *, .no-transition *::before, .no-transition *::after {
   *   transition: none !important;
   * }
   */
  function toggle() {
    const html = document.documentElement

    // 第一步：禁用所有过渡动画
    html.classList.add('no-transition')

    // 第二步：切换深色模式状态（瞬间生效，无动画）
    isDark.value = !isDark.value

    // 第三步：在下一帧恢复过渡动画
    // 【技术学习 - 双重 rAF 确保 DOM 已更新完毕】
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.classList.remove('no-transition')
      })
    })
  }

  // 暴露状态和方法
  return {
    isDark,  // 是否深色模式
    toggle,  // 切换主题
  }
})
