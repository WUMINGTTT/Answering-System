<!--
  ====================================================================
  QuestionList.vue — 题目列表组件（仪表盘专用）
  ====================================================================

  【组件职责】
  在仪表盘右侧展示题目列表，支持：
  1. 按游戏阶段自动筛选题目类别（必答/抢答/风险题）
  2. 风险题分值筛选（10分/20分/30分）
  3. 风险题编码映射（如 A1、B3、C10）
  4. 点击题目设为当前展示题目（再次点击取消）
  5. 向父组件 emit 风险题数据变化通知

  【技术学习 — 设计思路】
  - 题目列表根据当前游戏阶段自动过滤：只显示与当前阶段匹配类别的题目
  - 风险题编码系统：按分值分组（A=10分、B=20分、C=30分），组内按顺序编号
  - 点击选中/取消选中逻辑：单选模式，风险题阶段需先取消再选新题
  - 选中题目时自动切换游戏阶段（确保选手端第一时间看到题目）

  【风险题编码规则】
  - 10 分 → 字母 A，20 分 → 字母 B，30 分 → 字母 C
  - 组内按题目在数据库中的顺序编号，从 1 开始
  - 示例：A1 = 第一道 10 分风险题，B3 = 第三道 20 分风险题

  【数据流】
  API (getAllQuestions) → questions → displayQuestions（computed 筛选）→ 模板
  选中题目 → gameStore.setCurrentQuestion() → 通过 Store 同步到所有组件
  风险题数据变化 → emit('risk-data-changed') → 父组件 DashboardPanel 接收
-->

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { QuestionFilled, Search } from '@element-plus/icons-vue'
import { getAllQuestions } from '@/api/questions'
import type { Question } from '@/types/question'
import { useGameStatusStore, QUESTION_PHASES, type GameStatus } from '@/stores/gameStatus'

const store = useGameStatusStore()

// ====================================================================
// 向父组件暴露风险题数据
// ====================================================================
/**
 * 【技术学习】defineEmits 定义组件可触发的事件
 * 'risk-data-changed' 事件携带一个 payload 对象，包含：
 * - riskQuestions: 所有风险题列表
 * - riskCodeMap: 题目 ID → 编码的映射表
 * - riskScoreFilter: 当前分值筛选值
 */
const emit = defineEmits<{
  'risk-data-changed': [payload: { riskQuestions: Question[]; riskCodeMap: Map<string, string>; riskScoreFilter: number }]
}>()

// ====================================================================
// 题目列表数据与筛选
// ====================================================================
const questions = ref<Question[]>([])
const questionsLoading = ref(false)
const questionSearch = ref('')

/** 风险题阶段的分值筛选（0 = 全部显示） */
const riskScoreFilter = ref<number>(0)

/** 风险题可选分值列表 */
const RISK_SCORES = [10, 20, 30]

/**
 * 风险题分值 → 字母代号映射
 * 【技术学习】使用 Record<number, string> 类型确保键为数字、值为字符串
 */
const SCORE_LETTER: Record<number, string> = { 10: 'A', 20: 'B', 30: 'C' }

/**
 * 风险题 ID → 代号的计算映射
 * 【技术学习】computed 返回一个 Map 对象
 * Map 比普通对象更适合做 ID → 值的映射，查找效率 O(1)
 *
 * 编码逻辑：
 * 1. 筛选出所有 category === 'risk' 的题目
 * 2. 按分值分组（A 组 = 10 分，B 组 = 20 分，C 组 = 30 分）
 * 3. 每组内按原始顺序编号（从 1 开始）
 * 4. 最终编码格式：字母 + 编号（如 A1、B3、C10）
 */
const riskCodeMap = computed(() => {
  const map = new Map<string, string>()
  const riskQuestions = questions.value.filter((q) => q.category === 'risk')

  // 【技术学习】counters 记录每个分值组的当前编号
  const counters: Record<number, number> = {}
  for (const q of riskQuestions) {
    const s = q.score ?? 0
    const cur = counters[s] ?? 0      // 当前组的编号（从 0 开始）
    counters[s] = cur + 1             // 编号 +1
    const letter = SCORE_LETTER[s] || '?'  // 分值对应的字母
    map.set(q.id, `${letter}${counters[s]}`)  // 如 "A1"、"B3"
  }
  return map
})

