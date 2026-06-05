<script setup lang="ts">
import { ref } from 'vue'
import { logout } from '@/api/users'
import { useRouter } from 'vue-router'

defineProps<{
  nickname: string
  totalScore: number
  connected: boolean
}>()

const router = useRouter()
const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement
})

// ── 头像连续点击 → 退出登录 ──
let avatarClicks = 0
let avatarTimer: ReturnType<typeof setTimeout> | null = null

function onAvatarClick() {
  avatarClicks++
  if (avatarTimer) clearTimeout(avatarTimer)
  if (avatarClicks >= 5) {
    avatarClicks = 0
    showLogoutConfirm()
    return
  }
  const remaining = 5 - avatarClicks
  ElMessage({
    message: `再点击 ${remaining} 次后退出登录`,
    duration: 1500,
    showClose: false,
    customClass: 'avatar-click-msg',
  })
  avatarTimer = setTimeout(() => { avatarClicks = 0 }, 2000)
}

async function showLogoutConfirm() {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出登录',
      { confirmButtonText: '退出', cancelButtonText: '取消', type: 'warning' },
    )
    await logout()
    router.replace('/login')
  } catch { /* 取消 */ }
}
</script>

<template>
  <div class="player-bar" @dblclick="toggleFullscreen">
    <div class="bar-left">
      <div class="avatar" @click.stop="onAvatarClick" @dblclick.stop>{{ nickname.charAt(0) }}</div>
      <span class="nickname">{{ nickname }}</span>
    </div>
    <div class="bar-center">
      <!-- <span class="score">{{ totalScore }} 分</span> -->
    </div>
    <div class="bar-right">
      <span v-if="isFullscreen" class="fs-hint">全屏</span>
      <span class="conn-dot" :class="{ ok: connected }" />
    </div>
  </div>
</template>

<style scoped>
.player-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  height: 48px;
  cursor: pointer;
  user-select: none;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #67c23a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.nickname {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.fs-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}

.bar-center {
  flex: 1;
  text-align: center;
}

.score {
  font-size: 15px;
  color: #ffd666;
  font-weight: 700;
}

.conn-dot {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
  transition: background 0.3s;
}

.conn-dot.ok {
  background: #67c23a;
}
</style>

<!-- ElMessage 全局样式（渲染在组件外，不可 scoped） -->
<style>
.avatar-click-msg {
  background: rgba(0, 0, 0, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 10px !important;
  padding: 10px 20px !important;
  min-width: auto !important;
}
.avatar-click-msg .el-message__content {
  color: #fff !important;
  font-size: 14px !important;
}
</style>
