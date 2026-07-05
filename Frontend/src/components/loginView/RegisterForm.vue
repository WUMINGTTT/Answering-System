<!--
  ============================================
  RegisterForm.vue — 注册表单组件
  ============================================
  【组件功能】
  提供用户注册表单，包含昵称、用户名、密码三个字段。
  整体结构与 LoginForm.vue 高度相似，是学习"组件复用思路"的好案例。

  【技术学习 — 与 LoginForm 的结构对比】
  相同点：
    - 都使用 Element Plus 的 el-form / el-form-item / el-input
    - 都通过 ref 引用表单实例，调用 validate() 进行验证
    - 都使用 reactive 管理表单数据
    - 都通过 emit 向父组件传递成功/失败事件
    - 都有 loading 状态防止重复提交
  不同点：
    - 多了 nickname（昵称）字段
    - API 调用的是 register() 而非 login()
    - 成功事件只传递 message，不传递 role（注册不涉及角色）
    - 提供了 resetFields() 表单重置的示例代码（注释中说明）

  【技术学习 — 为什么两个表单不合并成一个？】
  虽然结构相似，但登录和注册的字段、验证规则、API 调用、事件类型都不同。
  如果强行合并，组件内部会有很多 if/else 判断，反而更难维护。
  "相似但不同"的场景，分开写是更好的选择。
-->

<script setup lang="ts">
// 【技术学习】Vue 3 Composition API
// ref: 创建响应式引用（用于基础类型或需要整体替换的对象）
// reactive: 创建响应式代理（用于对象，内部属性自动响应）
import { ref, reactive } from 'vue'

// 【技术学习】Element Plus 的类型定义
// FormInstance: el-form 组件实例的类型，可调用 validate()、resetFields() 等方法
// FormRules: 验证规则的类型约束，确保规则配置正确
import type { FormInstance, FormRules } from 'element-plus'

// 【技术学习】导入注册 API 函数
// 与 LoginForm 中的 login() 类似，register() 也是对 axios 的封装
import { register } from '@/api/users'

// =============================================
// 【技术学习 — defineEmits 事件定义】
// 与 LoginForm 的区别：注册成功不返回 role（角色），只返回 message
// =============================================
const emit = defineEmits<{
  registerSuccess: [message: string]  // 注册成功，传递服务器消息
  registerError: [err: unknown]       // 注册失败，传递错误对象
}>()

// =============================================
// 【技术学习 — 响应式状态】
// 与 LoginForm 完全相同的模式
// =============================================

// loading: 按钮加载状态，防止重复点击注册按钮
const loading = ref(false)

// formRef: 绑定到模板中的 el-form，用于调用表单方法
const formRef = ref<FormInstance>()

// 【技术学习 — 表单数据（比 LoginForm 多了 nickname）】
// reactive 使整个对象变为响应式，任何属性变化都会触发视图更新
const form = reactive({
  nickname: '',   // 昵称：用户显示名称（可包含中文、特殊字符）
  username: '',   // 用户名：登录账号（通常只允许字母数字）
  password: '',   // 密码
})

// =============================================
// 【技术学习 — 表单验证规则】
// 与 LoginForm 相同的配置方式，只是多了 nickname 规则
// 每个字段对应一个规则数组，可以有多条规则（如 required + min长度 + pattern正则）
// =============================================
const rules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// =============================================
// 【技术学习 — 表单提交函数】
// =============================================
async function onSubmit() {
  // 【技术学习 — 表单验证流程（与 LoginForm 一致）】
  // 1. formRef.value?.validate() 触发所有字段的验证
  // 2. .catch(() => false) 捕获验证失败的 reject，返回 false
  // 3. 验证通过返回 true，失败返回 false
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return  // 验证失败，阻止提交

  // 开始加载，禁用按钮
  loading.value = true
  try {
    // 【技术学习 — 调用注册 API】
    // register(form) 将表单数据作为请求体发送到后端
    // 后端通常会返回 { code, message, data } 格式的响应
    const { data: res } = await register(form)

    // 注册成功，向父组件派发事件
    // 父组件收到后可以：显示成功消息、自动切换到登录 Tab、清空表单等
    emit('registerSuccess', res.message)
  } catch (err) {
    // 注册失败（如用户名已存在、服务器错误等）
    emit('registerError', err)
  } finally {
    // 无论成功失败，恢复按钮状态
    loading.value = false
  }

  // =============================================
  // 【技术学习 — 表单重置（resetFields）】
  // Element Plus 的 el-form 提供了 resetFields() 方法：
  //   - 清空所有字段的值为初始值
  //   - 清除所有字段的验证状态（错误提示消失）
  //
  // 使用场景：
  //   1. 注册成功后清空表单，方便连续注册
  //   2. 用户点击"重置"按钮
  //   3. 切换 Tab 时清空表单
  //
  // 用法示例：
  //   formRef.value?.resetFields()
  //
  // 注意事项：
  //   - resetFields 会将字段重置为 reactive 初始化时的值（空字符串）
  //   - 如果需要重置为其他默认值，需要先手动修改 reactive 对象的属性
  //   - 只对有 prop 属性的 el-form-item 生效
  // =============================================
}
</script>

<template>
  <!--
    【技术学习 — el-form 表单容器】
    ref="formRef"     : JS 中通过这个引用来调用表单方法
    :model="form"     : 表单数据源，el-form-item 的 prop 会从中查找对应字段
    :rules="rules"    : 验证规则配置
    label-position="top" : 标签在输入框上方

    与 LoginForm 完全相同的配置，说明这是一个通用的表单模式。
  -->
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
    <!--
      【技术学习 — 昵称字段（LoginForm 没有的字段）】
      prop="nickname" 必须与 form 对象中的属性名一致。
      否则 v-model 绑定正常，但 validate() 不会对该字段进行验证。
    -->
    <el-form-item label="昵称" prop="nickname">
      <el-input v-model="form.nickname" placeholder="请输入昵称" />
    </el-form-item>

    <!-- 用户名字段，与 LoginForm 相同 -->
    <el-form-item label="用户名" prop="username">
      <el-input v-model="form.username" placeholder="请输入用户名" />
    </el-form-item>

    <!-- 密码字段，与 LoginForm 相同：type="password" + show-password -->
    <el-form-item label="密码" prop="password">
      <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
    </el-form-item>

    <!--
      【技术学习 — 注册按钮】
      与 LoginForm 的登录按钮结构一致，只是文字不同。
      :loading 绑定 loading ref，为 true 时显示加载动画并禁用按钮。
    -->
    <el-form-item>
      <el-button type="primary" class="submit-btn" :loading="loading" @click="onSubmit">
        注 册
      </el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
/* 提交按钮宽度 100%，与 LoginForm 相同 */
.submit-btn {
  width: 100%;
}
</style>
