<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { QuestionFilled, Search } from '@element-plus/icons-vue'
import { getAllQuestions } from '@/api/questions'
import type { Question } from '@/types/question'
import { useGameStatusStore, QUESTION_PHASES } from '@/stores/gameStatus'

const store = useGameStatusStore()

// ---------- 题目列表 ----------
const questions = ref<Question[]>([])
const questionsLoading = ref(false)
const questionSearch = ref('')

/** 根据当前状态自动筛选题目：仅在答题阶段过滤对应类别的题目 */
const displayQuestions = computed(() => {
  let list = questions.value

  // 仅当状态为答题阶段（必答题/抢答题/风险题）时按类别过滤
  if ((QUESTION_PHASES as readonly string[]).includes(store.status)) {
    list = list.filter((q) => q.category === store.status)
  }

  const kw = questionSearch.value.trim().toLowerCase()
  if (kw) {
    list = list.filter((q) => q.stem.toLowerCase().includes(kw))
  }
  return list
})

/** 题目列表标题提示 */
const questionListHint = computed(() => {
  if ((QUESTION_PHASES as readonly string[]).includes(store.status)) {
    return store.statusLabel
  }
  return '全部类别'
})

async function fetchQuestions() {
  questionsLoading.value = true
  try {
    const { data: res } = await getAllQuestions()
    questions.value = res.data
  } catch {
    ElMessage.error('获取题目列表失败')
  } finally {
    questionsLoading.value = false
  }
}

// ---------- 设置当前题目 ----------
function toggleCurrentQuestion(q: Question) {
  if (isCurrentQuestion(q)) {
    // 再次点击已选中的题目 → 取消选中
    store.setCurrentQuestion(null)
    ElMessage.info('已取消当前展示题目')
  } else {
    store.setCurrentQuestion(q)
    ElMessage.success(`已将「${q.stem.slice(0, 20)}...」设为当前展示题目`)
  }
}

function isCurrentQuestion(q: Question) {
  return store.currentQuestion?.id === q.id
}

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

// ---------- 初始化 ----------
onMounted(() => {
  fetchQuestions()
})
</script>

<template>
  <el-card class="list-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="card-title">
          <el-icon :size="18"><QuestionFilled /></el-icon>
          <span>题目列表</span>
          <el-tag :color="store.statusColor" size="small" effect="dark" class="filter-badge">
            {{ questionListHint }}
          </el-tag>
          <span class="card-count">{{ displayQuestions.length }} 题</span>
        </div>
        <el-input
          v-model="questionSearch"
          :prefix-icon="Search"
          placeholder="搜索题目"
          clearable
          size="small"
          style="width: 180px"
        />
      </div>
    </template>

    <div class="list-body" v-loading="questionsLoading">
      <template v-if="displayQuestions.length">
        <div
          v-for="q in displayQuestions"
          :key="q.id"
          class="list-item"
          :class="{ 'is-current': isCurrentQuestion(q) }"
          @click="toggleCurrentQuestion(q)"
        >
          <div
            class="item-avatar"
            :style="{ background: isCurrentQuestion(q) ? '#ecf5ff' : undefined }"
          >
            <el-icon :size="20" :color="isCurrentQuestion(q) ? '#409eff' : undefined">
              <QuestionFilled />
            </el-icon>
          </div>
          <div class="item-info">
            <div class="item-name item-stem">{{ q.stem }}</div>
            <div class="item-meta">
              <el-tag :type="typeTagType(q.type)" size="small">{{ typeLabel(q.type) }}</el-tag>
              <el-tag :type="categoryTagType(q.category)" size="small">
                {{ categoryLabel(q.category) }}
              </el-tag>
            </div>
          </div>
          <div class="item-extra">
            <el-tag v-if="isCurrentQuestion(q)" type="primary" size="small" effect="dark">
              当前
            </el-tag>
            <span class="item-score">{{ q.score }} 分</span>
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无题目" :image-size="60" />
    </div>
  </el-card>
</template>

<style scoped>
.list-card {
  border-radius: 8px;
  flex: 1;
}

.list-card :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom: 1px solid #ebeef5;
}

.list-card :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.card-count {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
}

.filter-badge {
  font-size: 11px;
  border-radius: 4px;
}

/* 列表项 */
.list-body {
  max-height: 420px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

.list-body::-webkit-scrollbar {
  width: 6px;
}

.list-body::-webkit-scrollbar-track {
  background: transparent;
}

.list-body::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 3px;
}

.list-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid #f2f3f5;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: #f5f7fa;
}

.list-item.is-current {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}

.item-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
}

.item-stem {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.item-extra {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.item-score {
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
}
</style>
