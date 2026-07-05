<!--
  ============================================
  RiskQuestionGrid.vue — 风险题选择网格组件
  ============================================
  【组件功能】
  在"风险题"环节，以网格形式展示所有可选的风险题目。
  每张卡片显示题目的代号（如 A5、B12）和分值，已选过的题目会显示遮罩。

  【技术学习 — 核心知识点】
  1. 风险题选择网格：使用 CSS Grid 实现 5 列等宽布局
  2. 题目编码系统：分值映射到字母（10→A, 20→B, 30→C）+ 序号
  3. 分值颜色编码：不同分值用不同颜色标识，直观区分难度
  4. 已选/未选状态：通过 usedIds 数组判断，已选题目显示半透明遮罩
  5. CSS 自定义属性：通过 --card-color 变量实现动态颜色

  【技术学习 — 什么是"风险题"？】
  风险题是一种竞赛题型：分值越高，题目越难，答对得分多，答错扣分也多。
  选手需要根据自身实力选择不同分值的题目，体现"风险与收益"的博弈。
-->

<script setup lang="ts">
// 【技术学习】导入题目类型定义
import type { Question } from '@/types/question'

// =============================================
// 【技术学习 — 常量映射表】
// Record<number, string> 是 TypeScript 的工具类型，表示"数字→字符串"的映射。
//
// SCORE_LETTER: 分值 → 字母代号
//   10 分 → 'A'（低风险）
//   20 分 → 'B'（中风险）
//   30 分 → 'C'（高风险）
//
// SCORE_COLOR: 分值 → 颜色
//   10 分 → 蓝色 #409eff（Element Plus 的 primary 色）
//   20 分 → 橙色 #e6a23c（Element Plus 的 warning 色）
//   30 分 → 红色 #f56c6c（Element Plus 的 danger 色）
//
// 颜色选择逻辑：分值越高，颜色越"危险"（蓝→橙→红），
// 让选手在视觉上直观感受到风险等级。
// =============================================
const SCORE_LETTER: Record<number, string> = { 10: 'A', 20: 'B', 30: 'C' }
const SCORE_COLOR: Record<number, string> = {
  10: '#409eff',   // 蓝色 — 低风险
  20: '#e6a23c',   // 橙色 — 中风险
  30: '#f56c6c',   // 红色 — 高风险
}

// =============================================
// 【技术学习 — defineProps 组件属性】
// =============================================
defineProps<{
  /** 风险题目列表（已按分值筛选） */
  questions: Question[]

  /**
   * 题目 ID → 代号的映射表（Map 类型）
   * 例如：'abc123' → 'A5'，'def456' → 'B12'
   * 代号由父组件生成，格式为"字母+序号"
   */
  codeMap: Map<string, string>

  /** 已被选择过的题目 ID 列表 */
  usedIds: string[]
}>()

// =============================================
// 【技术学习 — 分值转字母函数】
// 将数字分值转换为字母代号。
// || '?' 是兜底处理：如果分值不在映射表中（如 15 分），显示 '?'。
// =============================================
function scoreLetter(score: number): string {
  return SCORE_LETTER[score] || '?'
}
</script>

<template>
  <!--
    【技术学习 — 网格外层容器】
    控制整体宽度和内边距，适配不同屏幕。
  -->
  <div class="risk-grid-wrapper">
    <!--
      【技术学习 — CSS Grid 网格布局】
      .risk-grid 使用 grid-template-columns: repeat(5, 1fr)
      表示 5 列等宽的网格，每列占一份弹性空间。
      比 Flex 更适合这种"固定列数"的网格布局。
    -->
    <div class="risk-grid">
      <!--
        【技术学习 — v-for 遍历题目列表】
        :key="q.id" 使用题目 ID 作为唯一标识
        :class="{ 'is-used': usedIds.includes(q.id) }" 动态 class：
          - usedIds.includes(q.id) 检查当前题目是否已被选择
          - 如果已选，添加 'is-used' 类，显示灰色遮罩和虚线边框

        :style="{ '--card-color': ... }" 设置 CSS 自定义属性：
          - 这是一个 Vue 的行内样式绑定技巧
          - --card-color 是 CSS 变量名，在样式中通过 var(--card-color) 引用
          - 这样每张卡片可以有不同的边框颜色（根据分值决定）
      -->
      <div
        v-for="q in questions"
        :key="q.id"
        class="risk-card"
        :class="{ 'is-used': usedIds.includes(q.id) }"
        :style="{ '--card-color': SCORE_COLOR[q.score] || '#909399' }"
      >
        <!--
          【技术学习 — 题目代号显示】
          codeMap.get(q.id) 从 Map 中获取代号（如 'A5'）
          || '?' 兜底处理：Map 中找不到时显示 '?'
        -->
        <span class="card-code">{{ codeMap.get(q.id) || '?' }}</span>

        <!--
          【技术学习 — 分值标签】
          scoreLetter(q.score) 将分值转为字母（10→A, 20→B）
          最终显示格式如 "A · 10 分"
        -->
        <span class="card-score">{{ scoreLetter(q.score) }} · {{ q.score }} 分</span>

        <!--
          【技术学习 — 已选择遮罩层】
          v-if="usedIds.includes(q.id)" 条件渲染
          当题目已被选择时，显示半透明黑色遮罩 + "已选择"文字。
          使用 position: absolute + inset: 0 覆盖整个卡片。

          【技术学习 — 什么是 inset: 0？】
          inset 是 top/right/bottom/left 的简写。
          inset: 0 等价于 top:0; right:0; bottom:0; left:0;
          效果：元素铺满父容器（需要父容器有 position: relative）。
        -->
        <div v-if="usedIds.includes(q.id)" class="used-overlay">
          <span class="used-text">已选择</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 网格外层容器 */
