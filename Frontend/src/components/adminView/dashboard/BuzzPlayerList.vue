<!--
  ====================================================================
  BuzzPlayerList.vue — 抢答选手列表组件
  ====================================================================

  【组件职责】
  在抢答题阶段展示所有抢答记录，包括：
  1. 有效抢答和提前抢答的分类展示
  2. 获胜者标签（首位有效抢答者）
  3. 响应时间差距显示（与首位的毫秒差）
  4. 点击选手卡片打开得分管理弹窗
  5. 统计摘要（有效/提前各多少人）
  6. 等待中状态提示

  【技术学习 — 设计思路】
  - 抢答记录分为两类：有效抢答（!early）和提前抢答（early）
  - 提前抢答：在倒计时开始前就按下按钮的行为，会被标记为 early
  - 获胜者：第一个有效抢答者（timestamp 最小的非 early 记录）
  - 响应时间差距：每条记录与首位有效抢答者的 timestamp 差值
  - 点击任何选手卡片都可以打开得分管理弹窗（支持为抢答者加分）

  【数据流】
  父组件 DashboardPanel → props: records, winner, buzzOpen, currentQuestion
  得分操作 → API → emit('score-added') → 父组件刷新排名和选手列表
-->

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { BuzzRecord } from '@/composables/useSocket'
import type { Question } from '@/types/question'
import type { User } from '@/types/user'
import type { ScoreDetail } from '@/types/score'
import { addScore, deleteScore, deleteAllScores } from '@/api/scores'
import { getAllUsers } from '@/api/users'

// ====================================================================
// Props 和 Emits
// ====================================================================
const props = defineProps<{
  records: BuzzRecord[]           // 当前题目的所有抢答记录
  winner: { userId: string; nickname: string; timestamp: number } | null  // 获胜者
  buzzOpen: boolean               // 抢答是否已开启
  currentQuestion: Question | null // 当前题目（用于自动填充得分原因）
}>()

const emit = defineEmits<{
  'score-added': []  // 得分变动后通知父组件刷新数据
}>()

// ====================================================================
// 排序和分类
// ====================================================================

/**
 * 按时间戳排序的记录列表
 * 【技术学习】[...props.records] 创建副本后再排序，避免修改 props
 */
const sorted = computed(() => [...props.records].sort((a, b) => a.timestamp - b.timestamp))

/** 有效抢答记录（非提前抢答） */
const validBuzzes = computed(() => sorted.value.filter((r) => !r.early))

/** 提前抢答记录 */
const earlyBuzzes = computed(() => sorted.value.filter((r) => r.early))

/**
 * 计算响应时差文字
 * @param ts 当前记录的时间戳
 * @returns "首位" 或 "+XXms"
 */
function gapText(ts: number): string {
  const first = validBuzzes.value[0]
  if (!first || ts === first.timestamp) return '首位'  // 首位有效抢答者
  return `+${ts - first.timestamp}ms`  // 与首位的时间差（毫秒）
}

// ====================================================================
// 得分管理弹窗（与 PlayerList 中的逻辑类似）
// ====================================================================
const detailDialogVisible = ref(false)
const dialogUser = ref<User | null>(null)
const showAddForm = ref(false)
const scoreForm = reactive({ score: 0, reason: '' })
const scoreLoading = ref(false)
const deletingScoreId = ref<string | null>(null)
const deletingAllScores = ref(false)

/**
 * 打开得分详情弹窗
 * 【技术学习】点击抢答选手卡片后：
 * 1. 从服务器获取该用户的完整数据（包含 scoreDetails）
 * 2. 自动填充得分表单：分值 = 当前题目分值，原因 = "抢答题：题干前30字"
 * 这样管理员可以快速为抢答者加分
 */
async function openDialog(record: BuzzRecord) {
  try {
    const { data: res } = await getAllUsers()
    const user = res.data.find((u: User) => u.id === record.userId) || null
    dialogUser.value = user
  } catch {
    dialogUser.value = null
  }
  showAddForm.value = false
  // 自动填充得分表单
  scoreForm.score = props.currentQuestion?.score ?? 0
  scoreForm.reason = props.currentQuestion
    ? `抢答题：${props.currentQuestion.stem.slice(0, 30)}`
    : ''
  detailDialogVisible.value = true
}

/** 为选手添加得分 */
async function onAddScore() {
  const user = dialogUser.value
  if (!user) return
  if (!scoreForm.reason.trim()) {
    ElMessage.warning('请输入得分原因')
    return
  }
  scoreLoading.value = true
  try {
    const { data: res } = await addScore(user.id, {
      score: scoreForm.score,
      reason: scoreForm.reason,
    })
    ElMessage.success(`已为「${user.nickname}」添加 ${scoreForm.score} 分`)
    // 更新弹窗中的用户数据
    if (dialogUser.value) {
      dialogUser.value.totalScore += res.data.score
      dialogUser.value.scoreDetails = [...dialogUser.value.scoreDetails, res.data]
    }
    // 重置表单（再次填充默认值）
    scoreForm.score = props.currentQuestion?.score ?? 0
    scoreForm.reason = props.currentQuestion
      ? `抢答题：${props.currentQuestion.stem.slice(0, 30)}`
      : ''
    showAddForm.value = false
    emit('score-added')  // 通知父组件刷新排名
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '添加失败')
  } finally {
    scoreLoading.value = false
  }
}

