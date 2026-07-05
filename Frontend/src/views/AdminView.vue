/**
 * 【技术学习】管理后台组件 AdminView.vue
 *
 * 这是管理员的后台页面，功能包括：
 * 1. 侧边栏导航菜单
 * 2. 动态切换不同的管理面板（控制台、用户管理、题目管理、会话管理）
 * 3. 暗色/亮色主题切换
 * 4. 侧边栏折叠/展开功能
 *
 * 设计特点：
 * - 使用 Element Plus 的 Container 布局组件
 * - 通过 v-if/v-else-if 条件渲染切换面板
 * - 使用 CSS 变量实现主题系统
 * - 侧边栏使用深色背景，主区域使用浅色背景
 */

<!-- ==================== 脚本部分 ==================== -->
<script setup lang="ts">

// -------------------- 导入依赖 --------------------

// Vue 核心函数
import { ref, watch } from 'vue'

// Vue Router
// 【技术学习】useRoute 用于获取当前路由信息，useRouter 用于路由跳转
import { useRoute, useRouter } from 'vue-router'

// Element Plus 图标
import { Monitor, User, Document, Fold, Expand, Connection } from '@element-plus/icons-vue'

// 管理面板组件
// 【技术学习】将不同的管理功能拆分为独立组件，便于维护
import UserManagement from '@/components/adminView/UserManagement.vue'        // 用户管理
import QuestionManagement from '@/components/adminView/QuestionManagement.vue' // 题目管理
import DashboardPanel from '@/components/adminView/DashboardPanel.vue'        // 控制台
import SessionManager from '@/components/adminView/SessionManager.vue'        // 会话管理

// 主题切换组件
import ThemeToggle from '@/components/ThemeToggle.vue'

// 主题状态管理
// 【技术学习】useThemeStore 是 Pinia store，用于全局主题状态管理
import { useThemeStore } from '@/stores/theme'

// -------------------- 初始化 --------------------

// 获取当前路由信息
const route = useRoute()

// 获取路由器实例
const router = useRouter()

// 获取主题 store
const theme = useThemeStore()

// ==================== 响应式数据 ====================

/**
 * 【技术学习】当前激活的菜单项
 *
 * 初始化逻辑：
 * 1. 从 URL 查询参数中获取 tab 值（如 /admin?tab=users）
 * 2. 如果没有查询参数，默认显示 'dashboard'（控制台）
 *
 * as string 是 TypeScript 类型断言，告诉编译器 route.query.tab 是字符串类型
 */
const activeMenu = ref((route.query.tab as string) || 'dashboard')

// 侧边栏是否折叠
const isCollapse = ref(false)

// ==================== 方法 ====================

/**
 * 【技术学习】切换侧边栏折叠状态
 *
 * 这是一个简单的 toggle 函数：
 * - 如果当前是展开状态，切换为折叠
 * - 如果当前是折叠状态，切换为展开
 */
function toggleCollapse() {
  isCollapse.value = !isCollapse.value
}

// ==================== 监听器 ====================

/**
 * 【技术学习】监听菜单切换，同步更新 URL
 *
 * 当用户点击不同的菜单项时：
 * 1. activeMenu 的值会改变
 * 2. 这个 watch 会被触发
 * 3. 使用 router.replace() 更新 URL 的查询参数
 *
 * 这样做的好处：
 * - 用户可以收藏特定标签页的 URL
 * - 刷新页面后可以恢复到之前打开的标签页
 */
watch(activeMenu, (val) => {
  router.replace({ query: { tab: val } })
})

/**
 * 【技术学习】深色模式切换
 *
 * 监听主题 store 的 isDark 属性变化：
 * - 当 isDark 变为 true 时，给 <html> 元素添加 'dark' 类名
 * - 当 isDark 变为 false 时，移除 'dark' 类名
 *
 * Element Plus 的暗色主题 CSS 变量会根据 <html> 元素是否有 'dark' 类名自动生效
 *
 * 注意：路由守卫也负责在进入/离开管理页时同步 dark 类名
 * 这里的 watch 确保在管理页内切换主题时实时同步
 */
