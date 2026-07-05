<!--
  ====================================================================
  DashboardPanel.vue — 管理面板核心仪表盘组件
  ====================================================================

  【组件职责】
  这是管理后台的"大脑"，负责：
  1. 通过 Socket.IO 与服务器进行双向状态同步（远端 → 本地，本地 → 远端）
  2. 管理游戏的全局状态（当前阶段、当前题目、是否显示答案等）
  3. 计算选手排名
  4. 处理风险题的已选记录
  5. 协调所有子组件的状态

  【技术学习 — 设计思路】
  - 采用"中央集权"设计：此组件持有所有关键状态，子组件通过 props 接收数据、通过 emit 向上传递事件
  - 使用 syncingRemote 标志位防止"回环"：从服务器同步到本地时，不再次推送到服务器，避免无限循环
  - computed 派生同步载荷（syncPayload），只在本地操作时才推送，远端同步时跳过
  - watch 监听多种状态变化，实现自动化联动（如切换题目时自动停止倒计时）

  【子组件通信关系】
  - StatusControls    ← props: connected | emit: reset-used-questions
  - CurrentQuestion   ← 纯展示，读取 store 中的 currentQuestion
  - PlayerList        ← ref 调用 fetchUsers() | emit: 无（得分变动通过事件总线）
  - QuestionList      ← emit: risk-data-changed（传递风险题数据）
  - PlayerStatusPanel ← 纯展示，读取 Socket 的 playerStatuses
  - BuzzPlayerList    ← props: records, winner, buzzOpen, currentQuestion | emit: score-added
  ====================================================================
-->

<script setup lang="ts">
// ── Vue 3 Composition API 核心函数 ──
import { ref, watch, computed, nextTick } from 'vue'

// ── 导入子组件 ──
import StatusControls from './dashboard/StatusControls.vue'      // 游戏阶段切换控制面板
import CurrentQuestion from './dashboard/CurrentQuestion.vue'     // 当前题目展示卡片
import PlayerList from './dashboard/PlayerList.vue'               // 选手列表（含得分管理）
import QuestionList from './dashboard/QuestionList.vue'           // 题目列表（含风险题筛选）
import PlayerStatusPanel from './dashboard/PlayerStatusPanel.vue' // 选手答题状态面板
import BuzzPlayerList from './dashboard/BuzzPlayerList.vue'       // 抢答选手列表

// ── 导入 Socket.IO 组合式函数及相关类型 ──
// 【技术学习】useSocket 是自定义的 composable，封装了 Socket.IO 的连接和状态同步逻辑
import { useSocket, type PlayerRanking, type PlayerAnswerStatus, type BuzzRecord } from '@/composables/useSocket'

// ── 导入 Pinia Store（全局状态管理） ──
import { useGameStatusStore } from '@/stores/gameStatus'   // 游戏状态（阶段、题目、答案显示）
import { useCountdownStore } from '@/stores/countdown'      // 倒计时状态（剩余时间、是否计时中）

// ── 导入 API 函数 ──
import { getAllUsers } from '@/api/users'                   // 获取所有用户数据

// ── 导入类型定义 ──
import type { Question } from '@/types/question'

// ====================================================================
// 初始化 Store 实例
// 【技术学习】Pinia store 是响应式的，任何对 store 属性的修改都会自动触发视图更新
// ====================================================================
const gameStore = useGameStatusStore()
const countdownStore = useCountdownStore()

// ====================================================================
// Socket.IO 连接与状态同步
// ====================================================================
// 【技术学习】useSocket 返回三个核心值：
//   - connected: 布尔值，表示是否已连接到服务器
//   - serverState: 服务器推送过来的最新状态（响应式对象）
//   - pushState: 将本地状态推送到服务器的函数
// syncRemote: true 表示此页面会接收服务器推送的状态（管理页需要双向同步）
// pageType: 'admin' 告知服务器这是管理页面（用于会话统计）
const { connected, serverState, pushState } = useSocket({ syncRemote: true, pageType: 'admin' })

/**
 * 防回环标志位
 * 【技术学习】这是一个普通的变量（不是 ref），因为它的变化不需要触发视图更新。
 * 当我们从服务器同步数据到本地时，设为 true，防止 watch 把刚同步的数据又推回服务器。
 */
let syncingRemote = false

