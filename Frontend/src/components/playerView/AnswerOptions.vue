<!--
  ============================================================================
  AnswerOptions.vue - 答题选项组件
  ============================================================================

  【组件功能】
  根据题目类型（单选/多选/主观题）渲染对应的答题界面，支持：
  - 单选题：点击选项自动选中，只能选一个
  - 多选题：点击选项切换选中状态，可选多个
  - 主观题：文本输入框，自由输入答案
  - 答案提交功能

  【设计思路】
  1. 使用响应式数组 selected 存储已选选项，统一处理单选和多选
  2. 选项采用 2 列网格布局，充分利用屏幕空间
  3. 提交后禁用所有交互，防止重复提交
  4. 切换题目时自动清空已选内容

  【技术学习】
  - v-model：Vue 双向绑定指令，表单元素与数据同步
  - watch：Vue 侦听器，监听数据变化执行副作用
  - emit：子组件向父组件传递事件
  - 条件渲染：v-if / v-else 根据条件显示不同内容
-->

<script setup lang="ts">
/**
 * 导入说明：
 * - ref：创建响应式变量
 * - watch：侦听器，监听响应式数据变化
 * - Question：题目类型定义
 */
import { ref, watch } from 'vue'
import type { Question } from '@/types/question'

/**
 * defineProps：定义组件接收的 props
 *
 * 【技术学习】props 详解：
 * - question: Question    → 当前题目对象，包含题目类型、选项等信息
 * - canAnswer: boolean    → 是否允许答题（由父组件控制，如倒计时期间可能禁止答题）
 * - submitted: boolean    → 是否已提交答案
 *
 * props 是父组件传入的数据，子组件不应该直接修改 props
 */
const props = defineProps<{
  question: Question
  canAnswer: boolean
  submitted: boolean
}>()

/**
 * defineEmits：定义组件可以发射的事件
 *
 * 【技术学习】组件通信 - 子传父：
 * - 父组件通过 @submit="handler" 监听事件
 * - 子组件通过 emit('submit', data) 触发事件并传递数据
 * - [answers: string[]] 表示事件携带一个字符串数组参数
 *
 * 这是 Vue 组件通信的核心模式之一
 */
const emit = defineEmits<{
  submit: [answers: string[]]
}>()

/**
 * selected：响应式数组，存储当前选中的选项
 *
 * 【技术学习】为什么用数组而不是 Set？
 * - 虽然 Set 在判断包含关系时更高效（O(1)）
 * - 但 Vue 3 的响应式系统对数组的支持更完善
 * - 对于选项数量很少的场景（通常 4-8 个），性能差异可以忽略
 * - includes() 方法在小数组上的性能已经足够
 */
const selected = ref<string[]>([])

/**
 * subjectiveText：主观题的文本输入内容
 *
 * 【技术学习】v-model 的工作原理：
 * - <textarea v-model="subjectiveText"> 等价于：
 *   <textarea :value="subjectiveText" @input="subjectiveText = $event.target.value">
 * - 自动实现双向绑定：数据变化更新视图，视图变化更新数据
 */
const subjectiveText = ref('')

/**
 * watch 侦听器：监听题目 ID 变化
 *
 * 【技术学习】watch 的使用场景：
 * - 当 props.question.id 变化时（即切换了新题目）
 * - 自动清空已选选项和主观题文本
 * - 避免上一题的答案影响下一题
 *
 * watch(要监听的值, 变化时的回调函数)
 *
 * () => props.question.id 是一个 getter 函数
 * Vue 会在每次响应式更新时检查这个值是否变化
 */
watch(() => props.question.id, () => {
  selected.value = []           // 清空已选选项
  subjectiveText.value = ''     // 清空主观题文本
})

/**
 * toggleOption：切换选项的选中状态
 *
 * 【技术学习】单选 vs 多选的实现逻辑：
 *
 * 单选题（single）：
 * - 直接用新选项替换整个数组：selected.value = [opt]
 * - 无论之前选了什么，点击新选项就只保留新选项
 *
 * 多选题（multiple）：
 * - 查找选项在数组中的位置
 * - 如果已存在（idx >= 0），则移除：splice(idx, 1)
 * - 如果不存在，则添加：push(opt)
 *
 * splice(index, deleteCount) 数组方法：
 * - 从 index 位置开始，删除 deleteCount 个元素
 * - 这里是移除指定位置的 1 个元素
 *
 * 前置条件检查：
 * - !canAnswer：不允许答题时直接返回
 * - submitted：已提交后不允许修改
 */
