<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { BuzzRecord } from '@/composables/useSocket'
import type { Question } from '@/types/question'
import type { User } from '@/types/user'
import type { ScoreDetail } from '@/types/score'
import { addScore, deleteScore, deleteAllScores } from '@/api/scores'
import { getAllUsers } from '@/api/users'

const props = defineProps<{
  records: BuzzRecord[]
  winner: { userId: string; nickname: string; timestamp: number } | null
  buzzOpen: boolean
  currentQuestion: Question | null
}>()

const emit = defineEmits<{
  'score-added': []
}>()

// ── 排序 ──
const sorted = computed(() =>
  [...props.records].sort((a, b) => a.timestamp - b.timestamp)
)

const validBuzzes = computed(() => sorted.value.filter((r) => !r.early))
const earlyBuzzes = computed(() => sorted.value.filter((r) => r.early))

/** 响应时差 */
function gapText(ts: number): string {
  const first = validBuzzes.value[0]
  if (!first || ts === first.timestamp) return '首位'
  return `+${ts - first.timestamp}ms`
}

// ── 得分弹窗（与选手列表弹窗相同） ──
const detailDialogVisible = ref(false)
const dialogUser = ref<User | null>(null)
const showAddForm = ref(false)
const scoreForm = reactive({ score: 0, reason: '' })
const scoreLoading = ref(false)
const deletingScoreId = ref<string | null>(null)
const deletingAllScores = ref(false)

async function openDialog(record: BuzzRecord) {
  // 拉取用户数据
  try {
    const { data: res } = await getAllUsers()
    const user = res.data.find((u: User) => u.id === record.userId) || null
    dialogUser.value = user
  } catch {
    dialogUser.value = null
  }
  showAddForm.value = false
  scoreForm.score = props.currentQuestion?.score ?? 0
  scoreForm.reason = props.currentQuestion
    ? `抢答题：${props.currentQuestion.stem.slice(0, 30)}`
    : ''
  detailDialogVisible.value = true
}

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
    if (dialogUser.value) {
      dialogUser.value.totalScore += res.data.score
      dialogUser.value.scoreDetails = [...dialogUser.value.scoreDetails, res.data]
    }
    scoreForm.score = props.currentQuestion?.score ?? 0
    scoreForm.reason = props.currentQuestion
      ? `抢答题：${props.currentQuestion.stem.slice(0, 30)}`
      : ''
    showAddForm.value = false
    emit('score-added')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '添加失败')
  } finally {
    scoreLoading.value = false
  }
}

async function onDeleteScore(detail: ScoreDetail) {
  const user = dialogUser.value
  if (!user) return
  try {
    await ElMessageBox.confirm(
      `确定要删除该得分记录吗？\n\n分值：${detail.score}\n原因：${detail.reason}`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch { return }
  deletingScoreId.value = detail.id
  try {
    await deleteScore(user.id, detail.id)
    ElMessage.success('已删除得分记录')
    if (dialogUser.value) {
      dialogUser.value.totalScore -= detail.score
      dialogUser.value.scoreDetails = dialogUser.value.scoreDetails.filter((s) => s.id !== detail.id)
    }
    emit('score-added')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  } finally {
    deletingScoreId.value = null
  }
}

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
  } catch { return }
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

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <div v-if="records.length > 0 || buzzOpen" class="buzz-panel">
    <div class="panel-row">
      <div class="panel-info">
        <span class="panel-title">抢答记录</span>
        <span class="panel-count">{{ records.length }} 人</span>
      </div>
      <div class="panel-stats">
        <span class="stat-item stat-valid">有效 {{ validBuzzes.length }}</span>
        <span v-if="earlyBuzzes.length" class="stat-item stat-early">提前 {{ earlyBuzzes.length }}</span>
      </div>
    </div>

    <!-- 所有选手同一行展示（有效 + 提前混排） -->
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
        <span class="chip-rank" :class="{ 'early-rank': b.early }">
          {{ b.early ? '!' : `#${validBuzzes.findIndex(v => v.userId === b.userId) + 1}` }}
        </span>
        <span class="chip-name">{{ b.nickname }}</span>
        <span v-if="!b.early" class="chip-gap">{{ gapText(b.timestamp) }}</span>
        <span v-if="!b.early && winner && b.userId === winner.userId" class="chip-winner-tag">首</span>
      </div>
    </div>

    <!-- 等待中 -->
    <div v-if="records.length === 0 && buzzOpen" class="waiting-row">
      等待选手抢答...
    </div>
  </div>

  <!-- 得分详情弹窗（与选手列表相同） -->
  <el-dialog
    v-model="detailDialogVisible"
    :title="dialogUser ? `「${dialogUser.nickname}」得分详情` : '得分详情'"
    width="580px"
    destroy-on-close
  >
    <div class="detail-header">
      <div class="detail-user-info">
        <span class="detail-user-name">{{ dialogUser?.nickname }}</span>
        <span class="detail-user-total">
          总分：<strong>{{ dialogUser?.totalScore ?? 0 }}</strong> 分
        </span>
        <span class="detail-user-count">
          {{ dialogUser?.scoreDetails?.length ?? 0 }} 条记录
        </span>
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

    <!-- 添加得分表单 -->
    <div v-if="showAddForm" class="add-score-inline">
      <div class="add-score-row">
        <span class="add-score-label">分值</span>
        <el-input-number v-model="scoreForm.score" :min="-999" :max="999" size="small" style="width: 120px" />
        <span class="add-score-label">原因</span>
        <el-input v-model="scoreForm.reason" placeholder="得分原因" size="small" style="flex: 1" />
        <el-button type="primary" size="small" :loading="scoreLoading" @click="onAddScore">确认</el-button>
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

.stat-item {
  font-size: 11px;
}

.stat-valid { color: #67c23a; }
.stat-early { color: #e6a23c; }

/* ========== 选手条（有效+提前混排） ========== */
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

/* ========== 选手卡片 ========== */
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

.player-chip:hover {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.25);
}

.player-chip.is-winner {
  background: rgba(103, 194, 58, 0.1);
  border-color: rgba(103, 194, 58, 0.25);
}

.player-chip.is-winner:hover {
  background: rgba(103, 194, 58, 0.18);
}

.player-chip.is-early {
  opacity: 0.5;
  border-color: rgba(230, 162, 60, 0.2);
  background: rgba(230, 162, 60, 0.04);
}

.player-chip.is-early:hover {
  opacity: 0.75;
}

.chip-rank {
  font-weight: 700;
  font-size: 11px;
  color: #409eff;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  min-width: 16px;
}

.early-rank {
  color: #e6a23c;
}

.chip-name {
  font-weight: 500;
  color: var(--text-primary);
}

.chip-gap {
  color: var(--text-secondary);
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.chip-winner-tag {
  font-size: 10px;
  font-weight: 700;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.15);
  padding: 0 4px;
  border-radius: 3px;
}

/* ========== 等待 ========== */
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