// ====================================================================
// 远端 → 本地：当服务器推送新状态时，同步到本地 Store
// ====================================================================
// 【技术学习】watch 监听 serverState 的变化。
// 当任何客户端（包括本页面）推送到服务器后，服务器会广播最新状态，
// 所有连接的管理页都会收到并执行此回调，将状态写入本地 store。
watch(serverState, (s) => {
  if (!s) return  // 如果服务器状态为空，跳过

  // 标记正在从远端同步，防止后续的 store 变化触发推送到服务器
  syncingRemote = true

  // ── 同步游戏状态到 gameStore ──
  gameStore.status = s.status as typeof gameStore.status       // 游戏阶段（waiting/required/quick-answer/risk/ranking）
  gameStore.currentQuestion = s.currentQuestion                 // 当前选中的题目对象
  gameStore.currentRiskCode = s.currentRiskCode                 // 当前风险题的代号（如 A1、B3）
  gameStore.showAnswer = s.showAnswer                           // 是否在展示页显示答案

  // ── 同步倒计时状态到 countdownStore ──
  countdownStore.answerDuration = s.answerDuration              // 答题倒计时总时长（秒）
  countdownStore.quickAnswerDuration = s.quickAnswerDuration    // 抢答倒计时总时长（秒）
  countdownStore.answerEndTime = s.answerEndTime                // 答题倒计时的结束时间戳
  countdownStore.quickAnswerEndTime = s.quickAnswerEndTime      // 抢答倒计时的结束时间戳
  countdownStore.isAnswerCounting = s.isAnswerCounting          // 答题倒计时是否正在进行
  countdownStore.isQuickAnswerCounting = s.isQuickAnswerCounting // 抢答倒计时是否正在进行

  // 【技术学习】根据 endTime 反推 remaining（剩余秒数）
  // 这样即使页面刷新，也能正确显示剩余时间，而不是从头开始
  // Math.ceil 向上取整，Math.max(0, ...) 确保不会出现负数
  if (s.isAnswerCounting && s.answerEndTime) {
    countdownStore.answerRemaining = Math.max(0, Math.ceil((s.answerEndTime - Date.now()) / 1000))
  }
  if (s.isQuickAnswerCounting && s.quickAnswerEndTime) {
    countdownStore.quickAnswerRemaining = Math.max(0, Math.ceil((s.quickAnswerEndTime - Date.now()) / 1000))
  }

  // ── 同步其他管理页特有数据 ──
  if (s.rankings) rankings.value = s.rankings                                       // 排名数据
  if (s.usedRiskQuestionIds) usedRiskQuestionIds.value = [...s.usedRiskQuestionIds] // 已使用的风险题 ID 列表
  if (s.riskScoreFilter !== undefined) riskScoreFilter.value = s.riskScoreFilter    // 风险题分值筛选
  if (s.playerStatuses) playerStatuses.value = [...s.playerStatuses]                // 选手答题状态
  if (s.buzzOpen !== undefined) buzzOpen.value = s.buzzOpen                          // 抢答是否开启
  if (s.buzzWinner !== undefined) buzzWinner.value = s.buzzWinner                   // 抢答获胜者
  if (s.buzzRecords) buzzRecordsMap.value = { ...s.buzzRecords }                    // 抢答记录映射表

  // 【技术学习】nextTick 确保所有响应式更新完成后再重置标志位
  // 这样本轮 watch 触发的 computed/watch 都能正确检测到 syncingRemote = true
  nextTick(() => { syncingRemote = false })
})

// ====================================================================
// 阶段切换时自动重置倒计时
// ====================================================================
// 【技术学习】当管理员手动切换游戏阶段（如从"必答题"切换到"抢答题"），
// 自动重置所有倒计时，避免上一阶段的倒计时干扰新阶段。
// syncingRemote 检查：如果是从服务器同步过来的阶段变化，不要重置，
// 因为服务器的状态已经是正确的。
watch(() => gameStore.status, () => {
  if (syncingRemote) return  // 远端同步时跳过，防止覆盖服务器的倒计时数据
  countdownStore.resetAll()
})

// ====================================================================
// 切换题目时自动停止倒计时 + 记录已使用的风险题
// ====================================================================
// 【技术学习】这是一个复合 watch，处理两个逻辑：
// 1. 如果倒计时正在进行中，自动停止并提示管理员
// 2. 如果是风险题阶段，将选中的题目 ID 记录到已使用列表中
watch(() => gameStore.currentQuestion, () => {
  if (syncingRemote) return  // 远端同步时跳过

  // 逻辑1：切换题目时，如果倒计时正在运行，自动停止
  if (countdownStore.isAnswerCounting || countdownStore.isQuickAnswerCounting) {
    countdownStore.resetAll()
    ElMessage.info('已切换题目，倒计时已自动停止')
  }

  // 逻辑2：风险题选中时记录为已使用（防止重复选择同一道风险题）
  if (
    gameStore.status === 'risk' &&                                    // 当前是风险题阶段
    gameStore.currentQuestion &&                                       // 有选中的题目
    gameStore.currentQuestion.category === 'risk'                      // 且该题目确实是风险题
  ) {
    const id = gameStore.currentQuestion.id
    if (!usedRiskQuestionIds.value.includes(id)) {
      usedRiskQuestionIds.value.push(id)  // 添加到已使用列表
    }
  }
})