function toggleOption(opt: string) {
  // 不允许答题或已提交，直接返回
  if (!props.canAnswer || props.submitted) return

  // 根据题目类型处理不同的选择逻辑
  if (props.question.type === 'single') {
    // 单选：直接替换为只包含当前选项的数组
    selected.value = [opt]
  } else if (props.question.type === 'multiple') {
    // 多选：查找当前选项是否已选中
    const idx = selected.value.indexOf(opt)
    if (idx >= 0) {
      // 已选中 → 移除
      selected.value.splice(idx, 1)
    } else {
      // 未选中 → 添加
      selected.value.push(opt)
    }
  }
}

/**
 * isSelected：判断某个选项是否被选中
 *
 * 【技术学习】Array.includes() 方法：
 * - 检查数组是否包含指定元素
 * - 返回 boolean 值
 * - 使用严格相等（===）进行比较
 *
 * 在模板中用于动态绑定 CSS 类名：
 * :class="{ selected: isSelected(opt) }"
 */
function isSelected(opt: string): boolean {
  return selected.value.includes(opt)
}

/**
 * handleSubmit：提交答案
 *
 * 【技术学习】答案提交流程：
 * 1. 检查是否已提交（防止重复提交）
 * 2. 根据题目类型准备答案数据
 *    - 主观题：取文本输入框内容，去除首尾空格
 *    - 客观题：复制已选选项数组（使用展开运算符 [...]）
 * 3. 通过 emit 将答案发送给父组件
 * 4. 父组件再通过 Socket 发送到服务器
 *
 * 展开运算符 [...selected.value]：
 * - 创建数组的浅拷贝
 * - 避免直接传递引用，保护组件内部状态
 */
function handleSubmit() {
  // 已提交则不允许再次提交
  if (props.submitted) return

  // 根据题目类型准备答案
  const answers = props.question.type === 'subjective'
    // 主观题：去除首尾空格，如果有内容则放入数组
    ? (subjectiveText.value.trim() ? [subjectiveText.value.trim()] : [])
    // 客观题：复制选中的选项数组
    : [...selected.value]

  // 发射 submit 事件，将答案传递给父组件
  emit('submit', answers)
}

/**
 * optionLabels：选项字母标签数组
 *
 * 【技术学习】
 * - 用于给选项添加字母标识（A、B、C、D...）
 * - 使用数组索引映射：optionLabels[0] = 'A', optionLabels[1] = 'B'
 * - 如果选项超过8个，使用数字作为后备：optionLabels[i] || i
 */
const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
</script>

<template>
  <!--
    答题选项主容器

    【技术学习】组件布局结构：
    - 客观题：选项网格 + 提交按钮
    - 主观题：文本输入框 + 提交按钮
    - 使用 v-if/v-else 条件渲染不同内容
  -->
  <div class="answer-options">
    <!--
      客观题选项区域（单选/多选）

      【技术学习】<template> 标签用法：
      - <template v-if> 不会渲染为真实 DOM 元素
      - 仅作为逻辑容器，用于条件渲染多个元素
      - 避免添加额外的 DOM 节点
    -->
    <template v-if="question.type !== 'subjective'">
      <!-- 选项网格容器 -->
      <div class="options-grid">
        <!--
          遍历渲染每个选项

          【技术学习】v-for 带索引：
          - v-for="(opt, i) in question.options"
          - opt：当前选项的文字内容
          - i：当前选项的索引（0、1、2...）
          - :key="i"：使用索引作为 key（实际项目中建议使用唯一 ID）

          动态 class 绑定：
          :class="{ selected: isSelected(opt), disabled: !canAnswer || submitted }"
          - selected：选中状态样式
          - disabled：禁用状态样式

          条件渲染选中勾号：
          v-if="isSelected(opt)"：只在选中时显示 ✓
        -->
        <div
          v-for="(opt, i) in question.options"
          :key="i"
          class="option-item"
          :class="{
            selected: isSelected(opt),
            disabled: !canAnswer || submitted,
          }"
          @click="toggleOption(opt)"
        >
          <!-- 选项字母标签 -->
          <span class="option-letter">{{ optionLabels[i] || i }}</span>
          <!-- 选项文字内容 -->
          <span class="option-text">{{ opt }}</span>
          <!-- 选中勾号（只在选中时显示） -->
          <span v-if="isSelected(opt)" class="option-check">✓</span>
        </div>
      </div>
    </template>

    <!--
      主观题文本输入区域

      【技术学习】v-else 配合 v-if 使用：
      - 当 question.type === 'subjective' 时显示此区域
      - 与上面的 v-if 互斥，只会显示其中一个

      textarea 属性说明：
      - v-model="subjectiveText"：双向绑定输入内容
      - :disabled：动态禁用状态
      - placeholder：占位提示文字
      - rows="3"：默认显示3行高度
    -->
    <template v-else>
      <textarea
        v-model="subjectiveText"
        class="subjective-input"
        :disabled="!canAnswer || submitted"
        placeholder="请输入你的答案..."
        rows="3"
      />
    </template>

    <!--
      提交按钮

      【技术学习】按钮状态管理：
      - :disabled="!canAnswer || submitted"：不允许答题或已提交时禁用
      - 使用 <template> 和 v-if/v-else 切换按钮文字
      - 提交前显示"提交答案"，提交后显示"已提交 ✓"
    -->
    <button
      class="submit-btn"
      :disabled="!canAnswer || submitted"
      @click="handleSubmit"
    >
      <template v-if="submitted">已提交 ✓</template>
      <template v-else>提交答案</template>
    </button>
  </div>
