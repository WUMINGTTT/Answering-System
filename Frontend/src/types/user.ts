export type UserRole = 'player' | 'admin'

export interface User {
  id: string
  nickname: string
  username: string
  password: string
  totalScore: number
  scoreDetails: unknown[]
  role: UserRole
}

export interface CreateUser {
  nickname: string
  username: string
  password: string
  role: UserRole
}

export interface RegisterUser {
  nickname: string
  username: string
  password: string
}

export interface LoginUser {
  username: string
  password: string
}

export type UpdateUser = Partial<CreateUser>
