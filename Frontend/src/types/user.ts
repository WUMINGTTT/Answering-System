/**
 * user.ts —— 用户相关的类型定义
 *
 * 【技术学习】
 * 同一个"用户"概念，在不同场景下需要的字段不同：
 * - 注册时：只需要昵称、用户名、密码（角色由后端默认分配）
 * - 登录时：只需要用户名和密码
 * - 管理员创建用户时：需要指定角色
 * - 更新用户时：以上字段都是可选的（只改想改的）
 * - 完整用户对象：包含 id、总分、得分明细等后端附加的字段
 *
 * 为每个场景定义独立的接口，可以：
 * 1. 避免传多余字段（注册时不需要传 id）
 * 2. 利用 TypeScript 做编译期校验（漏传字段会报错）
 */

import type { ScoreDetail } from './score'

/**
 * 用户角色类型
 *
 * - 'player' : 普通参赛选手
 * - 'admin'  : 管理员（可管理题目、用户、分数等）
 */
export type UserRole = 'player' | 'admin'

/**
 * 完整用户对象（对应后端返回的用户数据）
 *
 * 这是后端返回给前端的完整用户结构，
 * 包含 id、累计总分和每条得分明细。
 */
export interface User {
  /** 用户唯一标识（由后端生成） */
  id: string

  /** 昵称（显示名称） */
  nickname: string

  /** 登录用户名 */
  username: string

  /** 登录密码 */
  password: string

  /** 累计总分（由后端根据 scoreDetails 计算） */
  totalScore: number

  /** 得分明细列表（记录每笔加分的原因和时间） */
  scoreDetails: ScoreDetail[]

  /** 用户角色 */
  role: UserRole
}

/**
 * 管理员创建用户时使用的类型
 *
 * 【技术学习】管理员可以在后台手动添加用户，
 * 因此需要同时指定 role（角色），
 * 而普通注册流程中角色由后端默认设置为 'player'。
 */
export interface CreateUser {
  nickname: string
  username: string
  password: string
  role: UserRole
}

/**
 * 用户注册时使用的类型
 *
 * 【技术学习】与 CreateUser 相比少了 role 字段，
 * 因为注册接口由参赛选手自行操作，角色固定为 'player'，
 * 不应让用户自己选择角色（安全考虑）。
 */
export interface RegisterUser {
  nickname: string
  username: string
  password: string
}

/**
 * 用户登录时使用的类型
 *
 * 只需要用户名和密码，是最精简的字段集。
 */
export interface LoginUser {
  username: string
  password: string
}

/**
 * 更新用户时使用的类型
 *
 * 【技术学习】使用 Partial<CreateUser> 将所有字段变为可选，
 * 这样更新操作可以只传需要修改的字段。
 * 例如只修改昵称：updateUser('abc', { nickname: '新名字' })
 */
export type UpdateUser = Partial<CreateUser>
