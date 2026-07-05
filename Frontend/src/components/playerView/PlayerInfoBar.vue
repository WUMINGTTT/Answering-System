<!--
  ============================================================================
  PlayerInfoBar.vue - 选手信息栏组件
  ============================================================================

  【组件功能】
  显示在选手页面顶部的信息栏，包含：
  - 选手头像（使用昵称首字母）
  - 选手昵称
  - 全屏切换功能
  - 连接状态指示器
  - 彩蛋：连续点击头像5次可退出登录

  【设计思路】
  1. 头像采用首字母方案，简单高效，无需存储图片
  2. 全屏功能使用浏览器原生 Fullscreen API
  3. 连接状态通过颜色圆点直观展示（绿色=已连接，红色=断开）
  4. 退出登录设计为"彩蛋"，防止误操作

  【技术学习】
  - Fullscreen API：浏览器原生的全屏控制接口
  - @click.stop：Vue 事件修饰符，阻止事件冒泡
  - setTimeout/clearTimeout：定时器的创建与清除
  - ref：Vue 3 响应式数据声明
-->

<script setup lang="ts">
/**
 * 导入说明：
 * - ref：Vue 3 的响应式 API，用于创建响应式变量
 * - logout：退出登录的 API 函数
 * - useRouter：Vue Router 的路由实例，用于页面跳转
 */
import { ref } from 'vue'
import { logout } from '@/api/users'
import { useRouter } from 'vue-router'

/**
 * defineProps：定义组件接收的 props（父组件传入的数据）
 *
 * 【技术学习】TypeScript 泛型语法定义 props 类型：
 * - nickname: string    → 选手昵称
 * - totalScore: number  → 总分数（当前未在模板中使用）
 * - connected: boolean  → WebSocket 连接状态
 */
defineProps<{
  nickname: string
  totalScore: number
  connected: boolean
}>()

// 获取路由实例，用于页面跳转（如跳转到登录页）
const router = useRouter()

/**
 * isFullscreen：响应式变量，记录当前是否处于全屏状态
 *
 * 【技术学习】ref() 创建的变量在 script 中通过 .value 访问，
 * 在 template 中会自动解包，直接使用变量名即可
 */
const isFullscreen = ref(false)

/**
 * toggleFullscreen：切换全屏状态
 *
 * 【技术学习】Fullscreen API（全屏 API）：
 * - document.fullscreenElement：当前全屏的元素，null 表示未全屏
 * - requestFullscreen()：进入全屏模式（这是一个 Promise）
 * - exitFullscreen()：退出全屏模式
 *
 * 使用场景：答题时全屏可以防止选手切换到其他应用作弊
 */
function toggleFullscreen() {
  // 检查当前是否已全屏
  if (!document.fullscreenElement) {
    // 未全屏 → 请求全屏（document.documentElement 是 <html> 元素）
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    // 已全屏 → 退出全屏
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

/**
 * 监听全屏状态变化事件
 *
 * 【技术学习】fullscreenchange 事件：
 * - 当全屏状态改变时触发（进入或退出全屏）
 * - 用户按 Esc 键退出全屏时也会触发
 * - 使用 !! 双重取反将值转为布尔类型
 *
 * 为什么需要监听？因为用户可能按 Esc 直接退出全屏，
 * 此时不会执行 toggleFullscreen 函数，需要同步更新状态
 */
document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement
})

// ============================================================================
// 彩蛋功能：连续点击头像5次触发退出登录
// ============================================================================

/**
 * avatarClicks：记录连续点击次数
 * avatarTimer：定时器引用，用于在超时后重置点击次数
 *
 * 【技术学习】ReturnType<typeof setTimeout>：
 * - TypeScript 工具类型，自动推断 setTimeout 的返回类型
 * - 在浏览器中是 number，在 Node.js 中是 Timeout 对象
 * - 使用 | null 表示可能为空（初始状态和清除后）
 */
let avatarClicks = 0
let avatarTimer: ReturnType<typeof setTimeout> | null = null

/**
 * onAvatarClick：头像点击处理函数
 *
 * 【逻辑流程】
 * 1. 点击次数 +1
 * 2. 清除之前的定时器（重置2秒倒计时）
 * 3. 如果达到5次，触发退出登录弹窗
 * 4. 否则显示剩余点击次数提示
 * 5. 设置新的2秒定时器，超时后重置点击次数
 *
 * 【技术学习】
 * - clearTimeout：取消已设置的定时器
 * - setTimeout：设置一个延时执行的函数
 * - ElMessage：Element Plus 的消息提示组件
 */
function onAvatarClick() {
  // 累加点击次数
  avatarClicks++

  // 如果有之前的定时器，先清除（重新开始计时）
  if (avatarTimer) clearTimeout(avatarTimer)

  // 达到5次，触发退出登录
  if (avatarClicks >= 5) {
    avatarClicks = 0  // 重置计数器
    showLogoutConfirm()
    return
  }

  // 计算剩余点击次数，显示提示
  const remaining = 5 - avatarClicks
  ElMessage({
    message: `再点击 ${remaining} 次后退出登录`,
    duration: 1500,        // 提示显示1.5秒
    showClose: false,      // 不显示关闭按钮
    customClass: 'avatar-click-msg',  // 自定义样式类名
  })

  /**
   * 设置2秒定时器，超时后重置点击次数
   *
   * 【技术学习】如果2秒内没有继续点击，计数器清零
   * 这样可以防止用户分多次点击累积到5次
   */
  avatarTimer = setTimeout(() => { avatarClicks = 0 }, 2000)
}