/** 删除单条得分记录 */
async function onDeleteScore(detail: ScoreDetail) {
  const user = dialogUser.value
  if (!user) return
  try {
    await ElMessageBox.confirm(
      `确定要删除该得分记录吗？\n\n分值：${detail.score}\n原因：${detail.reason}`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  deletingScoreId.value = detail.id
  try {
    await deleteScore(user.id, detail.id)
    ElMessage.success('已删除得分记录')
    if (dialogUser.value) {
      dialogUser.value.totalScore -= detail.score
      dialogUser.value.scoreDetails = dialogUser.value.scoreDetails.filter(
        (s) => s.id !== detail.id,
      )
    }
    emit('score-added')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  } finally {
    deletingScoreId.value = null
  }
}

/** 批量清空得分 */
async function onDeleteAllScores() {
  const user = dialogUser.value
  if (!user) return
  if ((user.scoreDetails?.length ?? 0) === 0) {
    ElMessage.warning('暂无得分记录可删除')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除「${user.nickname}」的全部 ${user.scoreDetails.length} 条得分记录吗？此操作不可恢复！`,
      '删除全部得分',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  deletingAllScores.value = true
  try {
    await deleteAllScores(user.id)
    ElMessage.success(`已删除「${user.nickname}」的全部得分`)
    if (dialogUser.value) {
      dialogUser.value.totalScore = 0
      dialogUser.value.scoreDetails = []
    }
    emit('score-added')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  } finally {
    deletingAllScores.value = false
  }
}

/** 格式化时间戳 */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <!--
    【技术学习】v-if 条件：有记录或抢答已开启时显示面板
    buzzOpen 为 true 但 records 为空时，显示"等待选手抢答..."提示
  -->
  <div v-if="records.length > 0 || buzzOpen" class="buzz-panel">
    <!-- 顶部信息栏 -->
    <div class="panel-row">
      <div class="panel-info">
        <span class="panel-title">抢答记录</span>
        <span class="panel-count">{{ records.length }} 人</span>
      </div>
      <div class="panel-stats">
        <span class="stat-item stat-valid">有效 {{ validBuzzes.length }}</span>
        <!-- 只有存在提前抢答时才显示 -->
        <span v-if="earlyBuzzes.length" class="stat-item stat-early"
          >提前 {{ earlyBuzzes.length }}</span
        >
      </div>
    </div>

    <!--
      选手芯片条（有效 + 提前混排显示）
      【技术学习】v-for 遍历排序后的记录，每条渲染一个可点击的芯片
      芯片样式根据状态动态变化：
      - is-winner: 获胜者（绿色高亮）
      - is-early: 提前抢答（半透明 + 橙色边框）
    -->
    <div v-if="records.length" class="player-strip">
      <div
        v-for="(b, i) in sorted"
        :key="b.userId"
        class="player-chip"
        :class="{
          'is-winner': winner && b.userId === winner.userId && !b.early,
          'is-early': b.early,
        }"
        @click="openDialog(b)"
      >
        <!-- 排名编号（提前抢答显示 "!"） -->
        <span class="chip-rank" :class="{ 'early-rank': b.early }">
          {{ b.early ? '!' : `#${validBuzzes.findIndex((v) => v.userId === b.userId) + 1}` }}
        </span>
        <!-- 选手昵称 -->
        <span class="chip-name">{{ b.nickname }}</span>
        <!-- 响应时差（仅有效抢答显示） -->
        <span v-if="!b.early" class="chip-gap">{{ gapText(b.timestamp) }}</span>
        <!-- 获胜者标签（首位有效抢答者显示"首"字标签） -->
        <span v-if="!b.early && winner && b.userId === winner.userId" class="chip-winner-tag"
          >首</span
        >
      </div>
    </div>

    <!-- 等待中提示（抢答已开启但无人抢答） -->
    <div v-if="records.length === 0 && buzzOpen" class="waiting-row">等待选手抢答...</div>
  </div>

  <!--
    ========== 得分详情弹窗 ==========
    【技术学习】与 PlayerList 中的弹窗结构基本相同
    但默认填充抢答题相关信息（分值和原因）
  -->
  <el-dialog
    v-model="detailDialogVisible"
    :title="dialogUser ? `「${dialogUser.nickname}」得分详情` : '得分详情'"
    width="580px"
    destroy-on-close
  >
    <!-- 弹窗头部 -->
    <div class="detail-header">
      <div class="detail-user-info">
        <span class="detail-user-name">{{ dialogUser?.nickname }}</span>
        <span class="detail-user-total">
          总分：<strong>{{ dialogUser?.totalScore ?? 0 }}</strong> 分
        </span>
        <span class="detail-user-count"> {{ dialogUser?.scoreDetails?.length ?? 0 }} 条记录 </span>
      </div>
      <div class="detail-header-actions">
        <el-button
          v-if="!showAddForm"
          type="primary"
          size="small"
          :icon="Plus"
          @click="showAddForm = true"
        >
          添加得分
        </el-button>
        <el-button
          type="danger"
          size="small"
          :icon="Delete"
          :loading="deletingAllScores"
          @click="onDeleteAllScores"
        >
          删除全部
        </el-button>
      </div>
    </div>

    <!-- 添加得分表单（可折叠） -->
    <div v-if="showAddForm" class="add-score-inline">
      <div class="add-score-row">
        <span class="add-score-label">分值</span>
        <el-input-number
          v-model="scoreForm.score"
          :min="-999"
          :max="999"
          size="small"
          style="width: 120px"
        />
        <span class="add-score-label">原因</span>
        <el-input v-model="scoreForm.reason" placeholder="得分原因" size="small" style="flex: 1" />
        <el-button type="primary" size="small" :loading="scoreLoading" @click="onAddScore"
          >确认</el-button
        >
        <el-button size="small" @click="showAddForm = false">取消</el-button>
      </div>
    </div>

    <!-- 得分记录表格 -->
    <el-table
      :data="dialogUser?.scoreDetails ?? []"
      stripe
      max-height="320"
      size="small"
      empty-text="暂无得分记录"
    >
      <el-table-column prop="score" label="分值" width="80" align="center">
        <template #default="{ row }">
          <span :class="row.score >= 0 ? 'score-positive' : 'score-negative'">
            {{ row.score > 0 ? '+' : '' }}{{ row.score }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="得分时间" width="160" align="center">
        <template #default="{ row }">
          <span class="score-time">{{ formatTime(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="60" align="center">
        <template #default="{ row }">
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            :loading="deletingScoreId === row.id"
            text
            @click.stop="onDeleteScore(row)"
          />
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<style scoped>
/* ========== 面板容器 ========== */
.buzz-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 8px;
  max-height: 140px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

/* 顶部信息栏 */
.panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-light);
  gap: 12px;
  flex-shrink: 0;
}

.panel-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: 8px;
}

.panel-stats {
  display: flex;
  gap: 10px;
}

.stat-item { font-size: 11px; }
.stat-valid { color: #67c23a; }   /* 有效：绿色 */
.stat-early { color: #e6a23c; }   /* 提前：橙色 */

/* ========== 选手芯片条 ========== */
.player-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px;
  overflow-y: auto;
  flex: 1;
  align-content: flex-start;
  scrollbar-width: thin;
}

/* 单个选手芯片 */
.player-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

/* 悬停效果 */
.player-chip:hover {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.25);
}

/* 【技术学习】获胜者样式：绿色高亮 */
.player-chip.is-winner {
  background: rgba(103, 194, 58, 0.1);
  border-color: rgba(103, 194, 58, 0.25);
}

.player-chip.is-winner:hover {
  background: rgba(103, 194, 58, 0.18);
}

/* 提前抢答样式：半透明 + 橙色边框 */
.player-chip.is-early {
  opacity: 0.5;
  border-color: rgba(230, 162, 60, 0.2);
  background: rgba(230, 162, 60, 0.04);
}

.player-chip.is-early:hover {
  opacity: 0.75;
}

/* 排名编号 */
.chip-rank {
  font-weight: 700;
  font-size: 11px;
  color: #409eff;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  min-width: 16px;
}

/* 提前抢答的排名标记（橙色） */
.early-rank {
  color: #e6a23c;
}

.chip-name {
  font-weight: 500;
  color: var(--text-primary);
}

/* 响应时差（等宽字体） */
.chip-gap {
  color: var(--text-secondary);
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

/* 获胜者"首"字标签 */
.chip-winner-tag {
  font-size: 10px;
  font-weight: 700;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.15);
  padding: 0 4px;
  border-radius: 3px;
}

/* 等待中提示 */
.waiting-row {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ========== 得分详情弹窗 ========== */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding: 10px 14px;
  background: var(--bg-hover);
  border-radius: 8px;
}

.detail-user-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.detail-user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-user-total {
  font-size: 13px;
  color: var(--text-regular);
}

.detail-user-total strong {
  color: var(--color-primary);
  font-size: 15px;
}

.detail-user-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-header-actions {
  display: flex;
  gap: 6px;
}

/* 添加得分行内表单 */
.add-score-inline {
  margin-bottom: 14px;
  padding: 10px 14px;
  background: var(--bg-active);
  border-radius: 8px;
  border: 1px solid var(--border-base);
}

.add-score-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-score-label {
  font-size: 13px;
  color: var(--text-regular);
  white-space: nowrap;
}

/* 分值颜色 */
.score-positive {
  color: #67c23a;
  font-weight: 600;
}

.score-negative {
  color: #f56c6c;
  font-weight: 600;
}

.score-time {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
