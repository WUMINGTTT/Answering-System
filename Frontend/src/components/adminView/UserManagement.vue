<!--
  ====================================================================
  UserManagement.vue — 用户管理页面
  ====================================================================

  【组件职责】
  提供完整的用户 CRUD（增删改查）管理界面，包括：
  1. 用户列表展示（表格形式，支持搜索、角色筛选）
  2. 新增 / 编辑用户（弹窗表单，支持表单验证）
  3. 删除单个 / 全部用户（带确认弹窗）
  4. 选手得分详情管理（添加、删除、批量清空得分）
  5. 导出 Excel 功能（将用户数据导出为 .xlsx 文件）
  6. 密码可见性切换（默认隐藏密码，点击切换显示/隐藏）

  【技术学习 — 主要知识点】
  - Element Plus 表格组件（el-table）的使用：列定义、排序、插槽自定义
  - Element Plus 表单组件（el-form）的使用：验证规则、动态表单
  - 响应式数据管理：ref、reactive、computed 的配合使用
  - 自定义确认弹窗的 Promise 封装模式
  - xlsx 库实现前端 Excel 导出
  - 生命周期钩子（onMounted / onUnmounted）的使用
-->

<script setup lang="ts">
// ── Vue 3 Composition API 导入 ──
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

// ── Element Plus 类型导入 ──
// 【技术学习】FormInstance 是 el-form 组件实例的类型，可以调用 validate() 等方法
// FormRules 定义表单验证规则的类型
import type { FormInstance, FormRules } from 'element-plus'

// ── Element Plus 图标组件导入 ──
import { Plus, Delete, Edit, View, Hide, DocumentCopy, Search, InfoFilled, Download } from '@element-plus/icons-vue'

// ── API 函数导入 ──
import { getAllUsers, createUser, updateUser, deleteUser, deleteAllUsers } from '@/api/users'
import { addScore, deleteScore, deleteAllScores } from '@/api/scores'

// ── 类型定义导入 ──
import type { User } from '@/types/user'
import type { ScoreDetail, CreateScore } from '@/types/score'

// ── Excel 导出库 ──
// 【技术学习】xlsx（SheetJS）是一个纯前端的 Excel 处理库
// 可以在浏览器中生成 .xlsx 文件并触发下载，无需服务器参与
import * as XLSX from 'xlsx'

// ====================================================================
// 用户列表数据与筛选
// ====================================================================
const users = ref<User[]>([])           // 所有用户数据（从服务器获取）
const loading = ref(false)              // 表格加载状态（显示 loading 动画）
const activeRole = ref<'all' | 'player' | 'admin'>('all')  // 当前选中的角色筛选
const searchKeyword = ref('')           // 搜索关键词

// 【技术学习】使用 Set 存储当前可见密码的用户 ID
// Set 的 has() 方法查找效率比数组高（O(1) vs O(n)）
const visiblePasswords = reactive(new Set<string>())

/**
 * 计算属性：根据筛选条件过滤用户列表
 * 【技术学习】computed 会自动追踪依赖（users、activeRole、searchKeyword）
 * 任何一个依赖变化时，displayUsers 都会自动重新计算
 */