watch(() => theme.isDark, (val) => {
  document.documentElement.classList.toggle('dark', val)
})
</script>

<!-- ==================== 模板部分 ==================== -->
<template>
  <!--
    【技术学习】Element Plus 的 Container 布局组件

    el-container: 外层容器
    el-aside: 侧边栏
    el-main: 主内容区域

    这些组件提供了语义化的布局结构，便于样式控制
  -->
  <el-container class="admin-container" :class="{ dark: theme.isDark }">

    <!-- ========== 侧边栏 ========== -->
    <!--
      【技术学习】动态宽度
      :width="isCollapse ? '64px' : '220px'"

      使用三元表达式根据折叠状态动态设置宽度：
      - 折叠时：64px（只显示图标）
      - 展开时：220px（显示图标和文字）
    -->
    <el-aside :width="isCollapse ? '64px' : '220px'">

      <!-- Logo 区域 -->
      <div class="logo">
        <!--
          【技术学习】条件渲染
          v-if="!isCollapse" 只在展开状态下显示文字
        -->
        <span v-if="!isCollapse">后台管理</span>

        <!-- 折叠/展开按钮 -->
        <!--
          【技术学习】动态图标
          :icon="isCollapse ? Expand : Fold"

          根据折叠状态显示不同的图标：
          - 折叠时：显示展开图标
          - 展开时：显示折叠图标
        -->
        <el-button :icon="isCollapse ? Expand : Fold" text class="toggle-btn" @click="toggleCollapse" />
      </div>

      <!--
        【技术学习】Element Plus 的 Menu 组件

        :default-active="activeMenu" - 当前激活的菜单项
        :collapse="isCollapse" - 是否折叠
        background-color - 菜单背景色
        text-color - 文字颜色
        active-text-color - 激活项文字颜色

        @select="activeMenu = $event" - 菜单项被选中时触发
        $event 是被选中菜单项的 index 值
      -->
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        @select="activeMenu = $event"
      >
        <!-- 控制台菜单项 -->
        <!--
          【技术学习】菜单项结构

          el-menu-item: 菜单项容器
          index: 菜单项的唯一标识，用于判断激活状态

          el-icon: 图标组件
          template #title: 菜单项文字（使用插槽）
        -->
        <el-menu-item index="dashboard">
          <el-icon><Monitor /></el-icon>
          <template #title>控制台</template>
        </el-menu-item>

        <!-- 用户管理菜单项 -->
        <el-menu-item index="users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>

        <!-- 题目管理菜单项 -->
        <el-menu-item index="questions">
          <el-icon><Document /></el-icon>
          <template #title>题目管理</template>
        </el-menu-item>

        <!-- 会话管理菜单项 -->
        <el-menu-item index="sessions">
          <el-icon><Connection /></el-icon>
          <template #title>会话管理</template>
        </el-menu-item>
      </el-menu>

      <!-- 侧边栏底部：主题切换 -->
      <div class="aside-footer">
        <!--
          【技术学习】Props 传递
          :collapsed="isCollapse" 将折叠状态传递给 ThemeToggle 组件
          组件内部可以根据这个值调整显示样式
        -->
        <ThemeToggle :collapsed="isCollapse" />
      </div>
    </el-aside>

    <!-- ========== 主内容区域 ========== -->
    <el-main>
      <!--
        【技术学习】动态组件切换

        使用 v-if / v-else-if 条件渲染来切换不同的管理面板：
        - activeMenu === 'dashboard' → 显示控制台
        - activeMenu === 'users' → 显示用户管理
        - activeMenu === 'questions' → 显示题目管理
        - activeMenu === 'sessions' → 显示会话管理

        替代方案：可以使用 <component :is="..."> 动态组件
        但 v-if 的方式更直观，且支持懒加载
      -->
      <DashboardPanel v-if="activeMenu === 'dashboard'" />
      <UserManagement v-else-if="activeMenu === 'users'" />
      <QuestionManagement v-else-if="activeMenu === 'questions'" />
      <SessionManager v-else-if="activeMenu === 'sessions'" />
    </el-main>
  </el-container>
