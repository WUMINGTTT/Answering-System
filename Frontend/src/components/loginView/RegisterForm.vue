<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { register } from '@/api/users'

const emit = defineEmits<{
  registerSuccess: []
}>()

const loading = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  nickname: '',
  username: '',
  password: '',
})

const rules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const { data: res } = await register(form)
    ElMessage.success(res.message)
    emit('registerSuccess')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
  >
    <el-form-item label="昵称" prop="nickname">
      <el-input
        v-model="form.nickname"
        placeholder="请输入昵称"
      />
    </el-form-item>

    <el-form-item label="用户名" prop="username">
      <el-input
        v-model="form.username"
        placeholder="请输入用户名"
      />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="form.password"
        type="password"
        placeholder="请输入密码"
        show-password
      />
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        class="submit-btn"
        :loading="loading"
        @click="onSubmit"
      >
        注 册
      </el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.submit-btn {
  width: 100%;
}
</style>