const displayUsers = computed(() => {
  let list = users.value

  // 按角色筛选
  if (activeRole.value !== 'all') {
    list = list.filter((u) => u.role === activeRole.value)
  }

  // 按关键词搜索（支持昵称、用户名、ID 搜索，不区分大小写）
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

/** 统计明细：分别计算选手和管理员的数量 */
const playerCount = computed(() => users.value.filter((u) => u.role === 'player').length)
const adminCount = computed(() => users.value.filter((u) => u.role === 'admin').length)

/**
 * 切换密码可见性
 * 【技术学习】Set 的 add/delete 方法用于添加/删除元素
 * 模板中通过 visiblePasswords.has(row.id) 判断是否显示密码
 */
function togglePassword(id: string) {
  if (visiblePasswords.has(id)) {
    visiblePasswords.delete(id)
  } else {
    visiblePasswords.add(id)
  }
}

/**
 * 复制用户 ID 到剪贴板
 * 【技术学习】navigator.clipboard.writeText() 是 Web Clipboard API
 * 是现代浏览器提供的异步剪贴板操作接口
 */
async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('ID 已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

/**
 * 从服务器获取全部用户数据
 * 【技术学习】try-catch-finally 模式：
 * - try: 执行可能失败的操作
 * - catch: 处理错误（显示错误提示）
 * - finally: 无论成功失败都会执行（关闭 loading）
 */
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

// ====================================================================
// 新增 / 编辑用户弹窗
// ====================================================================
const dialogVisible = ref(false)          // 控制弹窗是否显示
const dialogTitle = computed(() => (editingId.value ? '编辑用户' : '新增用户'))  // 弹窗标题
const editingId = ref<string | null>(null) // 正在编辑的用户 ID（null 表示新增模式）
const formRef = ref<FormInstance>()        // 表单实例引用（用于调用 validate 方法）

// 【技术学习】reactive 创建响应式对象，适合管理表单数据
// 对象内部的所有属性都是响应式的
const form = reactive({
  nickname: '',
  username: '',
  password: '',
  role: 'player' as 'player' | 'admin',
})

/**
 * 表单验证规则
 * 【技术学习】Element Plus 的 FormRules 格式：
 * - required: 是否必填
 * - message: 验证失败时的提示信息
 * - trigger: 触发验证的时机（blur = 失去焦点时，change = 值变化时）
 * - validator: 自定义验证函数（用于复杂验证逻辑）
 */
const rules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      // 【技术学习】自定义验证器：编辑模式下密码可以留空（不修改密码）
      validator: (_rule, value, cb) => {
        if (editingId.value && !value) return cb()         // 编辑模式 + 密码为空 → 通过
        if (!editingId.value && !value) return cb(new Error('请输入密码'))  // 新增模式 + 密码为空 → 失败
        cb()                                                 // 其他情况 → 通过
      },
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const submitting = ref(false)  // 提交按钮的 loading 状态

/**
 * 打开新增用户弹窗
 * 清空表单数据，设置为新增模式
 */
function openAddDialog() {
  editingId.value = null       // 清空编辑 ID，表示新增模式
  form.nickname = ''
  form.username = ''
  form.password = ''
  form.role = 'player'
  dialogVisible.value = true   // 显示弹窗
}

/**
 * 打开编辑用户弹窗
 * 用现有用户数据填充表单
 */
function openEditDialog(user: User) {
  editingId.value = user.id    // 设置编辑 ID，表示编辑模式
  form.nickname = user.nickname
  form.username = user.username
  form.password = ''           // 密码留空，表示不修改
  form.role = user.role
  dialogVisible.value = true
}

/**
 * 提交表单（新增或编辑）
 * 【技术学习】表单提交流程：
 * 1. 调用 formRef.validate() 进行表单验证
 * 2. 验证通过后，根据 editingId 判断是新增还是编辑
 * 3. 调用对应的 API 函数
 * 4. 成功后关闭弹窗并刷新列表
 */
async function onSubmit() {
  // 【技术学习】await formRef.value?.validate().catch(() => false)
  // 如果验证失败，catch 会捕获错误并返回 false，避免抛出异常
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingId.value) {
      // 编辑模式：调用更新 API
      await updateUser(editingId.value, {
        nickname: form.nickname,
        username: form.username,
        password: form.password || undefined,  // 密码为空时传 undefined（不修改）
        role: form.role,
      })
      ElMessage.success('用户修改成功')
    } else {
      // 新增模式：调用创建 API
      await createUser({
        nickname: form.nickname,
        username: form.username,
        password: form.password,
        role: form.role,
      })
      ElMessage.success('用户创建成功')
    }
    dialogVisible.value = false  // 关闭弹窗
    await fetchUsers()           // 刷新用户列表
  } catch (err: any) {
    // 【技术学习】err?.response?.data?.message 使用可选链安全地获取错误信息
    ElMessage.error(err?.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// ====================================================================
// 自定义确认弹窗（Promise 封装模式）
// ====================================================================
// 【技术学习】这是一种常见的"将回调转换为 Promise"的模式：
// 1. showConfirm() 显示弹窗并返回 Promise
// 2. 用户点击"确定"或"取消"时，调用 onConfirmResult()
// 3. onConfirmResult() 通过之前保存的 resolve 函数来 resolve Promise
// 这样调用方可以用 await showConfirm('...') 来等待用户确认
const confirmVisible = ref(false)
const confirmMessage = ref('')
let confirmResolve: ((v: boolean) => void) | null = null  // 保存 Promise 的 resolve 函数

function showConfirm(message: string): Promise<boolean> {
  confirmMessage.value = message
  confirmVisible.value = true
  return new Promise((resolve) => {
    confirmResolve = resolve  // 保存 resolve 函数，等待用户操作
  })
}

function onConfirmResult(result: boolean) {
  confirmVisible.value = false
  confirmResolve?.(result)  // 调用 resolve，将用户的选择传递给 await 处
}

// ====================================================================
// 删除用户
// ====================================================================
async function onDeleteUser(user: User) {
  const ok = await showConfirm(`确定要删除用户「${user.nickname}」吗？`)
  if (!ok) return  // 用户取消

  try {
    await deleteUser(user.id)
    ElMessage.success('用户已删除')
    await fetchUsers()
  } catch {
    ElMessage.error('删除失败')
  }
}

/** 删除全部用户（危险操作，需二次确认） */
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

// ====================================================================
// 表格高度自适应
// ====================================================================
// 【技术学习】表格需要固定表头并内部滚动，高度需要根据窗口大小动态计算
// 减去的 205px 大约是页面顶部控件栏的高度
const tableMaxHeight = ref(window.innerHeight - 205)

function onResize() {
  tableMaxHeight.value = window.innerHeight - 205
}

// ====================================================================
// 导出 Excel 功能
// ====================================================================
/**
 * 将用户数据导出为 Excel 文件
 * 【技术学习】xlsx 库的使用流程：
 * 1. 准备数据：将数据转换为对象数组格式（每行一个对象）
 * 2. json_to_sheet()：将对象数组转为工作表
 * 3. book_new()：创建新的工作簿
 * 4. book_append_sheet()：将工作表添加到工作簿
 * 5. writeFile()：触发浏览器下载文件
 */
function exportToExcel() {
  const rows: Record<string, string | number>[] = []

  // 【技术学习】遍历每个用户，展开其得分详情为多行
  // 这样每个得分记录都会在 Excel 中独占一行
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

  const ws = XLSX.utils.json_to_sheet(rows)          // 数据 → 工作表
  const wb = XLSX.utils.book_new()                    // 创建工作簿
  XLSX.utils.book_append_sheet(wb, ws, '选手得分详情') // 添加工作表
  XLSX.writeFile(wb, `选手得分详情_${new Date().toLocaleDateString()}.xlsx`) // 触发下载
}

// ====================================================================
// 生命周期钩子
// ====================================================================
// 【技术学习】onMounted 在组件挂载到 DOM 后执行（类似 mounted 选项）
// 适合执行初始数据加载和事件监听注册
onMounted(() => {
  fetchUsers()                                    // 获取用户列表
  window.addEventListener('resize', onResize)     // 监听窗口大小变化
})

// 【技术学习】onUnmounted 在组件卸载前执行（类似 beforeUnmount 选项）
// 必须清理事件监听器，防止内存泄漏
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

// ====================================================================
// 辅助函数：角色标签样式
// ====================================================================
function roleTagType(role: string) {
  return role === 'admin' ? 'danger' : 'success'  // 管理员红色，选手绿色
}

function roleLabel(role: string) {
  return role === 'admin' ? '管理员' : '选手'
}

// ====================================================================
// 得分详情管理
// ====================================================================
const scoreDialogVisible = ref(false)   // 得分详情弹窗是否显示
const scoreUser = ref<User | null>(null) // 当前查看得分的用户
const scoreForm = reactive({ score: 0, reason: '' })  // 添加得分的表单
const scoreLoading = ref(false)         // 添加得分按钮的 loading 状态

/** 打开得分详情弹窗 */
function openScoreDialog(user: User) {
  scoreUser.value = user
  scoreForm.score = 0
  scoreForm.reason = ''
  scoreDialogVisible.value = true
}

/** 为用户添加得分 */
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
    // 【技术学习】更新本地数据，避免重新请求服务器
    // 使用展开运算符 [...user.scoreDetails, res.data] 创建新数组
    // 这样 Vue 能检测到数组变化并更新视图
    user.scoreDetails = [...user.scoreDetails, res.data]
    user.totalScore = user.totalScore + res.data.score
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '添加失败')
  } finally {
    scoreLoading.value = false
  }
}

/** 删除单条得分记录 */
async function onDeleteScore(scoreId: string, score: number) {
  if (!scoreUser.value) return

  const ok = await showConfirm('确定要删除该得分记录吗？')
  if (!ok) return

  const user = scoreUser.value

  try {
    await deleteScore(user.id, scoreId)
    ElMessage.success('得分已删除')
    // 过滤掉被删除的记录
    user.scoreDetails = user.scoreDetails.filter((d) => d.id !== scoreId)
    user.totalScore = user.totalScore - score
  } catch {
    ElMessage.error('删除失败')
  }
}

// ── 删除全部得分 ──
const deletingAllScores = ref(false)

async function onDeleteAllScores() {
  const user = scoreUser.value
  if (!user) return
  if ((user.scoreDetails?.length ?? 0) === 0) {
    ElMessage.warning('暂无得分记录可删除')
    return
  }

  const ok = await showConfirm(
    `确定要删除「${user.nickname}」的全部 ${user.scoreDetails.length} 条得分记录吗？此操作不可恢复！`,
  )
  if (!ok) return

  deletingAllScores.value = true
  try {
    await deleteAllScores(user.id)
    ElMessage.success(`已删除「${user.nickname}」的全部得分`)
    user.scoreDetails = []
    user.totalScore = 0
  } catch {
    ElMessage.error('删除失败')
  } finally {
    deletingAllScores.value = false
  }
}

</script>

<template>
  <div class="user-management">
    <!-- ========== 控件栏：标题 + 搜索 + 筛选 + 操作按钮 ========== -->
    <div class="control-bar">
      <h2 class="control-title">用户管理</h2>

      <!-- 搜索框：支持按用户名、昵称、ID 搜索 -->
      <el-input
        v-model="searchKeyword"
        placeholder="搜索用户名 / 昵称 / ID"
        :prefix-icon="Search"
        clearable
        style="width: 240px"
      />

      <!-- 角色筛选：全部 / 选手 / 管理员 -->
      <el-radio-group v-model="activeRole" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="player">选手</el-radio-button>
        <el-radio-button value="admin">管理员</el-radio-button>
      </el-radio-group>

      <!-- 操作按钮组 -->
      <div class="control-actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">新增用户</el-button>
        <el-button type="success" :icon="Download" @click="exportToExcel">导出Excel</el-button>
        <el-button type="danger" :icon="Delete" @click="onDeleteAll">删除全部用户</el-button>
      </div>
    </div>

    <!-- ========== 数量统计栏 ========== -->
    <div class="summary-bar">
      <span class="summary-item">
        <span class="summary-num">{{ users.length }}</span>
        <span class="summary-label">总计</span>
      </span>
      <el-divider direction="vertical" />
      <span class="summary-item summary-item--player">
        <span class="summary-num">{{ playerCount }}</span>
        <span class="summary-label">选手</span>
      </span>
      <el-divider direction="vertical" />
      <span class="summary-item summary-item--admin">
        <span class="summary-num">{{ adminCount }}</span>
        <span class="summary-label">管理员</span>
      </span>
    </div>

    <!--
      ========== 用户表格 ==========
      【技术学习】el-table 组件详解：
      - :data="displayUsers" 绑定数据源（计算属性，自动响应筛选变化）
      - v-loading="loading" 加载状态（显示骨架屏动画）
      - border 显示边框线
      - stripe 斑马纹（奇偶行背景色交替）
      - :max-height 设置最大高度，超出后表头固定、内容滚动
    -->
    <el-table :data="displayUsers" v-loading="loading" border stripe :max-height="tableMaxHeight" style="width: 100%">
      <!-- ID 列：显示 ID + 复制按钮 -->
      <el-table-column label="ID" width="140">
        <!-- 【技术学习】#default="{ row }" 是作用域插槽，row 是当前行的数据对象 -->
        <template #default="{ row }">
          <span class="id-cell">
            <span>{{ row.id }}</span>
            <el-button link size="small" @click="copyId(row.id)">
              <el-icon><component :is="DocumentCopy" /></el-icon>
            </el-button>
          </span>
        </template>
      </el-table-column>

      <!-- 基本信息列 -->
      <el-table-column prop="nickname" label="昵称" min-width="120" />
      <el-table-column prop="username" label="用户名" min-width="120" />

      <!-- 密码列：默认隐藏，可点击切换显示/隐藏 -->
      <el-table-column label="密码" width="160">
        <template #default="{ row }">
          <span class="password-cell">
            <!-- 根据 visiblePasswords Set 判断是否显示密码 -->
            <span>{{ visiblePasswords.has(row.id) ? row.password : '********' }}</span>
            <el-button link size="small" @click="togglePassword(row.id)">
              <!-- 根据状态切换眼睛图标：显示时用 Hide，隐藏时用 View -->
              <el-icon><component :is="visiblePasswords.has(row.id) ? Hide : View" /></el-icon>
            </el-button>
          </span>
        </template>
      </el-table-column>

      <!-- 角色列：用不同颜色的 Tag 标签显示 -->
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>

      <!-- 总分列：支持排序，管理员显示 "-" -->
      <el-table-column label="总分" width="100" sortable prop="totalScore">
        <template #default="{ row }">
          {{ row.role === 'admin' ? '-' : row.totalScore }}
        </template>
      </el-table-column>

      <!-- 操作列：固定在右侧，不随水平滚动移动 -->
      <el-table-column label="操作" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
          <!-- 只有选手才显示"得分"按钮 -->
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

    <!-- ========== 确认弹窗（自定义实现，替代 ElMessageBox） ========== -->
    <el-dialog v-model="confirmVisible" title="确认操作" width="420px">
      <p class="confirm-message">{{ confirmMessage }}</p>
      <template #footer>
        <el-button @click="onConfirmResult(false)">取消</el-button>
        <el-button type="primary" @click="onConfirmResult(true)">确定</el-button>
      </template>
    </el-dialog>

    <!--
      ========== 新增 / 编辑用户弹窗 ==========
      【技术学习】destroy-on-close 属性：关闭弹窗时销毁内部组件实例
      这样每次打开弹窗都会重新渲染，避免残留上次的表单状态
    -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px" destroy-on-close>
      <!-- 【技术学习】el-form 组件：
        - ref="formRef" 获取表单实例引用
        - :model="form" 绑定表单数据对象
        - :rules="rules" 绑定验证规则
        - label-width="80px" 标签宽度
      -->
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

    <!--
      ========== 得分详情弹窗 ==========
      展示某个选手的所有得分记录，支持添加/删除/批量清空
    -->
    <el-dialog
      v-model="scoreDialogVisible"
      :title="scoreUser ? `${scoreUser.nickname} 的得分详情` : '得分详情'"
      width="560px"
      destroy-on-close
    >
      <!-- 添加得分操作栏 -->
      <div class="score-add-bar">
        <el-input-number v-model="scoreForm.score" :min="-999" :max="999" style="width: 140px" />
        <el-input v-model="scoreForm.reason" placeholder="得分原因" style="width: 200px" />
        <el-button type="primary" :loading="scoreLoading" @click="onAddScore">添加</el-button>
        <el-button
          type="danger"
          :icon="Delete"
          :loading="deletingAllScores"
          @click="onDeleteAllScores"
        >
          删除全部
        </el-button>
      </div>

      <!-- 得分记录表格 -->
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

      <!-- 当前总分显示 -->
      <div v-if="scoreUser" class="score-total">
        当前总分：<strong>{{ scoreUser.totalScore }}</strong>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页面容器 */
.user-management {
  background: var(--bg-card);
  border-radius: 4px;
  padding: 20px;
}

/* 控件栏：标题 + 搜索 + 筛选 + 按钮 */
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
  color: var(--text-primary);
}

