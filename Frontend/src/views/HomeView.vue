<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function navigateTo(url: string): void {
  router.replace(url)
}
</script>
<template>
  <div class="box">
    <el-button @click="navigateTo('/login')" type="primary" size="large" plain>登录页</el-button>
    <el-button @click="navigateTo('/player')" type="primary" size="large" plain>选手页</el-button>
    <el-button @click="navigateTo('/admin')" type="primary" size="large" plain>管理页</el-button>
    <el-button @click="navigateTo('/display')" type="primary" size="large" plain>显示页</el-button>
  </div>
</template>
<style scoped>
.box {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
