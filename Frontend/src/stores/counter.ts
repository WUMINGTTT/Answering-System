/**
 * 计数器 Store（脚手架模板文件）
 *
 * 【技术学习 - 这是什么？】
 * 这是 Pinia 的示例/模板文件，通常由项目脚手架（如 create-vue）自动生成。
 * 它展示了 Pinia Store 的最基本写法，可以作为学习参考或删除。
 *
 * 【技术学习 - Setup Store 模式的基本结构】
 * 一个最简单的 Setup Store 包含三部分：
 * 1. State（状态）：用 ref() 定义响应式数据
 * 2. Getters（计算属性）：用 computed() 定义派生数据
 * 3. Actions（操作方法）：用普通函数修改状态
 *
 * 使用方式：在组件中通过 const store = useCounterStore() 获取 Store 实例，
 * 然后通过 store.count、store.doubleCount、store.increment 访问。
 */

// 从 Vue 中导入 ref（响应式引用）和 computed（计算属性）
import { ref, computed } from 'vue'
// 从 Pinia 中导入 defineStore，用于定义一个 Store
import { defineStore } from 'pinia'

/**
 * 定义计数器 Store
 *
 * 【技术学习 - defineStore 参数说明】
 * 第一个参数 'counter'：Store 的唯一标识符（ID），在 DevTools 中显示
 * 第二个参数：Setup 函数，返回一个包含 state、computed、actions 的对象
 *
 * 导出的 useCounterStore 是一个组合式函数（Composable），
 * 命名约定以 "use" 开头，这是 Vue 社区的惯例。
 */
export const useCounterStore = defineStore('counter', () => {
  // ---- State（状态） ----
  // 【技术学习】ref() 创建一个响应式引用，初始值为 0
  // 在组件中通过 store.count 访问时会自动解包，不需要写 .value
  const count = ref(0)

  // ---- Getters（计算属性） ----
  // 【技术学习】computed() 创建一个计算属性，当 count 变化时自动重新计算
  // 它是只读的、有缓存的——只有依赖变化时才会重新计算
  const doubleCount = computed(() => count.value * 2)

  // ---- Actions（操作方法） ----
  // 【技术学习】普通函数就是 action，用于修改 state
  // 直接通过 .value 修改 ref 的值，不需要像 Vuex 那样通过 mutations
  function increment() {
    count.value++
  }

  // 【技术学习】return 中暴露的属性和方法才能在组件中使用
  // 未暴露的变量是 Store 的"私有"变量，外部无法访问
  return { count, doubleCount, increment }
})
