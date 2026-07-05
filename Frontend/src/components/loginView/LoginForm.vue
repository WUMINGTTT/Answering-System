<!--
  ============================================
  LoginForm.vue — 登录表单组件
  ============================================
  【组件功能】
  提供用户名+密码的登录表单，使用 Element Plus 的表单组件库实现。
  包含表单验证、加载状态、API 调用和错误处理等完整流程。

  【技术学习 — 核心知识点】
  1. Element Plus 表单：el-form / el-form-item / el-input 三件套
  2. 表单验证规则（rules）：声明式配置验证条件
  3. ref 引用表单实例：通过 ref 获取 el-form 的 DOM/组件引用
  4. validate() 方法：手动触发表单验证
  5. emit 事件派发：子组件向父组件传递登录结果
  6. async/await + try/catch：异步 API 调用的标准写法
-->

<script setup lang="ts">
// 【技术学习】Vue 3 Composition API 的核心函数
// ref: 创建基本类型的响应式引用（如布尔值、对象引用）
// reactive: 创建复杂对象的响应式代理
import { ref, reactive } from 'vue'

// 【技术学习】从 Element Plus 导入类型定义
// FormInstance: el-form 组件的实例类型，用于调用 validate() 等方法
// FormRules: 表单验证规则的类型定义
import type { FormInstance, FormRules } from 'element-plus'

// 【技术学习】导入封装好的 API 请求函数
// login 函数内部使用 axios 发送 POST 请求到后端登录接口
import { login } from '@/api/users'

// =============================================
// 【技术学习 — defineEmits 事件定义】
// 声明组件可以向父组件派发的事件及参数类型。
// 这是 Vue 3 的类型安全写法，父组件通过 @loginSuccess="..." 监听。
// =============================================
const emit = defineEmits<{
  // 登录成功事件：传递用户角色（role）和服务器返回的消息（message）
  loginSuccess: [role: string, message: string]
  // 登录失败事件：传递错误对象，类型为 unknown（因为错误类型不确定）
  loginError: [err: unknown]
}>()

// =============================================
// 【技术学习 — 响应式状态】
// =============================================

// loading: 控制登录按钮的加载状态，防止重复提交
// ref(false) 初始值为 false，表示不在加载中
const loading = ref(false)

// 【技术学习 — ref 引用表单实例】
// 这个 ref 通过模板中的 ref="formRef" 与 el-form 组件绑定
// 绑定后可以在 JS 中调用 el-form 的方法（如 validate()、resetFields()）
const formRef = ref<FormInstance>()

// 【技术学习 — reactive 表单数据】
// reactive 创建一个响应式对象，内部所有属性都是响应式的
// 模板中通过 v-model 双向绑定，用户输入会自动同步到这个对象
const form = reactive({
  username: '',  // 用户名
  password: '',  // 密码
})

// =============================================
// 【技术学习 — 表单验证规则（rules）】
// Element Plus 的声明式验证配置。每个字段对应一个规则数组。
// 每条规则对象的属性：
//   required: true   — 必填项
//   message           — 验证失败时的提示文字
//   trigger: 'blur'   — 触发时机（'blur' = 失去焦点时验证）
// 其他常用属性：min/max（长度限制）、pattern（正则匹配）、type（类型校验）等
// =============================================
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// =============================================
// 【技术学习 — 表单提交函数】
// 使用 async/await 处理异步操作，代码更清晰
// =============================================
async function onSubmit() {
  // 【技术学习 — 表单验证】
  // formRef.value?.validate() 返回 Promise<boolean>
  //   - 验证全部通过：resolve(true)
  //   - 验证失败：reject()，被 .catch(() => false) 捕获后返回 false
  // ?. 可选链：formRef.value 可能为 undefined（组件未挂载时），避免报错
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return  // 验证不通过，直接返回，不发送请求

  // 设置 loading 状态，按钮显示"加载中"动画，同时防止重复点击
  loading.value = true

  try {
    // 【技术学习 — API 调用】
    // login(form) 发送 HTTP 请求，返回 AxiosResponse
    // { data: res } 解构赋值：从响应中取出 data 字段，重命名为 res
    // res.data 是后端返回的业务数据（包含 role 角色信息）
    // res.message 是后端返回的提示消息
    const { data: res } = await login(form)

    // 【技术学习 — 向父组件派发成功事件】
    // emit(事件名, ...参数)：触发父组件监听的 @loginSuccess 事件
    // 父组件可以据此跳转页面或显示成功提示
    emit('loginSuccess', res.data.role, res.message)
  } catch (err) {
    // 【技术学习 — 错误处理】
    // axios 请求失败会抛出异常（网络错误、4xx/5xx 状态码等）
    // 这里将错误传递给父组件，由父组件统一处理错误提示
    emit('loginError', err)
  } finally {
    // 【技术学习 — finally 块】
    // 无论成功还是失败，都会执行。用于清理 loading 状态。
    // 这样即使登录失败，按钮也会恢复为可点击状态。
    loading.value = false
  }
}
</script>

<template>
  <!--
    【技术学习 — el-form 组件详解】
    ref="formRef"     : 将 DOM/组件引用绑定到 JS 中的 formRef 变量
    :model="form"     : 绑定表单数据对象，el-form-item 的 prop 会从中取值
    :rules="rules"    : 绑定验证规则，validate() 方法依据这些规则校验
    label-position="top" : 标签显示在输入框上方（默认是左侧）
  -->
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
    <!--
      【技术学习 — el-form-item 表单项】
      label="用户名" : 标签文字
      prop="username" : 对应 model 中的字段名，也是 rules 中的 key
      注意：prop 必须和 :model 绑定的对象属性名一致，否则验证不生效
    -->
    <el-form-item label="用户名" prop="username">
      <!--
        【技术学习 — v-model 双向绑定】
        v-model="form.username" 实现双向数据绑定：
          - 用户在输入框中打字 → form.username 自动更新
          - JS 中修改 form.username → 输入框自动显示新值
      -->
      <el-input v-model="form.username" placeholder="请输入用户名" />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <!--
        【技术学习 — 密码输入框】
        type="password"    : 输入内容显示为圆点，隐藏真实字符
        show-password      : 在输入框右侧显示"眼睛"图标，点击可切换明文/密文
      -->
      <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
    </el-form-item>

    <el-form-item>
      <!--
        【技术学习 — 提交按钮】
        type="primary"  : 使用主题色（蓝色）样式
        :loading="loading" : 绑定 loading 状态，为 true 时按钮显示加载动画并禁用
        @click="onSubmit"  : 点击时调用 onSubmit 函数
      -->
      <el-button type="primary" class="submit-btn" :loading="loading" @click="onSubmit">
        登 录
      </el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
/* 提交按钮占满整行宽度 */
.submit-btn {
  width: 100%;
}
</style>
