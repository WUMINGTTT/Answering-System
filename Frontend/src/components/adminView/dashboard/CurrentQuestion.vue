<!--
  ====================================================================
  CurrentQuestion.vue — 当前题目展示卡片
  ====================================================================

  【组件职责】
  展示管理员当前选中的题目信息，包括：
  1. 题干内容
  2. 题型和类别标签（带颜色编码）
  3. 风险题代号（如 A1、B3）
  4. 选项列表（非主观题，用字母序号标识）
  5. 答案显示开关（控制展示页是否公布答案）
  6. 分值显示
  7. 取消选择功能

  【技术学习 — 设计思路】
  - 纯展示组件（除了"取消选择"按钮和答案开关），数据全部来自 Pinia Store
  - 未选中题目时显示空状态占位符
  - 选项字母使用 String.fromCharCode(65 + i) 生成（65 = 'A'）

  【数据流】
  Pinia Store (gameStatusStore) → 模板直接读取 store.currentQuestion
  "取消选择" → store.setCurrentQuestion(null)
  答案开关 → store.setShowAnswer(value)
-->

<script setup lang="ts">
import { QuestionFilled, Close } from '@element-plus/icons-vue'
import { useGameStatusStore } from '@/stores/gameStatus'

// 初始化游戏状态 Store
const store = useGameStatusStore()

/**
 * 清除当前选中的题目
 * 【技术学习】调用 store 的方法修改状态，而非直接修改属性
 * 这样可以在方法内部处理额外逻辑（如同步到服务器）
 */
function clearQuestion() {
  store.setCurrentQuestion(null)
  ElMessage.info('已取消当前展示题目')
}

// ====================================================================
// 标签辅助函数（题型和类别的中文文本和颜色）
// ====================================================================
// 【技术学习】这些辅助函数在多个组件中重复使用（DashboardPanel、QuestionList、CurrentQuestion）
// 在实际项目中可以提取为公共工具函数

/** 题型中文标签 */
function typeLabel(type: string) {
  const map: Record<string, string> = {
    single: '单选',
    multiple: '多选',
    subjective: '主观',
  }
  return map[type] || type
}

/** 题型标签颜色 */
function typeTagType(type: string) {
  const map: Record<string, string> = {
    single: 'primary',    // 蓝色
    multiple: 'success',   // 绿色
    subjective: 'warning', // 橙色
  }
  return map[type] || 'info'
}

/** 类别中文标签 */
function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    required: '必答题',
    'quick-answer': '抢答题',
    risk: '风险题',
  }
  return map[cat] || cat
}

/** 类别标签颜色 */
function categoryTagType(cat: string) {
  const map: Record<string, string> = {
    required: '',            // 默认色
    'quick-answer': 'danger', // 红色
    risk: 'warning',          // 橙色
  }
  return map[cat] || 'info'
}
</script>

