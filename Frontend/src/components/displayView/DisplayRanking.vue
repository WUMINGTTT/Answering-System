<!--
  ============================================
  DisplayRanking.vue — 排行榜展示组件
  ============================================
  【组件功能】
  在大屏幕上展示参赛选手的排名信息，采用双列布局以节省垂直空间。
  根据排名自动分配奖项等级（一等/二等/三等奖），并用金银铜色标识。

  【技术学习 — 核心知识点】
  1. 双列排名布局：将排名列表均分为左右两列
  2. 奖项等级：根据排名区间返回对应的标签和样式类
  3. computed 响应式计算：排名数据变化时自动重新计算分列
  4. CSS 变色方案：用 class 切换不同奖项的颜色主题
-->

<script setup lang="ts">
// 【技术学习】computed 是 Vue 的计算属性
// 当依赖的响应式数据变化时，computed 会自动重新计算并缓存结果
import { computed } from 'vue'

// 【技术学习】导入排名数据的类型定义
// PlayerRanking 包含 rank（排名）、nickname（昵称）、totalScore（总分）等字段
import type { PlayerRanking } from '@/composables/useSocket'

// =============================================
// 【技术学习 — defineProps】
// rankings: 排名数组，由父组件从 WebSocket 接收后传入
// =============================================
const props = defineProps<{
  rankings: PlayerRanking[]
}>()

// =============================================
// 【技术学习 — computed 计算属性：双列分列逻辑】
//
// 目标：将排名列表分为左右两列，右列多一个（当总数为奇数时）。
// 例如 7 人：左列 3 人（排名 1-3），右列 4 人（排名 4-7）
// 例如 6 人：左列 3 人（排名 1-3），右列 3 人（排名 4-6）
//
// 算法：
//   rightCount = Math.ceil(总数 / 2)  → 向上取整，右列多一个
//   leftCount = 总数 - rightCount     → 左列拿剩下的
//   left  = 前 leftCount 个
//   right = 剩余的 rightCount 个
//
// 为什么右列多一个？
//   排名越靠后（数值越大）的位置越不重要，放在右侧下方不太显眼。
// =============================================
const columns = computed(() => {
  const list = props.rankings
  const rightCount = Math.ceil(list.length / 2)  // 右列数量（向上取整）
  const leftCount = list.length - rightCount      // 左列数量
  return {
    left: list.slice(0, leftCount),    // 左列：前 leftCount 个
    right: list.slice(leftCount),      // 右列：从 leftCount 开始到末尾
  }
})

// =============================================
// 【技术学习 — 奖项等级判定函数】
// 根据排名返回奖项标签和 CSS 类名：
//   第 1 名      → 一等奖（金色）  → tier-1
//   第 2-4 名    → 二等奖（银色）  → tier-2
//   第 5-10 名   → 三等奖（铜色）  → tier-3
//   第 11 名以后 → 无奖项
//
// 返回对象格式：{ label: 显示文字, cls: CSS 类名 }
// 这种"函数返回配置对象"的模式很常用，便于模板中灵活使用。
// =============================================
function awardTier(rank: number) {
  if (rank === 1) return { label: '一等奖', cls: 'tier-1' }
  if (rank >= 2 && rank <= 4) return { label: '二等奖', cls: 'tier-2' }
  if (rank >= 5 && rank <= 10) return { label: '三等奖', cls: 'tier-3' }
  return { label: '', cls: '' }  // 无奖项
}

// =============================================
// 【技术学习 — 排名徽章生成函数】
// 当前实现：直接返回排名数字字符串
// 预留扩展：可以改为奖牌 emoji（如第1名用 🥇）
// =============================================
function rankBadge(rank: number) {
  return `${rank}`
}
</script>