/**
 * 根据当前状态自动筛选题目
 * 【技术学习】筛选逻辑链：
 * 1. 如果当前是答题阶段（必答/抢答/风险），只显示对应类别的题目
 * 2. 如果是风险题阶段且设置了分值筛选，进一步按分值过滤
 * 3. 如果有搜索关键词，按题干内容过滤
 */
const displayQuestions = computed(() => {
  let list = questions.value

  // 仅当状态为答题阶段时按类别过滤
  if ((QUESTION_PHASES as readonly string[]).includes(store.status)) {
    list = list.filter((q) => q.category === store.status)
  }

  // 风险题阶段按分值筛选
  if (store.status === 'risk' && riskScoreFilter.value !== 0) {
    list = list.filter((q) => q.score === riskScoreFilter.value)
  }

  // 按关键词搜索
  const kw = questionSearch.value.trim().toLowerCase()
  if (kw) {
    list = list.filter((q) => q.stem.toLowerCase().includes(kw))
  }
  return list
})

/**
 * 题目列表标题提示文字
 * 答题阶段显示阶段名称，其他阶段显示"全部类别"
 */
const questionListHint = computed(() => {
  if ((QUESTION_PHASES as readonly string[]).includes(store.status)) {
    return store.statusLabel
  }
  return '全部类别'
})

/**
 * 从服务器获取题目数据
 */
async function fetchQuestions() {
  questionsLoading.value = true
  try {
    const { data: res } = await getAllQuestions()
    questions.value = res.data
    emitRiskData()  // 获取数据后立即通知父组件
  } catch {
    ElMessage.error('获取题目列表失败')
  } finally {
    questionsLoading.value = false
  }
}

// ====================================================================
// 风险题数据通知
// ====================================================================
/** 所有风险题的计算属性 */
const allRiskQuestions = computed(() =>
  questions.value.filter((q) => q.category === 'risk'),
)

/**
 * 向父组件发送风险题数据变化通知
 * 【技术学习】父组件通过 @risk-data-changed="onRiskDataChanged" 接收
 */
function emitRiskData() {
  emit('risk-data-changed', {
    riskQuestions: allRiskQuestions.value,
    riskCodeMap: riskCodeMap.value,
    riskScoreFilter: riskScoreFilter.value,
  })
}

// 分值筛选变化时同步通知父组件
watch(riskScoreFilter, () => emitRiskData())

// ====================================================================
// 选中/取消选中题目
// ====================================================================
/**
 * 切换当前题目的选中状态
 * 【技术学习】选中逻辑：
 * 1. 如果点击的是已选中的题目 → 取消选中
 * 2. 如果点击的是未选中的题目：
 *    a. 风险题阶段且已有选中题目 → 提示先取消再选（防止误操作）
 *    b. 自动切换游戏阶段到题目对应类别
 *    c. 设置为当前题目
 *
 * 注意：store.setCurrentQuestion(q, rCode) 第二个参数是风险题编码
 */
function toggleCurrentQuestion(q: Question) {
  if (isCurrentQuestion(q)) {
    // 再次点击已选中的题目 → 取消选中
    store.setCurrentQuestion(null)
    ElMessage.info('已取消当前展示题目')
  } else {
    // 风险题阶段：已有选中题目时，需先取消再选新题
    if (store.status === 'risk' && store.currentQuestion) {
      ElMessage.warning('请先取消选择当前题目，再选择新题目')
      return
    }
    // 根据题目类别自动切换游戏阶段
    const phase = q.category as GameStatus
    if (store.status !== phase) {
      store.status = phase
    }
    // 获取风险题编码（非风险题返回 undefined）
    const rCode = riskCodeMap.value.get(q.id)
    store.setCurrentQuestion(q, rCode)
    // 显示成功提示（风险题显示编码，其他题显示题干前 20 字）
    const label = rCode ? `「${rCode}」` : `「${q.stem.slice(0, 20)}...」`
    ElMessage.success(`已将 ${label} 设为当前展示题目`)
  }
}

/** 判断题目是否为当前选中题目 */
function isCurrentQuestion(q: Question) {
  return store.currentQuestion?.id === q.id
}

// ====================================================================
// 标签辅助函数
// ====================================================================
function typeLabel(type: string) {
  const map: Record<string, string> = { single: '单选', multiple: '多选', subjective: '主观' }
  return map[type] || type
}

