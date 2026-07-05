<!--
  ====================================================================
  QuestionManagement.vue — 题目管理页面
  ====================================================================

  【组件职责】
  提供完整的题目 CRUD（增删改查）管理界面，包括：
  1. 题目列表展示（表格形式，支持搜索、题型筛选、类别筛选）
  2. 新增 / 编辑题目（弹窗表单，支持动态选项和答案列表）
  3. 删除单个 / 全部题目（带确认弹窗）
  4. 导出题库为 Excel 文件
  5. 题型和类别的标签显示（不同颜色区分）

  【技术学习 — 主要知识点】
  - 动态表单：选项和答案列表可以动态添加/删除
  - 多维度筛选：同时支持题型（type）和类别（category）筛选
  - computed 派生数据：displayQuestions 自动响应所有筛选条件变化
  - Element Plus 标签组件（el-tag）的颜色编码
-->

<script setup lang="ts">
// ── Vue 3 Composition API 导入 ──
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'

// ── Element Plus 类型和图标导入 ──
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Delete, Edit, Search, DocumentCopy, Download } from '@element-plus/icons-vue'

// ── API 函数导入 ──
import {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions,
} from '@/api/questions'

// ── 类型定义导入 ──
import type { Question } from '@/types/question'

// ── Excel 导出库 ──
import * as XLSX from 'xlsx'

// ====================================================================
// 题目列表数据与多维度筛选
// ====================================================================
const questions = ref<Question[]>([])        // 所有题目数据
const loading = ref(false)                   // 表格加载状态
const searchKeyword = ref('')                // 搜索关键词（按题干或 ID 搜索）

// 【技术学习】多维度筛选：分别用不同的 ref 控制不同维度的筛选条件
const filterType = ref<'all' | 'single' | 'multiple' | 'subjective'>('all')      // 题型筛选
const filterCategory = ref<'all' | 'required' | 'quick-answer' | 'risk'>('all')  // 类别筛选

/**
 * 计算属性：根据所有筛选条件过滤题目列表
 * 【技术学习】筛选逻辑链：先按题型 → 再按类别 → 最后按关键词
 * 每一步都是对上一步结果的进一步过滤
 */
const displayQuestions = computed(() => {
  let list = questions.value

  // 按题型筛选
  if (filterType.value !== 'all') {
    list = list.filter((q) => q.type === filterType.value)
  }

  // 按类别筛选
  if (filterCategory.value !== 'all') {
    list = list.filter((q) => q.category === filterCategory.value)
  }

  // 按关键词搜索（搜索题干内容或题目 ID）
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (q) =>
        q.stem.toLowerCase().includes(kw) || q.id.toLowerCase().includes(kw),
    )
  }
  return list
})

/** 统计各类别题目的数量 */
const requiredCount = computed(() => questions.value.filter((q) => q.category === 'required').length)
const quickAnswerCount = computed(() => questions.value.filter((q) => q.category === 'quick-answer').length)
const riskCount = computed(() => questions.value.filter((q) => q.category === 'risk').length)

/**
 * 从服务器获取全部题目数据
 */
async function fetchQuestions() {
  loading.value = true
  try {
    const { data: res } = await getAllQuestions()
    questions.value = res.data
  } catch {
    ElMessage.error('获取题目列表失败')
  } finally {
    loading.value = false
  }
}

// ====================================================================
// 新增 / 编辑题目弹窗
// ====================================================================
const dialogVisible = ref(false)
const dialogTitle = computed(() => (editingId.value ? '编辑题目' : '新增题目'))
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

// 【技术学习】表单数据包含动态数组：options（选项）和 answers（答案）
// 初始值设为 ['']，确保至少有一个输入框显示
const form = reactive({
  type: 'single' as Question['type'],         // 题型：single/multiple/subjective
  category: 'required' as Question['category'], // 类别：required/quick-answer/risk
  stem: '',                                    // 题干内容
  options: [''] as string[],                   // 选项列表（动态数组）
  answers: [''] as string[],                   // 答案列表（动态数组）
  score: 10,                                   // 分值
})

