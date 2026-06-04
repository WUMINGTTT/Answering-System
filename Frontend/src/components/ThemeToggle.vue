<script setup lang="ts">
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'

defineProps<{
  collapsed?: boolean
}>()

const theme = useThemeStore()
</script>

<template>
  <el-tooltip :content="theme.isDark ? '切换浅色模式' : '切换深色模式'" placement="top">
    <div class="theme-toggle" @click="theme.toggle()">
      <el-icon :size="18">
        <component :is="theme.isDark ? Sunny : Moon" />
      </el-icon>
      <span v-if="!collapsed" class="toggle-label">
        {{ theme.isDark ? '浅色模式' : '深色模式' }}
      </span>
    </div>
  </el-tooltip>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--color-primary);
}

.toggle-label {
  font-size: 13px;
  user-select: none;
}
</style>
