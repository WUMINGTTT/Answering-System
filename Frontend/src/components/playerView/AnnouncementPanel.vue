<script setup lang="ts">
import { Bell } from '@element-plus/icons-vue'

const placeholderAnnouncements = [
  { id: '1', title: '欢迎参加本次知识竞赛' },
  { id: '2', title: '请遵守比赛规则，诚信答题' },
  { id: '3', title: '如有疑问请举手示意工作人员' },
]
</script>

<template>
  <div class="announce-strip">
    <el-icon :size="14" class="strip-icon"><Bell /></el-icon>
    <div class="strip-scroll">
      <span
        v-for="a in placeholderAnnouncements"
        :key="a.id"
        class="strip-item"
      >{{ a.title }}</span>
    </div>
  </div>
</template>

<style scoped>
.announce-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  height: 36px;
  overflow: hidden;
}

.strip-icon {
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.strip-scroll {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
  mask-image: linear-gradient(90deg, #000 85%, transparent);
  -webkit-mask-image: linear-gradient(90deg, #000 85%, transparent);
}

.strip-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  flex-shrink: 0;
}

.strip-item::before {
  content: '●';
  margin-right: 6px;
  font-size: 6px;
  color: #409eff;
  vertical-align: middle;
}
</style>
