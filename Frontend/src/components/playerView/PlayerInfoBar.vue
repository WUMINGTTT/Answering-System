<script setup lang="ts">
defineProps<{
  nickname: string
  totalScore: number
  connected: boolean
}>()
</script>

<template>
  <div class="player-bar">
    <div class="bar-left">
      <div class="avatar">{{ nickname.charAt(0) }}</div>
      <span class="nickname">{{ nickname }}</span>
    </div>
    <div class="bar-center">
      <!-- <span class="score">{{ totalScore }} 分</span> -->
    </div>
    <div class="bar-right">
      <span class="conn-dot" :class="{ ok: connected }" />
    </div>
  </div>
</template>

<style scoped>
.player-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  height: 48px;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #67c23a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.nickname {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.bar-center {
  flex: 1;
  text-align: center;
}

.score {
  font-size: 15px;
  color: #ffd666;
  font-weight: 700;
}

.bar-right {
  flex-shrink: 0;
}

.conn-dot {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
  transition: background 0.3s;
}

.conn-dot.ok {
  background: #67c23a;
}
</style>
