<!--
  ============================================
  BuzzResultPanel.vue — 抢答结果面板组件
  ============================================
  【组件功能】
  在"抢答"环节结束后，展示所有抢答选手的结果。
  包括：获胜者横幅、有效抢答排名、提前抢答列表、等待状态等。

  【技术学习 — 核心知识点】
  1. computed 响应式计算：自动排序、过滤抢答记录
  2. 有效/提前抢答区分：通过 early 标志位分组展示
  3. 响应时间差距计算：相对于获胜者的时间差（如 "+120ms"）
  4. 排序逻辑：按时间戳升序排列，最先抢到的排第一
  5. 条件渲染：根据不同的状态显示不同的 UI

  【技术学习 — 抢答机制说明】
  1. 服务端开启抢答 → 倒计时开始
  2. 倒计时结束前点击 → "提前抢答"（违规，显示为橙色）
  3. 倒计时结束后点击 → "有效抢答"（按时间先后排名）
  4. 第一个有效抢答者 → 获胜者（显示绿色横幅）
-->

<script setup lang="ts">
// 【技术学习】computed 用于创建响应式计算属性
import { computed } from 'vue'

// 【技术学习】导入抢答记录的类型定义
// BuzzRecord 包含 userId、nickname、timestamp、early（是否提前）等字段
import type { BuzzRecord } from '@/composables/useSocket'

// =============================================
// 【技术学习 — defineProps 组件属性】
// =============================================
const props = defineProps<{
  /** 所有抢答记录（包含有效和提前的） */
  records: BuzzRecord[]

  /**
   * 获胜者信息
   * { userId, nickname, timestamp } | null
   * null 表示还没有获胜者（如还在倒计时中）
   */
  winner: { userId: string; nickname: string; timestamp: number } | null

  /** 是否正在倒计时中 */
  isCounting: boolean

  /** 抢答是否已开放（倒计时结束后为 true） */
  buzzOpen: boolean
}>()

// =============================================
// 【技术学习 — computed 计算属性详解】
//
// computed 的特点：
//   1. 依赖追踪：自动追踪内部用到的响应式数据（props.records）
//   2. 缓存：依赖不变时返回缓存结果，不重复计算
//   3. 响应式：依赖变化时自动更新，触发视图重新渲染
// =============================================

/**
 * 【技术学习 — 按时间排序】
 * [...props.records] 创建数组副本（sort 会修改原数组，所以先复制）
 * .sort((a, b) => a.timestamp - b.timestamp) 按时间戳升序排列
 *   - 时间戳越小 → 越早 → 排在前面
 *   - a.timestamp - b.timestamp 为负 → a 排在 b 前面
 */
const sortedRecords = computed(() =>
  [...props.records].sort((a, b) => a.timestamp - b.timestamp)
)

/**
 * 【技术学习 — 提前抢答列表】
 * .filter((r) => r.early) 过滤出 early 为 true 的记录
 * 提前抢答 = 在倒计时结束前就按了按钮（违规行为）
 */
const earlyBuzzes = computed(() =>
  sortedRecords.value.filter((r) => r.early)
)

/**
 * 【技术学习 — 有效抢答列表】
 * .filter((r) => !r.early) 过滤出 early 为 false 的记录
 * 有效抢答 = 在倒计时结束后才按的按钮（合规行为）
 */
const validBuzzes = computed(() =>
  sortedRecords.value.filter((r) => !r.early)
)

/**
 * 【技术学习 — 获胜者记录】
 * 从排序后的记录中找到获胜者的那条记录。
 * 用途：获取获胜者的时间戳，用于计算其他选手与获胜者的时间差。
 *
 * 为什么不用 props.winner 直接获取 timestamp？
 * 因为 props.winner 的 timestamp 可能与 records 中的不完全一致
 * （服务端返回的时间可能存在微小差异），从 records 中查找更准确。
 */
const winnerRecord = computed(() =>
  props.winner
    ? sortedRecords.value.find((r) => r.userId === props.winner!.userId && !r.early)
    : null
)

