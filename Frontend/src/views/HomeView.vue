/**
 * 【技术学习】首页组件 HomeView.vue
 *
 * 这是应用的首页，主要功能：
 * 1. 显示应用标题和描述
 * 2. 提供导航卡片，让用户快速跳转到不同页面
 * 3. 注册 Socket.IO 会话，用于在线状态追踪
 *
 * 设计特点：
 * - 使用 CSS Grid 实现卡片网格布局
 * - 卡片有悬停动画效果
 * - 支持响应式设计，在手机上自动切换为单列布局
 */

<!-- ==================== 脚本部分 ==================== -->
<script setup lang="ts">

// -------------------- 导入依赖 --------------------

// 导入 Vue Router 的 useRouter 钩子
// 【技术学习】useRouter 返回路由器实例，可以用它的方法进行页面跳转
import { useRouter } from 'vue-router'

// 导入 Element Plus 的图标组件
// 【技术学习】@element-plus/icons-vue 提供了丰富的图标库
import { User, Setting, Monitor, Key } from '@element-plus/icons-vue'

// 导入自定义的 Socket.IO 组合式函数
// 【技术学习】useSocket 是项目封装的 Socket.IO 连接管理函数
import { useSocket } from '@/composables/useSocket'

// -------------------- 初始化 --------------------

// 获取路由器实例
// 【技术学习】router 实例提供了 push()、replace()、go() 等导航方法
const router = useRouter()

// 注册 Socket.IO 会话
// 【技术学习】这个调用会建立与服务器的 WebSocket 连接
// 参数说明：
// - syncRemote: false - 不同步远程状态（首页不需要实时数据）
// - pageType: 'home' - 告诉服务器当前页面类型，用于在线用户统计
useSocket({ syncRemote: false, pageType: 'home' })

// -------------------- 类型定义 --------------------

/**
 * 【技术学习】定义导航卡片的数据接口
 *
 * interface 用于定义对象的结构，TypeScript 会检查数据是否符合这个结构
 * - title: 卡片标题
 * - description: 卡片描述文字
 * - icon: 图标组件（使用 typeof 获取组件类型）
 * - url: 点击后跳转的地址
 * - color: 卡片图标的背景颜色
 */
interface NavCard {
  title: string
  description: string
  icon: typeof User  // 图标组件的类型
  url: string
  color: string
}

// -------------------- 卡片数据 --------------------

/**
 * 【技术学习】定义导航卡片数组
 *
 * 每个对象代表一个导航卡片，包含：
 * - 登录页：用户注册和登录
 * - 选手页：答题和查看得分
 * - 管理页：后台管理功能
 * - 显示页：公开展示屏
 *
 * 使用 interface 定义类型的好处：
 * TypeScript 会在编写代码时检查数据结构是否正确
 */
const cards: NavCard[] = [
  {
    title: '登录页',
    description: '选手注册与登录入口',
    icon: Key,           // 钥匙图标，代表登录
    url: '/login',       // 跳转地址
    color: '#409eff',    // 蓝色主题
  },
  {
    title: '选手页',
    description: '答题与得分查看',
    icon: User,          // 用户图标
    url: '/player',
    color: '#67c23a',    // 绿色主题
  },
  {
    title: '管理页',
    description: '题目与用户管理后台',
    icon: Setting,       // 设置图标
    url: '/admin',
    color: '#e6a23c',    // 橙色主题
  },
  {
    title: '显示页',
    description: '实时得分公开展示',
    icon: Monitor,       // 显示器图标
    url: '/display',
    color: '#f56c6c',    // 红色主题
  },
]

// -------------------- 方法 --------------------

/**
 * 导航到指定页面
 * @param url - 要跳转的页面地址
 *
 * 【技术学习】router.replace() vs router.push()
 * - replace: 替换当前历史记录，用户无法点击"后退"按钮返回
 * - push: 添加新的历史记录，用户可以点击"后退"按钮返回
 *
 * 这里使用 replace 是因为首页只是入口，不需要保留历史记录
 */
function navigateTo(url: string): void {
  router.replace(url)
}
</script>