function typeTagType(type: string) {
  const map: Record<string, string> = { single: 'primary', multiple: 'success', subjective: 'warning' }
  return map[type] || 'info'
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = { required: '必答题', 'quick-answer': '抢答题', risk: '风险题' }
  return map[cat] || cat
}

function categoryTagType(cat: string) {
  const map: Record<string, string> = { required: '', 'quick-answer': 'danger', risk: 'warning' }
  return map[cat] || 'info'
}

// ====================================================================
// 初始化
// ====================================================================
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
          <!-- 当前筛选的类别标签 -->
          <el-tag :color="store.statusColor" size="small" effect="dark" class="filter-badge">
            {{ questionListHint }}
          </el-tag>
          <span class="card-count">{{ displayQuestions.length }} 题</span>
        </div>
        <div class="card-header-right">
          <!-- 风险题分值筛选（仅在风险题阶段显示） -->
          <el-radio-group
            v-if="store.status === 'risk'"
            v-model="riskScoreFilter"
            size="small"
            class="score-filter"
          >
            <el-radio-button :value="0">全部</el-radio-button>
            <el-radio-button
              v-for="s in RISK_SCORES"
              :key="s"
              :value="s"
            >{{ s }} 分</el-radio-button>
          </el-radio-group>
          <!-- 搜索框 -->
          <el-input
            v-model="questionSearch"
            :prefix-icon="Search"
            placeholder="搜索题目"
            clearable
            size="small"
            style="width: 180px"
          />
        </div>
      </div>
    </template>

    <!-- 题目列表 -->
    <div class="list-body" v-loading="questionsLoading">
      <template v-if="displayQuestions.length">
        <div
          v-for="q in displayQuestions"
          :key="q.id"
          class="list-item"
          :class="{ 'is-current': isCurrentQuestion(q) }"
          @click="toggleCurrentQuestion(q)"
        >
          <!-- 图标（选中时变色） -->
          <div
            class="item-avatar"
            :style="{ background: isCurrentQuestion(q) ? 'var(--bg-active)' : undefined }"
          >
            <el-icon :size="20" :color="isCurrentQuestion(q) ? 'var(--color-primary)' : undefined">
              <QuestionFilled />
            </el-icon>
          </div>

          <!-- 题目信息：题干 + 标签 -->
          <div class="item-info">
            <div class="item-name item-stem">{{ q.stem }}</div>
            <div class="item-meta">
              <el-tag :type="typeTagType(q.type)" size="small">{{ typeLabel(q.type) }}</el-tag>
              <el-tag :type="categoryTagType(q.category)" size="small">
                {{ categoryLabel(q.category) }}
              </el-tag>
            </div>
          </div>

          <!-- 右侧信息：当前标签 + 风险题编码 + 分值 -->
          <div class="item-extra">
            <el-tag v-if="isCurrentQuestion(q)" type="primary" size="small" effect="dark">
              当前
            </el-tag>
            <!-- 风险题额外显示代号 -->
            <span v-if="q.category === 'risk'" class="item-code">{{ riskCodeMap.get(q.id) }}</span>
            <span class="item-score">{{ q.score }} 分</span>
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无题目" :image-size="60" />
    </div>
  </el-card>
</template>

<style scoped>
/* 卡片容器 */
.list-card {
  border-radius: 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-card :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-base);
  flex-shrink: 0;
}

.list-card :deep(.el-card__body) {
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.card-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-filter { flex-shrink: 0; }

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

.filter-badge {
  font-size: 11px;
  border-radius: 4px;
}

/* ========== 列表项 ========== */
.list-body {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c4c4c4 transparent;
}

.list-body::-webkit-scrollbar { width: 6px; }
.list-body::-webkit-scrollbar-track { background: transparent; }
.list-body::-webkit-scrollbar-thumb { background: #c4c4c4; border-radius: 3px; }
.list-body::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid var(--border-light);
}

.list-item:last-child { border-bottom: none; }
.list-item:hover { background: var(--bg-hover); }

/* 【技术学习】选中状态样式：背景色 + 左侧蓝色边框 */
.list-item.is-current {
  background: var(--bg-active);
  border-left: 3px solid var(--color-primary);
}

.item-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.item-info { flex: 1; min-width: 0; }

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

/* 题干溢出时显示省略号 */
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
  color: var(--color-primary);
  font-weight: 600;
}

/* 风险题编码（红色等宽字体） */
.item-code {
  font-size: 15px;
  color: #f56c6c;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  letter-spacing: 0.5px;
}
</style>
