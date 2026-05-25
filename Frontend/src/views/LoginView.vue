<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import LoginForm from '@/components/loginView/LoginForm.vue'
import RegisterForm from '@/components/loginView/RegisterForm.vue'

const router = useRouter()
const activeTab = ref('login')

function onLoginSuccess(role: string) {
  if (role === 'admin') {
    router.push('/admin')
  } else {
    router.push('/player')
  }
}

function onRegisterSuccess() {
  activeTab.value = 'login'
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="login-title">答题系统</h2>

      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="登录" name="login">
          <LoginForm @login-success="onLoginSuccess" />
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <RegisterForm @register-success="onRegisterSuccess" />
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
  min-height: 100vh;
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
