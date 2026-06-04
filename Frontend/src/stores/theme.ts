import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'app-theme'

function getInitial(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored === 'dark'
  } catch {}
  // 跟随系统偏好
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(getInitial())

  // 持久化偏好到 localStorage，不在全局应用主题
  watch(isDark, (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
    } catch {}
  })

  function toggle() {
    // 切换时禁用所有过渡动画，避免组件颜色变化不同步
    const html = document.documentElement
    html.classList.add('no-transition')
    isDark.value = !isDark.value
    // 在下一帧恢复过渡，确保颜色已同步
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.classList.remove('no-transition')
      })
    })
  }

  return { isDark, toggle }
})