</template>

<style scoped>
/* 答题选项主容器 */
.answer-options {
  display: flex;
  flex-direction: column;          /* 垂直排列 */
  gap: 10px;                       /* 子元素间距 */
  flex: 1;                         /* 占据剩余空间 */
  min-height: 0;                   /* 允许缩小，配合 flex 实现滚动 */
}

/*
 * 选项网格布局
 *
 * 【技术学习】CSS Grid 网格布局：
 * - grid-template-columns: 1fr 1fr：两列等宽
 * - 1fr 是弹性单位，表示占据可用空间的 1 份
 * - gap: 10px：网格项之间的间距
 * - align-content: center：内容垂直居中
 */
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* 两列等宽 */
  gap: 10px;
  flex: 1;
  align-content: center;           /* 网格内容垂直居中 */
}

/*
 * 选项卡片样式
 *
 * 【设计要点】
 * - 卡片式设计，点击区域大，便于触屏操作
 * - 2px 边框，选中时高亮显示
 * - 过渡动画让状态切换更平滑
 */
.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;  /* 过渡动画 */
  user-select: none;              /* 禁止选中文字 */
  min-height: 52px;               /* 最小高度，保证点击区域 */
}

/*
 * 点击反馈效果
 *
 * 【技术学习】:active 伪类：
 * - 鼠标按下时的样式
 * - :not(.disabled) 排除禁用状态
 * - transform: scale(0.97) 缩小效果，提供按压反馈
 */
.option-item:active:not(.disabled) {
  transform: scale(0.97);
}

/* 选中状态样式 */
.option-item.selected {
  border-color: #409eff;           /* 蓝色边框 */
  background: rgba(64, 158, 255, 0.15);  /* 淡蓝色背景 */
}

/* 禁用状态样式 */
.option-item.disabled {
  cursor: not-allowed;             /* 禁止光标 */
  opacity: 0.45;                   /* 半透明 */
}

/* 选项字母标签 */
.option-letter {
  width: 32px;
  height: 32px;
  border-radius: 50%;              /* 圆形 */
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;                  /* 不允许缩小 */
}

/* 选中状态的字母标签 */
.option-item.selected .option-letter {
  background: #409eff;             /* 蓝色背景 */
}

/* 选项文字内容 */
.option-text {
  flex: 1;                         /* 占据剩余空间 */
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.35;
  overflow: hidden;                /* 溢出隐藏 */
  text-overflow: ellipsis;         /* 溢出显示省略号 */
  display: -webkit-box;
  -webkit-line-clamp: 2;          /* 最多显示2行 */
  line-clamp: 2;
  -webkit-box-orient: vertical;   /* 垂直排列 */
}

/* 选中勾号 */
.option-check {
  font-size: 18px;
  color: #67c23a;                  /* 绿色 */
  font-weight: 700;
  flex-shrink: 0;
}

/* 主观题文本输入框 */
.subjective-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  resize: none;                    /* 禁止手动调整大小 */
  outline: none;                   /* 去除默认聚焦轮廓 */
}

/* 输入框聚焦状态 */
.subjective-input:focus { border-color: #409eff; }

/* 输入框禁用状态 */
.subjective-input:disabled { opacity: 0.5; }

/* 输入框占位文字样式 */
.subjective-input::placeholder { color: rgba(255, 255, 255, 0.25); }

/*
 * 提交按钮样式
 *
 * 【设计要点】
 * - 渐变背景，视觉效果好
 * - 字间距 2px，文字更清晰
 * - 点击反馈效果
 */
.submit-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #409eff, #337ecc);  /* 渐变背景 */
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 2px;             /* 字间距 */
  flex-shrink: 0;                  /* 不允许缩小 */
}

/* 提交按钮点击效果 */
.submit-btn:active:not(:disabled) { transform: scale(0.97); }

/* 提交按钮禁用状态 */
.submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/*
 * 响应式设计：窄屏适配
 *
 * 【技术学习】媒体查询：
 * - @media (max-width: 420px)：当屏幕宽度 <= 420px 时应用
 * - 用于适配手机等小屏幕设备
 * - 网格从两列变为单列，减小间距和内边距
 */
@media (max-width: 420px) {
  .options-grid {
    grid-template-columns: 1fr;    /* 单列布局 */
  }
  .option-item {
    min-height: 46px;
    padding: 10px 12px;
  }
}
</style>
