<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, User, Document, Fold, Expand, Connection } from '@element-plus/icons-vue'
import UserManagement from '@/components/adminView/UserManagement.vue'
import QuestionManagement from '@/components/adminView/QuestionManagement.vue'
import DashboardPanel from '@/components/adminView/DashboardPanel.vue'
import SessionManager from '@/components/adminView/SessionManager.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const theme = useThemeStore()

const activeMenu = ref((route.query.tab as string) || 'dashboard')
const isCollapse = ref(false)

function toggleCollapse() {
  isCollapse.value = !isCollapse.value
}

watch(activeMenu, (val) => {
  router.replace({ query: { tab: val } })
})

// ========== 深色模式：仅在管理页生效 ==========
// 路由守卫负责进入/离开时同步 html.dark
// 此处监听切换操作，确保在管理页内切换时实时同步
watch(() => theme.isDark, (val) => {
  document.documentElement.classList.toggle('dark', val)
})
</script>

<template>
  <el-container class="admin-container" :class="{ dark: theme.isDark }">
    <el-aside :width="isCollapse ? '64px' : '220px'">
      <div class="logo">
        <span v-if="!isCollapse">后台管理</span>
        <el-button :icon="isCollapse ? Expand : Fold" text class="toggle-btn" @click="toggleCollapse" />
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        @select="activeMenu = $event"
      >
        <el-menu-item index="dashboard">
          <el-icon><Monitor /></el-icon>
          <template #title>控制台</template>
        </el-menu-item>
        <el-menu-item index="users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="questions">
          <el-icon><Document /></el-icon>
          <template #title>题目管理</template>
        </el-menu-item>
        <el-menu-item index="sessions">
          <el-icon><Connection /></el-icon>
          <template #title>会话管理</template>
        </el-menu-item>
      </el-menu>

        <div class="aside-footer">
          <ThemeToggle :collapsed="isCollapse" />
        </div>
      </el-aside>

    <el-main>
      <DashboardPanel v-if="activeMenu === 'dashboard'" />
      <UserManagement v-else-if="activeMenu === 'users'" />
      <QuestionManagement v-else-if="activeMenu === 'questions'" />
      <SessionManager v-else-if="activeMenu === 'sessions'" />
    </el-main>
  </el-container>
</template>

<style scoped>
.admin-container {
  height: 100vh;
  background: var(--bg-page);
}

/* ========== 侧边栏 ========== */
.el-aside {
  position: relative;
  background: var(--bg-sidebar);
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-card);
  border-right: 1px solid var(--border-base);
}

/* ========== Logo ========== */
.logo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  border-bottom: 1px solid var(--border-base);
  transition: padding 0.3s;
  user-select: none;
  white-space: nowrap;
}

.toggle-btn {
  color: var(--text-secondary);
  font-size: 18px;
  transition: color 0.2s;
}

.toggle-btn:hover {
  color: var(--color-primary) !important;
  background-color: transparent !important;
}

/* ========== 菜单 ========== */
.el-menu {
  border-right: none;
  background: transparent;
  padding: 8px 0;
}

:deep(.el-menu-item) {
  margin: 2px 10px;
  border-radius: 8px;
  color: var(--text-regular);
  font-size: 14px;
  height: 44px;
  line-height: 44px;
  transition: all 0.2s ease;
}

:deep(.el-menu-item .el-icon) {
  font-size: 18px;
  color: var(--text-secondary);
  transition: color 0.2s;
}

:deep(.el-menu-item:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary);
}

:deep(.el-menu-item:hover .el-icon) {
  color: var(--text-regular);
}

:deep(.el-menu-item.is-active) {
  background: var(--bg-active) !important;
  color: var(--color-primary) !important;
  font-weight: 600;
  border-radius: 0 8px 8px 0;
  border-left: 3px solid var(--color-primary);
  margin-left: 7px;
}

:deep(.el-menu-item.is-active .el-icon) {
  color: var(--color-primary);
}

/* 折叠菜单 */
:deep(.el-menu--collapse) {
  padding: 8px 0;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 2px 6px;
  padding: 0 !important;
  justify-content: center;
  border-radius: 8px;
}

:deep(.el-menu--collapse .el-menu-item.is-active) {
  border-left: none;
  border-radius: 8px;
  margin-left: 6px;
}

/* ========== 主区域 ========== */
.el-main {
  background: var(--bg-page);
  padding: 24px;
}

/* ========== 侧边栏底部（主题切换） ========== */
.aside-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 8px;
}

/* ========== 深色模式 CSS 变量（仅管理页） ========== */
.admin-container.dark {
  --bg-page: #14141a;
  --bg-card: #1e1e28;
  --bg-sidebar: #1a1a24;
  --bg-hover: #2a2a36;
  --bg-active: rgba(64, 158, 255, 0.12);
  --border-base: #2e2e3a;
  --border-light: #262632;
  --text-primary: #e4e4ec;
  --text-regular: #b0b0be;
  --text-secondary: #787882;
  --text-placeholder: #565662;
  --color-primary: #60a5fa;
  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.3);
}
</style>
