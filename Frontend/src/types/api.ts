/** 后端统一响应格式 */
export interface ResBody<T> {
  code: number
  message: string
  data: T
}
