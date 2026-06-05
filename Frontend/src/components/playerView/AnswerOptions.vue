<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Question } from '@/types/question'

const props = defineProps<{
  question: Question
  canAnswer: boolean
  submitted: boolean
}>()

const emit = defineEmits<{
  submit: [answers: string[]]
}>()

const selected = ref<string[]>([])
const subjectiveText = ref('')

watch(() => props.question.id, () => {
  selected.value = []
  subjectiveText.value = ''
})

function toggleOption(opt: string) {
  if (!props.canAnswer || props.submitted) return
  if (props.question.type === 'single') {
    selected.value = [opt]
  } else if (props.question.type === 'multiple') {
    const idx = selected.value.indexOf(opt)
    if (idx >= 0) selected.value.splice(idx, 1)
    else selected.value.push(opt)
  }
}

function isSelected(opt: string): boolean {
  return selected.value.includes(opt)
}

function handleSubmit() {
  if (props.submitted) return
  const answers = props.question.type === 'subjective'
    ? (subjectiveText.value.trim() ? [subjectiveText.value.trim()] : [])
    : [...selected.value]
  emit('submit', answers)
}

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
</script>

<template>
  <div class="answer-options">
    <!-- 客观题选项：2 列网格 -->
    <template v-if="question.type !== 'subjective'">
      <div class="options-grid">
        <div
          v-for="(opt, i) in question.options"
          :key="i"
          class="option-item"
          :class="{
            selected: isSelected(opt),
            disabled: !canAnswer || submitted,
          }"
          @click="toggleOption(opt)"
        >
          <span class="option-letter">{{ optionLabels[i] || i }}</span>
          <span class="option-text">{{ opt }}</span>
          <span v-if="isSelected(opt)" class="option-check">✓</span>
        </div>
      </div>
    </template>

    <!-- 主观题 -->
    <template v-else>
      <textarea
        v-model="subjectiveText"
        class="subjective-input"
        :disabled="!canAnswer || submitted"
        placeholder="请输入你的答案..."
        rows="3"
      />
    </template>

    <!-- 提交按钮 -->
    <button
      class="submit-btn"
      :disabled="!canAnswer || submitted"
      @click="handleSubmit"
    >
      <template v-if="submitted">已提交 ✓</template>
      <template v-else>提交答案</template>
    </button>
  </div>
</template>

<style scoped>
.answer-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

/* 2 列网格 */
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
  align-content: center;
}

/* 选项卡片 */
.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
  min-height: 52px;
}

.option-item:active:not(.disabled) {
  transform: scale(0.97);
}

.option-item.selected {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.15);
}

.option-item.disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.option-letter {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.option-item.selected .option-letter {
  background: #409eff;
}

.option-text {
  flex: 1;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.option-check {
  font-size: 18px;
  color: #67c23a;
  font-weight: 700;
  flex-shrink: 0;
}

/* 主观题 */
.subjective-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  resize: none;
  outline: none;
}

.subjective-input:focus { border-color: #409eff; }
.subjective-input:disabled { opacity: 0.5; }
.subjective-input::placeholder { color: rgba(255, 255, 255, 0.25); }

/* 提交按钮 */
.submit-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #409eff, #337ecc);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 2px;
  flex-shrink: 0;
}

.submit-btn:active:not(:disabled) { transform: scale(0.97); }
.submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* 窄屏回退单列 */
@media (max-width: 420px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  .option-item {
    min-height: 46px;
    padding: 10px 12px;
  }
}
</style>
