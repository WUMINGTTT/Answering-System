<!--
  ============================================
  AnswerReveal.vue — 答案揭晓组件
  ============================================
  【组件功能】
  在题目展示后，以醒目的绿色卡片形式展示正确答案。
  支持多个答案的显示（如多选题的 A、B、C 多个正确选项）。

  【技术学习 — 核心知识点】
  1. 答案芯片（Chip）展示：每个答案用独立的"芯片"标签显示
  2. 绿色主题设计：用绿色传达"正确"的语义信息
  3. 条件渲染：没有答案时不渲染任何内容
  4. 纯展示组件：只有 props，没有内部状态或事件

  【技术学习 — 什么是 Chip/Tag 组件？】
  Chip（芯片）是一种常见的 UI 元素，用于展示紧凑的信息标签。
  例如：标签、分类、选中的选项等。Element Plus 中对应 el-tag 组件。
  这里手动实现了一个自定义的 chip 样式。
-->

<script setup lang="ts">
// =============================================
// 【技术学习 — defineProps】
// answers: string[] — 答案数组
//   单选题：['B']
//   多选题：['A', 'C', 'D']
//   判断题：['正确'] 或 ['错误']
//   填空题：['答案文本']
//
// 使用 string[] 而非 string，是因为多选题可能有多个正确答案。
// =============================================
defineProps<{
  answers: string[]
}>()

// 【技术学习 — 为什么不直接传一个字符串？】
// 如果是 string 类型，多选题需要手动拼接（如 "A,B,C"），
// 然后再拆分显示。用 string[] 数组更自然，前端直接遍历即可。
</script>

<template>
  <!--
    【技术学习 — 条件渲染答案卡片】
    v-if="answers.length" — 当数组不为空时才渲染。
    在 JavaScript 中，0 是 falsy，所以 length 为 0 时不渲染。
    这是一种常见的"空数组守卫"写法。
  -->
  <div v-if="answers.length" class="answer-card">
    <!-- "答案"标签，固定在左侧 -->
    <div class="answer-label">答案</div>

    <!--
      【技术学习 — 答案列表】
      使用 flex 布局，多个答案芯片水平排列并自动换行。
      flex-wrap: wrap 允许答案过多时换行显示。
    -->
    <div class="answer-list">
      <!--
        【技术学习 — v-for 遍历答案数组】
        v-for="(ans, i) in answers" :key="i"
        ans: 当前答案文本
        i: 索引（用作 :key）
      -->
      <span
        v-for="(ans, i) in answers"
        :key="i"
        class="answer-item"
      >{{ ans }}</span>
    </div>
  </div>
</template>

<style scoped>
/*
  【技术学习 — 答案卡片整体样式】
  绿色主题设计，传达"正确答案"的语义：
    - background: rgba(103, 194, 58, 0.15)  — 浅绿色半透明背景
    - border: 1px solid rgba(103, 194, 58, 0.3) — 绿色边框
    - backdrop-filter: blur(12px) — 玻璃拟态模糊效果

  103, 194, 58 是 Element Plus 的 success（成功/绿色）色值。
*/
.answer-card {
  max-width: 900px;
  width: 100%;
  margin-top: 20px;
  padding: 24px 48px;
  background: rgba(103, 194, 58, 0.15);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(103, 194, 58, 0.3);
  display: flex;             /* 水平排列：标签 + 答案列表 */
  align-items: center;       /* 垂直居中 */
  gap: 20px;                 /* 标签和答案之间的间距 */
}

/* "答案"标签文字 */
.answer-label {
  font-size: 18px;
  font-weight: 600;
  color: #67c23a;            /* Element Plus 成功绿色 */
  flex-shrink: 0;            /* 不压缩，保持固定宽度 */
}

/* 答案列表容器 */
.answer-list {
  display: flex;
  gap: 12px;                 /* 每个答案芯片之间的间距 */
  flex-wrap: wrap;           /* 答案过多时自动换行 */
}

/*
  【技术学习 — 答案芯片（Chip）样式】
  每个答案是一个独立的圆角标签，绿色背景 + 浅绿文字。
  这种设计让每个答案都清晰可辨，适合大屏展示。
*/
.answer-item {
  font-size: 22px;
  font-weight: 700;
  padding: 6px 18px;
  background: rgba(103, 194, 58, 0.3);  /* 绿色半透明背景 */
  border-radius: 6px;                    /* 小圆角 */
  color: #b3e19d;                        /* 浅绿色文字 */
  letter-spacing: 1px;                   /* 字间距 */
}
</style>
