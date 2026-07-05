<!--
  ============================================================================
  BuzzButton.vue - 抢答按钮组件
  ============================================================================

  【组件功能】
  抢答场景的核心交互组件，提供大圆形按钮用于选手抢答。
  支持多种状态：等待、倒计时、就绪、成功、提前、失败。

  【设计思路】
  1. 大圆形按钮设计（220px），便于触屏操作，视觉冲击力强
  2. 多状态切换，每个状态有独特的视觉表现（颜色、文字、大小）
  3. 倒计时中也可点击（会被标记为"提前抢答"）
  4. 状态由父组件通过 props 控制，按钮本身只负责展示和事件发射

  【技术学习】
  - computed：Vue 计算属性，基于响应式数据自动计算派生值
  - 状态机模式：通过 props 组合判定当前状态
  - CSS 状态驱动样式：根据状态类名切换视觉效果
  - Socket 事件：通过 emit 向父组件传递抢答动作
-->

<script setup lang="ts">
/**
 * 导入说明：
 * - computed：Vue 3 计算属性 API
 * - BuzzResult：抢答结果的类型定义
 */
import { computed } from 'vue'
import type { BuzzResult } from '@/composables/useSocket'

/**
 * defineProps：定义组件接收的 props
 *
 * 【技术学习】props 详解（抢答状态相关的所有数据）：
 *
 * 倒计时相关：
 * - isCounting: boolean     → 是否正在倒计时
 * - remaining: number       → 剩余秒数（整数）
 * - remainingText: string   → 剩余时间文字
 * - remainingDecimal: string → 剩余时间（带小数，如 "2.3"）
 *
 * 抢答控制相关：
 * - buzzOpen: boolean       → 抢答是否开放（管理员已开始）
 * - hasWinner: boolean      → 是否已有获胜者
 * - winnerNickname: string  → 获胜者昵称
 * - canBuzz: boolean        → 当前是否可以抢答
 *
 * 结果相关：
 * - buzzResult: BuzzResult | null → 本选手的抢答结果
 */
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

/**
 * defineEmits：定义组件可以发射的事件
 *
 * 【技术学习】
 * - buzz: [] 表示发射 buzz 事件，不携带参数
 * - 父组件通过 @buzz="handler" 监听
 * - 按钮点击时触发，父组件处理实际的 Socket 通信
 */
const emit = defineEmits<{
  buzz: []
}>()

// ============================================================================
// 状态判定：通过 props 组合判断当前所处状态
// ============================================================================

/**
 * 【技术学习】状态机设计模式
 *
 * 抢答流程的状态转换：
 *
 * 1. pending（等待）：管理员选了题，但还没开始倒计时
 *    条件：buzzOpen=false, isCounting=false
 *
 * 2. counting（倒计时）：倒计时进行中
 *    条件：buzzOpen=true, isCounting=true
 *
 * 3. ready（就绪）：倒计时结束，可以抢答
 *    条件：buzzOpen=true, isCounting=false
 *
 * 4. 结果状态（由 buzzResult 决定）：
 *    - success：抢答成功
 *    - early：提前抢答
 *    - fail：抢答失败
 *
 * computed() 接收一个 getter 函数，返回只读的 ref
 * 当依赖的响应式数据变化时，自动重新计算
 */

/** pending：等待状态 - 题目已出、等待管理员开始倒计时 */
const isPending = computed(() => !props.buzzOpen && !props.isCounting)

/** counting：倒计时进行中 */
const isCountingDown = computed(() => props.buzzOpen && !props.isCounting)

/** ready：抢答就绪 - 倒计时结束，所有选手均可抢答 */
const isReady = computed(() => props.buzzOpen && !props.isCounting)

/**
 * buttonText：按钮主文字
 *
 * 【技术学习】computed 的优先级：
 * - 先检查是否有结果（buzzResult）
 * - 再检查倒计时状态
 * - 最后检查就绪状态
 * - 默认显示"等待"
 *
 * 优先级顺序很重要：buzzResult > counting > ready > pending
 */
const buttonText = computed(() => {
  // 有抢答结果显示对应文字
  if (props.buzzResult) {
    if (props.buzzResult.early) return '提前'      // 提前抢答
    if (props.buzzResult.valid) return '成功'      // 抢答成功
    return '失败'                                   // 抢答失败
  }
  // 倒计时中显示剩余秒数（带小数，如 "2.3"）
  if (isCountingDown.value) return props.remainingDecimal
  // 就绪状态显示"抢答"
  if (isReady.value) return '抢答'
  // 默认显示"等待"
  return '等待'
})

/**
 * buttonSubText：按钮副文字
 *
 * 【设计说明】
 * - 倒计时时显示"秒"字，配合主文字的数字
 * - 就绪态和结果态不显示副文字
 */
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

/**
 * buttonClass：按钮的 CSS 类名
 *
 * 【技术学习】状态驱动样式：
 * - 根据不同状态返回不同的类名
 * - CSS 中定义每个类名对应的颜色、大小等样式
 * - 实现视觉反馈，让选手直观了解当前状态
 *
 * 类名对应的状态：
 * - buzz--pending：等待中（灰色）
 * - buzz--counting：倒计时（橙色）
 * - buzz--ready：就绪（绿色，更大）
 * - buzz--success：成功（绿色）
 * - buzz--early：提前（橙色）
 * - buzz--fail：失败（红色，半透明）
 */
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

/**
 * clickable：按钮是否可点击
 *
 * 【技术学习】
 * - 有抢答结果时不可点击（已出结果）
 * - 抢答开放时可点击（buzzOpen=true）
 * - 倒计时中也可点击（会被标记为提前抢答）
 * - 等待状态不可点击（管理员还没开始）
 */
