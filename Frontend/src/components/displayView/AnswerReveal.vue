<script setup lang="ts">
defineProps<{
  answers: string[]
}>()
</script>

<template>
  <div v-if="answers.length" class="answer-card">
    <div class="answer-label">答案</div>
    <div class="answer-list">
      <span
        v-for="(ans, i) in answers"
        :key="i"
        class="answer-item"
      >{{ ans }}</span>
    </div>
  </div>
</template>

<style scoped>
.answer-card {
  max-width: 900px;
  width: 100%;
  margin-top: 20px;
  padding: 24px 48px;
  background: rgba(103, 194, 58, 0.15);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(103, 194, 58, 0.3);
  display: flex;
  align-items: center;
  gap: 20px;
}

.answer-label {
  font-size: 18px;
  font-weight: 600;
  color: #67c23a;
  flex-shrink: 0;
}

.answer-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.answer-item {
  font-size: 22px;
  font-weight: 700;
  padding: 6px 18px;
  background: rgba(103, 194, 58, 0.3);
  border-radius: 6px;
  color: #b3e19d;
  letter-spacing: 1px;
}
</style>
