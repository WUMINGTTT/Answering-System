<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<!-- 全局主题样式（非 scoped） -->
<style>
/* ========== 浅色（默认） ========== */
:root {
  --bg-page: #f0f2f5;
  --bg-card: #fff;
  --bg-sidebar: #fff;
  --bg-hover: #f5f7fa;
  --bg-active: #ecf5ff;
  --border-base: #ebeef5;
  --border-light: #f2f3f5;
  --text-primary: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --text-placeholder: #c0c4cc;
  --color-primary: #409eff;
  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* 主题切换时禁用过渡，避免组件颜色不同步 */
html.no-transition,
html.no-transition *,
html.no-transition *::before,
html.no-transition *::after {
  transition: none !important;
  animation: none !important;
}

body {
  margin: 0;
  background: var(--bg-page);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
