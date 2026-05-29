<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, User, Document } from '@element-plus/icons-vue'
import UserManagement from '@/components/adminView/UserManagement.vue'

const route = useRoute()
const router = useRouter()

const activeMenu = ref((route.query.tab as string) || 'dashboard')

watch(activeMenu, (val) => {
  router.replace({ query: { tab: val } })
})
</script>

<template>
  <el-container class="admin-container">
    <el-aside width="220px">
      <div class="logo">后台管理</div>
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        @select="activeMenu = $event"
      >
        <el-menu-item index="dashboard">
          <el-icon><Monitor /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="questions">
          <el-icon><Document /></el-icon>
          <span>题目管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-main>
      <div v-if="activeMenu === 'dashboard'" class="page-placeholder">
        <h2>控制台</h2>
      </div>
      <UserManagement v-else-if="activeMenu === 'users'" />
      <div v-else-if="activeMenu === 'questions'" class="page-placeholder">
        <h2>题目管理</h2>
      </div>
    </el-main>
  </el-container>
</template>

<style scoped>
.admin-container {
  height: 100vh;
}

.el-aside {
  background-color: #304156;
  overflow: hidden;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background-color: #2b3a4a;
}

.el-menu {
  border-right: none;
}

.el-main {
  background-color: #f0f2f5;
  padding: 24px;
}

.page-placeholder h2 {
  color: #303133;
  font-weight: 500;
}
</style>