.control-actions {
  display: flex;
  gap: 12px;
}

/* 数量统计栏 */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--bg-hover);
  border-radius: 6px;
}

.summary-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 0 8px;
}

.summary-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 不同角色的数量用不同颜色 */
.summary-item--player .summary-num {
  color: #67c23a;  /* 选手：绿色 */
}

.summary-item--admin .summary-num {
  color: #f56c6c;  /* 管理员：红色 */
}

.el-divider--vertical {
  height: 20px;
  margin: 0 4px;
}

/* 密码和 ID 单元格 */
.password-cell,
.id-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 得分添加操作栏 */
.score-add-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 总分显示 */
.score-total {
  margin-top: 12px;
  text-align: right;
  font-size: 14px;
  color: var(--text-primary);
}

/* 确认弹窗消息文本 */
.confirm-message {
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.6;
}

/* ========== 响应式布局 ========== */
@media (max-width: 900px) {
  .control-bar {
    flex-wrap: wrap;
    gap: 10px;
  }

  .control-bar > .el-input {
    width: 100% !important;
    order: 3;  /* 搜索框排到第三行 */
  }

  .control-actions {
    width: 100%;
    order: 4;  /* 按钮组排到第四行 */
    flex-wrap: wrap;
  }

  .control-actions .el-button {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 500px) {
  .user-management {
    padding: 12px;
  }

  .summary-bar {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