// ====================================================================
// 排名数据
// ====================================================================
const rankings = ref<PlayerRanking[]>([])  // 排名列表，每个元素包含 rank、nickname、totalScore

// 【技术学习】ref<InstanceType<typeof PlayerList>>() 用于获取子组件的引用
// 通过这个引用，可以调用子组件暴露的方法（如 fetchUsers()）
const playerListRef = ref<InstanceType<typeof PlayerList>>()

/**
 * 得分变动后的回调函数
 * 当在抢答列表等子组件中修改了得分后，需要同步刷新排名和选手列表
 */
function onScoreAdded() {
  fetchRankings()                        // 重新计算排名
  playerListRef.value?.fetchUsers()      // 刷新选手列表（通过 ref 调用子组件方法）
}

/**
 * 从 API 拉取选手列表并计算排名
 * 【技术学习】排名计算逻辑：
 * 1. 获取所有用户
 * 2. 筛选出角色为 "player" 的用户
 * 3. 按总分从高到低排序
 * 4. 生成排名数据（rank 从 1 开始）
 */
async function fetchRankings() {
  try {
    const { data: res } = await getAllUsers()
    const players = res.data
      .filter((u) => u.role === 'player')            // 只保留选手，排除管理员
      .sort((a, b) => b.totalScore - a.totalScore)   // 按总分降序排列
    // 【技术学习】map 的第二个参数 i 是索引，从 0 开始，所以 rank = i + 1
    rankings.value = players.map((p, i) => ({
      rank: i + 1,
      nickname: p.nickname,
      totalScore: p.totalScore,
    }))
  } catch {
    ElMessage.error('获取排名数据失败')
  }
}

// 进入排名展示阶段时，自动拉取最新排名数据
watch(() => gameStore.status, (s) => {
  if (syncingRemote) return
  if (s === 'ranking') fetchRankings()  // 只在切换到排名阶段时拉取
})

// ====================================================================
// 风险题相关数据
// ====================================================================
const riskScoreFilter = ref(0)                     // 风险题分值筛选（0=全部，10/20/30=按分值筛选）
const usedRiskQuestionIds = ref<string[]>([])       // 已使用过的风险题 ID 列表（防止重复出题）
const playerStatuses = ref<PlayerAnswerStatus[]>([]) // 选手答题状态列表（waiting/answering/submitted）

// ── 抢答相关数据 ──
const buzzOpen = ref(false)                        // 抢答是否已开启
const buzzWinner = ref<{ userId: string; nickname: string; timestamp: number } | null>(null) // 抢答获胜者
const buzzRecordsMap = ref<Record<string, BuzzRecord[]>>({}) // 按题目 ID 分组的抢答记录

/**
 * QuestionList 子组件通知风险题数据变化时的回调
 * 【技术学习】子组件通过 emit('risk-data-changed', payload) 向上传递数据
 * 父组件通过 @risk-data-changed="onRiskDataChanged" 接收
 */
function onRiskDataChanged(payload: {
  riskQuestions: Question[]
  riskCodeMap: Map<string, string>
  riskScoreFilter: number
}) {
  riskScoreFilter.value = payload.riskScoreFilter
}

// ====================================================================
// 本地 → 远端：将关键状态推送到服务器
// ====================================================================
// 【技术学习】computed 会自动追踪其依赖项的变化。
// 当 gameStore 或 countdownStore 中的任何属性变化时，syncPayload 会自动重新计算。
// 这样我们只需要 watch syncPayload 一个值，就能捕获所有需要同步的状态变化。
const syncPayload = computed(() => ({
  status: gameStore.status,                          // 游戏阶段
  currentQuestion: gameStore.currentQuestion,        // 当前题目
  currentRiskCode: gameStore.currentRiskCode,        // 风险题代号
  showAnswer: gameStore.showAnswer,                  // 是否显示答案
  // ── 倒计时相关 ──
  answerDuration: countdownStore.answerDuration,
  quickAnswerDuration: countdownStore.quickAnswerDuration,
  answerEndTime: countdownStore.answerEndTime,
  quickAnswerEndTime: countdownStore.quickAnswerEndTime,
  isAnswerCounting: countdownStore.isAnswerCounting,
  isQuickAnswerCounting: countdownStore.isQuickAnswerCounting,
  // ── 排名和风险题数据 ──
  rankings: rankings.value,
  riskScoreFilter: riskScoreFilter.value,
  usedRiskQuestionIds: [...usedRiskQuestionIds.value], // 使用展开运算符创建副本，避免引用问题
}))

