/**
 * 【技术学习】选手答题界面组件 PlayerView.vue
 *
 * 这是选手答题的主要页面，功能包括：
 * 1. 显示当前题目和选项
 * 2. 处理选手的答题操作
 * 3. 显示答题结果（正确/错误/超时）
 * 4. 支持必答题和抢答题两种模式
 * 5. 页面刷新后自动恢复答题状态
 *
 * 安全措施：
 * - 禁用复制功能（防止题目泄露）
 * - 禁用右键菜单（防止查看源代码）
 * - 禁用页面滚动（优化移动端体验）
 */

<!-- ==================== 脚本部分 ==================== -->
<script setup lang="ts">

// -------------------- 导入依赖 --------------------

// Vue 核心函数
// 【技术学习】
// - ref: 创建响应式变量
// - watch: 监听响应式变量的变化
// - computed: 创建计算属性
// - onMounted: 组件挂载后执行
// - onUnmounted: 组件卸载前执行（用于清理资源）
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'

// Vue Router
import { useRouter } from 'vue-router'

// Socket.IO 相关
import { useSocket, type SyncedGameState, type AnswerResult } from '@/composables/useSocket'

// 倒计时 composable
import { useDisplayCountdown } from '@/composables/useDisplayCountdown'

// 类型定义
import type { Question } from '@/types/question'
import type { User } from '@/types/user'

// API 函数
import { getMe } from '@/api/users'

// 子组件
import PlayerInfoBar from '@/components/playerView/PlayerInfoBar.vue'        // 顶部信息栏
import AnnouncementPanel from '@/components/playerView/AnnouncementPanel.vue' // 公告面板
import AnswerOptions from '@/components/playerView/AnswerOptions.vue'         // 答题选项
import BuzzButton from '@/components/playerView/BuzzButton.vue'              // 抢答按钮

// -------------------- 初始化 --------------------

const router = useRouter()

// ==================== Socket.IO 连接 ====================

/**
 * 【技术学习】建立 Socket.IO 连接并获取相关方法
 *
 * useSocket 返回的对象包含：
 * - connected: 连接状态
 * - serverState: 服务器状态
 * - registerPlayer: 注册选手到服务器
 * - submitAnswer: 提交答案
 * - resetPlayerAnswerState: 重置选手答题状态
 * - answerResult: 答题结果
 * - checkPlayerStatus: 检查选手状态（用于状态恢复）
 * - myStatus: 选手当前状态
 * - sendBuzz: 发送抢答请求
 * - buzzResult: 抢答结果
 */
const {
  connected,
  serverState,
  registerPlayer,
  submitAnswer,
  resetPlayerAnswerState,
  answerResult,
  checkPlayerStatus,
  myStatus,
  sendBuzz,
  buzzResult,
} = useSocket({ syncRemote: true, pageType: 'player' })

// ==================== 倒计时状态 ====================

const {
  answerRemainingText,           // 答题剩余时间文本
  quickAnswerRemainingText,      // 抢答剩余时间文本
  quickAnswerRemainingDecimal,   // 抢答剩余时间（小数，用于精确动画）
  isQuickAnswerCounting,         // 抢答倒计时是否正在计数
  quickAnswerRemaining,          // 抢答剩余秒数
  syncFromServer,                // 同步服务器状态
} = useDisplayCountdown()

// ==================== 当前用户 ====================

// 当前登录的用户信息
const user = ref<User | null>(null)

// 用户信息加载状态
const userLoading = ref(true)

/**
 * 【技术学习】组件挂载后获取用户信息
 *
 * onMounted 生命周期钩子：
 * - 在组件挂载到 DOM 后执行
 * - 通常用于初始化数据、发送请求等
 *
 * async/await 处理异步请求：
 * - try: 尝试执行可能失败的代码
 * - catch: 捕获错误（这里静默处理）
 * - finally: 无论成功失败都执行（关闭加载状态）
 */
onMounted(async () => {
  try {
    // 获取当前用户信息
    const { data: res } = await getMe()
    user.value = res.data

    // 如果 Socket 已连接，注册选手并检查状态
    if (connected.value) {
      registerPlayer(res.data.id, res.data.nickname)  // 注册选手
      checkPlayerStatus(res.data.id)                   // 检查状态（用于恢复）
    }
  } catch {
    /* 静默失败，稍后重试 */
  } finally {
    userLoading.value = false  // 无论成功失败，都关闭加载状态
  }
})

