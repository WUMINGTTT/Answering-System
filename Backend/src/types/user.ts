import type { ScoreDetail } from './score.js';

export type UserRole = 'player' | 'admin';

export interface User {
  id: string;
  nickname: string;
  username: string;
  password: string;
  totalScore: number;
  scoreDetails: ScoreDetail[];
  role: UserRole;
}

/** 管理员创建用户时可指定角色 */
export type CreateUser = Pick<User, 'nickname' | 'username' | 'password' | 'role'>;

/** 可修改字段: 昵称、用户名、密码、角色。不支持修改 id、总分、得分详情 */
export type UpdateUser = Partial<CreateUser>;

/** 用户自主注册, 仅需昵称、用户名、密码, 角色默认为选手 */
export type RegisterUser = Pick<User, 'nickname' | 'username' | 'password'>;

/** 登录请求 */
export type LoginUser = Pick<User, 'username' | 'password'>;