/** 参与抢答的总人数 */
const totalParticipants = computed(() => sortedRecords.value.length)

// =============================================
// 【技术学习 — 辅助函数】
// =============================================

/**
 * 【技术学习 — 时间戳格式化】
 * 将毫秒时间戳转为本地时间字符串（如 "14:30:25"）
 * toLocaleTimeString('zh-CN', { hour12: false }) 使用 24 小时制
 */
function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

/**
 * 【技术学习 — 响应时间差距计算】
 * 计算某个选手相对于第一个有效抢答者的时间差。
 *
 * 参数：
 *   ts: 当前选手的时间戳
 *   baseTs: 基准时间戳（获胜者的时间戳）
 *
 * 返回：
 *   diff === 0 → '首位'（就是获胜者）
 *   diff > 0   → '+120ms'（比获胜者慢了 120 毫秒）
 *
 * 用途：让观众直观看到每个选手与获胜者的速度差距。
 */
function responseTime(ts: number, baseTs: number): string {
  const diff = ts - baseTs
  if (diff === 0) return '首位'
  return `+${diff}ms`
}
</script>

<template>
  <!--
    【技术学习 — 面板显示条件】
    v-if="records.length >  || buzzOpen"
    两种情况显示面板：
      1. 已经有抢答记录（有人按了按钮）
      2. 抢答已开放（倒计时结束，等待选手抢答）
  -->
  <div v-if="records.length > 0 || buzzOpen" class="buzz-panel">
    <!--
      【技术学习 — 获胜者横幅】
      v-if="winner" 只有当有获胜者时才显示。
      绿色主题设计，突出获胜者的视觉效果。
    -->
    <div v-if="winner" class="winner-banner">
      <span class="winner-name">{{ winner.nickname }}</span>
      <span class="winner-label">抢答成功</span>
    </div>

    <!--
      【技术学习 — 汇总信息条】
      显示参与总人数和提前抢答人数。
      v-if="earlyBuzzes.length" 有提前抢答时才显示数量。
    -->
    <div class="buzz-summary">
      <span>共 {{ totalParticipants }} 人参与</span>
      <span v-if="earlyBuzzes.length" class="summary-early">｜ {{ earlyBuzzes.length }} 人提前</span>
    </div>

    <!--
      【技术学习 — 有效抢答卡片网格】
      v-if="validBuzzes.length > 0" 有有效抢答时才显示。
      使用 Flex 布局 + wrap 实现自动换行的卡片网格。
    -->
    <div v-if="validBuzzes.length > 0" class="buzz-cards">
      <div
        v-for="(b, i) in validBuzzes"
        :key="i"
        class="buzz-card"
        :class="{
          'is-winner': winner && b.userId === winner.userId,  // 获胜者高亮
        }"
      >
        <!-- 排名序号（#1, #2, #3...） -->
        <span class="card-rank">#{{ i + 1 }}</span>
        <!-- 选手昵称 -->
        <span class="card-name">{{ b.nickname }}</span>
        <!--
          【技术学习 — 响应时间差距】
          只有当有获胜者记录时才显示时间差。
          responseTime(b.timestamp, winnerRecord.timestamp) 计算差距。
        -->
        <span v-if="winnerRecord" class="card-gap">
          {{ responseTime(b.timestamp, winnerRecord.timestamp) }}
        </span>
        <!-- 获胜者奖杯图标 -->
        <span v-if="winner && b.userId === winner.userId" class="card-winner">🏆</span>
      </div>
    </div>

    <!--
      【技术学习 — 提前抢答区域】
      与有效抢答分开显示，使用不同的颜色主题（橙色 vs 蓝色/绿色）。
      buzz-cards--early: 额外的类名，控制该区域的边距。
    -->
    <div v-if="earlyBuzzes.length > 0" class="buzz-cards buzz-cards--early">
      <!-- 提前抢答标题 -->
      <div class="early-label">⚠️ 提前抢答</div>
      <div
        v-for="(b, i) in earlyBuzzes"
        :key="i"
        class="buzz-card is-early"
      >
        <!-- 用 "!" 代替排名序号，表示这是违规操作 -->
        <span class="card-rank early-rank">!</span>
        <span class="card-name">{{ b.nickname }}</span>
      </div>
    </div>

    <!--
      【技术学习 — 等待状态提示】
      records.length === 0 && buzzOpen 表示抢答已开放但还没人按按钮。
      根据 isCounting 状态显示不同的提示文字。
    -->
    <div v-if="records.length === 0 && buzzOpen" class="buzz-waiting">
      <span v-if="isCounting">等待倒计时结束...</span>
      <span v-else>等待选手抢答...</span>
    </div>
  </div>
