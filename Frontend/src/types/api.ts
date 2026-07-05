/**
 * api.ts —— 后端统一响应体的类型定义
 *
 * 【技术学习】
 * 后端 API 返回的数据通常遵循统一的格式，前端用 TypeScript 的"泛型接口"来描述它，
 * 这样在任何接口调用中都能获得类型提示和类型检查。
 *
 * 设计思路：
 *   后端返回的 JSON 大致长这样：
 *   {
 *     code: 200,            // 业务状态码（非 HTTP 状态码）
 *     message: "success",   // 给人看的提示信息
 *     data: { ... }         // 真正的业务数据，类型不固定
 *   }
 *
 *   data 的类型会随接口不同而变化——有的是 User，有的是 Question[]，
 *   所以我们用泛型 <T> 来表示"这个字段的类型由调用方决定"。
 */

/**
 * 后端统一响应格式（泛型接口）
 *
 * @typeParam T - data 字段的实际类型，由使用者在调用时指定
 *
 * 【技术学习】泛型（Generics）的好处：
 * 1. 复用性：一个接口定义就能适配所有 API 响应，不需要每种 data 类型都写一个接口。
 * 2. 类型安全：当 T = User 时，TypeScript 会自动推断 res.data 的类型是 User，
 *    访问不存在的属性会报错，避免运行时 bug。
 * 3. 可读性：阅读代码时，一眼就能看出这个 API 返回的 data 是什么类型。
 *
 * 用法示例：
 *   // 响应体中 data 是单个用户
 *   ResBody<User>
 *
 *   // 响应体中 data 是题目数组
 *   ResBody<Question[]>
 *
 *   // 响应体中 data 为空（如删除操作）
 *   ResBody<null>
 */
export interface ResBody<T> {
  /** 业务状态码，如 200 表示成功，400 表示参数错误等 */
  code: number

  /** 提示信息，通常用于展示给用户看的成功/失败描述 */
  message: string

  /** 业务数据，类型由泛型 T 决定 */
  data: T
}