<template>
  <div class="ranking-container">
    <!-- 排行榜标题 -->
    <div class="ranking-title">🏆 排行榜</div>

    <!--
      【技术学习 — 条件渲染】
      v-if="rankings.length" — 有排名数据时显示排行榜
      v-else                 — 没有数据时显示"暂无排名数据"
      这是 Vue 的 v-if / v-else 配对用法。
    -->
    <div v-if="rankings.length" class="ranking-columns">
      <!--
        【技术学习 — 左列排名】
        v-for="r in columns.left" 遍历左列数据
        :class="awardTier(r.rank).cls" 动态绑定奖项样式类
          例如排名 1 → class="ranking-item tier-1" → 金色背景
      -->
      <div class="ranking-col">
        <div
          v-for="r in columns.left"
          :key="r.rank"
          class="ranking-item"
          :class="awardTier(r.rank).cls"
        >
          <!-- 排名数字 -->
          <span class="r-rank">{{ rankBadge(r.rank) }}</span>
          <!-- 选手昵称 -->
          <span class="r-name">{{ r.nickname }}</span>
          <!-- 总分 -->
          <span class="r-score">{{ r.totalScore }} 分</span>
          <!--
            【技术学习 — 条件渲染奖项标签】
            v-if="awardTier(r.rank).label"
            只有当 label 不为空字符串时才显示奖项标签。
            排名 11+ 的选手不会显示奖项标签。
          -->
          <span v-if="awardTier(r.rank).label" class="r-award">{{ awardTier(r.rank).label }}</span>
        </div>
      </div>

      <!-- 右列排名，结构与左列完全相同 -->
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

    <!-- 无数据时的空状态提示 -->
    <div v-else class="ranking-empty">暂无排名数据</div>
  </div>
</template>

<style scoped>
/* 排行榜容器 */
.ranking-container {
  max-width: 960px;
  width: 100%;
}

/* 排行榜标题 */
.ranking-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 30px;
  letter-spacing: 4px;   /* 字间距 */
}

/*
  【技术学习 — 双列布局】
  display: flex 使左右两列水平排列。
  gap: 16px 两列之间的间距。
*/
.ranking-columns {
  display: flex;
  gap: 16px;
}

/* 单列容器 */
.ranking-col {
  flex: 1;                  /* 两列等分宽度 */
  display: flex;
  flex-direction: column;   /* 列内项目垂直排列 */
  gap: 6px;                 /* 每行之间的间距 */
}

/* 单个排名项 */
.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 排名数字 */
.r-rank {
  font-size: 18px;
  font-weight: 700;
  width: 32px;
  text-align: center;
  flex-shrink: 0;           /* 不压缩 */
}

/* 选手昵称 */
.r-name {
  font-size: 18px;
  flex: 1;                  /* 占据剩余空间 */
  min-width: 0;             /* 允许文本溢出处理 */
  overflow: hidden;
  text-overflow: ellipsis;  /* 溢出部分显示省略号 ... */
  white-space: nowrap;      /* 不换行 */
}

/* 总分：金色文字 */
.r-score {
  font-size: 18px;
  font-weight: 700;
  color: #ffd666;           /* 金色 */
  flex-shrink: 0;
}

/* 奖项标签 */
.r-award {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}

/*
  【技术学习 — 奖项颜色方案】
  三种奖项等级对应三种颜色主题：
    tier-1 (一等奖): 金色 — rgba(255, 215, 0, ...)
    tier-2 (二等奖): 银色 — rgba(192, 192, 192, ...)
    tier-3 (三等奖): 铜色 — rgba(205, 127, 50, ...)

  每个等级有两处颜色：
    1. 行背景 + 边框色（.tier-N）
    2. 奖项标签背景 + 文字色（.tier-N .r-award）
*/

/* 一等奖 — 金色主题 */
.tier-1 {
  background: rgba(255, 215, 0, 0.12);
  border-color: rgba(255, 215, 0, 0.3);
}
.tier-1 .r-award { background: rgba(255, 215, 0, 0.3); color: #ffd666; }

/* 二等奖 — 银色主题 */
.tier-2 {
  background: rgba(192, 192, 192, 0.12);
  border-color: rgba(192, 192, 192, 0.25);
}
.tier-2 .r-award { background: rgba(192, 192, 192, 0.25); color: #c0c0c0; }

/* 三等奖 — 铜色主题 */
.tier-3 {
  background: rgba(205, 127, 50, 0.1);
  border-color: rgba(205, 127, 50, 0.2);
}
.tier-3 .r-award { background: rgba(205, 127, 50, 0.25); color: #cd7f32; }

/* 空状态 */
.ranking-empty {
  text-align: center;
  font-size: 20px;
  opacity: 0.5;
  padding: 40px 0;
}

/* 【技术学习 — 响应式】小屏幕改为单列 */
@media (max-width: 768px) {
  .ranking-columns { flex-direction: column; }
  .ranking-title { font-size: 26px; }
}
</style>
