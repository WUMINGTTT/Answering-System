<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Delete, Edit, Search, DocumentCopy, Download } from '@element-plus/icons-vue'
import {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions,
} from '@/api/questions'
import type { Question } from '@/types/question'
import * as XLSX from 'xlsx'

// ---------- 题目列表 ----------
const questions = ref<Question[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const filterType = ref<'all' | 'single' | 'multiple' | 'subjective'>('all')
const filterCategory = ref<'all' | 'required' | 'quick-answer' | 'risk'>('all')

const displayQuestions = computed(() => {
  let list = questions.value
  if (filterType.value !== 'all') {
    list = list.filter((q) => q.type === filterType.value)
  }
  if (filterCategory.value !== 'all') {
    list = list.filter((q) => q.category === filterCategory.value)
  }
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (q) =>
        q.stem.toLowerCase().includes(kw) || q.id.toLowerCase().includes(kw),
    )
  }
  return list
})

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

// ---------- 新增 / 编辑 ----------
const dialogVisible = ref(false)
const dialogTitle = computed(() => (editingId.value ? '编辑题目' : '新增题目'))
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  type: 'single' as Question['type'],
  category: 'required' as Question['category'],
  stem: '',
  options: [''] as string[],
  answers: [''] as string[],
  score: 10,
})

const rules: FormRules = {
  type: [{ required: true, message: '请选择题型', trigger: 'change' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  stem: [{ required: true, message: '请输入题干', trigger: 'blur' }],
  score: [{ required: true, message: '请输入分值', trigger: 'blur' }],
}

const showOptions = computed(() => form.type !== 'subjective')

const submitting = ref(false)

function openAddDialog() {
  editingId.value = null
  form.type = 'single'
  form.category = 'required'
  form.stem = ''
  form.options = ['']
  form.answers = ['']
  form.score = 10
  dialogVisible.value = true
}

function openEditDialog(q: Question) {
  editingId.value = q.id
  form.type = q.type
  form.category = q.category
  form.stem = q.stem
  form.options = q.options.length > 0 ? [...q.options] : ['']
  form.answers = q.answers.length > 0 ? [...q.answers] : ['']
  form.score = q.score
  dialogVisible.value = true
}

function addOption() {
  form.options.push('')
}

function removeOption(index: number) {
  form.options.splice(index, 1)
}

function addAnswer() {
  form.answers.push('')
}

function removeAnswer(index: number) {
  form.answers.splice(index, 1)
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const nonEmpty = (arr: string[]) => arr.filter((s) => s.trim() !== '')

  submitting.value = true
  try {
    const data = {
      type: form.type,
      category: form.category,
      stem: form.stem,
      options: showOptions.value ? nonEmpty(form.options) : [],
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
async function onDeleteQuestion(q: Question) {
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

// ---------- 标签 ----------
function typeLabel(type: string) {
  const map: Record<string, string> = { single: '单选', multiple: '多选', subjective: '主观' }
  return map[type] || type
}

function typeTagType(type: string) {
  const map: Record<string, string> = { single: 'primary', multiple: 'success', subjective: 'warning' }
  return map[type] || 'info'
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    required: '必答题',
    'quick-answer': '抢答题',
    risk: '风险题',
  }
  return map[cat] || cat
}

function categoryTagType(cat: string) {
  const map: Record<string, string> = { required: '', 'quick-answer': 'danger', risk: 'warning' }
  return map[cat] || 'info'
}

// ---------- 表格高度 ----------
const tableMaxHeight = ref(window.innerHeight - 140)

function onResize() {
  tableMaxHeight.value = window.innerHeight - 140
}

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    ElMessage.success('ID 已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// ---------- 导出 Excel ----------
function exportToExcel() {
  const rows = questions.value.map((q) => ({
    ID: q.id,
    题型: typeLabel(q.type),
    类别: categoryLabel(q.category),
    题干: q.stem,
    选项: q.options.join(' | '),
    答案: q.answers.join(' | '),
    分值: q.score,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '题库')
  XLSX.writeFile(wb, `题库_${new Date().toLocaleDateString()}.xlsx`)
}

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
    <!-- 控件栏 -->
    <div class="control-bar">
      <h2 class="control-title">题目管理</h2>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索题干 / ID"
        :prefix-icon="Search"
        clearable
        style="width: 200px"
      />
      <el-select v-model="filterType" placeholder="题型" clearable style="width: 100px" @clear="filterType = 'all'">
        <el-option label="全部题型" value="all" />
        <el-option label="单选" value="single" />
        <el-option label="多选" value="multiple" />
        <el-option label="主观" value="subjective" />
      </el-select>
      <el-select v-model="filterCategory" placeholder="类别" clearable style="width: 110px" @clear="filterCategory = 'all'">
        <el-option label="全部类别" value="all" />
        <el-option label="必答题" value="required" />
        <el-option label="抢答题" value="quick-answer" />
        <el-option label="风险题" value="risk" />
      </el-select>
      <div class="control-actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">新增题目</el-button>
        <el-button type="success" :icon="Download" @click="exportToExcel">导出题库</el-button>
        <el-button type="danger" :icon="Delete" @click="onDeleteAll">删除全部</el-button>
      </div>
    </div>

    <!-- 题目表格 -->
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
      <el-table-column label="题型" width="80">
        <template #default="{ row }">
          <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类别" width="90">
        <template #default="{ row }">
          <el-tag :type="categoryTagType(row.category)" size="small">{{ categoryLabel(row.category) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="stem" label="题干" min-width="200" show-overflow-tooltip />
      <el-table-column prop="score" label="分值" width="80" sortable />
      <el-table-column label="操作" fixed="right" width="170">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
          <el-button type="danger" link :icon="Delete" @click="onDeleteQuestion(row)">删除</el-button>
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
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
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
        <el-form-item label="题干" prop="stem">
          <el-input v-model="form.stem" type="textarea" :rows="2" placeholder="请输入题干" />
        </el-form-item>
        <el-form-item label="分值" prop="score">
          <el-input-number v-model="form.score" :min="1" :max="100" />
        </el-form-item>

        <!-- 选项（非主观题显示） -->
        <el-form-item v-if="showOptions" label="选项">
          <div class="dynamic-list">
            <div v-for="(_, i) in form.options" :key="i" class="dynamic-row">
              <el-input v-model="form.options[i]" :placeholder="`选项 ${i + 1}`" style="width: 360px" />
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

        <!-- 答案 -->
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
.question-management {
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

.id-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

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

.confirm-message {
  font-size: 15px;
  color: #303133;
  line-height: 1.6;
}
</style>