/**
 * showLogoutConfirm：显示退出登录确认弹窗
 *
 * 【技术学习】
 * - async/await：异步函数语法，让异步代码看起来像同步代码
 * - try/catch：异常捕获，用户点击"取消"会抛出异常被 catch 捕获
 * - ElMessageBox.confirm：Element Plus 的确认弹窗组件
 * - router.replace：替换当前路由（不会产生历史记录，用户无法后退返回）
 */
async function showLogoutConfirm() {
  try {
    // 显示确认弹窗，等待用户选择
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出登录',
      { confirmButtonText: '退出', cancelButtonText: '取消', type: 'warning' },
    )

    // 用户点击了"退出"，调用退出登录 API
    await logout()

    // 跳转到登录页面（replace 不会产生历史记录）
    router.replace('/login')
  } catch {
    // 用户点击了"取消"或关闭弹窗，不做任何操作
    /* 取消 */
  }
}
</script>

<template>
  <!--
    信息栏容器
    @dblclick="toggleFullscreen"：双击整个信息栏切换全屏

    【技术学习】事件修饰符：
    - @dblclick 双击事件（double click 的缩写）
  -->
  <div class="player-bar" @dblclick="toggleFullscreen">
    <!-- 左侧区域：头像 + 昵称 -->
    <div class="bar-left">
      <!--
        头像显示区：显示昵称的第一个字符

        【技术学习】事件修饰符详解：
        - @click.stop：点击时阻止事件冒泡到父元素
          如果不加 .stop，点击头像会同时触发父元素的 @dblclick
        - @dblclick.stop：阻止双击事件冒泡
          防止双击头像时触发全屏切换

        nickname.charAt(0)：获取昵称的第一个字符作为头像显示
      -->
      <div class="avatar" @click.stop="onAvatarClick" @dblclick.stop>{{ nickname.charAt(0) }}</div>
      <span class="nickname">{{ nickname }}</span>
    </div>

    <!-- 中间区域：分数显示（当前已注释掉） -->
    <div class="bar-center">
      <!-- <span class="score">{{ totalScore }} 分</span> -->
    </div>

    <!-- 右侧区域：全屏提示 + 连接状态 -->
    <div class="bar-right">
      <!--
        全屏提示文字
        v-if="isFullscreen"：仅在全屏状态下显示
        这是一个条件渲染指令
      -->
      <span v-if="isFullscreen" class="fs-hint">全屏</span>

      <!--
        连接状态指示器（彩色圆点）

        【技术学习】动态 class 绑定：
        :class="{ ok: connected }" 表示：
        - 当 connected 为 true 时，添加 'ok' 类名
        - 当 connected 为 false 时，不添加 'ok' 类名

        通过 CSS 类名切换实现颜色变化：
        - 默认（红色）：连接断开
        - .ok（绿色）：已连接
      -->
      <span class="conn-dot" :class="{ ok: connected }" />
    </div>
  </div>
</template>

<!--
  scoped 样式：只对当前组件生效
  Vue 会在编译时为选择器添加唯一属性，实现样式隔离
-->
<style scoped>
/* 信息栏整体布局 */
.player-bar {
  display: flex;                    /* 弹性布局，子元素水平排列 */
  align-items: center;             /* 垂直居中对齐 */
  gap: 12px;                       /* 子元素之间的间距 */
  padding: 8px 16px;              /* 内边距：上下8px，左右16px */
  background: rgba(255, 255, 255, 0.06);  /* 半透明白色背景 */
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);  /* 底部细边框 */
  flex-shrink: 0;                  /* 不允许缩小，保持固定高度 */
  height: 48px;                    /* 固定高度 */
  cursor: pointer;                 /* 鼠标指针为手型 */
  user-select: none;              /* 禁止选中文字 */
}

/* 左侧区域布局 */
.bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 头像样式：圆形，渐变背景 */
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;              /* 圆形 */
  background: linear-gradient(135deg, #409eff, #67c23a);  /* 渐变背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;               /* 粗体 */
  color: #fff;                     /* 白色文字 */
  flex-shrink: 0;                  /* 不允许缩小 */
}

/* 昵称文字样式 */
.nickname {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

/* 右侧区域布局 */
.bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 全屏提示文字 */
.fs-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}

/* 中间区域：自动占满剩余空间 */
.bar-center {
  flex: 1;                         /* 占据剩余空间 */
  text-align: center;
}

/* 分数显示样式（当前未使用） */
.score {
  font-size: 15px;
  color: #ffd666;                  /* 金色 */
  font-weight: 700;
}

/* 连接状态圆点：默认红色（断开） */
.conn-dot {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;              /* 圆形 */
  background: #f56c6c;            /* 红色 */
  transition: background 0.3s;    /* 颜色过渡动画，0.3秒 */
}

/* 连接状态圆点：绿色（已连接） */
.conn-dot.ok {
  background: #67c23a;            /* 绿色 */
}
</style>

<!--
  非 scoped 样式：全局生效

  【技术学习】为什么需要全局样式？
  - ElMessage 组件渲染在 <body> 下，不在当前组件 DOM 树内
  - scoped 样式无法影响组件外部的元素
  - 所以需要用全局样式来定制 ElMessage 的外观
  - 使用 customClass 选择器确保只影响特定的 ElMessage
-->
<style>
/* 自定义 ElMessage 样式 */
.avatar-click-msg {
  background: rgba(0, 0, 0, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 10px !important;
  padding: 10px 20px !important;
  min-width: auto !important;
}

/* ElMessage 内容文字样式 */
.avatar-click-msg .el-message__content {
  color: #fff !important;
  font-size: 14px !important;
}
</style>
