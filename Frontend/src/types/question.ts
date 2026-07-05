/**
 * question.ts —— 题目相关的类型定义
 *
 * 【技术学习】
 * 这个文件定义了前端使用的"题目"数据结构，与后端实体一一对应。
 * 同时利用 TypeScript 工具类型（Omit、Partial）派生出
 * 创建（Create）和更新（Update）时需要的类型，避免重复定义。
 *
 * 与后端的对应关系：
 *   后端实体 (Question Entity)  <——>  前端接口 (Question)
 *   后端创建 DTO                <——>  CreateQuestion
 *   后端更新 DTO                <——>  UpdateQuestion
 */

/**
 * 题目完整数据结构（对应后端返回的完整题目对象）
 *
 * 【技术学习】
 * 这里的字段类型用到了 TypeScript 的"字面量类型联合"：
 * - type 字段只能是 'single' | 'multiple' | 'subjective' 三个字符串之一
 * - category 字段只能是 'required' | 'quick-answer' | 'risk' 三个字符串之一
 * 这比用 string 更精确，写错值时 TypeScript 会立即报错。
 */
export interface Question {
  /** 题目唯一标识（由后端生成） */
  id: string

  /**
   * 题目类型
   * - 'single'     : 单选题
   * - 'multiple'   : 多选题
   * - 'subjective' : 主观题
   */
  type: 'single' | 'multiple' | 'subjective'

  /**
   * 题目分类（对应比赛中的不同阶段/模块）
   * - 'required'      : 必答题
   * - 'quick-answer'  : 抢答题
   * - 'risk'          : 风险题
   */
  category: 'required' | 'quick-answer' | 'risk'

  /** 题干（题目的正文描述） */
  stem: string

  /** 选项列表（主观题时可为空数组） */
  options: string[]

  /** 正确答案列表（单选题只有一个元素，多选题有多个） */
  answers: string[]

  /** 该题的分值 */
  score: number
}

/**
 * 创建题目时使用的类型
 *
 * 【技术学习】Omit<T, K> 是 TypeScript 内置工具类型，
 * 表示"从类型 T 中去掉 K 字段"。
 * 这里从 Question 中去掉了 id，因为新建题目时 id 由后端自动生成，
 * 前端不需要（也不应该）手动指定。
 *
 * 等价于手动写：
 *   interface CreateQuestion {
 *     type: ...
 *     category: ...
 *     stem: string
 *     options: string[]
 *     answers: string[]
 *     score: number
 *   }
 */
export type CreateQuestion = Omit<Question, 'id'>

/**
 * 更新题目时使用的类型（所有字段都是可选的）
 *
 * 【技术学习】Partial<T> 是 TypeScript 内置工具类型，
 * 将 T 中所有字段变为可选（加 ? 修饰符）。
 * 更新时只需传要修改的字段，不必传全部字段。
 *
 * 例如只需要改分值：
 *   updateQuestion('abc123', { score: 20 })
 */
export type UpdateQuestion = Partial<CreateQuestion>
