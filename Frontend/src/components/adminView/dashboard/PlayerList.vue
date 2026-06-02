<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { UserFilled, Plus, Search, Delete } from '@element-plus/icons-vue'
import { getAllUsers } from '@/api/users'
import { addScore, deleteScore } from '@/api/scores'
import type { User } from '@/types/user'
import type { ScoreDetail } from '@/types/score'

// ---------- 选手列表 ----------
const users = ref<User[]>([])
const usersLoading = ref(false)
const userSearch = ref('')

const displayUsers = computed(() => {
  const kw = userSearch.value.trim().toLowerCase()
  if (!kw) return users.value.filter((u) => u.role === 'player')
  return users.value.filter(
    (u) =>
      u.role === 'player' &&
      (u.nickname.toLowerCase().includes(kw) || u.username.toLowerCase().includes(kw)),
  )
})

async function fetchUsers() {
  usersLoading.value = true
  try {
    const { data: res } = await getAllUsers()
    users.value = res.data
  } catch {
    ElMessage.error('获取选手列表失败')
  } finally {
    usersLoading.value = false
  }
}

// ---------- 得分详情弹窗 ----------
const detailDialogVisible = ref(false)
const detailUser = ref<User | null>(null)

function openDetailDialog(user: User) {
  detailUser.value = user
  showAddForm.value = false
  scoreForm.score = 0
  scoreForm.reason = ''
  detailDialogVisible.value = true
}

// ---------- 添加得分 ----------
const showAddForm = ref(false)
const scoreForm = reactive({ score: 0, reason: '' })
const scoreLoading = ref(false)

async function onAddScore() {
  const user = detailUser.value
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
    // 更新本地选手数据
    const target = users.value.find((u) => u.id === user.id)
    if (target) {
      target.totalScore += res.data.score
      target.scoreDetails = [...target.scoreDetails, res.data]
    }
    // 同步更新弹窗引用
    detailUser.value = users.value.find((u) => u.id === user.id) || null
    scoreForm.score = 0
    scoreForm.reason = ''
    showAddForm.value = false
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '添加失败')
  } finally {
    scoreLoading.value = false
  }
}

// ---------- 删除得分 ----------
const deletingScoreId = ref<string | null>(null)

async function onDeleteScore(scoreDetail: ScoreDetail) {
  const user = detailUser.value
  if (!user) return

  try {
    await ElMessageBox.confirm(
      `确定要删除该得分记录吗？\n\n分值：${scoreDetail.score}\n原因：${scoreDetail.reason}`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return // 用户取消
  }

  deletingScoreId.value = scoreDetail.id
  try {
    await deleteScore(user.id, scoreDetail.id)
    ElMessage.success('已删除得分记录')
    // 更新本地数据
    const target = users.value.find((u) => u.id === user.id)
    if (target) {
      target.totalScore -= scoreDetail.score
      target.scoreDetails = target.scoreDetails.filter((s) => s.id !== scoreDetail.id)
    }
    // 同步更新弹窗引用
    detailUser.value = users.value.find((u) => u.id === user.id) || null
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  } finally {
    deletingScoreId.value = null
  }
}

// ---------- 工具 ----------
function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ---------- 初始化 ----------
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <el-card class="list-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="card-title">
          <el-icon :size="18"><UserFilled /></el-icon>
          <span>选手列表</span>
          <span class="card-count">{{ displayUsers.length }} 人</span>
        </div>
        <el-input
          v-model="userSearch"
          :prefix-icon="Search"
          placeholder="搜索选手"
          clearable
          size="small"
          style="width: 180px"
        />
      </div>
    </template>

    <div class="list-body" v-loading="usersLoading">
      <template v-if="displayUsers.length">
        <div
          v-for="user in displayUsers"
          :key="user.id"
          class="list-item"
          @click="openDetailDialog(user)"
        >
          <div class="item-avatar">
            <el-icon :size="20"><UserFilled /></el-icon>
          </div>
          <div class="item-info">
            <div class="item-name">{{ user.nickname }}</div>
            <div class="item-sub">{{ user.username }}</div>
          </div>
          <div class="item-extra">
            <span class="item-score">{{ user.totalScore }} 分</span>
            <el-icon class="item-arrow"><Plus /></el-icon>
          </div>
        </div>
      </template>
      <el-empty v-else description="暂无选手" :image-size="60" />
    </div>
  </el-card>

  <!-- 得分详情弹窗 -->
  <el-dialog
    v-model="detailDialogVisible"
    :title="detailUser ? `「${detailUser.nickname}」得分详情` : '得分详情'"
    width="600px"
    destroy-on-close
  >
    <!-- 选手信息 + 添加按钮 -->
    <div class="detail-header">
      <div class="detail-user-info">
        <span class="detail-user-name">{{ detailUser?.nickname }}</span>
        <span class="detail-user-total"
          >总分：<strong>{{ detailUser?.totalScore ?? 0 }}</strong> 分</span
        >
        <span class="detail-user-count"
          >{{ detailUser?.scoreDetails?.length ?? 0 }} 条记录</span
        >
      </div>
      <el-button
        v-if="!showAddForm"
        type="primary"
        size="small"
        :icon="Plus"
        @click="showAddForm = true"
      >
        添加得分
      </el-button>
    </div>

    <!-- 添加得分表单（可折叠） -->
    <div v-if="showAddForm" class="add-score-inline">
      <div class="add-score-row">
        <span class="add-score-label">分值</span>
        <el-input-number v-model="scoreForm.score" :min="-999" :max="999" size="small" style="width: 130px" />
        <span class="add-score-label">原因</span>
        <el-input v-model="scoreForm.reason" placeholder="请输入得分原因" size="small" style="flex: 1" />
        <el-button type="primary" size="small" :loading="scoreLoading" @click="onAddScore">确认</el-button>
        <el-button size="small" @click="showAddForm = false">取消</el-button>
      </div>
    </div>

    <!-- 得分记录表格 -->
    <el-table
      :data="detailUser?.scoreDetails ?? []"
      stripe
      max-height="360"
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
      <el-table-column label="得分时间" width="170" align="center">
        <template #default="{ row }">
          <span class="score-time">{{ formatTime(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="72" align="center">
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
  color: var(--text-primary);
}

.card-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

/* 列表项 */
.list-body {
  height: 100%;
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
  border-bottom: 1px solid var(--border-light);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: var(--bg-hover);
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

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.item-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
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

.item-arrow {
  color: var(--text-placeholder);
  font-size: 14px;
}

/* ========== 得分详情弹窗 ========== */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-hover);
  border-radius: 8px;
}

.detail-user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-user-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-user-total {
  font-size: 14px;
  color: var(--text-regular);
}

.detail-user-total strong {
  color: var(--color-primary);
  font-size: 16px;
}

.detail-user-count {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 添加得分行内表单 */
.add-score-inline {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-active);
  border-radius: 8px;
  border: 1px solid var(--border-base);
}

.add-score-row {
  display: flex;
  align-items: center;
  gap: 10px;
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
