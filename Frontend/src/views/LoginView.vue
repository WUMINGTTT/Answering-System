/**
 * 【技术学习】登录页面组件 LoginView.vue
 *
 * 这是用户的登录和注册页面，主要功能：
 * 1. 使用 Tab 组件实现登录/注册表单切换
 * 2. 处理登录成功后的角色路由跳转（管理员/选手）
 * 3. 统一的错误处理和消息提示
 *
 * 设计特点：
 * - 将登录和注册表单拆分为独立组件，提高代码复用性
 * - 使用事件机制（emit）实现父子组件通信
 * - 根据用户角色自动跳转到对应页面
 */

<!-- ==================== 脚本部分 ==================== -->
<script setup lang="ts">

// -------------------- 导入依赖 --------------------

// 导入 axios HTTP 客户端
// 【技术学习】axios 是一个流行的 HTTP 库，用于发送网络请求
import axios from 'axios'

// 导入 Vue 的 ref 函数
// 【技术学习】ref 用于创建响应式的基本类型数据（字符串、数字、布尔值等）
import { ref } from 'vue'

// 导入登录和注册表单组件
// 【技术学习】@ 是 src 目录的别名，在 vite.config.ts 中配置
// 使用别名可以避免复杂的相对路径（如 ../../components/...）
import LoginForm from '@/components/loginView/LoginForm.vue'
import RegisterForm from '@/components/loginView/RegisterForm.vue'

// 导入 Socket.IO 组合式函数
import { useSocket } from '@/composables/useSocket'

// -------------------- Socket.IO 注册 --------------------

// 注册 Socket.IO 会话，用于在线状态追踪
// 【技术学习】pageType: 'login' 告诉服务器用户在登录页面
// 服务器可以用这个信息统计各页面的在线人数
useSocket({ syncRemote: false, pageType: 'login' })

// -------------------- 响应式数据 --------------------

// 当前激活的 Tab 名称
// 【技术学习】ref('login') 创建一个响应式变量，初始值为 'login'
// 当 activeTab 的值改变时，UI 会自动更新显示对应的 Tab 内容
const activeTab = ref('login')

// -------------------- 事件处理函数 --------------------

/**
 * 登录成功回调
 * @param role - 用户角色（'admin' 或 'player'）
 * @param msg - 成功消息
 *
 * 【技术学习】这个函数由 LoginForm 组件通过 emit 触发
 * 子组件通过 emit 向父组件发送事件，实现组件间通信
 *
 * 路由跳转使用 window.location.replace() 而不是 router.push()
 * 这样会刷新整个页面，确保所有状态重新初始化
 */
function onLoginSuccess(role: string, msg: string) {
  // 显示成功消息
  // 【技术学习】ElMessage 是 Element Plus 提供的全局消息提示组件
  ElMessage.success(msg)

  // 根据角色跳转到不同页面
  if (role === 'admin') {
    window.location.replace('/admin')    // 管理员跳转到管理页
  } else {
    window.location.replace('/player')   // 选手跳转到选手页
  }
}

/**
 * 注册成功回调
 * @param msg - 成功消息
 *
 * 【技术学习】注册成功后不跳转页面，而是切换到登录 Tab
 * 这是更好的用户体验：用户注册成功后可以直接登录
 */
function onRegisterSuccess(msg: string) {
  ElMessage.success(msg)
  activeTab.value = 'login'  // 切换到登录 Tab
}

/**
 * 提取错误消息的辅助函数
 * @param err - 错误对象
 * @returns 格式化后的错误消息字符串
 *
 * 【技术学习】这个函数处理不同类型的错误：
 * 1. Axios 错误：从服务器响应中提取错误消息
 * 2. 普通 Error 对象：直接返回 message 属性
 * 3. 其他未知错误：返回通用错误消息
 *
 * unknown 类型比 any 更安全，要求在使用前进行类型检查
 */
