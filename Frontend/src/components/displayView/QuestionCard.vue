<!--
  ============================================
  QuestionCard.vue — 题目卡片展示组件
  ============================================
  【组件功能】
  在大屏展示页面中显示一道题目的完整信息，包括题型标签、分值、题干和选项。
  采用"玻璃拟态"（Glassmorphism）设计风格，半透明背景 + 模糊效果。

  【技术学习 — 核心知识点】
  1. Props 数据接收：通过 defineProps 接收题目对象和类型标签
  2. 选项网格布局：使用 CSS Grid 实现 2 列自适应布局
  3. 字母标签生成：通过 String.fromCharCode(65 + i) 将索引转为 A/B/C/D
  4. 玻璃拟态样式：backdrop-filter: blur() + rgba 半透明背景
  5. 条件渲染：主观题不显示选项
-->

<script setup lang="ts">
// 【技术学习】导入题目类型定义
// Question 类型包含 id、stem（题干）、type（题型）、options（选项数组）、score（分值）等字段
import type { Question } from '@/types/question'

// =============================================
// 【技术学习 — defineProps 组件属性】
// question: 题目数据对象，由父组件传入
// typeLabel: 题型的中文标签（如"单选题"、"多选题"、"判断题"）
//   为什么不从 question.type 直接翻译？
//   因为不同场景可能需要不同的标签文案，由父组件决定更灵活。
// =============================================
defineProps<{
  question: Question
  typeLabel: string
}>()
</script>

<template>
  <!--
    【技术学习 — 题目卡片容器】
    最大宽度 900px，居中显示，适配大屏和普通屏幕。
  -->
  <div class="question-card">
    <!--
      【技术学习 — 题目元信息行】
      显示题型标签和分值，水平排列。
      .q-score 使用 margin-left: auto 推到右侧（Flex 布局技巧）。
    -->
    <div class="question-meta">
      <span class="q-type">{{ typeLabel }}</span>
      <span class="q-score">{{ question.score }} 分</span>
    </div>

    <!--
      【技术学习 — 题干文本】
      question.stem 是题目的主体文字。
      28px 大字体 + 粗体，确保大屏上清晰可读。
    -->
    <div class="q-stem">{{ question.stem }}</div>

    <!--
      【技术学习 — 选项区域（条件渲染）】
      v-if="question.type !== 'subjective' && question.options.length"
      两个条件：
        1. 不是主观题（主观题没有选项，需要手动输入答案）
        2. 选项数组不为空（防止数据异常时显示空区域）

      【技术学习 — CSS Grid 2 列布局】
      .q-options 使用 grid-template-columns: 1fr 1fr 实现两列等宽。
      1fr 是"弹性单位"，表示占据剩余空间的一份。
      比 float 或 flex 方案更适合这种"网格"布局。
    -->
    <div
      v-if="question.type !== 'subjective' && question.options.length"
      class="q-options"
    >
      <!--
        【技术学习 — v-for 遍历选项】
        v-for="(opt, i) in question.options" :key="i"
        opt: 当前选项的文本内容
        i: 当前索引（从 0 开始）
        :key="i": 使用索引作为 key（这里选项顺序固定，可以接受）
      -->
      <div
        v-for="(opt, i) in question.options"
        :key="i"
        class="q-option"
      >
        <!--
          【技术学习 — 字母标签生成】
          String.fromCharCode(65 + i) 将索引转为大写字母：
            i=0 → 65 → 'A'
            i=1 → 66 → 'B'
            i=2 → 67 → 'C'
            i=3 → 68 → 'D'
          65 是大写字母 'A' 的 ASCII/Unicode 码点。
        -->
        <span class="q-option-letter">{{ String.fromCharCode(65 + i) }}</span>
        <span class="q-option-text">{{ opt }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  【技术学习 — 玻璃拟态（Glassmorphism）效果】
  这是一种现代 UI 设计趋势，核心三要素：
    1. 半透明背景：background: rgba(255, 255, 255, 0.12)
    2. 背景模糊：backdrop-filter: blur(12px)
    3. 细边框：border: 1px solid rgba(255, 255, 255, 0.15)

  视觉效果：卡片看起来像一块磨砂玻璃，背景内容若隐若现。
  注意：backdrop-filter 需要浏览器支持，IE 不兼容。
*/
.question-card {
  max-width: 900px;
  width: 100%;
  background: rgba(255, 255, 255, 0.12);   /* 半透明白色背景 */
  backdrop-filter: blur(12px);              /* 背景模糊 12px */
  border-radius: 16px;                      /* 大圆角 */
  padding: 40px 48px;                       /* 内边距 */
  border: 1px solid rgba(255, 255, 255, 0.15); /* 半透明细边框 */
}

/* 题目元信息行：题型标签 + 分值 */
.question-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

/* 题型标签样式（如"单选题"） */
.q-type {
  font-size: 14px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);  /* 半透明背景 */
  border-radius: 4px;
}

/* 分值样式：金色文字，推到右侧 */
.q-score {
  font-size: 16px;
  font-weight: 600;
  color: #ffd666;          /* 金色 */
  margin-left: auto;       /* 【技术学习】Flex 布局技巧：自动左外边距将元素推到最右 */
}

/* 题干文本：大字体、粗体 */
.q-stem {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.6;        /* 行高 1.6 倍，增加可读性 */
  margin-bottom: 24px;
}

/*
  【技术学习 — CSS Grid 选项网格】
  grid-template-columns: 1fr 1fr  → 两列等宽
  gap: 12px                      → 格子之间的间距
  1fr = 1 fraction（一份弹性空间），两列平分容器宽度
*/
.q-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* 单个选项卡片 */
.q-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s;  /* 悬浮时背景变化的过渡动画 */
}

/*
  【技术学习 — 字母标签圆圈】
  宽高固定 36px，border-radius: 50% 变成正圆。
  display: flex + 居中对齐，确保字母在圆圈内水平垂直居中。
  flex-shrink: 0 防止在空间不足时被压缩。
*/
.q-option-letter {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;        /* 正圆 */
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;            /* 不压缩 */
}

/* 选项文字 */
.q-option-text {
  font-size: 20px;
  line-height: 1.4;
}

/* 【技术学习 — 响应式设计】小屏幕适配 */
@media (max-width: 768px) {
  .q-stem {
    font-size: 22px;         /* 题干字体缩小 */
  }

  .q-options {
    grid-template-columns: 1fr;  /* 小屏幕改为单列布局 */
  }

  .q-option-text {
    font-size: 16px;
  }

  .question-card {
    padding: 24px;           /* 减小内边距 */
  }
}
</style>
