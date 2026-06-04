<script setup lang="ts">
import type { Question } from '@/types/question'

defineProps<{
  question: Question
  typeLabel: string
}>()
</script>

<template>
  <div class="question-card">
    <div class="question-meta">
      <span class="q-type">{{ typeLabel }}</span>
      <span class="q-score">{{ question.score }} 分</span>
    </div>
    <div class="q-stem">{{ question.stem }}</div>

    <!-- 选项（非主观题展示） -->
    <div
      v-if="question.type !== 'subjective' && question.options.length"
      class="q-options"
    >
      <div
        v-for="(opt, i) in question.options"
        :key="i"
        class="q-option"
      >
        <span class="q-option-letter">{{ String.fromCharCode(65 + i) }}</span>
        <span class="q-option-text">{{ opt }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  max-width: 900px;
  width: 100%;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 40px 48px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.q-type {
  font-size: 14px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.q-score {
  font-size: 16px;
  font-weight: 600;
  color: #ffd666;
  margin-left: auto;
}

.q-stem {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.6;
  margin-bottom: 24px;
}

.q-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.q-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s;
}

.q-option-letter {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.q-option-text {
  font-size: 20px;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .q-stem {
    font-size: 22px;
  }

  .q-options {
    grid-template-columns: 1fr;
  }

  .q-option-text {
    font-size: 16px;
  }

  .question-card {
    padding: 24px;
  }
}
</style>
