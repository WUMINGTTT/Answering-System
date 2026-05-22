/** 后端统一响应格式 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
