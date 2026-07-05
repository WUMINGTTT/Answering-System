<!--
  ============================================
  ThemeToggle.vue — 主题切换组件
  ============================================
  【组件功能】
  提供深色/浅色主题的切换按钮，点击后在两种主题之间切换。
  常用于导航栏或侧边栏底部，让用户自由选择界面风格。

  【技术学习 — 组件设计思路】
  1. 状态管理：主题状态存放在 Pinia Store（theme store）中，
     所有组件共享同一个状态源，保证全局主题一致。
  2. Props 传参：通过 collapsed 控制是否显示文字标签，
     适配侧边栏"折叠/展开"两种状态。
  3. 条件渲染图标：使用 Vue 的动态 <component :is="..."> 语法，
     根据 isDark 状态切换显示"太阳"或"月亮"图标。
  4. Tooltip 提示：用 el-tooltip 提供悬浮提示，告知用户点击后的效果。
-->

<script setup lang="ts">
// 【技术学习】从 Element Plus 图标库导入太阳和月亮图标
// Sunny 用于深色模式（提示切换到浅色），Moon 用于浅色模式（提示切换到深色）
import { Sunny, Moon } from '@element-plus/icons-vue'

// 【技术学习】导入自定义的 Pinia 主题 Store
// useThemeStore 内部维护 isDark 状态和 toggle() 切换方法
import { useThemeStore } from '@/stores/theme'

// 【技术学习 — defineProps】
// 定义组件接收的 Props，使用 TypeScript 泛型语法
// collapsed?: 表示可选的布尔值 prop，当侧边栏折叠时为 true
// 用途：折叠状态下只显示图标，不显示文字标签
defineProps<{
  collapsed?: boolean
}>()

// 【技术学习】获取 theme store 实例
// 在 <script setup> 中直接调用即可，Vue 会在模板和方法中保持响应性
const theme = useThemeStore()
</script>

<template>
  <!--
    【技术学习 — el-tooltip】
    Element Plus 的工具提示组件，鼠标悬浮时显示提示文字。
    :content 绑定动态内容：深色模式时显示"切换浅色模式"，反之亦然。
    placement="top" 表示提示出现在按钮上方。
  -->
  <el-tooltip :content="theme.isDark ? '切换浅色模式' : '切换深色模式'" placement="top">
    <!--
      【技术学习 — 点击事件】
      @click="theme.toggle()" 点击时调用 store 的 toggle 方法切换主题。
      store 内部会翻转 isDark 的值，并同步更新 <body> 的 class 和 localStorage。
    -->
    <div class="theme-toggle" @click="theme.toggle()">
      <!--
        【技术学习 — 动态组件渲染】
        <component :is="..."> 是 Vue 的内置组件，可以动态渲染任意组件。
        根据 theme.isDark 的值，决定渲染 Sunny（太阳）还是 Moon（月亮）图标。
        这种写法比 v-if/v-else 更简洁，适合"二选一"的图标切换场景。
      -->
      <el-icon :size="18">
        <component :is="theme.isDark ? Sunny : Moon" />
      </el-icon>

      <!--
        【技术学习 — v-if 条件渲染】
        当 collapsed 为 true（侧边栏折叠）时，不渲染文字标签。
        collapsed 为 false 或 undefined 时，显示"浅色模式"或"深色模式"文字。
      -->
      <span v-if="!collapsed" class="toggle-label">
        {{ theme.isDark ? '浅色模式' : '深色模式' }}
      </span>
    </div>
  </el-tooltip>
</template>

<style scoped>
/*
  【技术学习 — CSS 样式说明】
  scoped 表示样式只作用于当前组件，不会影响其他组件的同名 class。
  这是 Vue SFC 的重要特性，避免样式污染。
*/

/* 主题切换按钮的容器样式 */
.theme-toggle {
  display: inline-flex;       /* 行内弹性布局，图标和文字水平排列 */
  align-items: center;        /* 垂直居中对齐 */
  justify-content: center;    /* 水平居中对齐 */
  gap: 8px;                   /* 图标和文字之间的间距 */
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;         /* 圆角 */
  background: transparent;    /* 默认透明背景 */
  cursor: pointer;            /* 鼠标悬浮时显示手型 */
  color: var(--text-secondary); /* 使用 CSS 变量，适配深色/浅色主题 */
  transition: all 0.2s ease;  /* 过渡动画，悬浮时平滑变化 */
  white-space: nowrap;        /* 文字不换行 */
}

/* 鼠标悬浮时的高亮效果 */
.theme-toggle:hover {
  background: var(--bg-hover);     /* 悬浮时显示半透明背景 */
  color: var(--color-primary);     /* 文字变为主题色 */
}

/* 文字标签样式 */
.toggle-label {
  font-size: 13px;
  user-select: none;  /* 禁止选中文字，防止误操作时选中文字 */
}
</style>