// ==================== 安全措施：禁用复制和右键 ====================

/**
 * 【技术学习】防止用户复制题目内容
 *
 * 这是一个简单的安全措施，防止选手：
 * 1. 复制题目文字（防止题目泄露）
 * 2. 使用右键菜单（防止查看源代码等操作）
 *
 * 实现方式：
 * - 监听 'copy' 和 'contextmenu' 事件
 * - 调用 e.preventDefault() 阻止默认行为
 */
function preventCopy(e: Event) {
  e.preventDefault()
}

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('copy', preventCopy)
  document.addEventListener('contextmenu', preventCopy)
})

// 组件卸载时移除事件监听
// 【技术学习】清理事件监听器防止内存泄漏
onUnmounted(() => {
  document.removeEventListener('copy', preventCopy)
  document.removeEventListener('contextmenu', preventCopy)
})

// ==================== 连接状态监听 ====================

/**
 * 【技术学习】监听 Socket 连接状态变化
 *
 * 当 Socket 重新连接时，需要重新注册选手
 * 这是为了处理网络断开后重连的情况
 */
watch(connected, (val) => {
  if (val && user.value) {
    // 连接成功后重新注册选手
    registerPlayer(user.value.id, user.value.nickname)
    // 检查选手状态（可能需要恢复）
    checkPlayerStatus(user.value.id)
  }
})

// ==================== 远端状态同步 ====================

// 当前题目
const currentQuestion = ref<Question | null>(null)

// 答题倒计时是否正在计数
const isAnswerCounting = ref(false)

// 当前游戏阶段
const phase = ref('')

// 抢答是否开放
const buzzOpen = ref(false)

// 抢答获胜者
const buzzWinner = ref<{ userId: string; nickname: string; timestamp: number } | null>(null)

/**
 * 【技术学习】监听服务器状态变化
 *
 * 当服务器推送新状态时：
 * 1. 检查题目是否变化（如果变化，重置答题状态）
 * 2. 同步所有状态到本地变量
 * 3. 同步倒计时状态
 */
watch(serverState, (s: SyncedGameState | null) => {
  if (!s) return

  // 检查题目是否变化
  // 【技术学习】比较题目 ID，如果不同说明是新题目
  if (s.currentQuestion?.id !== currentQuestion.value?.id) {
    resetPlayerAnswerState()  // 重置答题状态
    hasSubmitted.value = false  // 重置提交标记
  }

  // 同步状态
  currentQuestion.value = s.currentQuestion
  isAnswerCounting.value = s.isAnswerCounting
  phase.value = s.status
  buzzOpen.value = s.buzzOpen || false
  buzzWinner.value = s.buzzWinner || null

  // 同步倒计时
  syncFromServer(s)
})

// ==================== 答题流程 ====================

// 是否已提交答案
const hasSubmitted = ref(false)

/**
 * 【技术学习】页面刷新后恢复答题状态
 *
 * 问题：用户刷新页面后，之前的答题状态会丢失
 * 解决方案：从服务器获取选手的当前状态，恢复到刷新前的状态
 *
 * 实现方式：
 * 1. 服务器通过 myStatus 推送选手状态
 * 2. 等待 currentQuestion 加载完成
 * 3. 将状态应用到本地变量
 */

// 待应用的状态（临时存储）
let pendingStatus: { submitted: boolean; result: AnswerResult | null } | null = null

// 监听服务器推送的选手状态
watch(myStatus, (s) => {
  if (!s || !s.questionId) return
  // 保存待应用的状态
  pendingStatus = { submitted: s.submitted, result: s.result }
  // 尝试应用状态
  tryApplyPendingStatus()
})

// 监听当前题目变化
// 【技术学习】使用 getter 函数监听对象内部属性
watch(() => currentQuestion.value?.id, () => {
  tryApplyPendingStatus()
})

/**
 * 【技术学习】尝试应用待恢复的状态
 *
 * 这个函数在以下情况下被调用：
 * 1. 服务器推送选手状态时
 * 2. 当前题目加载完成时
 *
 * 只有当题目 ID 匹配时才会应用状态，避免状态错乱
 */
