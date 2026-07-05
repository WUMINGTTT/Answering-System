<!--
  ====================================================================
  PlayerList.vue — 选手列表组件（含得分管理）
  ====================================================================

  【组件职责】
  展示所有选手的列表，并提供完整的得分管理功能：
  1. 选手列表展示（头像、昵称、用户名、总分）
  2. 搜索功能（按昵称或用户名搜索）
  3. 按分数排序开关
  4. 得分详情弹窗（查看/添加/删除/批量清空得分记录）
  5. 通过 defineExpose 暴露 fetchUsers 方法供父组件调用

  【技术学习 — 主要知识点】
  - defineExpose：Vue 3 默认不暴露组件内部方法，需要显式声明
  - 弹窗表单的折叠/展开模式（showAddForm 控制）
  - 本地数据同步：修改得分后更新本地数据，避免重新请求服务器
  - ElMessageBox.confirm：Element Plus 的确认对话框（Promise API）
  - 事件冒泡控制：@click.stop 阻止事件冒泡

  【数据流】
  API (getAllUsers) → users → displayUsers（computed 筛选+排序）→ 模板
  得分操作 → API → 更新本地 users 数据 → 视图自动更新
-->

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { UserFilled, Plus, Search, Delete } from '@element-plus/icons-vue'
import { getAllUsers } from '@/api/users'
import { addScore, deleteScore, deleteAllScores } from '@/api/scores'
import type { User } from '@/types/user'
import type { ScoreDetail } from '@/types/score'

// ====================================================================
// 选手列表数据与筛选/排序
// ====================================================================
const users = ref<User[]>([])         // 所有用户数据
const usersLoading = ref(false)       // 加载状态
const userSearch = ref('')            // 搜索关键词
const sortByScore = ref(false)        // 是否按分数排序

/**
 * 计算属性：筛选 + 排序后的选手列表
 * 【技术学习】筛选逻辑：
 * 1. 只显示角色为 "player" 的用户（排除管理员）
 * 2. 如果有搜索关键词，按昵称或用户名过滤
 * 3. 如果开启按分数排序，创建新数组并排序（避免修改原数组）
 */
const displayUsers = computed(() => {
  const kw = userSearch.value.trim().toLowerCase()
  let list: User[]
  if (!kw) {
    list = users.value.filter((u) => u.role === 'player')
  } else {
    list = users.value.filter(
      (u) =>
        u.role === 'player' &&
        (u.nickname.toLowerCase().includes(kw) || u.username.toLowerCase().includes(kw)),
    )
  }
  if (sortByScore.value) {
    // 【技术学习】[...list] 创建副本后再排序，避免修改 computed 的依赖源
    list = [...list].sort((a, b) => b.totalScore - a.totalScore)
  }
  return list
})

/**
 * 从服务器获取用户数据
 * 【技术学习】此函数通过 defineExpose 暴露给父组件，
 * 父组件可以通过 ref 调用此方法来刷新选手列表
 */
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

// ====================================================================
// 得分详情弹窗
// ====================================================================
const detailDialogVisible = ref(false)   // 弹窗是否显示
const detailUser = ref<User | null>(null) // 当前查看的选手

/**
 * 打开得分详情弹窗
 * @param user 点击的选手对象
 */
function openDetailDialog(user: User) {
  detailUser.value = user
  showAddForm.value = false      // 默认折叠添加表单
  scoreForm.score = 0
  scoreForm.reason = ''
  detailDialogVisible.value = true
}

// ====================================================================
// 添加得分
// ====================================================================
const showAddForm = ref(false)                          // 是否展开添加得分表单
const scoreForm = reactive({ score: 0, reason: '' })    // 得分表单数据
const scoreLoading = ref(false)                         // 提交按钮 loading

/**
 * 为选手添加得分
 * 【技术学习】添加成功后更新本地数据：
 * 1. 找到 users 数组中对应的用户对象
 * 2. 更新 totalScore 和 scoreDetails
 * 3. 重新设置 detailUser 引用（确保弹窗中显示最新数据）
 * 这样避免了重新请求整个用户列表
 */
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

    // 更新本地数据
    const target = users.value.find((u) => u.id === user.id)
    if (target) {
      target.totalScore += res.data.score
      target.scoreDetails = [...target.scoreDetails, res.data]
    }
    // 同步更新弹窗引用（detailUser 可能指向旧对象）
    detailUser.value = users.value.find((u) => u.id === user.id) || null

    // 重置表单
    scoreForm.score = 0
    scoreForm.reason = ''
    showAddForm.value = false
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '添加失败')
  } finally {
    scoreLoading.value = false
  }
}

// ====================================================================
// 删除得分
// ====================================================================
const deletingScoreId = ref<string | null>(null)  // 正在删除的得分 ID（用于按钮 loading）

