<script setup lang="ts">
import { computed } from 'vue'
import type { BuzzRecord } from '@/composables/useSocket'

const props = defineProps<{
  records: BuzzRecord[]
  winner: { userId: string; nickname: string; timestamp: number } | null
  isCounting: boolean
  buzzOpen: boolean
}>()

/** 按时间排序 */
const sortedRecords = computed(() =>
  [...props.records].sort((a, b) => a.timestamp - b.timestamp)
)

/** 提前抢答列表 */
const earlyBuzzes = computed(() =>
  sortedRecords.value.filter((r) => r.early)
)

/** 有效抢答列表 */
const validBuzzes = computed(() =>
  sortedRecords.value.filter((r) => !r.early)
)

/** 获胜者记录 */
const winnerRecord = computed(() =>
  props.winner
    ? sortedRecords.value.find((r) => r.userId === props.winner!.userId && !r.early)
    : null
)

/** 参与抢答总人数 */
const totalParticipants = computed(() => sortedRecords.value.length)

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

/** 计算抢答响应时间（ms），相对于第一个有效抢答 */
function responseTime(ts: number, baseTs: number): string {
  const diff = ts - baseTs
  if (diff === 0) return '首位'
  return `+${diff}ms`
}
</script>

<template>
  <div v-if="records.length > 0 || buzzOpen" class="buzz-panel">
    <!-- 获胜者横幅 -->
    <div v-if="winner" class="winner-banner">
      <span class="winner-name">{{ winner.nickname }}</span>
      <span class="winner-label">抢答成功</span>
    </div>

    <!-- 汇总条 -->
    <div class="buzz-summary">
      <span>共 {{ totalParticipants }} 人参与</span>
      <span v-if="earlyBuzzes.length" class="summary-early">｜ {{ earlyBuzzes.length }} 人提前</span>
    </div>

    <!-- 选手卡片网格（有效抢答） -->
    <div v-if="validBuzzes.length > 0" class="buzz-cards">
      <div
        v-for="(b, i) in validBuzzes"
        :key="i"
        class="buzz-card"
        :class="{
          'is-winner': winner && b.userId === winner.userId,
        }"
      >
        <span class="card-rank">#{{ i + 1 }}</span>
        <span class="card-name">{{ b.nickname }}</span>
        <span v-if="winnerRecord" class="card-gap">
          {{ responseTime(b.timestamp, winnerRecord.timestamp) }}
        </span>
        <span v-if="winner && b.userId === winner.userId" class="card-winner">🏆</span>
      </div>
    </div>

    <!-- 提前抢答 -->
    <div v-if="earlyBuzzes.length > 0" class="buzz-cards buzz-cards--early">
      <div class="early-label">⚠️ 提前抢答</div>
      <div
        v-for="(b, i) in earlyBuzzes"
        :key="i"
        class="buzz-card is-early"
      >
        <span class="card-rank early-rank">!</span>
        <span class="card-name">{{ b.nickname }}</span>
      </div>
    </div>

    <!-- 等待状态 -->
    <div v-if="records.length === 0 && buzzOpen" class="buzz-waiting">
      <span v-if="isCounting">等待倒计时结束...</span>
      <span v-else>等待选手抢答...</span>
    </div>
  </div>
</template>

<style scoped>
.buzz-panel {
  width: 100%;
  max-width: 1100px;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ========== 获胜者横幅 ========== */
.winner-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 24px;
  background: rgba(103, 194, 58, 0.14);
  border: 1px solid rgba(103, 194, 58, 0.3);
  border-radius: 8px;
}

.winner-name {
  font-size: 28px;
  font-weight: 700;
  color: #67c23a;
  letter-spacing: 2px;
}

.winner-label {
  font-size: 15px;
  font-weight: 500;
  color: rgba(103, 194, 58, 0.8);
}

/* ========== 汇总条 ========== */
.buzz-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.summary-early {
  color: #e6a23c;
}

/* ========== 选手卡片网格 ========== */
.buzz-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.buzz-cards--early {
  margin-top: 2px;
}

.early-label {
  width: 100%;
  font-size: 12px;
  color: #e6a23c;
  font-weight: 500;
  padding: 4px 8px;
  margin-bottom: 2px;
}

/* 单张卡片 */
.buzz-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 90px;
  flex: 0 0 auto;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  text-align: center;
}

.buzz-card.is-winner {
  background: rgba(103, 194, 58, 0.12);
  border-color: rgba(103, 194, 58, 0.35);
}

.buzz-card.is-early {
  background: rgba(230, 162, 60, 0.06);
  border-color: rgba(230, 162, 60, 0.15);
}

.card-rank {
  font-size: 12px;
  font-weight: 700;
  color: #409eff;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.early-rank {
  color: #e6a23c;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 1px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.buzz-card.is-winner .card-name {
  color: #67c23a;
}

.buzz-card.is-early .card-name {
  color: rgba(230, 162, 60, 0.8);
}

.card-gap {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.card-winner {
  font-size: 14px;
  margin-top: 2px;
}

/* ========== 等待状态 ========== */
.buzz-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 15px;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .winner-name {
    font-size: 22px;
  }

  .buzz-card {
    min-width: 70px;
    padding: 8px 10px;
  }

  .card-name {
    font-size: 14px;
  }
}
</style>
