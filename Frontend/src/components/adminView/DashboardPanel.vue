<script setup lang="ts">
import StatusControls from './dashboard/StatusControls.vue'
import CurrentQuestion from './dashboard/CurrentQuestion.vue'
import PlayerList from './dashboard/PlayerList.vue'
import QuestionList from './dashboard/QuestionList.vue'
</script>

<template>
  <div class="dashboard">
    <!-- 状态控制 -->
    <StatusControls />

    <!-- 当前题目 | 选手列表 | 题目列表 -->
    <el-row :gutter="16" class="list-row">
      <el-col :xs="24" :sm="24" :md="4">
        <CurrentQuestion />
      </el-col>
      <el-col :xs="24" :sm="12" :md="10">
        <PlayerList />
      </el-col>
      <el-col :xs="24" :sm="12" :md="10">
        <QuestionList />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.list-row {
  flex: 1;
  min-height: 0;
}

.list-row :deep(.el-col) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* 小屏堆叠 */
@media (max-width: 992px) {
  .list-row {
    min-height: auto;
  }

  .list-row :deep(.el-col) {
    overflow: visible;
  }

  .list-row .el-col {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 20px;
  }

  .list-row .el-col:last-child {
    margin-bottom: 0;
  }
}
</style>
