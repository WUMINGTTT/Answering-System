/**
 * 【技术学习】公共展示屏组件 DisplayView.vue
 *
 * 这是大屏展示页面，用于在比赛现场向观众展示：
 * 1. 当前题目和答案
 * 2. 倒计时
 * 3. 风险题选择网格
 * 4. 抢答结果
 * 5. 排名展示
 *
 * 设计思路：
 * - 使用 Socket.IO 实时同步服务器状态
 * - 根据不同游戏阶段（必答、抢答、风险、排名）条件渲染不同内容
 * - 全屏显示，适合投影仪或大屏幕
 * - 支持响应式设计
 */

<!-- ==================== 脚本部分 ==================== -->
<script setup lang="ts">

// -------------------- 导入依赖 --------------------

// Vue 核心函数
// 【技术学习】
// - ref: 创建响应式变量
// - watch: 监听响应式变量的变化
// - computed: 创建计算属性（自动缓存）
// - onMounted: 组件挂载后执行的生命周期钩子
import { ref, watch, computed, onMounted } from 'vue'

// Socket.IO 相关
// 【技术学习】useSocket 返回连接状态和服务器状态
// SyncedGameState 和 PlayerRanking 是 TypeScript 类型定义
import { useSocket, type SyncedGameState, type PlayerRanking } from '@/composables/useSocket'

// 倒计时 composable
// 【技术学习】将倒计时逻辑封装到独立的 composable 中，提高代码复用性
import { useDisplayCountdown } from '@/composables/useDisplayCountdown'

// 题目类型定义
import type { Question } from '@/types/question'

// API 函数
import { getAllQuestions } from '@/api/questions'

// 子组件
// 【技术学习】将大屏的不同区域拆分为独立组件，便于维护
import CountdownTimers from '@/components/displayView/CountdownTimers.vue'      // 倒计时
import QuestionCard from '@/components/displayView/QuestionCard.vue'            // 题目卡片
import AnswerReveal from '@/components/displayView/AnswerReveal.vue'            // 答案展示
import DisplayRanking from '@/components/displayView/DisplayRanking.vue'        // 排名展示
import RiskQuestionGrid from '@/components/displayView/RiskQuestionGrid.vue'    // 风险题网格
import BuzzResultPanel from '@/components/displayView/BuzzResultPanel.vue'      // 抢答结果

// 抢答记录类型
import type { BuzzRecord } from '@/composables/useSocket'

// ==================== Socket.IO 连接 ====================

/**
 * 【技术学习】建立 Socket.IO 连接并同步服务器状态
 *
 * 参数说明：
 * - syncRemote: true - 同步远程状态（展示屏需要实时更新）
 * - pageType: 'display' - 标识页面类型
 *
 * 返回值：
 * - connected: 是否已连接到服务器
 * - serverState: 服务器状态的响应式对象
 */
const { connected, serverState } = useSocket({ syncRemote: true, pageType: 'display' })

// ==================== 倒计时状态 ====================

/**
 * 【技术学习】使用 composable 管理倒计时状态
 *
 * useDisplayCountdown() 封装了：
 * - 倒计时的显示/隐藏控制
 * - 倒计时的计时逻辑
 * - 剩余时间的格式化显示
 * - 与服务器状态的同步
 */
const {
  showQuickAnswerTimer,      // 是否显示抢答倒计时
  showAnswerTimer,           // 是否显示答题倒计时
  isQuickAnswerCounting,     // 抢答倒计时是否正在计数
  isAnswerCounting,          // 答题倒计时是否正在计数
  quickAnswerRemaining,      // 抢答剩余秒数
  answerRemaining,           // 答题剩余秒数
  quickAnswerRemainingText,  // 抢答剩余时间的格式化文本
  answerRemainingText,       // 答题剩余时间的格式化文本
  syncFromServer,            // 从服务器同步状态的函数
} = useDisplayCountdown()

// ==================== 题目状态 ====================

// 当前正在展示的题目
// 【技术学习】ref<Question | null> 表示可以是 Question 对象或 null
const currentQuestion = ref<Question | null>(null)

// 当前风险题的代号（如 A1、B2）
const currentRiskCode = ref<string | null>(null)

// 是否显示答案
const showAnswer = ref(false)

// 当前游戏阶段
// 【技术学习】可能的值：'required'、'quick-answer'、'risk'、'ranking'
const phase = ref('')

// 排名数据
const rankings = ref<PlayerRanking[]>([])

// ==================== 风险题数据 ====================

// 所有题目（用于计算风险题代号）
const allQuestions = ref<Question[]>([])

