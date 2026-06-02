<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue'
import { useGameStatusStore } from '@/stores/gameStatus'

const store = useGameStatusStore()

// ---------- 标签辅助 ----------
function typeLabel(type: string) {
  const map: Record<string, string> = {
    single: '单选',
    multiple: '多选',
    subjective: '主观',
  }
  return map[type] || type
}

function typeTagType(type: string) {
  const map: Record<string, string> = {
    single: 'primary',
    multiple: 'success',
    subjective: 'warning',
  }
  return map[type] || 'info'
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    required: '必答题',
    'quick-answer': '抢答题',
    risk: '风险题',
  }
  return map[cat] || cat
}

function categoryTagType(cat: string) {
  const map: Record<string, string> = {
    required: '',
    'quick-answer': 'danger',
    risk: 'warning',
  }
  return map[cat] || 'info'
}
</script>

<template>
  <el-card class="current-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <el-icon :size="18"><QuestionFilled /></el-icon>
        <span>当前题目</span>
      </div>
    </template>

    <div v-if="store.currentQuestion" class="question-detail">
      <!-- 题干 -->
      <div class="qd-stem">{{ store.currentQuestion.stem }}</div>

      <!-- 元信息 -->
      <div class="qd-meta">
        <el-tag :type="typeTagType(store.currentQuestion.type)" size="small">
          {{ typeLabel(store.currentQuestion.type) }}
        </el-tag>
        <el-tag :type="categoryTagType(store.currentQuestion.category)" size="small">
          {{ categoryLabel(store.currentQuestion.category) }}
        </el-tag>
        <span class="qd-score">{{ store.currentQuestion.score }} 分</span>
      </div>

      <!-- 选项（非主观题展示） -->
      <div
        v-if="store.currentQuestion.type !== 'subjective' && store.currentQuestion.options.length"
        class="qd-options"
      >
        <div class="qd-section-label">选项</div>
        <div
          v-for="(opt, i) in store.currentQuestion.options"
          :key="i"
          class="qd-option"
        >
          <span class="qd-option-letter">{{ String.fromCharCode(65 + i) }}</span>
          <span class="qd-option-text">{{ opt }}</span>
        </div>
      </div>

      <!-- 答案 -->
      <div v-if="store.currentQuestion.answers.length" class="qd-answers">
        <div class="qd-section-label">答案</div>
        <div class="qd-answer-list">
          <el-tag
            v-for="(ans, i) in store.currentQuestion.answers"
            :key="i"
            type="success"
            size="small"
            effect="dark"
          >
            {{ ans }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 未选择题目 -->
    <div v-else class="question-empty">
      <el-icon :size="32"><QuestionFilled /></el-icon>
      <span>暂未选择题目</span>
      <span class="empty-hint">从题目列表中点击选择</span>
    </div>
  </el-card>
</template>

<style scoped>
.current-card {
  border-radius: 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.current-card :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.current-card :deep(.el-card__body) {
  padding: 0;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

.current-card :deep(.el-card__body)::-webkit-scrollbar {
  width: 6px;
}

.current-card :deep(.el-card__body)::-webkit-scrollbar-track {
  background: transparent;
}

.current-card :deep(.el-card__body)::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 3px;
}

.current-card :deep(.el-card__body)::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

/* 题目详情 */
.question-detail {
  padding: 16px 18px;
}

.qd-stem {
  font-size: 15px;
  color: #303133;
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 12px;
}

.qd-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.qd-score {
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
  margin-left: auto;
}

/* 选项 & 答案 */
.qd-section-label {
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
  margin-bottom: 6px;
}

.qd-options {
  border-top: 1px dashed #e4e7ed;
  margin-top: 10px;
}

.qd-option {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 0;
}

.qd-option-letter {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
  flex-shrink: 0;
  min-width: 18px;
}

.qd-option-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.qd-answers {
  border-top: 1px dashed #e4e7ed;
  margin-top: 10px;
}

.qd-answer-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 空状态 */
.question-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  color: #c0c4cc;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: #dcdfe6;
}
</style>