/**
 * 删除单条得分记录
 * 【技术学习】使用 ElMessageBox.confirm 显示确认对话框
 * - 它返回 Promise：用户点"确定"resolve，点"取消"reject
 * - catch 捕获取消操作，直接 return
 * - 模板中的 \n 会被渲染为换行
 */
async function onDeleteScore(scoreDetail: ScoreDetail) {
  const user = detailUser.value
  if (!user) return

  // 显示确认对话框
  try {
    await ElMessageBox.confirm(
      `确定要删除该得分记录吗？\n\n分值：${scoreDetail.score}\n原因：${scoreDetail.reason}`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return // 用户点击了取消，直接返回
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
    detailUser.value = users.value.find((u) => u.id === user.id) || null
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  } finally {
    deletingScoreId.value = null
  }
}

// ====================================================================
// 批量清空得分
// ====================================================================
const deletingAllScores = ref(false)

async function onDeleteAllScores() {
  const user = detailUser.value
  if (!user) return
  if ((user.scoreDetails?.length ?? 0) === 0) {
    ElMessage.warning('暂无得分记录可删除')
    return
  }

  // 二次确认（危险操作）
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
    const target = users.value.find((u) => u.id === user.id)
    if (target) {
      target.totalScore = 0
      target.scoreDetails = []
    }
    detailUser.value = users.value.find((u) => u.id === user.id) || null
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  } finally {
    deletingAllScores.value = false
  }
}

// ====================================================================
// 工具函数
// ====================================================================
/**
 * 格式化时间戳为可读字符串
 * 【技术学习】手动补零（padStart）确保月/日/时/分/秒都是两位数
 */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ====================================================================
// 生命周期 & 方法暴露
// ====================================================================
onMounted(() => {
  fetchUsers()
})

/**
 * 【技术学习】defineExpose 将组件内部方法暴露给父组件
 * 父组件通过 ref 获取子组件实例后，可以调用 fetchUsers()
 * Vue 3 的 <script setup> 默认不暴露任何内容，必须显式声明
 */
defineExpose({ fetchUsers })
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
        <div class="card-header-right">
          <!-- 按分数排序开关 -->
          <el-switch
            v-model="sortByScore"
            size="small"
            active-text="按分数排序"
            inactive-text="默认顺序"
          />
          <!-- 搜索框 -->
          <el-input
            v-model="userSearch"
            :prefix-icon="Search"
            placeholder="搜索选手"
            clearable
            size="small"
            style="width: 180px"
          />
        </div>
      </div>
    </template>

    <!-- 选手列表 -->
    <div class="list-body" v-loading="usersLoading">
      <template v-if="displayUsers.length">
        <!--
          【技术学习】@click 点击列表项打开得分详情弹窗
          每个选手项包含：头像、昵称/用户名、分数、箭头图标
        -->
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
      <!-- 空状态 -->
      <el-empty v-else description="暂无选手" :image-size="60" />
    </div>
  </el-card>

  <!--
    ========== 得分详情弹窗 ==========
    【技术学习】弹窗结构：
    - 头部：选手信息 + 操作按钮
    - 中部：可折叠的添加得分表单
    - 底部：得分记录表格
  -->
  <el-dialog
    v-model="detailDialogVisible"
    :title="detailUser ? `「${detailUser.nickname}」得分详情` : '得分详情'"
    width="600px"
    destroy-on-close
  >
    <!-- 弹窗头部：选手信息 + 操作按钮 -->
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
      <div class="detail-header-actions">
        <!-- 展开添加表单按钮 -->
        <el-button
          v-if="!showAddForm"
          type="primary"
          size="small"
          :icon="Plus"
          @click="showAddForm = true"
        >
          添加得分
        </el-button>
        <!-- 删除全部得分按钮 -->
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

    <!--
      添加得分表单（可折叠）
      【技术学习】v-if 控制表单的显示/隐藏
      showAddForm 为 true 时渲染表单，为 false 时从 DOM 中移除
    -->
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

    <!--
      得分记录表格
      【技术学习】表格配置：
      - stripe 斑马纹
      - max-height="360" 固定高度，超出后滚动
      - size="small" 紧凑模式
    -->
    <el-table
      :data="detailUser?.scoreDetails ?? []"
      stripe
      max-height="360"
      size="small"
      empty-text="暂无得分记录"
    >
      <!-- 分值列：正数绿色，负数红色 -->
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

      <!-- 操作列：删除按钮 -->
      <el-table-column label="操作" width="72" align="center">
        <template #default="{ row }">
          <!--
            【技术学习】@click.stop 阻止事件冒泡
            因为表格行可能有点击事件，.stop 防止触发父元素的点击处理
          -->
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
  cursor: pointer;             /* 鼠标变为手型 */
  transition: background 0.15s ease;
  border-bottom: 1px solid var(--border-light);
}

.list-item:last-child { border-bottom: none; }

.list-item:hover { background: var(--bg-hover); }

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

.detail-header-actions {
  display: flex;
  gap: 8px;
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