</template>

<style scoped>
/* 抢答面板容器 */
.buzz-panel {
  width: 100%;
  max-width: 1100px;
  margin-top: 20px;
  display: flex;
  flex-direction: column;  /* 垂直排列各区域 */
  gap: 10px;
}

/* ========== 获胜者横幅 ========== */
/*
  【技术学习 — 获胜者横幅样式】
  绿色主题：传达"胜利/成功"的语义信息。
  与 AnswerReveal 组件使用相同的绿色色值。
*/
.winner-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 24px;
  background: rgba(103, 194, 58, 0.14);    /* 浅绿背景 */
  border: 1px solid rgba(103, 194, 58, 0.3); /* 绿色边框 */
  border-radius: 8px;
}

/* 获胜者昵称：大字体、绿色 */
.winner-name {
  font-size: 28px;
  font-weight: 700;
  color: #67c23a;
  letter-spacing: 2px;
}

/* "抢答成功"标签 */
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

/* 提前抢答人数用橙色标识 */
.summary-early {
  color: #e6a23c;
}

/* ========== 选手卡片网格 ========== */
/*
  【技术学习 — Flex wrap 卡片网格】
  display: flex + flex-wrap: wrap 实现自动换行。
  与 Grid 不同，Flex wrap 更适合"不确定数量"的元素，
  每个卡片宽度由内容决定，自动排列到下一行。
*/
.buzz-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 提前抢答区域额外间距 */
.buzz-cards--early {
  margin-top: 2px;
}

/* 提前抢答标题 */
.early-label {
  width: 100%;              /* 占满整行 */
  font-size: 12px;
  color: #e6a23c;           /* 橙色 */
  font-weight: 500;
  padding: 4px 8px;
  margin-bottom: 2px;
}

/* 单张选手卡片 */
.buzz-card {
  display: flex;
  flex-direction: column;   /* 内容垂直排列 */
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 90px;
  flex: 0 0 auto;           /* 不伸缩，保持内容宽度 */
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  text-align: center;
}

/* 【技术学习 — 获胜者卡片高亮】绿色边框和背景 */
.buzz-card.is-winner {
  background: rgba(103, 194, 58, 0.12);
  border-color: rgba(103, 194, 58, 0.35);
}

/* 【技术学习 — 提前抢答卡片】橙色边框和背景 */
.buzz-card.is-early {
  background: rgba(230, 162, 60, 0.06);
  border-color: rgba(230, 162, 60, 0.15);
}

/* 排名序号 */
.card-rank {
  font-size: 12px;
  font-weight: 700;
  color: #409eff;           /* 蓝色 */
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

/* 提前抢答的 "!" 标记用橙色 */
.early-rank {
  color: #e6a23c;
}

/* 选手昵称 */
.card-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 1px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;  /* 溢出显示省略号 */
  white-space: nowrap;
}

/* 获胜者昵称用绿色 */
.buzz-card.is-winner .card-name {
  color: #67c23a;
}

/* 提前抢答昵称用橙色 */
.buzz-card.is-early .card-name {
  color: rgba(230, 162, 60, 0.8);
}

/* 响应时间差距（如 "+120ms"） */
.card-gap {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

/* 获胜者奖杯图标 */
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
