<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import LoginForm from '@/components/loginView/LoginForm.vue'
import RegisterForm from '@/components/loginView/RegisterForm.vue'
import { useSocket } from '@/composables/useSocket'

// 会话注册（仅用于在线状态追踪）
useSocket({ syncRemote: false, pageType: 'login' })

const activeTab = ref('login')

function onLoginSuccess(role: string, msg: string) {
  ElMessage.success(msg)
  if (role === 'admin') {
    window.location.replace('/admin')
  } else {
    window.location.replace('/player')
  }
}

function onRegisterSuccess(msg: string) {
  ElMessage.success(msg)
  activeTab.value = 'login'
}

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || '服务器错误，请稍后重试'
  }
  if (err instanceof Error) return err.message
  return '未知错误，请稍后重试'
}

function onLoginError(err: unknown) {
  ElMessage.error(getErrorMessage(err))
}

function onRegisterError(err: unknown) {
  ElMessage.error(getErrorMessage(err))
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="login-title">答题系统</h2>

      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="登录" name="login">
          <LoginForm @login-success="onLoginSuccess" @login-error="onLoginError" />
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <RegisterForm @register-success="onRegisterSuccess" @register-error="onRegisterError" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 98vh;
  background: #f5f7fa;
}

.login-card {
  width: 420px;
}

.login-title {
  text-align: center;
  margin-bottom: 16px;
  font-size: 24px;
  color: #303133;
}

.login-tabs {
  --el-tabs-header-margin: 0 0 16px 0;
}
</style>
