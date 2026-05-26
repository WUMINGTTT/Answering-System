<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { login } from '@/api/users'

const emit = defineEmits<{
  loginSuccess: [role: string, message: string]
  loginError: [err: unknown]
}>()

const loading = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const { data: res } = await login(form)
    emit('loginSuccess', res.data.role, res.message)
  } catch (err) {
    emit('loginError', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
    <el-form-item label="用户名" prop="username">
      <el-input v-model="form.username" placeholder="请输入用户名" />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" class="submit-btn" :loading="loading" @click="onSubmit">
        登 录
      </el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.submit-btn {
  width: 100%;
}
</style>
