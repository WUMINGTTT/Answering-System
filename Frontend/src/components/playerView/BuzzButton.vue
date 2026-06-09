<script setup lang="ts">
import { computed } from 'vue'
import type { BuzzResult } from '@/composables/useSocket'

const props = defineProps<{
  isCounting: boolean
  remaining: number
  remainingText: string
  remainingDecimal: string
  buzzOpen: boolean
  hasWinner: boolean
  winnerNickname: string
  buzzResult: BuzzResult | null
  canBuzz: boolean
}>()

const emit = defineEmits<{
  buzz: []
}>()

// ── 状态判定 ──

/** 题目已出、等待倒计时开始（管理员选了题但还没点播放） */
const isPending = computed(() => !props.buzzOpen && !props.isCounting)

/** 倒计时运行中 */
const isCountingDown = computed(() => props.buzzOpen && props.isCounting)

/** 抢答就绪（倒计时结束、可点击，所有选手均可抢答） */
const isReady = computed(() => props.buzzOpen && !props.isCounting)

// ── 按钮主文字 ──
const buttonText = computed(() => {
  if (props.buzzResult) {
    if (props.buzzResult.early) return '提前'
    if (props.buzzResult.valid) return '成功'
    return '失败'
  }
  if (isCountingDown.value) return props.remainingDecimal
  if (isReady.value) return '抢答'
  return '等待'
})

// ── 按钮副文字 ──
const buttonSubText = computed(() => {
  if (props.buzzResult) {
    if (props.buzzResult.early) return '抢答'
    if (props.buzzResult.valid) return '抢答'
    return '抢答'
  }
  if (isCountingDown.value) return '秒'
  if (isReady.value) return ''
  return '开始'
})

// ── 按钮状态类 ──
const buttonClass = computed(() => {
  if (props.buzzResult) {
    if (props.buzzResult.early) return 'buzz--early'
    if (props.buzzResult.valid) return 'buzz--success'
    return 'buzz--fail'
  }
  if (isCountingDown.value) return 'buzz--counting'
  if (isReady.value) return 'buzz--ready'
  return 'buzz--pending'
})

// ── 按钮是否可点击（倒计时中也可点击，提前抢答会被服务端标记） ──
const clickable = computed(() => {
  if (props.buzzResult) return false
  return props.buzzOpen
})

// ── 底部提示文字 ──
const hintText = computed(() => {
  if (props.buzzResult) {
    if (props.buzzResult.early) return '提前抢答，请等待倒计时结束'
    if (props.buzzResult.valid) {
      if (props.buzzResult.winner && props.hasWinner) return '抢答成功！等待答题倒计时'
      return '抢答成功'
    }
    return `抢答失败，${props.buzzResult.winner?.nickname || '其他选手'} 抢先一步`
  }
  if (isCountingDown.value) return '现在点击为提前抢答'
  if (isReady.value) return '点击按钮抢答！'
  return '等待管理员开始倒计时'
})

function handleBuzz() {
  if (!clickable.value) return
  emit('buzz')
}
</script>

<template>
  <div class="buzz-area">
    <!-- 抢答按钮 — 大圆形 -->
    <button
      class="buzz-btn"
      :class="buttonClass"
      :disabled="!clickable"
      @click="handleBuzz"
    >
      <span class="buzz-btn-main">{{ buttonText }}</span>
      <span v-if="buttonSubText" class="buzz-btn-sub">{{ buttonSubText }}</span>
    </button>

    <!-- 底部提示 -->
    <div class="buzz-hint" :class="buttonClass">
      {{ hintText }}
    </div>
  </div>
</template>

<style scoped>
.buzz-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex: 1;
  padding: 0 8px;
}

/* ========== 抢答按钮（大圆形） ========== */
.buzz-btn {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
}

.buzz-btn-main {
  font-size: 38px;
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1;
}

.buzz-btn-sub {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1px;
  opacity: 0.7;
  line-height: 1;
}

.buzz-btn:disabled {
  cursor: not-allowed;
}

/* ── 等待中（题目已出、未开始倒计时） ── */
.buzz-btn.buzz--pending {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.buzz-btn.buzz--pending .buzz-btn-main {
  color: rgba(255, 255, 255, 0.3);
}

.buzz-btn.buzz--pending .buzz-btn-sub {
  color: rgba(255, 255, 255, 0.2);
}

/* ── 倒计时中 ── */
.buzz-btn.buzz--counting {
  border-color: rgba(230, 162, 60, 0.4);
  background: rgba(230, 162, 60, 0.08);
}

.buzz-btn.buzz--counting .buzz-btn-main {
  color: #e6a23c;
  font-size: 48px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.buzz-btn.buzz--counting .buzz-btn-sub {
  color: rgba(230, 162, 60, 0.7);
}

/* ── 就绪态（可点击抢答） ── */
.buzz-btn.buzz--ready {
  border-color: #67c23a;
  border-width: 4px;
  background: rgba(103, 194, 58, 0.15);
}

.buzz-btn.buzz--ready .buzz-btn-main {
  color: #67c23a;
  font-size: 44px;
}

.buzz-btn.buzz--ready .buzz-btn-sub {
  color: #67c23a;
}

/* ── 成功态 ── */
.buzz-btn.buzz--success {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.2);
}

.buzz-btn.buzz--success .buzz-btn-main {
  color: #67c23a;
}

.buzz-btn.buzz--success .buzz-btn-sub {
  color: rgba(103, 194, 58, 0.8);
}

/* ── 提前抢答 ── */
.buzz-btn.buzz--early {
  border-color: #e6a23c;
  background: rgba(230, 162, 60, 0.12);
}

.buzz-btn.buzz--early .buzz-btn-main {
  color: #e6a23c;
}

.buzz-btn.buzz--early .buzz-btn-sub {
  color: rgba(230, 162, 60, 0.8);
}

/* ── 失败 / 关闭态 ── */
.buzz-btn.buzz--fail,
.buzz-btn.buzz--closed {
  opacity: 0.5;
}

/* ========== 底部提示 ========== */
.buzz-hint {
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.4;
}

.buzz-hint.buzz--pending {
  color: rgba(255, 255, 255, 0.25);
}

.buzz-hint.buzz--counting {
  color: rgba(230, 162, 60, 0.6);
}

.buzz-hint.buzz--ready {
  color: #67c23a;
}

.buzz-hint.buzz--success {
  color: #67c23a;
}

.buzz-hint.buzz--early {
  color: #e6a23c;
}

.buzz-hint.buzz--fail,
.buzz-hint.buzz--closed {
  color: rgba(245, 108, 108, 0.6);
}

/* ========== 响应式 ========== */
@media (max-width: 420px) {
  .buzz-btn {
    width: 180px;
    height: 180px;
  }

  .buzz-btn-main {
    font-size: 32px;
  }

  .buzz-btn.buzz--counting .buzz-btn-main {
    font-size: 40px;
  }

  .buzz-btn.buzz--ready .buzz-btn-main {
    font-size: 36px;
  }

  .buzz-btn-sub {
    font-size: 12px;
  }

  .buzz-hint {
    font-size: 12px;
  }
}
</style>