function tryApplyPendingStatus() {
  if (!pendingStatus) return

  // 检查是否有有效的状态
  if (!myStatus.value?.questionId) {
    pendingStatus = null
    return
  }

  // 检查题目 ID 是否匹配
  if (myStatus.value.questionId !== currentQuestion.value?.id) {
    pendingStatus = null
    return
  }

  // 应用状态
  hasSubmitted.value = pendingStatus.submitted
  if (pendingStatus.result) {
    answerResult.value = pendingStatus.result as AnswerResult
  }

  // 清空待应用状态
  pendingStatus = null
}

/**
 * 【技术学习】倒计时状态变化时管理提交状态
 *
 * 当倒计时重新开始时：
 * - 重置 hasSubmitted 为 false（允许重新作答）
 * - 重置答题结果
 *
 * 当倒计时结束时：
 * - 重置 hasSubmitted 为 false（回到未提交状态）
 */
watch(isAnswerCounting, (val, oldVal) => {
  if (!oldVal && val) {
    // 倒计时重新开始 → 重置，允许作答
    hasSubmitted.value = false
    resetPlayerAnswerState()
  } else if (oldVal && !val) {
    // 倒计时结束 → 回到未提交状态
    hasSubmitted.value = false
  }
})

/**
 * 【技术学习】抢答开放时重置抢答结果
 *
 * 当 buzzOpen 变为 true 时：
 * - 清空之前的抢答结果
 * - 允许选手重新抢答
 */
watch(buzzOpen, (val) => {
  if (val) {
    buzzResult.value = null
  }
})

/**
 * 【技术学习】抢答倒计时重新开始时清空结果
 *
 * 补充说明：
 * buzzOpen 可能未变化（保持 true），导致上面的 watch 不触发
 * 所以需要监听 isQuickAnswerCounting 来确保状态正确重置
 */
watch(isQuickAnswerCounting, (val) => {
  if (val) {
    buzzResult.value = null
  }
})

// ==================== 计算属性 ====================

/**
 * 【技术学习】是否可以答题
 *
 * 必须满足以下条件：
 * 1. 当前阶段是必答题（'required'）
 * 2. 有当前题目
 * 3. 答题倒计时正在计数
 */
const canAnswer = computed(() =>
  phase.value === 'required' && currentQuestion.value !== null && isAnswerCounting.value
)

/**
 * 是否显示题目
 * 必答题阶段且有题目时显示
 */
const showQuestion = computed(() =>
  phase.value === 'required' && currentQuestion.value !== null
)

/**
 * 是否显示答题结果
 * 必答题阶段、有题目、且有答题结果时显示
 */
const showResult = computed(() =>
  phase.value === 'required' && currentQuestion.value !== null && answerResult.value !== null
)

// ==================== 抢答题相关 ====================

/**
 * 【技术学习】是否展示抢答题界面
 *
 * 抢答题阶段且有题目时显示
 */
const showBuzzQuestion = computed(() =>
  phase.value === 'quick-answer' && currentQuestion.value !== null
)

/**
 * 是否可以抢答
 * 抢答题阶段且有题目时就可以抢答
 */
const canBuzz = computed(() =>
  phase.value === 'quick-answer' && currentQuestion.value !== null
)

/**
 * 【技术学习】处理抢答操作
 *
 * 通过 Socket.IO 发送抢答请求到服务器
 * 服务器会判断谁最先抢答并返回结果
 */
function handleBuzz() {
  if (!user.value || !currentQuestion.value) return
  sendBuzz(user.value.id, currentQuestion.value.id)
}

/**
 * 【技术学习】提交答案
 * @param answers - 选手选择的答案数组
 *
 * 提交后：
 * 1. 设置 hasSubmitted 为 true（防止重复提交）
 * 2. 通过 Socket.IO 发送答案到服务器
 */
function onSubmitAnswer(answers: string[]) {
  if (!user.value || !currentQuestion.value) return
  hasSubmitted.value = true
  submitAnswer(user.value.id, currentQuestion.value.id, answers)
}

// ==================== 辅助计算属性 ====================

// 题目类型的中文标签
const typeLabel = computed(() => {
  if (!currentQuestion.value) return ''
  const map: Record<string, string> = {
    single: '单选题',
    multiple: '多选题',
    subjective: '主观题',
  }
  return map[currentQuestion.value.type] || ''
})
</script>