function getErrorMessage(err: unknown): string {
  // 检查是否是 Axios 错误
  // 【技术学习】axios.isAxiosError() 是类型守卫函数
  // 如果返回 true，TypeScript 会将 err 的类型收窄为 AxiosError
  if (axios.isAxiosError(err)) {
    // 优先使用服务器返回的错误消息，如果没有则使用默认消息
    return err.response?.data?.message || '服务器错误，请稍后重试'
  }

  // 检查是否是标准 Error 对象
  // 【技术学习】instanceof 检查对象是否是某个类的实例
  if (err instanceof Error) return err.message

  // 其他未知类型的错误
  return '未知错误，请稍后重试'
}

/**
 * 登录错误回调
 * @param err - 错误对象
 */
function onLoginError(err: unknown) {
  ElMessage.error(getErrorMessage(err))
}

/**
 * 注册错误回调
 * @param err - 错误对象
 */
function onRegisterError(err: unknown) {
  ElMessage.error(getErrorMessage(err))
}
</script>

<!-- ==================== 模板部分 ==================== -->
<template>
  <!-- 登录页面容器 -->
  <div class="login-page">

    <!-- 登录卡片 -->
    <!--
      【技术学习】el-card 是 Element Plus 的卡片组件
      它提供了统一的容器样式，包括边框、阴影和圆角
    -->
    <el-card class="login-card">

      <!-- 页面标题 -->
      <h2 class="login-title">答题系统</h2>

      <!--
        【技术学习】el-tabs 组件实现 Tab 切换

        v-model="activeTab" 双向绑定当前激活的 Tab
        - 当用户点击不同的 Tab 时，activeTab 会自动更新
        - 当 activeTab 的值改变时，UI 会自动切换到对应的 Tab

        el-tab-pane 定义每个 Tab 的内容
        - label: Tab 显示的文字
        - name: Tab 的唯一标识，与 activeTab 的值对应
      -->
      <el-tabs v-model="activeTab" class="login-tabs">

        <!-- 登录 Tab -->
        <el-tab-pane label="登录" name="login">
          <!--
            【技术学习】事件监听的语法

            @login-success="onLoginSuccess" 等价于 v-on:login-success="onLoginSuccess"

            当 LoginForm 组件触发 'login-success' 事件时：
            1. 子组件调用 emit('login-success', role, msg)
            2. 父组件的 onLoginSuccess 函数被调用
            3. 参数 role 和 msg 会传递给父组件的函数
          -->
          <LoginForm @login-success="onLoginSuccess" @login-error="onLoginError" />
        </el-tab-pane>

        <!-- 注册 Tab -->
        <el-tab-pane label="注册" name="register">
          <RegisterForm @register-success="onRegisterSuccess" @register-error="onRegisterError" />
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<!-- ==================== 样式部分 ==================== -->
<style scoped>
/* 登录页面容器 */
.login-page {
  display: flex;               /* Flexbox 布局 */
  justify-content: center;     /* 水平居中 */
  align-items: center;         /* 垂直居中 */
  min-height: 98vh;           /* 几乎占满整个视口高度 */
  background: #f5f7fa;        /* 浅灰色背景 */
}

/* 登录卡片 */
.login-card {
  width: 420px;               /* 固定宽度 */
}

/* 页面标题 */
.login-title {
  text-align: center;         /* 文字居中 */
  margin-bottom: 16px;       /* 与下方 Tab 的间距 */
  font-size: 24px;
  color: #303133;
}

/* Tab 组件样式 */
.login-tabs {
  /*
   * 【技术学习】CSS 变量覆盖
   *
   * Element Plus 组件使用 CSS 变量来控制样式
   * --el-tabs-header-margin 控制 Tab 头部的外边距
   * 这里将其设置为 0 0 16px 0，表示只保留底部间距
   */
  --el-tabs-header-margin: 0 0 16px 0;
}
</style>
