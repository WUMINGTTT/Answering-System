/**
 * 用户数据访问对象 (DAO - Data Access Object)
 *
 * 【技术学习】用户数据的特殊性：
 * - 用户对象包含嵌套数据结构（scoreDetails 数组）
 * - 创建用户时需要初始化默认值（totalScore: 0, scoreDetails: []）
 * - 这确保了数据结构的一致性，避免后续操作出现 undefined 错误
 *
 * 本模块管理用户的所有数据库操作，包括：
 * - 创建用户（带默认值初始化）
 * - 按 ID 或用户名查询用户
 * - 获取所有用户
 * - 更新和删除用户
 */

import { customAlphabet } from 'nanoid';
import type { User, CreateUser, UpdateUser } from '../types/user.js';
import { db } from './db.js';

/**
 * 创建自定义 ID 生成器
 *
 * 【技术学习】为什么多个 DAO 文件都定义了相同的 generateId？
 * - 每个模块应该独立，不依赖其他 DAO 的内部实现
 * - 如果共享一个 generateId，需要额外的模块来存放
 * - 在小型项目中，重复定义是可接受的权衡
 * - 大型项目可以考虑提取到公共工具模块
 */
const generateId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10,
);

/**
 * 新增用户
 *
 * 【技术学习】初始化默认值的重要性：
 * - totalScore: 0      -> 用户初始总分为 0
 * - scoreDetails: []   -> 用户初始没有得分记录
 *
 * 如果不初始化这些字段：
 * - 后续计算总分时会遇到 undefined + 10 = NaN 的问题
 * - 遍历 scoreDetails 时会报 undefined is not iterable 的错误
 *
 * 展开运算符 ...data 的作用：
 * - 将 CreateUser 类型的数据（username 等）展开到新对象中
 * - 后面的 totalScore 和 scoreDetails 会自动添加到对象中
 */
export async function createUser(data: CreateUser): Promise<User> {
  const user: User = {
    id: generateId(),
    ...data,
    totalScore: 0,      // 初始化总分为 0
    scoreDetails: [],   // 初始化得分记录为空数组
  };
  db.data.users.push(user);
  await db.write();
  return user;
}

/**
 * 按 ID 获取用户
 *
 * 【技术学习】返回类型 User | undefined 的含义：
 * - User: 找到用户时返回用户对象
 * - undefined: 未找到时返回 undefined
 * - 调用方需要检查返回值是否为 undefined
 *
 * 使用示例：
 * const user = await getUser("abc123");
 * if (user) {
 *   console.log(user.username);
 * } else {
 *   console.log("用户不存在");
 * }
 */
export async function getUser(id: string): Promise<User | undefined> {
  return db.data.users.find((u) => u.id === id);
}

/**
 * 获取全部用户
 *
 * 【技术学习】返回所有用户的数组
 * - 适用于需要展示用户列表的场景
 * - 注意：如果用户量很大，应该考虑分页查询
 * - 当前实现返回所有数据，适合小型应用
 */
export async function getAllUsers(): Promise<User[]> {
  return db.data.users;
}

/**
 * 按用户名获取用户
 *
 * 【技术学习】按非 ID 字段查找的模式：
 * - find() 方法可以按任意字段查找
 * - 这里按 username 查找，常用于登录验证
 * - username 应该是唯一的，但代码未强制约束
 * - 如果存在重复用户名，find() 只返回第一个匹配项
 *
 * 使用场景：
 * - 用户登录时验证用户名是否存在
 * - 注册时检查用户名是否已被占用
 */
export async function getUserByUsername(username: string): Promise<User | undefined> {
  return db.data.users.find((u) => u.username === username);
}

/**
 * 删除用户
 *
 * 【技术学习】删除操作的标准模式：
 * 1. findIndex() 查找元素位置
 * 2. 检查是否找到（index === -1 表示未找到）
 * 3. splice() 删除元素
 * 4. write() 持久化到文件
 * 5. 返回 boolean 表示操作结果
 *
 * 注意：这里只删除用户本身，不删除关联的得分记录
 * 因为得分记录是嵌套在用户对象内部的
 */
export async function deleteUser(id: string): Promise<boolean> {
  const index = db.data.users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  db.data.users.splice(index, 1);
  await db.write();
  return true;
}

/**
 * 删除全部用户
 *
 * 【技术学习】批量操作的注意事项：
 * - 此操作会清空所有用户数据，包括用户的得分记录
 * - 在生产环境中应该添加权限验证
 * - 可以考虑添加软删除（标记删除）而非物理删除
 */
export async function deleteAllUsers(): Promise<void> {
  db.data.users = [];
  await db.write();
}

/**
 * 修改用户信息
 *
 * 【技术学习】更新操作的展开运算符技巧：
 * - { ...db.data.users[index], ...data }
 * - 先展开原有用户数据，再展开新数据
 * - 新数据中的字段会覆盖旧数据的同名字段
 * - 未在 data 中出现的字段保持不变
 *
 * 示例：
 * 原有用户: { id: "1", username: "旧名", totalScore: 100, scoreDetails: [...] }
 * 更新数据: { username: "新名" }
 * 更新结果: { id: "1", username: "新名", totalScore: 100, scoreDetails: [...] }
 *
 * 注意：totalScore 和 scoreDetails 不应通过此方法直接修改
 * 这些字段应该通过 scoreDao 来管理，以确保数据一致性
 */
export async function updateUser(
  id: string,
  data: UpdateUser,
): Promise<User | null> {
  const index = db.data.users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  db.data.users[index] = { ...db.data.users[index], ...data };
  await db.write();
  return db.data.users[index];
}
