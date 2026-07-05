<!--
  ====================================================================
  StatusControls.vue — 游戏阶段切换控制面板
  ====================================================================

  【组件职责】
  管理员通过此面板控制游戏的运行阶段，包括：
  1. 显示当前游戏状态（带颜色标签）
  2. 提供阶段切换按钮（等待中、展示排名、必答题、抢答题、风险题）
  3. 集成倒计时控制面板（CountdownPanel）
  4. 显示服务器连接状态指示器
  5. 风险题阶段的"重置已选"按钮

  【技术学习 — 设计思路】
  - 状态分为两组：非答题状态（等待、排名）和答题阶段（必答、抢答、风险）
  - 当前激活的按钮用对应颜色高亮，其他按钮用默认样式
  - 通过 Pinia Store（useGameStatusStore）读取和修改游戏状态
  - 通过 emit 向父组件传递"重置已选题目"事件

  【颜色编码】
  - 等待中：灰色（#909399）
  - 必答题：蓝色（#409eff）
  - 抢答题：橙色（#e6a23c）
  - 风险题：红色（#f56c6c）
  - 排名展示：绿色（#67c23a）
-->

<script setup lang="ts">
// ── Element Plus 图标导入 ──
import {
  VideoPause,    // 暂停图标（等待状态）
  VideoPlay,     // 播放图标（答题状态）
  Trophy,        // 奖杯图标（抢答题）
  QuestionFilled, // 问号图标（风险题）
  TrendCharts,   // 图表图标（排名展示）
  RefreshLeft,   // 刷新图标（重置已选）
} from '@element-plus/icons-vue'

// ── 游戏状态 Store 和相关常量/类型 ──
import {
  useGameStatusStore,    // Pinia Store
  STATUS_COLORS,         // 各状态对应的颜色映射表
  QUESTION_PHASES,       // 答题阶段列表（['required', 'quick-answer', 'risk']）
  type GameStatus,       // 游戏状态类型
} from '@/stores/gameStatus'

// ── 倒计时子组件 ──
import CountdownPanel from './CountdownPanel.vue'

// ====================================================================
// Props 和 Emits 定义
// ====================================================================
/**
 * 【技术学习】defineProps 定义组件接收的 props
 * connected 表示服务器连接状态（由父组件 DashboardPanel 传入）
 */
defineProps<{
  connected?: boolean
}>()

/**
 * 【技术学习】defineEmits 定义组件可以触发的事件
 * 'reset-used-questions' 事件：通知父组件清空已使用的风险题 ID 列表
 * 类型参数 [] 表示该事件没有额外参数
 */
const emit = defineEmits<{
  'reset-used-questions': []
}>()

// ====================================================================
// 初始化 Store
// ====================================================================
const store = useGameStatusStore()

// ====================================================================
// 状态选项定义
// ====================================================================
// 【技术学习】将按钮配置抽象为数据数组，模板中用 v-for 循环渲染
// 这样添加/修改按钮只需要改数据，不需要改模板

/** 状态选项类型 */
type StatusOption = { label: string; value: GameStatus; icon: typeof VideoPause }

/** 非答题状态（等待中 / 排名展示） */
const IDLE_STATUS_OPTIONS: StatusOption[] = [
  { label: '等待中', value: 'waiting', icon: VideoPause },
  { label: '展示排名', value: 'ranking', icon: TrendCharts },
]

/** 答题阶段状态（必答 / 抢答 / 风险） */
const QUESTION_STATUS_OPTIONS: StatusOption[] = [
  { label: '必答题', value: 'required', icon: VideoPlay },
  { label: '抢答题', value: 'quick-answer', icon: Trophy },
  { label: '风险题', value: 'risk', icon: QuestionFilled },
]

</script>