// 【技术学习】watch syncPayload，当本地状态变化时推送到服务器
// { deep: true } 表示深度监听，对象内部属性变化也会触发
watch(syncPayload, (val) => {
  if (syncingRemote) return  // 防回环：如果是从服务器同步过来的，不要再推回去
  pushState(val)             // 将状态推送到服务器，服务器会广播给所有客户端
}, { deep: true })
</script>

<template>
  <!--
    【技术学习】模板布局结构：
    第一行：StatusControls（状态控制卡片）
    第二行：PlayerStatusPanel 或 BuzzPlayerList（根据阶段条件显示）
    第三行：三列布局 —— 当前题目 | 选手列表 | 题目列表
  -->
  <div class="dashboard">
    <!-- 状态控制面板：显示当前状态标签 + 切换按钮 + 倒计时 -->
    <!-- @reset-used-questions: 子组件通知父组件清空已使用的风险题 ID 列表 -->
    <StatusControls :connected="connected" @reset-used-questions="usedRiskQuestionIds = []" />

    <!-- 必答题阶段：显示选手答题状态面板（waiting/answering/submitted） -->
    <PlayerStatusPanel v-if="gameStore.status === 'required'" />

    <!-- 抢答题阶段：显示抢答选手列表（有效/提前抢答） -->
    <!-- :records: 当前题目的抢答记录数组 -->
    <!-- :winner: 抢答获胜者信息 -->
    <!-- :buzz-open: 抢答是否已开启 -->
    <!-- :current-question: 当前题目（用于自动填充得分原因） -->
    <!-- @score-added: 子组件修改得分后，通知父组件刷新排名和选手列表 -->
    <BuzzPlayerList
      v-if="gameStore.status === 'quick-answer'"
      :records="buzzRecordsMap[gameStore.currentQuestion?.id || ''] || []"
      :winner="buzzWinner"
      :buzz-open="buzzOpen"
      :current-question="gameStore.currentQuestion"
      @score-added="onScoreAdded"
    />

    <!--
      三列布局区域
      【技术学习】使用 Element Plus 的栅格系统（el-row + el-col）实现响应式布局
      - xs: 手机 (<768px)
      - sm: 平板 (>=768px)
      - md: 小桌面 (>=992px)
      - lg: 大桌面 (>=1200px)
      每个断点下的数字表示该列占 24 格中的几格
    -->
    <el-row :gutter="16" class="list-row">
      <el-col :xs="24" :sm="24" :md="6" :lg="5">
        <!-- 当前题目展示卡片（左侧） -->
        <CurrentQuestion />
      </el-col>
      <el-col :xs="24" :sm="12" :md="9" :lg="9">
        <!-- 选手列表（中间），ref 用于调用子组件的 fetchUsers() 方法 -->
        <PlayerList ref="playerListRef" />
      </el-col>
      <el-col :xs="24" :sm="12" :md="9" :lg="10">
        <!-- 题目列表（右侧），@risk-data-changed 接收风险题数据变更通知 -->
        <QuestionList @risk-data-changed="onRiskDataChanged" />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
/* 仪表盘主容器：纵向 flex 布局，子元素之间有 20px 间距 */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

/* 三列布局行：flex: 1 占据剩余空间，min-height: 0 允许内容收缩 */
.list-row {
  flex: 1;
  min-height: 0;
}

/* 【技术学习】:deep() 是 Vue 的深度选择器，用于穿透 scoped 样式限制
   修改子组件内部的 el-col 样式 */
.list-row :deep(.el-col) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* 平板及以下（<=991px）：纵向堆叠，列表区限制高度内部滚动 */
@media (max-width: 991px) {
  .dashboard {
    height: auto;
  }

  .list-row {
    flex: none;
    min-height: auto;
  }

  .list-row :deep(.el-col) {
    overflow: visible;
    height: auto;
  }

  .list-row .el-col {
    flex: 0 0 100%;   /* 每列占满整行 */
    max-width: 100%;
    margin-bottom: 16px;
  }

  .list-row .el-col:last-child {
    margin-bottom: 0;  /* 最后一列不需要底部间距 */
  }

  /* 列表区限制最大高度，内部滚动（当前题目卡片除外） */
  .list-row .el-col {
    max-height: 360px;
  }
  .list-row .el-col:first-child {
    max-height: none;  /* 当前题目卡片不限制高度 */
  }
}
</style>