<!-- ==================== 模板部分 ==================== -->
<template>
  <!-- 首页容器 -->
  <div class="home-page">

    <!-- Hero 区域：显示应用标题和副标题 -->
    <div class="hero">
      <h1 class="hero-title">答题系统</h1>
      <p class="hero-subtitle">知识竞赛 · 在线答题 · 实时排名</p>
    </div>

    <!-- 导航卡片网格 -->
    <!--
      【技术学习】使用 v-for 循环渲染卡片
      v-for="card in cards" 遍历 cards 数组，每次循环 card 指向当前元素
      :key="card.url" 提供唯一标识，帮助 Vue 高效更新 DOM
    -->
    <div class="card-grid">
      <el-card
        v-for="card in cards"
        :key="card.url"
        class="nav-card"
        shadow="hover"                    <!-- 悬停时显示阴影 -->
        :body-style="{ padding: '0' }"    <!-- 移除卡片默认内边距 -->
        @click="navigateTo(card.url)"     <!-- 点击时触发导航 -->
      >
        <div class="card-inner">
          <!-- 图标区域 -->
          <div class="card-icon" :style="{ background: card.color }">
            <el-icon :size="36">
              <!--
                【技术学习】动态组件 <component :is="...">
                根据 card.icon 的值动态渲染对应的图标组件
                这是 Vue 的高级功能，可以实现组件的动态切换
              -->
              <component :is="card.icon" />
            </el-icon>
          </div>

          <!-- 文字内容区域 -->
          <div class="card-body">
            <h3 class="card-title">{{ card.title }}</h3>
            <p class="card-desc">{{ card.description }}</p>
          </div>

          <!-- 箭头指示器 -->
          <div class="card-arrow">
            <el-icon><component :is="card.icon" /></el-icon>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<!-- ==================== 样式部分 ==================== -->
<!--
  【技术学习】scoped 属性表示这些样式只作用于当前组件
  Vue 会在编译时给元素添加唯一的 data 属性，实现样式隔离
-->
<style scoped>
/* 首页容器 */
.home-page {
  min-height: 100vh;          /* 最小高度为视口高度 */
  display: flex;               /* 使用 Flexbox 布局 */
  flex-direction: column;      /* 垂直排列子元素 */
  align-items: center;         /* 水平居中 */
  justify-content: center;     /* 垂直居中 */
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);  /* 渐变背景 */
  padding: 40px 20px;         /* 内边距 */
  box-sizing: border-box;      /* 让 padding 包含在宽度内 */
}

/* Hero 区域 */
.hero {
  text-align: center;          /* 文字居中 */
  margin-bottom: 48px;        /* 与下方卡片的间距 */
}

/* 主标题 */
.hero-title {
  font-size: 40px;
  font-weight: 700;           /* 粗体 */
  color: #303133;
  margin: 0 0 12px 0;
  letter-spacing: 2px;        /* 字符间距，增加大气感 */
}

/* 副标题 */
.hero-subtitle {
  font-size: 16px;
  color: #909399;
  margin: 0;
  letter-spacing: 4px;        /* 更大的字符间距 */
}

/*
 * 【技术学习】CSS Grid 网格布局
 *
 * grid-template-columns: repeat(2, 280px)
 * - repeat(2, 280px) 表示重复 2 次，每列宽度 280px
 * - 等价于 grid-template-columns: 280px 280px
 *
 * gap: 24px 设置网格项之间的间距
 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 280px);
  gap: 24px;
  max-width: 585px;           /* 最大宽度限制 */
  width: 100%;                /* 响应式：宽度自适应 */
}

/* 导航卡片 */
.nav-card {
  cursor: pointer;            /* 鼠标指针变为手型 */
  border-radius: 12px;       /* 圆角 */
  transition: transform 0.25s ease, box-shadow 0.25s ease;  /* 过渡动画 */
  border: 1px solid #ebeef5;
}

/* 卡片悬停效果 */
.nav-card:hover {
  transform: translateY(-4px);  /* 向上移动 4px */
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);  /* 更明显的阴影 */
}

/* 卡片内部布局 */
.card-inner {
  display: flex;               /* Flexbox 水平布局 */
  align-items: center;         /* 垂直居中 */
  padding: 24px 20px;
  gap: 16px;                  /* 元素间距 */
}

/* 图标容器 */
.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 14px;       /* 圆角矩形 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;               /* 白色图标 */
  flex-shrink: 0;            /* 不允许缩小 */
}

/* 文字内容区域 */
.card-body {
  flex: 1;                   /* 占据剩余空间 */
  min-width: 0;              /* 防止文字溢出 */
}

/* 卡片标题 */
.card-title {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 卡片描述 */
.card-desc {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

/* 箭头指示器 */
.card-arrow {
  color: #c0c4cc;
  flex-shrink: 0;
  transition: transform 0.25s ease, color 0.25s ease;  /* 过渡动画 */
}

/* 悬停时箭头向右移动并变色 */
.nav-card:hover .card-arrow {
  transform: translateX(4px);
  color: #409eff;            /* 变为主题色 */
}

/*
 * 【技术学习】响应式设计 - 媒体查询
 *
 * @media (max-width: 640px) 表示当屏幕宽度 <= 640px 时应用以下样式
 * 这是移动端适配的常用方式
 *
 * 在小屏幕上：
 * - 卡片网格改为单列布局
 * - 标题字号缩小
 * - 间距减小
 */
@media (max-width: 640px) {
  .card-grid {
    grid-template-columns: 1fr;  /* 单列布局，1fr 表示占据全部宽度 */
    max-width: 320px;
  }

  .hero-title {
    font-size: 30px;
  }

  .hero {
    margin-bottom: 32px;
  }
}
</style>