<!-- ==================== 模板部分 ==================== -->
<template>
  <!-- 选手页面容器 -->
  <div class="player-page">

    <!-- ========== 顶部信息栏 ========== -->
    <!--
      【技术学习】条件渲染
      v-if="user" 确保用户信息加载完成后才显示
      否则 user.nickname 等属性会报错
    -->
    <PlayerInfoBar
      v-if="user"
      :nickname="user.nickname"
      :total-score="user.totalScore"
      :connected="connected"
    />

    <!-- ========== 主体区域 ========== -->
    <div class="main-area">

      <!--
        【技术学习】多条件渲染
        根据不同状态显示不同的内容：
        1. 答题结果（答完题后显示）
        2. 必答题区域（必答题阶段）
        3. 抢答区域（抢答题阶段）
        4. 等待状态（没有题目时）
      -->

      <!-- ======== 答题结果 ======== -->
      <div v-if="showResult" class="result-card">
        <!-- 结果图标 -->
        <!--
          【技术学习】动态 class 绑定
          :class="answerResult!.timeout ? 'timeout' : (answerResult!.correct ? 'correct' : 'wrong')"

          根据答题结果动态添加不同的 class：
          - timeout: 超时
          - correct: 正确
          - wrong: 错误

          ! 是 TypeScript 的非空断言操作符，告诉编译器这个值一定不是 null
        -->
        <div
          class="result-icon"
          :class="answerResult!.timeout ? 'timeout' : (answerResult!.correct ? 'correct' : 'wrong')"
        >
          {{ answerResult!.timeout ? '⏰' : (answerResult!.correct ? '✓' : '✗') }}
        </div>

        <!-- 结果标题 -->
        <div class="result-title">
          {{ answerResult!.timeout ? '超时未答' : (answerResult!.correct ? '回答正确' : '回答错误') }}
        </div>

        <!-- 得分 -->
        <div
          class="result-score"
          :class="{ correct: answerResult!.correct, timeout: answerResult!.timeout }"
        >
          {{ answerResult!.correct ? `+${answerResult!.score} 分` : '+0 分' }}
        </div>
      </div>

      <!-- ======== 答题区（必答题） ======== -->
      <div v-else-if="showQuestion" class="question-area">
        <!-- 题目头部信息 -->
        <div class="q-header">
          <span class="q-type">{{ typeLabel }}</span>
          <span class="q-score">{{ currentQuestion!.score }} 分</span>

          <!-- 倒计时 -->
          <span v-if="isAnswerCounting" class="q-timer" :class="{ warn: isAnswerCounting }">
            {{ answerRemainingText }}
          </span>
          <span v-else-if="!isAnswerCounting" class="q-timer off">等待开始</span>
        </div>

        <!-- 题目内容 -->
        <div class="q-stem">{{ currentQuestion!.stem }}</div>

        <!-- 已提交提示 -->
        <!--
          【技术学习】条件渲染提示信息
          只有在已提交且倒计时进行中时才显示
        -->
        <div v-if="hasSubmitted && isAnswerCounting" class="notice submitted-notice">
          ✓ 已提交，等待结束...
        </div>

        <!--
          【技术学习】答题选项组件
          Props 传递：
          - question: 当前题目
          - can-answer: 是否可以答题（控制选项是否可点击）
          - submitted: 是否已提交（控制选项样式）
        -->
        <AnswerOptions
          :question="currentQuestion!"
          :can-answer="canAnswer && !hasSubmitted"
          :submitted="hasSubmitted"
          @submit="onSubmitAnswer"
        />
      </div>

      <!-- ======== 抢答区（抢答题） ======== -->
      <div v-else-if="showBuzzQuestion" class="buzz-area-wrapper">
        <!-- 抢答题头部 -->
        <div class="q-header">
          <span class="q-type buzz-type">抢答题</span>
          <span class="q-score">{{ currentQuestion!.score }} 分</span>
        </div>

        <!-- 题目内容 -->
        <div class="q-stem">{{ currentQuestion!.stem }}</div>

        <!--
          【技术学习】抢答按钮组件
          传递倒计时状态、抢答结果等信息
        -->
        <BuzzButton
          :is-counting="isQuickAnswerCounting"
          :remaining="quickAnswerRemaining"
          :remaining-text="quickAnswerRemainingText"
          :remaining-decimal="quickAnswerRemainingDecimal"
          :buzz-open="buzzOpen"
          :has-winner="buzzWinner !== null"
          :winner-nickname="buzzWinner?.nickname || ''"
          :buzz-result="buzzResult"
          :can-buzz="canBuzz"
          @buzz="handleBuzz"
        />
      </div>

      <!-- ======== 等待状态 ======== -->
      <div v-else class="waiting-card">
        <div class="waiting-icon">📋</div>
        <div class="waiting-text">等待出题</div>
      </div>
    </div>

    <!-- ========== 底部公告条 ========== -->
    <AnnouncementPanel />
  </div>
