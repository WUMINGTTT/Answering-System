<!--
  ============================================================================
  AnnouncementPanel.vue - 公告栏组件
  ============================================================================

  【组件功能】
  固定在选手页面底部的公告滚动栏，用于显示比赛相关的通知和提示信息。

  【设计思路】
  1. 采用水平滚动设计，类似新闻跑马灯效果
  2. 固定在页面底部，不随主内容滚动
  3. 使用 CSS mask-image 实现边缘渐隐效果，视觉更优雅
  4. 当前使用占位数据，实际项目中可替换为从服务器获取的公告

  【技术学习】
  - mask-image：CSS 遮罩属性，实现元素边缘渐隐效果
  - white-space: nowrap：防止文字换行，配合 overflow 实现滚动
  - flex-shrink: 0：在 flex 布局中禁止元素缩小
  - v-for：Vue 列表渲染指令，遍历数组生成元素
-->

<script setup lang="ts">
/**
 * 导入说明：
 * - Bell：Element Plus 提供的铃铛图标组件
 *
 * 【技术学习】@element-plus/icons-vue：
 * - Element Plus 的图标库，每个图标都是一个独立的 Vue 组件
 * - 使用时通过 import 导入，然后在 template 中作为组件使用
 */
import { Bell } from '@element-plus/icons-vue'

/**
 * placeholderAnnouncements：占位公告数据
 *
 * 【技术学习】
 * - 在实际项目中，这些数据通常从后端 API 获取
 * - 当前使用硬编码数据用于开发和演示
 * - 每条公告包含 id（唯一标识）和 title（公告内容）
 *
 * 未来优化方向：
 * - 通过 Socket 实时推送新公告
 * - 支持公告优先级排序
 * - 支持富文本公告内容
 */
const placeholderAnnouncements = [
  { id: '1', title: '欢迎参加本次知识竞赛' },
  { id: '2', title: '请遵守比赛规则，诚信答题' },
  { id: '3', title: '如有疑问请举手示意工作人员' },
]
</script>

<template>
  <!--
    公告栏容器

    【技术学习】组件结构说明：
    - 外层 div.announce-strip：整体容器，固定高度，flex 布局
    - 铃铛图标：视觉提示，表示这是通知区域
    - 滚动区域：包含所有公告文字
  -->
  <div class="announce-strip">
    <!--
      铃铛图标

      【技术学习】Element Plus 图标组件使用：
      - :size="14"：设置图标大小为 14px
      - class="strip-icon"：添加自定义样式类
      - 图标组件需要包裹在 <el-icon> 标签中使用
    -->
    <el-icon :size="14" class="strip-icon"><Bell /></el-icon>

    <!--
      滚动区域：包含所有公告条目

      【技术学习】滚动实现原理：
      1. overflow: hidden：隐藏超出容器的内容
      2. white-space: nowrap：所有条目不换行，排列在一行
      3. 配合 CSS 动画可实现自动滚动效果（当前版本为静态展示）
    -->
    <div class="strip-scroll">
      <!--
        v-for 循环渲染公告条目

        【技术学习】v-for 指令详解：
        - v-for="a in placeholderAnnouncements"：遍历数组
        - :key="a.id"：为每个元素提供唯一 key，优化 diff 算法
        - a 是当前遍历到的元素（相当于 placeholderAnnouncements[i]）
        - key 是 Vue 虚拟 DOM 算法需要的标识，应该使用唯一且稳定的值
      -->
      <span
        v-for="a in placeholderAnnouncements"
        :key="a.id"
        class="strip-item"
      >{{ a.title }}</span>
    </div>
  </div>
</template>

<style scoped>
/*
 * 公告栏整体容器样式
 *
 * 【设计要点】
 * - 固定在页面底部
 * - 高度固定为 36px，不占用过多空间
 * - 半透明背景，不遮挡主内容
 */
.announce-strip {
  display: flex;                    /* 弹性布局 */
  align-items: center;             /* 垂直居中 */
  gap: 8px;                        /* 元素间距 */
  padding: 6px 14px;              /* 内边距 */
  background: rgba(255, 255, 255, 0.04);  /* 半透明背景 */
  border-top: 1px solid rgba(255, 255, 255, 0.06);  /* 顶部分隔线 */
  flex-shrink: 0;                  /* 禁止缩小，保持固定高度 */
  height: 36px;                    /* 固定高度 */
  overflow: hidden;                /* 隐藏溢出内容 */
}

/*
 * 铃铛图标样式
 *
 * 【技术学习】flex-shrink: 0 的作用：
 * - 在 flex 容器空间不足时，禁止该元素缩小
 * - 确保铃铛图标始终保持原始大小
 */
.strip-icon {
  color: rgba(255, 255, 255, 0.4);  /* 半透明白色 */
  flex-shrink: 0;                  /* 禁止缩小 */
}

/*
 * 滚动区域样式
 *
 * 【技术学习】CSS mask-image 实现边缘渐隐：
 *
 * mask-image: linear-gradient(90deg, #000 85%, transparent);
 *
 * 解释：
 * - 90deg：渐变方向从左到右
 * - #000 85%：前 85% 的区域完全不遮罩（完全显示）
 * - transparent：最后 15% 渐变到透明（内容渐隐消失）
 *
 * 效果：滚动内容在右侧边缘会逐渐淡出，视觉效果更优雅
 *
 * 注意：需要同时写 mask-image 和 -webkit-mask-image 以兼容不同浏览器
 */
.strip-scroll {
  flex: 1;                         /* 占据剩余空间 */
  display: flex;
  gap: 20px;                       /* 公告条目之间的间距 */
  overflow: hidden;                /* 隐藏超出部分 */
  mask-image: linear-gradient(90deg, #000 85%, transparent);
  -webkit-mask-image: linear-gradient(90deg, #000 85%, transparent);
}

/*
 * 单个公告条目样式
 *
 * 【技术学习】
 * - white-space: nowrap：强制文字不换行，保持在一行内显示
 * - flex-shrink: 0：防止条目在空间不足时被压缩
 */
.strip-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);  /* 半透明白色 */
  white-space: nowrap;             /* 不换行 */
  flex-shrink: 0;                  /* 禁止缩小 */
}

/*
 * 公告条目前面的圆点装饰
 *
 * 【技术学习】::before 伪元素：
 * - 在元素内容前面插入生成的内容
 * - content 属性定义插入的内容
 * - 可以用来添加装饰性的图标或分隔符
 *
 * 这里用蓝色圆点作为每条公告的视觉标记
 */
.strip-item::before {
  content: '●';                    /* 插入圆点字符 */
  margin-right: 6px;              /* 与文字的间距 */
  font-size: 6px;                 /* 小圆点 */
  color: #409eff;                 /* Element Plus 主题蓝色 */
  vertical-align: middle;         /* 垂直居中对齐 */
}
</style>
