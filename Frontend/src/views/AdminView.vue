<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, User, Document, Fold, Expand } from '@element-plus/icons-vue'
import UserManagement from '@/components/adminView/UserManagement.vue'
import QuestionManagement from '@/components/adminView/QuestionManagement.vue'

const route = useRoute()
const router = useRouter()

const activeMenu = ref((route.query.tab as string) || 'dashboard')
const isCollapse = ref(false)

function toggleCollapse() {
  isCollapse.value = !isCollapse.value
}

watch(activeMenu, (val) => {
  router.replace({ query: { tab: val } })
})
</script>

<template>
  <el-container class="admin-container">
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
      </el-menu>
    </el-aside>

    <el-main>
      <div v-if="activeMenu === 'dashboard'" class="page-placeholder">
        <h2>控制台</h2>
      </div>
      <UserManagement v-else-if="activeMenu === 'users'" />
      <QuestionManagement v-else-if="activeMenu === 'questions'" />
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
  transition: width 0.3s;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background-color: #2b3a4a;
  transition: padding 0.3s;
}

.toggle-btn {
  color: #bfcbd9;
  font-size: 20px;
  background-color: transparent;
}

.toggle-btn:hover {
  background-color: transparent !important; 
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
