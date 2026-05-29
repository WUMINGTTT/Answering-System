<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Delete, Edit, View, Hide, DocumentCopy, Search, InfoFilled, Download } from '@element-plus/icons-vue'
import { getAllUsers, createUser, updateUser, deleteUser, deleteAllUsers } from '@/api/users'
import { addScore, deleteScore } from '@/api/scores'
import type { User } from '@/types/user'
import type { ScoreDetail, CreateScore } from '@/types/score'
import * as XLSX from 'xlsx'

// ---------- 用户列表 ----------
const users = ref<User[]>([])
const loading = ref(false)
const activeRole = ref<'all' | 'player' | 'admin'>('all')
const searchKeyword = ref('')
const visiblePasswords = reactive(new Set<string>())

const displayUsers = computed(() => {
  let list = users.value
  if (activeRole.value !== 'all') {
    list = list.filter((u) => u.role === activeRole.value)
  }
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (u) =>
        u.nickname.toLowerCase().includes(kw) ||
        u.username.toLowerCase().includes(kw) ||
        u.id.toLowerCase().includes(kw),
    )
  }
  return list
})

function togglePassword(id: string) {
  if (visiblePasswords.has(id)) {
    visiblePasswords.delete(id)
  } else {
    visiblePasswords.add(id)
  }
}

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('ID 已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const { data: res } = await getAllUsers()
    users.value = res.data
  } catch {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// ---------- 新增 / 编辑 ----------
const dialogVisible = ref(false)
const dialogTitle = computed(() => (editingId.value ? '编辑用户' : '新增用户'))
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  nickname: '',
  username: '',
  password: '',
  role: 'player' as 'player' | 'admin',
})

const rules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value, cb) => {
        if (editingId.value && !value) return cb()
        if (!editingId.value && !value) return cb(new Error('请输入密码'))
        cb()
      },
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const submitting = ref(false)

function openAddDialog() {
  editingId.value = null
  form.nickname = ''
  form.username = ''
  form.password = ''
  form.role = 'player'
  dialogVisible.value = true
}

function openEditDialog(user: User) {
  editingId.value = user.id
  form.nickname = user.nickname
  form.username = user.username
  form.password = ''
  form.role = user.role
  dialogVisible.value = true
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingId.value) {
      await updateUser(editingId.value, {
        nickname: form.nickname,
        username: form.username,
        password: form.password || undefined,
        role: form.role,
      })
      ElMessage.success('用户修改成功')
    } else {
      await createUser({
        nickname: form.nickname,
        username: form.username,
        password: form.password,
        role: form.role,
      })
      ElMessage.success('用户创建成功')
    }
    dialogVisible.value = false
    await fetchUsers()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// ---------- 确认弹窗 ----------
const confirmVisible = ref(false)
const confirmMessage = ref('')
let confirmResolve: ((v: boolean) => void) | null = null

function showConfirm(message: string): Promise<boolean> {
  confirmMessage.value = message
  confirmVisible.value = true
  return new Promise((resolve) => {
    confirmResolve = resolve
  })
}

function onConfirmResult(result: boolean) {
  confirmVisible.value = false
  confirmResolve?.(result)
}