<template>
  <!--
    【技术学习】el-card 组件结构：
    - header 插槽：卡片标题区域
    - 默认插槽：卡片内容区域
  -->
  <el-card class="current-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <el-icon :size="18"><QuestionFilled /></el-icon>
        <span>当前题目</span>

        <!-- 取消选择按钮（仅在已选中题目时显示） -->
        <el-button
          v-if="store.currentQuestion"
          :icon="Close"
          size="small"
          text
          class="clear-btn"
          @click="clearQuestion"
        >
          取消选择
        </el-button>
      </div>
    </template>

    <!-- ============================================================ -->
    <!-- 已选中题目时：显示题目详情                                      -->
    <!-- ============================================================ -->
    <div v-if="store.currentQuestion" class="question-detail">
      <!-- 题干 -->
      <div class="qd-stem">{{ store.currentQuestion.stem }}</div>

      <!-- 元信息行：题型标签 + 类别标签 + 风险题代号 + 分值 -->
      <div class="qd-meta">
        <!-- 题型标签 -->
        <el-tag :type="typeTagType(store.currentQuestion.type)" size="small">
          {{ typeLabel(store.currentQuestion.type) }}
        </el-tag>
        <!-- 类别标签 -->
        <el-tag :type="categoryTagType(store.currentQuestion.category)" size="small">
          {{ categoryLabel(store.currentQuestion.category) }}
        </el-tag>
        <!-- 风险题额外显示代号（如 A1、B3） -->
        <span v-if="store.currentRiskCode" class="qd-risk-code">{{ store.currentRiskCode }}</span>
        <!-- 分值（推到右侧） -->
        <span class="qd-score">{{ store.currentQuestion.score }} 分</span>
      </div>

      <!--
        选项列表（非主观题才显示）
        【技术学习】String.fromCharCode(65 + i) 将索引转换为大写字母
        65 是 'A' 的 ASCII 码，所以 0→A, 1→B, 2→C, ...
      -->
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

      <!--
        答案区域
        【技术学习】el-switch 开关组件：
        - :model-value 绑定当前值
        - active-text 显示在开关右侧的文字
        - @change 值变化时调用 store.setShowAnswer
        这个开关控制展示页是否向选手公布答案
      -->
      <div v-if="store.currentQuestion.answers.length" class="qd-answers">
        <div class="qd-answers-header">
          <span class="qd-section-label">答案</span>
          <el-switch
            :model-value="store.showAnswer"
            size="small"
            active-text="公布答案"
            inactive-text=""
            @change="store.setShowAnswer"
          />
        </div>
        <!-- 答案标签列表 -->
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

    <!-- ============================================================ -->
    <!-- 未选中题目时：显示空状态提示                                    -->
    <!-- ============================================================ -->
    <div v-else class="question-empty">
      <el-icon :size="32"><QuestionFilled /></el-icon>
      <span>暂未选择题目</span>
      <span class="empty-hint">从题目列表中点击选择</span>
    </div>
  </el-card>
</template>

<style scoped>
/* 卡片容器：flex 布局，自动填满可用空间 */
.current-card {
  border-radius: 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 200px;
}

/* 卡片头部固定 */
.current-card :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-base);
  flex-shrink: 0;
}

/* 卡片内容区域可滚动 */
.current-card :deep(.el-card__body) {
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

/* WebKit 自定义滚动条 */
.current-card :deep(.el-card__body)::-webkit-scrollbar { width: 6px; }
.current-card :deep(.el-card__body)::-webkit-scrollbar-track { background: transparent; }
.current-card :deep(.el-card__body)::-webkit-scrollbar-thumb { background: #c4c4c4; border-radius: 3px; }
.current-card :deep(.el-card__body)::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

/* 卡片头部布局 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 取消按钮（默认推到右侧） */
.clear-btn {
  margin-left: auto;
  color: var(--text-secondary);
  font-weight: 400;
  font-size: 13px;
}

.clear-btn:hover {
  color: #f56c6c;  /* 悬停时变红 */
}

/* ========== 题目详情 ========== */
.question-detail {
  padding: 16px 18px;
}

/* 题干 */
.qd-stem {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
  line-height: 1.6;
  margin-bottom: 12px;
}

/* 元信息行 */
.qd-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

/* 分值（推到右侧） */
.qd-score {
  font-size: 14px;
  color: var(--color-primary);
  font-weight: 600;
  margin-left: auto;
}

/* 风险题代号（红色等宽字体） */
.qd-risk-code {
  font-size: 16px;
  color: #f56c6c;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  letter-spacing: 1px;
}

/* ========== 选项和答案区域 ========== */
.qd-section-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 10px;
  margin-bottom: 6px;
}

.qd-options {
  border-top: 1px dashed var(--border-base);
  margin-top: 10px;
}

/* 单个选项 */
.qd-option {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 0;
}

/* 选项字母（蓝色加粗） */
.qd-option-letter {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  flex-shrink: 0;
  min-width: 18px;
}

.qd-option-text {
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.5;
}

/* 答案区域 */
.qd-answers {
  border-top: 1px dashed var(--border-base);
  margin-top: 10px;
}

.qd-answers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  margin-bottom: 6px;
}

.qd-answers-header .qd-section-label {
  margin: 0;
}

.qd-answer-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ========== 空状态 ========== */
.question-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  color: var(--text-placeholder);
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-placeholder);
}
</style>