</template>

<!-- ==================== 样式部分 ==================== -->
<style scoped>
/* ========== 管理后台容器 ========== */
.admin-container {
  height: 100vh;           /* 占满整个视口高度 */
  background: var(--bg-page);  /* 使用 CSS 变量 */
}

/* ========== 侧边栏 ========== */
/*
 * 【技术学习】CSS transition 实现平滑动画
 *
 * transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1)
 * - width: 要过渡的属性
 * - 0.3s: 过渡持续时间
 * - cubic-bezier(0.4, 0, 0.2, 1): 缓动函数（贝塞尔曲线）
 *   这个特定的曲线提供平滑的加速和减速效果
 */
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
  justify-content: space-between;  /* Logo 和按钮分别在两端 */
  height: 60px;
  padding: 0 20px;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  border-bottom: 1px solid var(--border-base);
  transition: padding 0.3s;
  user-select: none;       /* 禁用文字选择 */
  white-space: nowrap;     /* 禁止文字换行 */
}

/* 折叠/展开按钮 */
.toggle-btn {
  color: var(--text-secondary);
  font-size: 18px;
  transition: color 0.2s;
}

/* 按钮悬停效果 */
.toggle-btn:hover {
  color: var(--color-primary) !important;
  background-color: transparent !important;
}

/* ========== 菜单 ========== */
.el-menu {
  border-right: none;      /* 移除默认右边框 */
  background: transparent;
  padding: 8px 0;
}

/*
 * 【技术学习】:deep() 深度选择器
 *
 * 当使用 scoped 样式时，样式只作用于当前组件
 * 但子组件的内部元素不会被当前组件的 scoped 样式影响
 *
 * 使用 :deep() 可以"穿透"子组件的样式封装
 * 这里用于修改 Element Plus 菜单组件的内部样式
 */
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

/* 菜单项悬停效果 */
:deep(.el-menu-item:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary);
}

:deep(.el-menu-item:hover .el-icon) {
  color: var(--text-regular);
}

/* 菜单项激活状态 */
/*
 * 【技术学习】激活状态样式
 *
 * - 背景色：使用 --bg-active 变量
 * - 文字色：使用 --color-primary 变量
 * - 左边框：3px 蓝色边框作为激活指示器
 * - 圆角：只保留右侧圆角
 */
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

/* ========== 折叠菜单样式 ========== */
:deep(.el-menu--collapse) {
  padding: 8px 0;
}

/* 折叠状态下的菜单项 */
:deep(.el-menu--collapse .el-menu-item) {
  margin: 2px 6px;
  padding: 0 !important;
  justify-content: center;  /* 图标居中 */
  border-radius: 8px;
}

/* 折叠状态下的激活项 */
:deep(.el-menu--collapse .el-menu-item.is-active) {
  border-left: none;
  border-radius: 8px;
  margin-left: 6px;
}

/* ========== 主区域 ========== */
.el-main {
  background: var(--bg-page);
  padding: 24px;
  overflow-y: auto;        /* 垂直方向可滚动 */
  overflow-x: hidden;      /* 隐藏水平溢出 */
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .el-main {
    padding: 12px;
  }
}

/* ========== 侧边栏底部（主题切换） ========== */
/*
 * 【技术学习】绝对定位
 *
 * 将主题切换按钮固定在侧边栏底部：
 * - position: absolute - 相对于父元素（el-aside）定位
 * - bottom: 16px - 距离底部 16px
 * - left: 0; right: 0 - 水平撑满
 */
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
/*
 * 【技术学习】主题变量覆盖
 *
 * 当 .admin-container 元素同时有 .dark 类名时
 * 这些 CSS 变量会覆盖 :root 中定义的默认值
 *
 * 这样可以实现：
 * 1. 管理页独立的深色主题
 * 2. 不影响其他页面的样式
 * 3. 通过切换类名实时切换主题
 */
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