// 表单验证规则
const rules: FormRules = {
  type: [{ required: true, message: '请选择题型', trigger: 'change' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  stem: [{ required: true, message: '请输入题干', trigger: 'blur' }],
  score: [{ required: true, message: '请输入分值', trigger: 'blur' }],
}

/**
 * 计算属性：是否显示选项输入区域
 * 主观题没有选项，所以隐藏选项区域
 */
const showOptions = computed(() => form.type !== 'subjective')

const submitting = ref(false)

/** 打开新增题目弹窗 */
function openAddDialog() {
  editingId.value = null
  form.type = 'single'
  form.category = 'required'
  form.stem = ''
  form.options = ['']      // 重置为一个空选项
  form.answers = ['']      // 重置为一个空答案
  form.score = 10
  dialogVisible.value = true
}

/** 打开编辑题目弹窗 */
function openEditDialog(q: Question) {
  editingId.value = q.id
  form.type = q.type
  form.category = q.category
  form.stem = q.stem
  // 【技术学习】如果选项/答案为空，填充一个空字符串，确保至少显示一个输入框
  form.options = q.options.length > 0 ? [...q.options] : ['']
  form.answers = q.answers.length > 0 ? [...q.answers] : ['']
  form.score = q.score
  dialogVisible.value = true
}

// ====================================================================
// 动态选项 / 答案列表操作
// ====================================================================
// 【技术学习】动态表单的核心：通过数组的 push/splice 方法添加/删除元素
// Vue 会自动检测数组变化并更新视图

/** 添加一个空选项 */
function addOption() {
  form.options.push('')
}

/** 删除指定索引的选项 */
function removeOption(index: number) {
  form.options.splice(index, 1)
}

/** 添加一个空答案 */
function addAnswer() {
  form.answers.push('')
}

/** 删除指定索引的答案 */
function removeAnswer(index: number) {
  form.answers.splice(index, 1)
}

/**
 * 提交表单（新增或编辑）
 * 【技术学习】提交前清理数据：过滤掉空字符串选项/答案
 */
async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 辅助函数：过滤空字符串
  const nonEmpty = (arr: string[]) => arr.filter((s) => s.trim() !== '')

  submitting.value = true
  try {
    const data = {
      type: form.type,
      category: form.category,
      stem: form.stem,
      options: showOptions.value ? nonEmpty(form.options) : [],  // 主观题不提交选项
      answers: nonEmpty(form.answers),
      score: form.score,
    }

    if (editingId.value) {
      await updateQuestion(editingId.value, data)
      ElMessage.success('题目修改成功')
    } else {
      await createQuestion(data)
      ElMessage.success('题目创建成功')
    }
    dialogVisible.value = false
    await fetchQuestions()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// ====================================================================
// 自定义确认弹窗（Promise 封装模式）
// ====================================================================
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

// ====================================================================
// 删除题目
// ====================================================================
async function onDeleteQuestion(q: Question) {
  // 【技术学习】截取题干前 20 个字符作为确认信息，避免弹窗过长
  const ok = await showConfirm(`确定要删除题目「${q.stem.slice(0, 20)}...」吗？`)
  if (!ok) return

  try {
    await deleteQuestion(q.id)
    ElMessage.success('题目已删除')
    await fetchQuestions()
  } catch {
    ElMessage.error('删除失败')
  }
}

/** 删除全部题目（危险操作） */
async function onDeleteAll() {
  if (questions.value.length === 0) {
    ElMessage.warning('没有可删除的题目')
    return
  }

  const ok = await showConfirm('确定要删除全部题目吗？此操作不可恢复！')
  if (!ok) return

  try {
    await deleteAllQuestions()
    ElMessage.success('全部题目已删除')
    await fetchQuestions()
  } catch {
    ElMessage.error('删除失败')
  }
}

// ====================================================================
// 标签辅助函数
// ====================================================================
// 【技术学习】使用映射表（Record）将后端值转换为中文显示文本和标签颜色

/** 题型中文标签 */
function typeLabel(type: string) {
  const map: Record<string, string> = { single: '单选', multiple: '多选', subjective: '主观' }
  return map[type] || type
}

/** 题型标签颜色 */
function typeTagType(type: string) {
  const map: Record<string, string> = { single: 'primary', multiple: 'success', subjective: 'warning' }
  return map[type] || 'info'
}

/** 类别中文标签 */
function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    required: '必答题',
    'quick-answer': '抢答题',
    risk: '风险题',
  }
  return map[cat] || cat
}

/** 类别标签颜色 */
function categoryTagType(cat: string) {
  const map: Record<string, string> = { required: '', 'quick-answer': 'danger', risk: 'warning' }
  return map[cat] || 'info'
}

// ====================================================================
// 表格高度自适应
// ====================================================================
const tableMaxHeight = ref(window.innerHeight - 205)

function onResize() {
  tableMaxHeight.value = window.innerHeight - 205
}

/** 复制题目 ID 到剪贴板 */
async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('ID 已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// ====================================================================
// 导出题库为 Excel 文件
// ====================================================================
/**
 * 将题目数据导出为 Excel
 * 【技术学习】将每道题的所有信息展开为一行
 * 选项用 " | " 分隔，方便在 Excel 中查看
 */
function exportToExcel() {
  const rows = questions.value.map((q) => ({
    ID: q.id,
    题型: typeLabel(q.type),
    类别: categoryLabel(q.category),
    题干: q.stem,
    选项: q.options.join(' | '),   // 多个选项用竖线分隔
    答案: q.answers.join(' | '),   // 多个答案用竖线分隔
    分值: q.score,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题库')
  XLSX.writeFile(wb, `题库_${new Date().toLocaleDateString()}.xlsx`)
}

// ====================================================================
// 生命周期钩子
// ====================================================================
onMounted(() => {
  fetchQuestions()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="question-management">
    <!-- ========== 控件栏 ========== -->
    <div class="control-bar">
      <h2 class="control-title">题目管理</h2>

      <!-- 搜索框 -->
      <el-input
        v-model="searchKeyword"
        placeholder="搜索题干 / ID"
        :prefix-icon="Search"
        clearable
        style="width: 200px"
      />

      <!-- 题型筛选下拉框 -->
      <el-select v-model="filterType" placeholder="题型" clearable style="width: 100px" @clear="filterType = 'all'">
        <el-option label="全部题型" value="all" />
        <el-option label="单选" value="single" />
        <el-option label="多选" value="multiple" />
        <el-option label="主观" value="subjective" />
      </el-select>

      <!-- 类别筛选下拉框 -->
      <el-select v-model="filterCategory" placeholder="类别" clearable style="width: 110px" @clear="filterCategory = 'all'">
        <el-option label="全部类别" value="all" />
        <el-option label="必答题" value="required" />
        <el-option label="抢答题" value="quick-answer" />
        <el-option label="风险题" value="risk" />
      </el-select>

      <!-- 操作按钮组 -->
      <div class="control-actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">新增题目</el-button>
        <el-button type="success" :icon="Download" @click="exportToExcel">导出题库</el-button>
        <el-button type="danger" :icon="Delete" @click="onDeleteAll">删除全部</el-button>
      </div>
    </div>

    <!-- ========== 数量统计栏 ========== -->
    <div class="summary-bar">
      <span class="summary-item">
        <span class="summary-num">{{ questions.length }}</span>
        <span class="summary-label">总计</span>
      </span>
      <el-divider direction="vertical" />
      <span class="summary-item summary-item--required">
        <span class="summary-num">{{ requiredCount }}</span>
        <span class="summary-label">必答题</span>
      </span>
      <el-divider direction="vertical" />
      <span class="summary-item summary-item--quick">
        <span class="summary-num">{{ quickAnswerCount }}</span>
        <span class="summary-label">抢答题</span>
      </span>
      <el-divider direction="vertical" />
      <span class="summary-item summary-item--risk">
        <span class="summary-num">{{ riskCount }}</span>
        <span class="summary-label">风险题</span>
      </span>
    </div>

    <!--
      ========== 题目表格 ==========
      【技术学习】show-overflow-tooltip 属性：当内容超出列宽时，
      鼠标悬停会显示完整的 tooltip，避免内容被截断
    -->
    <el-table :data="displayQuestions" v-loading="loading" border stripe :max-height="tableMaxHeight" style="width: 100%">
      <el-table-column label="ID" width="150">
        <template #default="{ row }">
          <span class="id-cell">
            <span>{{ row.id }}</span>
            <el-button link size="small" @click="copyId(row.id)">
              <el-icon><component :is="DocumentCopy" /></el-icon>
            </el-button>
          </span>
        </template>
      </el-table-column>

      <!-- 题型列：用颜色标签显示 -->
      <el-table-column label="题型" width="80">
        <template #default="{ row }">
          <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>

      <!-- 类别列：用颜色标签显示 -->
      <el-table-column label="类别" width="90">
        <template #default="{ row }">
          <el-tag :type="categoryTagType(row.category)" size="small">{{ categoryLabel(row.category) }}</el-tag>
        </template>
      </el-table-column>

      <!-- 题干列：溢出时显示 tooltip -->
      <el-table-column prop="stem" label="题干" min-width="200" show-overflow-tooltip />

      <!-- 分值列：支持排序 -->
      <el-table-column prop="score" label="分值" width="80" sortable />

      <!-- 操作列 -->
      <el-table-column label="操作" fixed="right" width="170">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
          <el-button type="danger" link :icon="Delete" @click="onDeleteQuestion(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ========== 确认弹窗 ========== -->
    <el-dialog v-model="confirmVisible" title="确认操作" width="420px">
      <p class="confirm-message">{{ confirmMessage }}</p>
      <template #footer>
        <el-button @click="onConfirmResult(false)">取消</el-button>
        <el-button type="primary" @click="onConfirmResult(true)">确定</el-button>
      </template>
    </el-dialog>

    <!--
      ========== 新增 / 编辑题目弹窗 ==========
      【技术学习】el-row + el-col 实现两列表单布局
      :gutter="16" 设置列间距为 16px
    -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <!-- 题型和类别并排显示 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="题型" prop="type">
              <el-select v-model="form.type" style="width: 100%">
                <el-option label="单选" value="single" />
                <el-option label="多选" value="multiple" />
                <el-option label="主观" value="subjective" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类别" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option label="必答题" value="required" />
                <el-option label="抢答题" value="quick-answer" />
                <el-option label="风险题" value="risk" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 题干：多行文本输入 -->
        <el-form-item label="题干" prop="stem">
          <el-input v-model="form.stem" type="textarea" :rows="2" placeholder="请输入题干" />
        </el-form-item>

        <!-- 分值 -->
        <el-form-item label="分值" prop="score">
          <el-input-number v-model="form.score" :min="1" :max="100" />
        </el-form-item>

        <!--
          动态选项列表（非主观题才显示）
          【技术学习】v-for 遍历 form.options 数组，每个元素渲染一个输入框 + 删除按钮
          最后一个"添加选项"按钮用 push 方法添加新元素
        -->
        <el-form-item v-if="showOptions" label="选项">
          <div class="dynamic-list">
            <div v-for="(_, i) in form.options" :key="i" class="dynamic-row">
              <el-input v-model="form.options[i]" :placeholder="`选项 ${i + 1}`" style="width: 360px" />
              <!-- 至少保留一个选项，所以当只剩一个时禁用删除按钮 -->
              <el-button
                :disabled="form.options.length <= 1"
                :icon="Delete"
                circle
                size="small"
                @click="removeOption(i)"
              />
            </div>
            <el-button :icon="Plus" size="small" @click="addOption">添加选项</el-button>
          </div>
        </el-form-item>

        <!-- 动态答案列表 -->
        <el-form-item label="答案" prop="answers">
          <div class="dynamic-list">
            <div v-for="(_, i) in form.answers" :key="i" class="dynamic-row">
              <el-input v-model="form.answers[i]" placeholder="请输入答案" style="width: 360px" />
              <el-button
                :disabled="form.answers.length <= 1"
                :icon="Delete"
                circle
                size="small"
                @click="removeAnswer(i)"
              />
            </div>
            <el-button :icon="Plus" size="small" @click="addAnswer">添加答案</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页面容器 */
.question-management {
  background: var(--bg-card);
  border-radius: 4px;
  padding: 20px;
}

/* 控件栏 */
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

/* 不同类别用不同颜色 */
.summary-item--required .summary-num {
  color: #409eff;  /* 必答题：蓝色 */
}

.summary-item--quick .summary-num {
  color: #e6a23c;  /* 抢答题：橙色 */
}

.summary-item--risk .summary-num {
  color: #f56c6c;  /* 风险题：红色 */
}

.el-divider--vertical {
  height: 20px;
  margin: 0 4px;
}

/* ID 单元格 */
.id-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 动态选项/答案列表 */
.dynamic-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dynamic-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 确认弹窗消息 */
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

  .control-bar > .el-input,
  .control-bar > .el-select {
    width: 100% !important;
  }

  .control-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .control-actions .el-button {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 500px) {
  .question-management {
    padding: 12px;
  }

  .summary-bar {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
