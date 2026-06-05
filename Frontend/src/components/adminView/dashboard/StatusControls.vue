<script setup lang="ts">
import {
  VideoPause,
  VideoPlay,
  Trophy,
  QuestionFilled,
  TrendCharts,
  RefreshLeft,
} from '@element-plus/icons-vue'
import {
  useGameStatusStore,
  STATUS_COLORS,
  QUESTION_PHASES,
  type GameStatus,
} from '@/stores/gameStatus'
import CountdownPanel from './CountdownPanel.vue'

defineProps<{
  connected?: boolean
}>()

const emit = defineEmits<{
  'reset-used-questions': []
}>()

const store = useGameStatusStore()

type StatusOption = { label: string; value: GameStatus; icon: typeof VideoPause }

/** 非答题状态（等待 / 排名展示） */
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
  <el-card class="status-card" shadow="hover">
    <div class="status-layout">
      <!-- 左侧：当前状态信息 + 倒计时控制 -->
      <div class="status-info">
        <div class="status-header">
          <span class="status-label">当前状态</span>
          <el-tag :color="store.statusColor" size="large" effect="dark" class="status-tag">
            {{ store.statusLabel }}
          </el-tag>
          <!-- 服务器连接状态指示 -->
          <el-tooltip :content="connected ? '服务器已连接' : '服务器断开，正在重连...'" placement="bottom">
            <span class="conn-dot" :class="{ 'conn-dot--ok': connected }" />
          </el-tooltip>
          <!-- 风险题阶段：重置已选题目 -->
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

        <!-- 倒计时（必答题 / 抢答题时展示） -->
        <CountdownPanel />
      </div>

      <!-- 右侧：状态切换按钮 -->
      <div class="status-actions">
        <!-- 非答题状态组 -->
        <div class="status-group">
          <div class="status-buttons status-buttons--idle">
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

        <!-- 答题阶段组 -->
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
.status-card {
  border-radius: 8px;
}

.status-layout {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 40px;
}

.status-info {
  flex: 1;
  min-width: 0;
}

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

.conn-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
  flex-shrink: 0;
  transition: background 0.3s;
  cursor: default;
}

.conn-dot--ok {
  background: #67c23a;
}

.status-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-left: 40px;
  border-left: 1px solid var(--border-base);
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

.status-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-left: 0;
}

@media (max-width: 900px) {
  .status-layout {
    flex-direction: column;
    gap: 20px;
  }

  .status-actions {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border-base);
    padding-top: 20px;
  }
}
</style>