</template>

<!-- ==================== 全局样式 ==================== -->
<!--
  【技术学习】注意这里没有 scoped 属性
  这些样式会应用到整个页面，用于禁用滚动和下拉刷新
-->
<style>
/* 全局：禁用页面滚动 / 下拉 */
html, body {
  overflow: hidden;              /* 禁止滚动 */
  overscroll-behavior: none;     /* 禁止过度滚动效果（如刷新） */
  touch-action: manipulation;    /* 禁用双击缩放等触摸操作 */
  -webkit-overflow-scrolling: auto;  /* 禁用 iOS 的弹性滚动 */
}
</style>

<!-- ==================== 组件样式 ==================== -->
<style scoped>
/* ========== 页面容器 ========== */
/*
 * 【技术学习】移动端适配技巧
 *
 * height: 100dvh - 动态视口高度（考虑地址栏）
 * height: 100vh - 标准视口高度（兼容性回退）
 *
 * dvh (dynamic viewport height) 是 CSS 新单位
 * 它会根据浏览器 UI 的显示/隐藏动态调整
 * 在不支持的浏览器中会回退到 vh
 */
.player-page {
  height: 100dvh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
  overscroll-behavior: none;
  /* 禁用文字选择（防止复制） */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* ========== 主体区 ========== */
.main-area {
  flex: 1;           /* 占据剩余空间 */
  min-height: 0;     /* 防止 flex 子元素溢出 */
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  overflow: hidden;
}

/* ========== 答题区和抢答区 ========== */
.question-area,
.buzz-area-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: rgba(255, 255, 255, 0.035);  /* 半透明白色背景 */
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 18px;
}

/* 题目头部 */
.q-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

/* 题目标签 */
.q-type {
  font-size: 12px;
  padding: 3px 10px;
  background: rgba(64, 158, 255, 0.2);
  border-radius: 5px;
  color: #409eff;
  font-weight: 500;
}

/* 抢答题标签 */
.q-type.buzz-type {
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
}

/* 分数 */
.q-score {
  font-size: 16px;
  font-weight: 700;
  color: #ffd666;
  margin-right: auto;
}

/* 倒计时 */
.q-timer {
  font-size: 20px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: 2px;
  color: #fff;
}

/* 倒计时警告状态 */
.q-timer.warn {
  color: #e6a23c;
  animation: timer-pulse 1s ease-in-out infinite alternate;
}

/* 等待开始状态 */
.q-timer.off {
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
}

/* 倒计时脉冲动画 */
@keyframes timer-pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

/* 题目内容 */
.q-stem {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 4px;
  flex-shrink: 0;
  /* 多行文本截断 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;  /* 最多显示 2 行 */
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 提示信息 */
.notice {
  text-align: center;
  padding: 4px;
  border-radius: 6px;
  font-size: 13px;
  flex-shrink: 0;
}

/* 已提交提示 */
.submitted-notice {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

/* ========== 结果卡片 ========== */
.result-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 24px;
}

/* 结果图标 */
.result-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  font-weight: 700;
  margin-bottom: 12px;
  flex-shrink: 0;
}

/* 正确状态 */
.result-icon.correct {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}

/* 错误状态 */
.result-icon.wrong {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

/* 超时状态 */
.result-icon.timeout {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

/* 结果标题 */
.result-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

/* 得分 */
.result-score {
  font-size: 30px;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  margin-bottom: 16px;
}

.result-score.correct { color: #67c23a; }
.result-score.timeout { color: #e6a23c; }
.result-score:not(.correct):not(.timeout) { color: #909399; }

/* 正确答案显示 */
.result-correct {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
}

/* ========== 等待卡片 ========== */
.waiting-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
}

.waiting-icon { font-size: 48px; margin-bottom: 12px; }
.waiting-text { font-size: 20px; font-weight: 600; opacity: 0.6; }

/* ========== 响应式 ========== */
@media (min-width: 768px) {
  .main-area {
    padding: 16px 24px;
  }
  .q-stem {
    font-size: 20px;
  }
}

@media (max-width: 380px) {
  .main-area {
    padding: 8px 10px;
  }
  .question-area {
    padding: 12px;
  }
  .q-stem {
    font-size: 16px;
  }
}
</style>
