/**
 * 【文件说明】用户类型定义
 *
 * 本文件定义了答题系统中用户相关的所有 TypeScript 类型
 * 包括：用户角色、用户接口、创建/更新/注册/登录等场景的类型
 *
 * 【技术学习】为什么不同场景需要不同的类型？
 * 在实际应用中，同一个数据实体在不同场景下需要不同的字段：
 * 1. 创建用户时：需要提供昵称、用户名、密码、角色
 * 2. 用户登录时：只需要用户名和密码
 * 3. 用户注册时：只需要昵称、用户名、密码（角色默认为选手）
 * 4. 修改用户时：所有字段都是可选的（只传需要修改的字段）
 *
 * 通过 TypeScript 的工具类型（Pick、Partial、Omit 等）可以：
 * - 复用基础类型定义，避免重复
 * - 确保类型一致性
 * - 提供精确的类型提示
 */

import type { ScoreDetail } from './score.js';

/**
 * 【技术学习】用户角色设计
 *
 * 系统采用基于角色的访问控制（RBAC）：
 * - player（选手）：可以答题、查看自己的成绩
 * - admin（管理员）：可以管理题目、查看所有成绩、管理用户
 *
 * 使用联合类型定义角色，确保类型安全
 */
export type UserRole = 'player' | 'admin';

/**
 * 用户接口：定义用户的完整数据结构
 *
 * 包含用户的基本信息、成绩信息和角色信息
 */
export interface User {
  /** 用户唯一标识符，使用 nanoid 生成 */
  id: string;

  /** 用户昵称：显示名称，可以包含中文 */
  nickname: string;

  /** 用户名：登录账号，建议使用英文和数字 */
  username: string;

  /** 密码：存储加密后的密码哈希值，不存储明文 */
  password: string;

  /**
   * 总分：用户的所有得分累加
   * 由 scoreDetails 自动计算得出
   */
  totalScore: number;

  /**
   * 得分详情列表：记录每次得分的详细信息
   * 包括得分原因、分值、时间等
   */
  scoreDetails: ScoreDetail[];

  /** 用户角色：player（选手）或 admin（管理员） */
  role: UserRole;
}

/**
 * 【技术学习】Pick 工具类型
 * Pick<T, K> 从类型 T 中选取指定的属性 K，生成新类型
 *
 * 语法：Pick<Type, Keys>
 * - Type：源类型
 * - Keys：要选取的属性名（可以是单个或联合类型）
 *
 * 示例：
 * interface User { id: string; name: string; age: number; }
 * type UserName = Pick<User, 'name'>;
 * // 结果：{ name: string; }
 *
 * 管理员创建用户时可指定角色
 * 选取 User 中的 nickname、username、password、role 属性
 */
export type CreateUser = Pick<User, 'nickname' | 'username' | 'password' | 'role'>;

/**
 * 【技术学习】Partial 与 Pick 结合使用
 *
 * 先用 Pick 选取需要的属性，再用 Partial 将所有属性变为可选
 * 这种组合在更新操作中非常常用
 *
 * 可修改字段：昵称、用户名、密码、角色
 * 不支持修改：id（唯一标识）、总分（自动计算）、得分详情（独立管理）
 */
export type UpdateUser = Partial<CreateUser>;

/**
 * 用户自主注册类型
 * 仅需昵称、用户名、密码
 * 角色默认为选手（player），无需手动指定
 *
 * 【技术学习】为什么注册时不包含角色字段？
 * 1. 安全性：防止普通用户自行注册为管理员
 * 2. 简化流程：减少用户注册时需要填写的信息
 * 3. 默认值：系统自动分配默认角色
 */
export type RegisterUser = Pick<User, 'nickname' | 'username' | 'password'>;

/**
 * 登录请求类型
 * 仅需用户名和密码
 *
 * 【技术学习】为什么登录类型单独定义？
 * 1. 最小化原则：只传递必要的信息
 * 2. 安全性：避免在请求中携带不必要的敏感信息
 * 3. 接口清晰：明确登录接口需要的参数
 */
export type LoginUser = Pick<User, 'username' | 'password'>;