.risk-grid-wrapper {
  width: 100%;
  max-width: 1100px;
  padding: 0 20px;
}

/*
  【技术学习 — 5 列网格布局】
  repeat(5, 1fr) 创建 5 列等宽网格。
  gap: 16px 格子之间的间距。
  justify-items: center 让每张卡片在格子内水平居中。
*/
.risk-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  justify-items: center;
}

/*
  【技术学习 — 题目卡片样式】
  position: relative 为内部的绝对定位遮罩层提供定位基准。
  aspect-ratio: 1.6 / 1 宽高比 1.6:1，卡片呈横向矩形。
  backdrop-filter: blur(8px) 玻璃拟态模糊效果。
  border: 2px solid var(--card-color) 使用 CSS 变量实现动态颜色。
*/
.risk-card {
  position: relative;        /* 为子元素的 absolute 定位提供基准 */
  width: 100%;
  max-width: 180px;
  aspect-ratio: 1.6 / 1;    /* 宽高比 */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 2px solid var(--card-color);  /* CSS 变量控制颜色 */
  border-radius: 12px;
  display: flex;
  flex-direction: column;    /* 内容垂直排列 */
  align-items: center;       /* 水平居中 */
  justify-content: center;   /* 垂直居中 */
  cursor: default;           /* 默认鼠标样式（不可点击） */
  overflow: hidden;          /* 遮罩层圆角溢出处理 */
  user-select: none;         /* 禁止选中文字 */
}

/*
  【技术学习 — 已使用状态】
  cursor: not-allowed 鼠标悬浮时显示"禁止"图标。
  opacity: 0.45 降低透明度，视觉上表示"不可选"。
  border-style: dashed 虚线边框，区分未选/已选。
*/
.risk-card.is-used {
  cursor: not-allowed;
  opacity: 0.45;
  border-style: dashed;
}

/*
  【技术学习 — 已选择遮罩层】
  position: absolute + inset: 0 铺满整个卡片。
  background: rgba(0, 0, 0, 0.35) 半透明黑色遮罩。
  遮罩层在卡片内容之上，形成"已选择"的视觉效果。
*/
.used-overlay {
  position: absolute;
  inset: 0;               /* 等价于 top:0; right:0; bottom:0; left:0 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;    /* 比卡片小 2px，与边框对齐 */
}

/* "已选择"文字样式 */
.used-text {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 4px;
  transform: rotate(-15deg);  /* 文字旋转 -15 度，类似"印章"效果 */
}

/*
  【技术学习 — 题目代号样式】
  等宽字体确保 "A5" 和 "B12" 宽度一致。
  text-shadow 添加文字阴影，增强可读性。
*/
.card-code {
  font-size: 36px;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  color: #fff;
  letter-spacing: 3px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);  /* 文字阴影 */
  line-height: 1;
}

/* 分值标签 */
.card-score {
  margin-top: 6px;
  font-size: 13px;
  color: var(--card-color);  /* 使用与边框相同的颜色 */
  font-weight: 500;
  letter-spacing: 1px;
}

/*
  【技术学习 — CSS :has() 选择器（空态）】
  :has() 是 CSS4 的新特性，选择"包含指定子元素"的父元素。
  这里选择"包含空 .risk-grid 的 .risk-grid-wrapper"，
  即题目列表为空时，显示"暂无风险题目"提示。

  注意：:has() 在较旧的浏览器中不支持，但现代浏览器（Chrome 105+）已支持。
*/
.risk-grid-wrapper:has(.risk-grid:empty)::after {
  content: '暂无风险题目';
  display: block;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  padding: 40px;
}

/* 【技术学习 — 响应式设计】根据屏幕宽度调整列数和字体大小 */
@media (max-width: 1000px) {
  .risk-grid {
    grid-template-columns: repeat(4, 1fr);  /* 中等屏幕 4 列 */
    gap: 12px;
  }
  .card-code {
    font-size: 28px;
  }
}

@media (max-width: 700px) {
  .risk-grid {
    grid-template-columns: repeat(3, 1fr);  /* 小屏幕 3 列 */
    gap: 10px;
  }
  .card-code {
    font-size: 24px;
  }
}
</style>