// 风险题分值筛选条件
const riskScoreFilter = ref(0)

// 已使用的风险题 ID 列表
const usedRiskQuestionIds = ref<string[]>([])

// 抢答记录映射表（题目 ID → 抢答记录数组）
const buzzRecordsMap = ref<Record<string, BuzzRecord[]>>({})

// 抢答获胜者
const buzzWinner = ref<{ userId: string; nickname: string; timestamp: number } | null>(null)

// 抢答是否开放
const buzzOpen = ref(false)

// ==================== 计算属性 ====================

/**
 * 【技术学习】分值到字母代号的映射
 * 10分 → A，20分 → B，30分 → C
 */
const SCORE_LETTER: Record<number, string> = { 10: 'A', 20: 'B', 30: 'C' }

/**
 * 【技术学习】计算风险题 ID 到代号的映射
 *
 * computed 计算属性的特点：
 * 1. 自动缓存：只有依赖的数据变化时才重新计算
 * 2. 响应式：依赖数据变化时自动更新
 *
 * 算法说明：
 * - 按分值分组，每组内的题目按顺序编号
 * - 例如：10分的题目标记为 A1、A2、A3...
 * - 20分的题目标记为 B1、B2、B3...
 */
const riskCodeMap = computed(() => {
  const map = new Map<string, string>()
  // 筛选出所有风险题
  const riskQuestions = allQuestions.value.filter((q) => q.category === 'risk')
  // 记录每个分值的当前编号
  const counters: Record<number, number> = {}

  for (const q of riskQuestions) {
    const s = q.score ?? 0
    const cur = counters[s] ?? 0
    counters[s] = cur + 1
    // 获取分值对应的字母
    const letter = SCORE_LETTER[s] || '?'
    // 生成代号，如 A1、B2
    map.set(q.id, `${letter}${counters[s]}`)
  }

  return map
})

/**
 * 【技术学习】筛选要展示的风险题列表
 *
 * 根据 riskScoreFilter 的值筛选题目：
 * - 0: 显示所有风险题
 * - 10: 只显示 10 分的风险题
 * - 20: 只显示 20 分的风险题
 * - 30: 只显示 30 分的风险题
 */
const displayRiskQuestions = computed(() => {
  let list = allQuestions.value.filter((q) => q.category === 'risk')
  if (riskScoreFilter.value !== 0) {
    list = list.filter((q) => q.score === riskScoreFilter.value)
  }
  return list
})

// ==================== 状态同步 ====================

/**
 * 【技术学习】监听服务器状态变化
 *
 * watch 函数监听 serverState 的变化：
 * - 当服务器推送新状态时，这个函数会被调用
 * - 将服务器状态同步到本地响应式变量
 * - UI 会自动更新以反映最新状态
 *
 * 这是实现实时同步的核心机制
 */
watch(serverState, (s: SyncedGameState | null) => {
  if (!s) return  // 如果状态为空，跳过

  // 同步题目状态
  currentQuestion.value = s.currentQuestion
  currentRiskCode.value = s.currentRiskCode
  showAnswer.value = s.showAnswer
  phase.value = s.status

  // 同步排名数据
  rankings.value = s.rankings || []

  // 同步风险题相关数据
  if (s.riskScoreFilter !== undefined) riskScoreFilter.value = s.riskScoreFilter
  if (s.usedRiskQuestionIds) usedRiskQuestionIds.value = [...s.usedRiskQuestionIds]

  // 同步抢答相关数据
  if (s.buzzRecords) buzzRecordsMap.value = { ...s.buzzRecords }
  buzzWinner.value = s.buzzWinner || null
  buzzOpen.value = s.buzzOpen || false

  // 同步倒计时状态
  syncFromServer(s)
})

// ==================== 数据加载 ====================

/**
 * 【技术学习】从服务器获取所有题目
 *
 * async/await 是处理异步操作的语法糖：
 * - async 标记函数为异步函数
 * - await 等待 Promise 完成
 * - 比 .then() 链式调用更易读
 */
async function fetchQuestions() {
  try {
    const { data: res } = await getAllQuestions()
    allQuestions.value = res.data
  } catch {
    // 静默失败，稍后重试
    // 【技术学习】在 catch 中留空是一种容错策略
    // 展示屏不一定要显示风险题代号，失败不影响主要功能
  }
}

// 组件挂载后获取题目数据
// 【技术学习】onMounted 是生命周期钩子，在组件挂载到 DOM 后执行
onMounted(() => fetchQuestions())