const clickable = computed(() => {
  if (props.buzzResult) return false  // 已有结果，不可点击
  return props.buzzOpen               // 抢答开放时可点击
})

/**
 * hintText：底部提示文字
 *
 * 【设计说明】根据状态显示不同的提示信息，引导选手操作
 */
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

/**
 * handleBuzz：处理抢答点击
 *
 * 【技术学习】事件发射流程：
 * 1. 检查是否可点击（clickable）
 * 2. 发射 'buzz' 事件给父组件
 * 3. 父组件收到事件后，通过 Socket 发送抢答请求到服务器
 * 4. 服务器处理后返回结果，父组件更新 buzzResult
 */
function handleBuzz() {
  if (!clickable.value) return  // 不可点击则直接返回
  emit('buzz')                  // 发射抢答事件
}
</script>

<template>
  <!--
    抢答区域容器

    【技术学习】flex 布局实现垂直居中：
    - display: flex + flex-direction: column
    - align-items: center（水平居中）
    - justify-content: center（垂直居中）
    - flex: 1 占据剩余空间
  -->
  <div class="buzz-area">
    <!--
      抢答按钮 - 大圆形

      【技术学习】动态 class 绑合：
      :class="buttonClass" 绑定计算属性返回的类名
      不同类名对应不同的 CSS 样式，实现状态驱动的视觉变化

      :disabled="!clickable"：不可点击时禁用按钮
      @click="handleBuzz"：点击时触发抢答处理函数
    -->
    <button
      class="buzz-btn"
      :class="buttonClass"
      :disabled="!clickable"
      @click="handleBuzz"
    >
      <!-- 主文字：状态关键词或倒计时数字 -->
      <span class="buzz-btn-main">{{ buttonText }}</span>
      <!-- 副文字：辅助说明（如"秒"字） -->
      <span v-if="buttonSubText" class="buzz-btn-sub">{{ buttonSubText }}</span>
    </button>

    <!--
      底部提示文字

      【技术学习】动态 class 绑定：
      :class="buttonClass" 让提示文字的颜色与按钮状态保持一致
    -->
    <div class="buzz-hint" :class="buttonClass">
      {{ hintText }}
    </div>
  </div>
</template>

<style scoped>
/* 抢答区域容器 */
.buzz-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex: 1;
  padding: 0 8px;
}

/* ======================================================================== */
/*                          抢答按钮（大圆形）                               */
/* ======================================================================== */

/*
 * 按钮基础样式
 *
 * 【设计要点】
 * - width/height: 220px：大尺寸，便于触屏操作
 * - border-radius: 50%：圆形
 * - -webkit-tap-highlight-color: transparent：去除移动端点击高亮
 * - display: flex + column：垂直排列主副文字
 */
.buzz-btn {
  width: 220px;
  height: 220px;
  border-radius: 50%;              /* 圆形 */
  border: 2px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;  /* 移动端去除点击高亮 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
}

/* 按钮主文字样式 */
.buzz-btn-main {
  font-size: 38px;
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1;
}

/* 按钮副文字样式 */
.buzz-btn-sub {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1px;
  opacity: 0.7;
  line-height: 1;
}

/* 禁用状态 */
.buzz-btn:disabled {
  cursor: not-allowed;
}

/* ── 等待中状态（灰色） ── */
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

/* ── 倒计时中状态（橙色） ── */

/*
 * 【技术学习】等宽字体的使用：
 * font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace
 * - 等宽字体中每个字符宽度相同
 * - 倒计时数字变化时不会产生布局抖动
 * - 比如 "1.0" 和 "9.9" 占据相同宽度
 */
.buzz-btn.buzz--counting {
  border-color: rgba(230, 162, 60, 0.4);
  background: rgba(230, 162, 60, 0.08);
}

.buzz-btn.buzz--counting .buzz-btn-main {
  color: #e6a23c;
  font-size: 48px;                 /* 倒计时数字更大 */
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.buzz-btn.buzz--counting .buzz-btn-sub {
  color: rgba(230, 162, 60, 0.7);
}

/* ── 就绪态（绿色，加粗边框） ── */

/*
 * 【设计说明】就绪态是最激动人心的状态
 * - 更粗的边框（4px）强调可点击
 * - 更大的字号（44px）吸引注意力
 * - 绿色表示"可以行动"
 */
.buzz-btn.buzz--ready {
  border-color: #67c23a;
  border-width: 4px;               /* 更粗的边框 */
  background: rgba(103, 194, 58, 0.15);
}

.buzz-btn.buzz--ready .buzz-btn-main {
  color: #67c23a;
  font-size: 44px;                 /* 更大的字号 */
}

.buzz-btn.buzz--ready .buzz-btn-sub {
  color: #67c23a;
}

/* ── 成功态（绿色） ── */
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

/* ── 提前抢答态（橙色） ── */
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

/* ── 失败/关闭态（半透明） ── */
.buzz-btn.buzz--fail,
.buzz-btn.buzz--closed {
  opacity: 0.5;
}

/* ======================================================================== */
/*                           底部提示文字                                    */
/* ======================================================================== */

.buzz-hint {
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.4;
}

/* 各状态的提示文字颜色 */
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

/* ======================================================================== */
/*                             响应式设计                                    */
/* ======================================================================== */

/*
 * 【技术学习】响应式设计
 *
 * 小屏幕（<= 420px）适配：
 * - 按钮尺寸从 220px 缩小到 180px
 * - 字号相应减小
 * - 保持整体比例协调
 *
 * 为什么是 420px？
 * - 大多数手机屏幕宽度在 360px-420px 之间
 * - 420px 是一个常见的移动端断点
 */
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
