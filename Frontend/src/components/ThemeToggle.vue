<script setup lang="ts">
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <el-tooltip :content="theme.isDark ? '切换浅色模式' : '切换深色模式'" placement="right">
    <div class="theme-toggle" @click="theme.toggle()">
      <el-icon :size="20">
        <component :is="theme.isDark ? Sunny : Moon" />
      </el-icon>
    </div>
  </el-tooltip>
</template>

<style scoped>
.theme-toggle {
  position: fixed;
  bottom: 32px;
  left: 32px;
  z-index: 1000;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-card);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-regular);
  border: 1px solid var(--border-base);
}

.theme-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 深色模式阴影加深 */
:global(.dark) .theme-toggle {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

:global(.dark) .theme-toggle:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
</style>