// ==================== 辅助计算属性 ====================

// 是否处于风险题阶段
const isRiskPhase = computed(() => phase.value === 'risk')

// 是否显示风险题网格（风险题阶段且未选择具体题目时）
const showRiskGrid = computed(() => isRiskPhase.value && !currentQuestion.value)

// 游戏阶段的中文标签
const categoryLabel = computed(() => {
  const map: Record<string, string> = {
    required: '必答题',
    'quick-answer': '抢答题',
    risk: '风险题',
  }
  return map[phase.value] || ''
})

// 游戏阶段的主题颜色
const categoryColor = computed(() => {
  const map: Record<string, string> = {
    required: '#409eff',      // 蓝色
    'quick-answer': '#e6a23c', // 橙色
    risk: '#f56c6c',         // 红色
  }
  return map[phase.value] || '#909399'  // 默认灰色
})

// 题目类型的中文标签
const typeLabel = computed(() => {
  if (!currentQuestion.value) return ''
  const map: Record<string, string> = {
    single: '单选题',
    multiple: '多选题',
    subjective: '主观题',
  }
  return map[currentQuestion.value.type] || ''
})

/**
 * 【技术学习】当前题目的抢答记录
 *
 * 从 buzzRecordsMap 中获取当前题目的抢答记录
 * 如果没有当前题目或没有记录，返回空数组
 */
const currentBuzzRecords = computed<BuzzRecord[]>(() => {
  if (!currentQuestion.value) return []
  return buzzRecordsMap.value[currentQuestion.value.id] || []
})
</script>

<!-- ==================== 模板部分 ==================== -->
<template>
  <!-- 全屏展示容器 -->
  <div class="display-page">

    <!-- 背景层：显示背景图片 -->
    <div class="bg-layer" />

    <!-- 内容层：所有实际内容 -->
    <div class="content-layer">

      <!-- ========== 顶部状态栏 ========== -->
      <div class="top-bar">
        <!--
          【技术学习】条件渲染
          v-if="categoryLabel" 只在有游戏阶段标签时显示
        -->
        <span v-if="categoryLabel" class="phase-tag" :style="{ background: categoryColor }">
          {{ categoryLabel }}
        </span>

        <!-- 风险题代号（如 A1、B2） -->
        <span v-if="currentRiskCode" class="risk-code-badge">{{ currentRiskCode }}</span>

        <!--
          【技术学习】连接状态指示器
          :class="{ connected }" 是动态 class 绑定
          当 connected 为 true 时，会添加 'connected' 类名
        -->
        <span class="connection-dot" :class="{ connected }" />
      </div>

      <!-- ========== 中间主体区域 ========== -->
      <div class="main-area">

        <!--
          【技术学习】多条件渲染
          使用 v-if / v-else-if / v-else 链式判断
          Vue 会根据条件显示对应的区块，只会渲染一个
        -->

        <!-- 排名展示 -->
        <template v-if="phase === 'ranking'">
          <DisplayRanking :rankings="rankings" />
        </template>

        <!-- 风险题网格（未选题时显示） -->
        <template v-else-if="showRiskGrid">
          <div class="risk-grid-header">
            <span class="risk-grid-title">请选择题号</span>
          </div>
          <!--
            【技术学习】组件 Props 传递
            :questions - 传递题目列表
            :code-map - 传递代号映射
            :used-ids - 传递已使用的题目 ID
          -->
          <RiskQuestionGrid
            :questions="displayRiskQuestions"
            :code-map="riskCodeMap"
            :used-ids="usedRiskQuestionIds"
          />
        </template>

        <!-- 答题展示（含风险题选中后展示） -->
        <template v-else-if="currentQuestion">

          <!-- 倒计时组件（仅管理员启动后展示） -->
          <CountdownTimers
            :show-quick-answer="showQuickAnswerTimer"
            :show-answer="showAnswerTimer"
            :is-quick-answer-counting="isQuickAnswerCounting"
            :is-answer-counting="isAnswerCounting"
            :quick-answer-remaining="quickAnswerRemaining"
            :answer-remaining="answerRemaining"
            :quick-answer-text="quickAnswerRemainingText"
            :answer-text="answerRemainingText"
          />

          <!-- 题目卡片 -->
          <QuestionCard
            :question="currentQuestion"
            :type-label="typeLabel"
          />

          <!-- 答案（后台控制显隐） -->
          <!--
            【技术学习】v-if 条件渲染
            只有当 showAnswer 为 true 时才渲染答案组件
          -->
          <AnswerReveal
            v-if="showAnswer"
            :answers="currentQuestion.answers"
          />

          <!-- 抢答结果面板（抢答题阶段实时展示） -->
          <BuzzResultPanel
            v-if="phase === 'quick-answer'"
            :records="currentBuzzRecords"
            :winner="buzzWinner"
            :is-counting="isQuickAnswerCounting"
            :buzz-open="buzzOpen"
          />
        </template>

        <!-- 等待状态（没有题目时显示） -->
        <div v-else class="waiting-state">
          <div class="waiting-text">等待选题...</div>
          <div class="waiting-sub">题目将在此处展示</div>
        </div>
      </div>

      <!-- ========== 底部状态栏 ========== -->
      <div class="bottom-bar">
        <!-- 断开连接提示 -->
        <span v-if="!connected" class="disconnected-hint">● 正在连接...</span>
      </div>
    </div>
  </div>
