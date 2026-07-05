<!--
  ============================================
  CountdownTimers.vue — 倒计时显示组件
  ============================================
  【组件功能】
  在大屏幕上显示"抢答倒计时"和"答题倒计时"两个计时器。
  采用 72px 大字体等宽字体，确保远处观众也能清晰看到剩余时间。

  【技术学习 — 核心知识点】
  1. 大字体倒计时：使用等宽字体（monospace）防止数字跳动
  2. 服务端时间同步：剩余时间由父组件从服务端获取后通过 props 传入
  3. 小数秒精确显示：quickAnswerText / answerText 由父组件格式化（如 "5.3s"）
  4. 低秒数警告动画：剩余时间 <= 阈值时触发红色闪烁 CSS animation
  5. props 设计：纯展示组件，不维护内部状态，所有数据来自父组件

  【技术学习 — 为什么倒计时逻辑不在这个组件内部？】
  这是一个"展示层"组件，只负责渲染。倒计时的计算、服务端时间同步、
  WebSocket 通信等逻辑都在父组件（DisplayView）中完成。
  这样做符合"单一职责原则"：每个组件只做一件事。
-->

<script setup lang="ts">
// =============================================
// 【技术学习 — defineProps 类型化 Props】
// 使用 TypeScript 泛型语法定义 props 的类型。
// 纯展示组件的特点：所有数据都通过 props 从父组件接收。
// =============================================
defineProps<{
  // -- 抢答倒计时相关 --
  showQuickAnswer: boolean       // 是否显示抢答倒计时（有些阶段不需要抢答）
  isQuickAnswerCounting: boolean // 抢答倒计时是否正在计时中（区分"计时中"和"已停止"）
  quickAnswerRemaining: number   // 抢答剩余秒数（用于判断是否进入警告状态）
  quickAnswerText: string        // 抢答倒计时的显示文本（如 "5.3s"、"0.0s"）

  // -- 答题倒计时相关 --
  showAnswer: boolean            // 是否显示答题倒计时
  isAnswerCounting: boolean      // 答题倒计时是否正在计时中
  answerRemaining: number        // 答题剩余秒数
  answerText: string             // 答题倒计时的显示文本
}>()

// 【技术学习 — 注意事项】
// 这个组件没有任何 ref、computed、watch 或方法。
// 它是一个"纯展示"组件（Pure/Presentational Component）：
//   - 输入（props）→ 输出（模板渲染）
//   - 没有副作用，没有内部状态
//   - 易于测试和复用
</script>

<template>
  <!--
    【技术学习 — 外层条件渲染】
    v-if="showQuickAnswer || showAnswer"
    只有当至少一个倒计时需要显示时，才渲染整行容器。
    两个都不显示时，整个组件不占用任何空间。
  -->
  <div v-if="showQuickAnswer || showAnswer" class="timers-row">
    <!--
      【技术学习 — 抢答倒计时块】
      v-if="showQuickAnswer": 根据父组件控制是否显示
      timer--quick: CSS 类名，用于区分两种倒计时的样式
    -->
    <div v-if="showQuickAnswer" class="timer-block timer--quick">
      <!-- 标签文字 -->
      <div class="timer-label">抢答倒计时</div>

      <!--
        【技术学习 — 倒计时数值 + 警告样式】
        :class="{ warn: isQuickAnswerCounting && quickAnswerRemaining <= 5 }"
        这是一个动态 class 绑定，当满足两个条件时添加 "warn" 类：
          1. isQuickAnswerCounting: 倒计时正在运行中（不是暂停或结束状态）
          2. quickAnswerRemaining <= 5: 剩余时间 <= 5 秒
        warn 类会触发红色文字 + 闪烁动画，提醒观众时间即将耗尽。
      -->
      <div
        class="timer-value"
        :class="{ warn: isQuickAnswerCounting && quickAnswerRemaining <= 5 }"
      >
        <!--
          【技术学习 — 显示格式化的时间文本】
          quickAnswerText 由父组件负责格式化，如 "10.0s"、"3.5s"
          这样组件不需要关心时间格式化的逻辑。
        -->
        {{ quickAnswerText }}
      </div>
    </div>

    <!-- 答题倒计时块，结构与抢答倒计时相同 -->
    <div v-if="showAnswer" class="timer-block timer--answer">
      <div class="timer-label">答题倒计时</div>

      <!--
        答题倒计时的警告阈值是 10 秒（比抢答的 5 秒更早触发）
        因为答题时间通常更长，需要更早提醒。
      -->
      <div
        class="timer-value"
        :class="{ warn: isAnswerCounting && answerRemaining <= 10 }"
      >
        {{ answerText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 倒计时行：两个计时器水平排列 */
.timers-row {
  display: flex;           /* 弹性布局 */
  gap: 40px;               /* 两个计时器之间的间距 */
  margin-bottom: 30px;     /* 与下方内容的间距 */
}

/* 每个计时器块居中对齐 */
.timer-block {
  text-align: center;
}

/* 标签文字样式（如"抢答倒计时"） */
.timer-label {
  font-size: 16px;
  opacity: 0.8;            /* 略微透明，不喧宾夺主 */
  margin-bottom: 6px;
  letter-spacing: 2px;     /* 字间距，增加可读性 */
}

/*
  【技术学习 — 大字体倒计时核心样式】
  - font-size: 72px    超大字体，确保远处观众可见
  - font-weight: 700   粗体，增强视觉冲击
  - 等宽字体族         防止数字宽度变化导致布局跳动
    JetBrains Mono / Fira Code 是程序员常用的等宽字体
    Consolas 是 Windows 自带的等宽字体作为兜底
    monospace 是系统默认等宽字体的最终兜底
*/
.timer-value {
  font-size: 72px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  letter-spacing: 4px;
  line-height: 1;  /* 行高设为 1，防止文字底部有多余间距 */
}

/*
  【技术学习 — 警告状态样式】
  当剩余时间 <= 阈值时，通过 :class 动态添加 "warn" 类。
  - color: #f56c6c   Element Plus 的危险红色
  - animation         使用 CSS @keyframes 实现闪烁效果
*/
.timer-value.warn {
  color: #f56c6c;
  animation: pulse-warn 0.8s ease-in-out infinite alternate;
}

/*
  【技术学习 — CSS 动画 @keyframes】
  pulse-warn: 在完全不透明（1）和半透明（0.4）之间交替。
  - infinite: 无限循环
  - alternate: 正向播放完后反向播放，形成"呼吸灯"效果
  - 0.8s: 一个周期 0.8 秒
*/
@keyframes pulse-warn {
  from { opacity: 1; }
  to { opacity: 0.4; }
}

/* 【技术学习 — 响应式设计】小屏幕时缩小字体 */
@media (max-width: 768px) {
  .timer-value {
    font-size: 48px;
  }
}
</style>