// ---------- 删除 ----------
async function onDeleteUser(user: User) {
  const ok = await showConfirm(`确定要删除用户「${user.nickname}」吗？`)
  if (!ok) return

  try {
    await deleteUser(user.id)
    ElMessage.success('用户已删除')
    await fetchUsers()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function onDeleteAll() {
  if (users.value.length === 0) {
    ElMessage.warning('没有可删除的用户')
    return
  }

  const ok = await showConfirm('确定要删除全部用户吗？此操作不可恢复！')
  if (!ok) return

  try {
    await deleteAllUsers()
    ElMessage.success('全部用户已删除')
    await fetchUsers()
  } catch {
    ElMessage.error('删除失败')
  }
}

// ---------- 表格高度 ----------
const tableMaxHeight = ref(window.innerHeight - 140)

function onResize() {
  tableMaxHeight.value = window.innerHeight - 140
}

// ---------- 导出 Excel ----------
function exportToExcel() {
  const rows: Record<string, string | number>[] = []

  for (const user of users.value) {
    const details = user.scoreDetails.length > 0 ? user.scoreDetails : [{} as ScoreDetail]
    for (const d of details) {
      rows.push({
        昵称: user.nickname,
        用户名: user.username,
        角色: user.role === 'admin' ? '管理员' : '选手',
        总分: user.totalScore,
        得分分值: 'score' in (d as ScoreDetail) ? d.score : '',
        得分原因: 'reason' in (d as ScoreDetail) ? d.reason : '',
        得分时间: (d as ScoreDetail).createdAt
          ? new Date(d.createdAt).toLocaleString()
          : '',
      })
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '选手得分详情')
  XLSX.writeFile(wb, `选手得分详情_${new Date().toLocaleDateString()}.xlsx`)
}

onMounted(() => {
  fetchUsers()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

// ---------- 角色标签 ----------
function roleTagType(role: string) {
  return role === 'admin' ? 'danger' : 'success'
}

function roleLabel(role: string) {
  return role === 'admin' ? '管理员' : '选手'
}

// ---------- 得分详情 ----------
const scoreDialogVisible = ref(false)
const scoreUser = ref<User | null>(null)
const scoreForm = reactive({ score: 0, reason: '' })
const scoreLoading = ref(false)

function openScoreDialog(user: User) {
  scoreUser.value = user
  scoreForm.score = 0
  scoreForm.reason = ''
  scoreDialogVisible.value = true
}

async function onAddScore() {
  const user = scoreUser.value
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
    ElMessage.success('得分添加成功')
    scoreForm.score = 0
    scoreForm.reason = ''
    user.scoreDetails = [...user.scoreDetails, res.data]
    user.totalScore = user.totalScore + res.data.score
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '添加失败')
  } finally {
    scoreLoading.value = false
  }
}

async function onDeleteScore(scoreId: string, score: number) {
  if (!scoreUser.value) return

  const ok = await showConfirm('确定要删除该得分记录吗？')
  if (!ok) return

  const user = scoreUser.value

  try {
    await deleteScore(user.id, scoreId)
    ElMessage.success('得分已删除')
    user.scoreDetails = user.scoreDetails.filter((d) => d.id !== scoreId)
    user.totalScore = user.totalScore - score
  } catch {
    ElMessage.error('删除失败')
  }
}

</script>

<template>
  <div class="user-management">
    <!-- 控件栏 -->
    <div class="control-bar">
      <h2 class="control-title">用户管理</h2>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索用户名 / 昵称 / ID"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />
      <el-radio-group v-model="activeRole" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="player">选手</el-radio-button>
        <el-radio-button value="admin">管理员</el-radio-button>
      </el-radio-group>
      <div class="control-actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">新增用户</el-button>
        <el-button type="success" :icon="Download" @click="exportToExcel">导出Excel</el-button>
        <el-button type="danger" :icon="Delete" @click="onDeleteAll">删除全部用户</el-button>
      </div>
    </div>

    <!-- 用户表格 -->
    <el-table :data="displayUsers" v-loading="loading" border stripe :max-height="tableMaxHeight" style="width: 100%">
      <el-table-column label="ID" width="140">
        <template #default="{ row }">
          <span class="id-cell">
            <span>{{ row.id }}</span>
            <el-button link size="small" @click="copyId(row.id)">
              <el-icon><component :is="DocumentCopy" /></el-icon>
            </el-button>
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="昵称" min-width="120" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column label="密码" width="160">
        <template #default="{ row }">
          <span class="password-cell">
            <span>{{ visiblePasswords.has(row.id) ? row.password : '********' }}</span>
            <el-button link size="small" @click="togglePassword(row.id)">
              <el-icon><component :is="visiblePasswords.has(row.id) ? Hide : View" /></el-icon>
            </el-button>
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="总分" width="100" sortable prop="totalScore">
        <template #default="{ row }">
          {{ row.role === 'admin' ? '-' : row.totalScore }}
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
          <el-button
            v-if="row.role === 'player'"
            type="warning"
            link
            :icon="InfoFilled"
            @click="openScoreDialog(row)"
          >
            得分
          </el-button>
          <el-button type="danger" link :icon="Delete" @click="onDeleteUser(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 确认弹窗 -->
    <el-dialog v-model="confirmVisible" title="确认操作" width="420px">
      <p class="confirm-message">{{ confirmMessage }}</p>
      <template #footer>
        <el-button @click="onConfirmResult(false)">取消</el-button>
        <el-button type="primary" @click="onConfirmResult(true)">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="editingId ? '留空则不修改密码' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="选手" value="player" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 得分详情弹窗 -->
    <el-dialog
      v-model="scoreDialogVisible"
      :title="scoreUser ? `${scoreUser.nickname} 的得分详情` : '得分详情'"
      width="560px"
      destroy-on-close
    >
      <!-- 添加得分 -->
      <div class="score-add-bar">
        <el-input-number v-model="scoreForm.score" :min="-999" :max="999" style="width: 140px" />
        <el-input v-model="scoreForm.reason" placeholder="得分原因" style="width: 200px" />
        <el-button type="primary" :loading="scoreLoading" @click="onAddScore">添加</el-button>
      </div>

      <!-- 得分列表 -->
      <el-table
        :data="scoreUser?.scoreDetails || []"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        empty-text="暂无得分记录"
      >
        <el-table-column prop="score" label="分值" width="80" />
        <el-table-column prop="reason" label="原因" min-width="160" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="danger" link :icon="Delete" @click="onDeleteScore(row.id, row.score)" />
          </template>
        </el-table-column>
      </el-table>

      <div v-if="scoreUser" class="score-total">
        当前总分：<strong>{{ scoreUser.totalScore }}</strong>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-management {
  background: #fff;
  border-radius: 4px;
  padding: 20px;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.control-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.control-actions {
  display: flex;
  gap: 12px;
}

.password-cell,
.id-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.score-add-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-total {
  margin-top: 12px;
  text-align: right;
  font-size: 14px;
  color: #303133;
}

.confirm-message {
  font-size: 15px;
  color: #303133;
  line-height: 1.6;
}
</style>
