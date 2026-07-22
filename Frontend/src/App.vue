/**
 * 【技术学习】根组件 App.vue
 *
 * 这是 Vue 应用的根组件，所有其他页面组件都是它的子组件。
 * 它的主要职责是：
 * 1. 提供路由出口 RouterView，让不同的页面组件在这里渲染
 * 2. 定义全局的 CSS 变量，建立主题系统
 * 3. 提供全局样式重置
 */

<!-- ==================== 脚本部分 ==================== -->
<script setup lang="ts">
/**
 * 【技术学习】<script setup> 是 Vue 3 的组合式 API 语法糖
 * - 不需要手动 export default
 * - 所有顶层变量和函数都自动暴露给模板使用
 * - 更简洁，性能更好
 */

// 导入 RouterView 组件
// 【技术学习】RouterView 是 Vue Router 提供的内置组件
// 它是一个"路由出口"，根据当前 URL 显示对应的页面组件
import { RouterView } from 'vue-router'
</script>

<!-- ==================== 模板部分 ==================== -->
<template>
  <!--
    【技术学习】RouterView 是路由系统的核心
    当用户访问不同的 URL 时，Vue Router 会根据路由配置
    将对应的页面组件渲染到这个位置

    例如：
    - 访问 / → 渲染 HomeView
    - 访问 /login → 渲染 LoginView
    - 访问 /display → 渲染 DisplayView
  -->
  <RouterView />
</template>

<!-- ==================== 全局样式部分 ==================== -->
<!--
  【技术学习】注意这里没有 scoped 属性！
  没有 scoped 的样式会应用到整个应用的所有组件
  这里定义的主题变量和全局样式需要被所有组件共享
-->

<style>
/* ========== CSS 变量定义（浅色/默认主题） ========== */

/*
 * 【技术学习】CSS 变量（也叫 CSS 自定义属性）
 *
 * :root 选择器表示文档根元素（即 <html> 标签）
 * 在这里定义的变量可以在整个应用的任何 CSS 中使用
 *
 * 使用方式：
 *   background: var(--bg-page);
 *   color: var(--text-primary);
 *
 * 优点：
 * 1. 集中管理颜色和样式值
 * 2. 可以通过 JavaScript 动态修改
 * 3. 轻松实现主题切换功能
 */
:root {
  /* 页面背景色 - 整个页面的底色 */
  --bg-page: #f0f2f5;

  /* 卡片背景色 - 卡片、面板等容器的背景 */
  --bg-card: #fff;

  /* 侧边栏背景色 */
  --bg-sidebar: #fff;

  /* 鼠标悬停时的背景色 */
  --bg-hover: #f5f7fa;

  /* 激活状态的背景色（如选中的菜单项） */
  --bg-active: #ecf5ff;

  /* 默认边框颜色 */
  --border-base: #ebeef5;

  /* 浅色边框（用于分割线等） */
  --border-light: #f2f3f5;

  /* 主要文字颜色（标题、重要内容） */
  --text-primary: #303133;

  /* 常规文字颜色（正文内容） */
  --text-regular: #606266;

  /* 次要文字颜色（说明文字、时间戳等） */
  --text-secondary: #909399;

  /* 占位符文字颜色（输入框提示文字） */
  --text-placeholder: #c0c4cc;

  /* 主题色（按钮、链接等强调元素） */
  --color-primary: #409eff;

  /* 卡片阴影效果 */
  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* ========== 防闪烁类 ========== */

/*
 * 【技术学习】no-transition 类用于主题切换时防止闪烁
 *
 * 问题：切换主题时，不同的元素可能有不同的过渡时间
 * 导致颜色变化不同步，出现闪烁现象
 *
 * 解决方案：在切换主题时临时添加 no-transition 类
 * 禁用所有过渡和动画效果，切换完成后再移除
 *
 * 使用方式（在 JavaScript 中）：
 *   document.documentElement.classList.add('no-transition')
 *   // ... 切换主题 ...
 *   document.documentElement.classList.remove('no-transition')
 */
html.no-transition,
html.no-transition *,
html.no-transition *::before,
html.no-transition *::after {
  /* !important 确保优先级最高，覆盖所有其他过渡设置 */
  transition: none !important;
  animation: none !important;
}

/* ========== 全局样式重置 ========== */

/*
 * 【技术学习】body 样式重置
 *
 * 浏览器默认会给 body 添加 margin，这里需要重置为 0
 * 同时设置背景色和文字颜色，使用之前定义的 CSS 变量
 *
 * transition 属性让主题切换时背景和文字颜色有平滑的过渡效果
 */
body {
  margin: 0;  /* 移除浏览器默认的外边距 */
  background: var(--bg-page);  /* 使用 CSS 变量设置背景色 */
  color: var(--text-primary);  /* 使用 CSS 变量设置文字颜色 */
  transition: background-color 0.3s ease, color 0.3s ease;  /* 主题切换过渡动画 */
}
</style>