</template>

<!-- ==================== 样式部分 ==================== -->
<style scoped>
/* ========== 全屏容器 ========== */
/*
 * 【技术学习】全屏布局技巧
 *
 * position: fixed - 固定定位，脱离文档流
 * inset: 0 - 简写形式，等价于 top: 0; right: 0; bottom: 0; left: 0;
 * 这样可以让元素占满整个视口
 */
.display-page {
  position: fixed;
  inset: 0;
  overflow: hidden;  /* 隐藏溢出内容 */
}

/* ========== 背景层 ========== */
/*
 * 【技术学习】背景图片叠加效果
 *
 * 1. .bg-layer 显示背景图片
 * 2. .bg-layer::after 伪元素添加半透明黑色遮罩
 * 这样可以让文字更容易阅读
 */
.bg-layer {
  position: absolute;
  inset: 0;
  background: url('/src/public/bg.jpg') center / cover no-repeat;
}

.bg-layer::after {
  content: '';  /* 伪元素必须有 content */
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);  /* 45% 不透明度的黑色 */
}

/* ========== 内容层 ========== */
.content-layer {
  position: relative;
  z-index: 1;  /* 确保内容在背景之上 */
  height: 100%;
  display: flex;
  flex-direction: column;  /* 垂直布局 */
  color: #fff;  /* 白色文字 */
}

/* ========== 顶部栏 ========== */
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  flex-shrink: 0;  /* 不允许缩小 */
}

/* 游戏阶段标签 */
.phase-tag {
  font-size: 16px;
  font-weight: 600;
  padding: 6px 18px;
  border-radius: 6px;
  letter-spacing: 2px;
}

/* 风险题代号 */
.risk-code-badge {
  font-size: 22px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  color: #ffa39e;
  letter-spacing: 2px;
}

/* 连接状态指示器 */
/*
 * 【技术学习】动态样式
 *
 * 默认红色（断开），添加 .connected 类后变绿色
 * transition 实现颜色平滑过渡
 */
.connection-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;  /* 默认红色 */
  margin-left: auto;    /* 推到右侧 */
  transition: background 0.3s;
}
.connection-dot.connected {
  background: #67c23a;  /* 绿色 */
}

/* ========== 中间主体 ========== */
.main-area {
  flex: 1;  /* 占据剩余空间 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 60px;
  min-height: 0;  /* 防止 flex 子元素溢出 */
}

/* ========== 风险题网格标题 ========== */
.risk-grid-header {
  text-align: center;
  margin-bottom: 20px;
}

.risk-grid-title {
  font-size: 22px;
  font-weight: 600;
  opacity: 0.8;
  letter-spacing: 4px;
}

/* ========== 等待状态 ========== */
.waiting-state {
  text-align: center;
  opacity: 0.7;
}

.waiting-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.waiting-text {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.waiting-sub {
  font-size: 16px;
  opacity: 0.6;
}

/* ========== 底部 ========== */
.bottom-bar {
  display: flex;
  justify-content: center;
  padding: 12px;
  flex-shrink: 0;
}

/* 断开连接提示 */
.disconnected-hint {
  font-size: 13px;
  opacity: 0.5;
  animation: pulse-warn 1.5s ease-in-out infinite alternate;
}

/*
 * 【技术学习】CSS 动画
 *
 * @keyframes 定义动画的关键帧
 * infinite: 无限循环
 * alternate: 动画交替播放（正向 → 反向 → 正向...）
 *
 * 这个动画让断开连接提示在 0.5 到 1 不透明度之间闪烁
 */
@keyframes pulse-warn {
  from { opacity: 1; }
  to { opacity: 0.5; }
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .main-area {
    padding: 16px 20px;
  }
}
</style>