<template>
  <!--
    【技术学习】el-card 是 Element Plus 的卡片组件
    shadow="hover" 表示鼠标悬停时显示阴影，增强交互感
  -->
  <el-card class="status-card" shadow="hover">
    <div class="status-layout">
      <!-- ============================================================ -->
      <!-- 左侧：当前状态信息 + 倒计时控制                                -->
      <!-- ============================================================ -->
      <div class="status-info">
        <div class="status-header">
          <span class="status-label">当前状态</span>

          <!-- 当前状态标签（带颜色背景） -->
          <el-tag :color="store.statusColor" size="large" effect="dark" class="status-tag">
            {{ store.statusLabel }}
          </el-tag>

          <!--
            服务器连接状态指示器
            【技术学习】el-tooltip 在鼠标悬停时显示提示信息
            placement="bottom" 表示提示框显示在下方
          -->
          <el-tooltip :content="connected ? '服务器已连接' : '服务器断开，正在重连...'" placement="bottom">
            <!-- 连接状态圆点：绿色=已连接，红色=断开 -->
            <span class="conn-dot" :class="{ 'conn-dot--ok': connected }" />
          </el-tooltip>

          <!-- 风险题阶段：显示"重置已选"按钮 -->
          <!--
            【技术学习】v-if 条件渲染：只在风险题阶段显示此按钮
            emit('reset-used-questions') 通知父组件清空已使用题目列表
          -->
          <el-button
            v-if="store.status === 'risk'"
            :icon="RefreshLeft"
            size="small"
            type="warning"
            plain
            @click="emit('reset-used-questions')"
          >
            重置已选
          </el-button>
        </div>

        <!-- 倒计时面板（仅在必答/抢答阶段显示） -->
        <CountdownPanel />
      </div>

      <!-- ============================================================ -->
      <!-- 右侧：状态切换按钮组                                           -->
      <!-- ============================================================ -->
      <div class="status-actions">
        <!-- 非答题状态组（等待 + 排名） -->
        <div class="status-group">
          <div class="status-buttons status-buttons--idle">
            <!--
              【技术学习】v-for 循环渲染按钮：
              - :type 根据是否为当前状态决定按钮类型（primary / default）
              - :color 当前激活的按钮用对应颜色，其他按钮不设颜色
              - :dark 激活按钮使用深色模式
              - @click 调用 store.setStatus() 切换游戏阶段
            -->
            <el-button
              v-for="opt in IDLE_STATUS_OPTIONS"
              :key="opt.value"
              :type="store.status === opt.value ? 'primary' : 'default'"
              :color="store.status === opt.value ? STATUS_COLORS[opt.value] : undefined"
              :dark="store.status === opt.value"
              size="large"
              class="status-btn"
              @click="store.setStatus(opt.value)"
            >
              <el-icon><component :is="opt.icon" /></el-icon>
              <span>{{ opt.label }}</span>
            </el-button>
          </div>
        </div>

        <!-- 答题阶段组（必答 + 抢答 + 风险） -->
        <div class="status-group">
          <div class="status-buttons status-buttons--question" style="margin-top: 20px">
            <el-button
              v-for="opt in QUESTION_STATUS_OPTIONS"
              :key="opt.value"
              :type="store.status === opt.value ? 'primary' : 'default'"
              :color="store.status === opt.value ? STATUS_COLORS[opt.value] : undefined"
              :dark="store.status === opt.value"
              size="large"
              class="status-btn"
              @click="store.setStatus(opt.value)"
            >
              <el-icon><component :is="opt.icon" /></el-icon>
              <span>{{ opt.label }}</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
/* 卡片圆角 */
.status-card {
  border-radius: 8px;
}

/* 主布局：左侧信息 + 右侧按钮，水平排列 */
.status-layout {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 40px;
}

/* 左侧信息区域 */
.status-info {
  flex: 1;
  min-width: 0;
}

/* 状态头部：标签 + 连接指示器 + 重置按钮 */
.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.status-label {
  font-size: 15px;
  color: var(--text-regular);
  font-weight: 500;
}

.status-tag {
  font-size: 15px;
  padding: 6px 20px;
  border-radius: 6px;
}

/* 连接状态圆点 */
.conn-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;     /* 默认红色（断开） */
  flex-shrink: 0;
  transition: background 0.3s;
  cursor: default;
}

.conn-dot--ok {
  background: #67c23a;     /* 绿色（已连接） */
}

/* 右侧按钮区域 */
.status-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-left: 40px;
  border-left: 1px solid var(--border-base);  /* 左侧分隔线 */
  flex-shrink: 0;
}

.status-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-buttons {
  display: grid;
  gap: 10px;
  width: 100%;
}

/* 非答题状态：等待 + 排名 → 2 列 */
.status-buttons--idle {
  grid-template-columns: 1fr 1fr;
}

/* 答题阶段：必答 + 抢答 + 风险 → 3 列 */
.status-buttons--question {
  grid-template-columns: repeat(3, 1fr);
}

/* 按钮样式 */
.status-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-left: 0;
}

/* ========== 响应式布局 ========== */
@media (max-width: 900px) {
  /* 小屏：改为纵向排列 */
  .status-layout {
    flex-direction: column;
    gap: 16px;
  }

  .status-actions {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border-base);  /* 改为顶部分隔线 */
    padding-top: 16px;
  }
}

@media (max-width: 500px) {
  /* 超小屏：答题按钮改为单列 */
  .status-buttons--question {
    grid-template-columns: 1fr;
    margin-top: 12px;
  }

  .status-btn {
    font-size: 13px;
  }

  /* 超小屏：隐藏按钮文字，只显示图标 */
  .status-btn span {
    display: none;
  }

  .status-btn .el-icon {
    margin: 0;
  }
}
</style>
