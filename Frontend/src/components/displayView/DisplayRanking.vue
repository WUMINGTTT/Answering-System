<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerRanking } from '@/composables/useSocket'

const props = defineProps<{
  rankings: PlayerRanking[]
}>()

/** 竖向双列均分：单数时右列多一个 */
const columns = computed(() => {
  const list = props.rankings
  const rightCount = Math.ceil(list.length / 2)
  const leftCount = list.length - rightCount
  return {
    left: list.slice(0, leftCount),
    right: list.slice(leftCount),
  }
})

function awardTier(rank: number) {
  if (rank === 1) return { label: '一等奖', cls: 'tier-1' }
  if (rank >= 2 && rank <= 4) return { label: '二等奖', cls: 'tier-2' }
  if (rank >= 5 && rank <= 10) return { label: '三等奖', cls: 'tier-3' }
  return { label: '', cls: '' }
}

function rankBadge(rank: number) {
  return `${rank}`
}
</script>

<template>
  <div class="ranking-container">
    <div class="ranking-title">🏆 排行榜</div>

    <div v-if="rankings.length" class="ranking-columns">
      <div class="ranking-col">
        <div
          v-for="r in columns.left"
          :key="r.rank"
          class="ranking-item"
          :class="awardTier(r.rank).cls"
        >
          <span class="r-rank">{{ rankBadge(r.rank) }}</span>
          <span class="r-name">{{ r.nickname }}</span>
          <span class="r-score">{{ r.totalScore }} 分</span>
          <span v-if="awardTier(r.rank).label" class="r-award">{{ awardTier(r.rank).label }}</span>
        </div>
      </div>
      <div class="ranking-col">
        <div
          v-for="r in columns.right"
          :key="r.rank"
          class="ranking-item"
          :class="awardTier(r.rank).cls"
        >
          <span class="r-rank">{{ rankBadge(r.rank) }}</span>
          <span class="r-name">{{ r.nickname }}</span>
          <span class="r-score">{{ r.totalScore }} 分</span>
          <span v-if="awardTier(r.rank).label" class="r-award">{{ awardTier(r.rank).label }}</span>
        </div>
      </div>
    </div>

    <div v-else class="ranking-empty">暂无排名数据</div>
  </div>
</template>

<style scoped>
.ranking-container {
  max-width: 960px;
  width: 100%;
}

.ranking-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 30px;
  letter-spacing: 4px;
}

.ranking-columns {
  display: flex;
  gap: 16px;
}

.ranking-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.r-rank {
  font-size: 18px;
  font-weight: 700;
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.r-name {
  font-size: 18px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.r-score {
  font-size: 18px;
  font-weight: 700;
  color: #ffd666;
  flex-shrink: 0;
}

.r-award {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}

.tier-1 {
  background: rgba(255, 215, 0, 0.12);
  border-color: rgba(255, 215, 0, 0.3);
}
.tier-1 .r-award { background: rgba(255, 215, 0, 0.3); color: #ffd666; }

.tier-2 {
  background: rgba(192, 192, 192, 0.12);
  border-color: rgba(192, 192, 192, 0.25);
}
.tier-2 .r-award { background: rgba(192, 192, 192, 0.25); color: #c0c0c0; }

.tier-3 {
  background: rgba(205, 127, 50, 0.1);
  border-color: rgba(205, 127, 50, 0.2);
}
.tier-3 .r-award { background: rgba(205, 127, 50, 0.25); color: #cd7f32; }

.ranking-empty {
  text-align: center;
  font-size: 20px;
  opacity: 0.5;
  padding: 40px 0;
}

@media (max-width: 768px) {
  .ranking-columns { flex-direction: column; }
  .ranking-title { font-size: 26px; }
}
</style>
