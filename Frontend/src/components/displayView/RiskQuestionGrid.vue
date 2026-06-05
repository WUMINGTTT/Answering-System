<script setup lang="ts">
import type { Question } from '@/types/question'

/** 分值 → 字母代号 */
const SCORE_LETTER: Record<number, string> = { 10: 'A', 20: 'B', 30: 'C' }

/** 分值 → 颜色 */
const SCORE_COLOR: Record<number, string> = {
  10: '#409eff',
  20: '#e6a23c',
  30: '#f56c6c',
}

defineProps<{
  /** 风险题目列表（已按分值筛选） */
  questions: Question[]
  /** 题目 ID → 代号（如 A5） */
  codeMap: Map<string, string>
  /** 已被选择过的题目 ID 列表 */
  usedIds: string[]
}>()

const emit = defineEmits<{
  select: [question: Question, code: string]
}>()

function handleClick(q: Question, code: string, used: boolean) {
  if (used) return
  emit('select', q, code)
}

function scoreLetter(score: number): string {
  return SCORE_LETTER[score] || '?'
}
</script>

<template>
  <div class="risk-grid-wrapper">
    <div class="risk-grid">
      <div
        v-for="q in questions"
        :key="q.id"
        class="risk-card"
        :class="{ 'is-used': usedIds.includes(q.id) }"
        :style="{ '--card-color': SCORE_COLOR[q.score] || '#909399' }"
        @click="handleClick(q, codeMap.get(q.id) || '?', usedIds.includes(q.id))"
      >
        <!-- 代号 -->
        <span class="card-code">{{ codeMap.get(q.id) || '?' }}</span>
        <!-- 分值标签 -->
        <span class="card-score">{{ scoreLetter(q.score) }} · {{ q.score }} 分</span>
        <!-- 已选择遮罩 -->
        <div v-if="usedIds.includes(q.id)" class="used-overlay">
          <span class="used-text">已选择</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.risk-grid-wrapper {
  width: 100%;
  max-width: 1100px;
  padding: 0 20px;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  justify-items: center;
}

/* 卡片 */
.risk-card {
  position: relative;
  width: 100%;
  max-width: 180px;
  aspect-ratio: 1.6 / 1;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 2px solid var(--card-color);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
  overflow: hidden;
  user-select: none;
}

.risk-card:hover:not(.is-used) {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px color-mix(in srgb, var(--card-color) 40%, transparent);
  background: rgba(255, 255, 255, 0.18);
}

.risk-card:active:not(.is-used) {
  transform: scale(0.96);
}

/* 已使用状态 */
.risk-card.is-used {
  cursor: not-allowed;
  opacity: 0.45;
  border-style: dashed;
}

.used-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;
}

.used-text {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 4px;
  transform: rotate(-15deg);
}

/* 代号 */
.card-code {
  font-size: 36px;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  color: #fff;
  letter-spacing: 3px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  line-height: 1;
}

/* 分值标签 */
.card-score {
  margin-top: 6px;
  font-size: 13px;
  color: var(--card-color);
  font-weight: 500;
  letter-spacing: 1px;
}

/* 空态 */
.risk-grid-wrapper:has(.risk-grid:empty)::after {
  content: '暂无风险题目';
  display: block;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  padding: 40px;
}

/* ── 响应式 ── */
@media (max-width: 1000px) {
  .risk-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .card-code {
    font-size: 28px;
  }
}

@media (max-width: 700px) {
  .risk-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .card-code {
    font-size: 24px;
  }
}
</style>
