import { customAlphabet } from 'nanoid';
import type { User, CreateUser, UpdateUser } from '../types/user.js';
import { db } from './db.js';

const generateId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10,
);

/** 新增用户，返回带 id 的完整用户，总分和得分详情初始化为 0/空 */
export async function createUser(data: CreateUser): Promise<User> {
  const user: User = {
    id: generateId(),
    ...data,
    totalScore: 0,
    scoreDetails: [],
  };
  db.data.users.push(user);
  await db.write();
  return user;
}

/** 按 id 获取用户, 未找到返回 undefined */
export async function getUser(id: string): Promise<User | undefined> {
  return db.data.users.find((u) => u.id === id);
}

/** 获取全部用户 */
export async function getAllUsers(): Promise<User[]> {
  return db.data.users;
}

/** 按用户名获取用户, 未找到返回 undefined */
export async function getUserByUsername(username: string): Promise<User | undefined> {
  return db.data.users.find((u) => u.username === username);
}

/** 删除用户, 返回是否删除成功 */
export async function deleteUser(id: string): Promise<boolean> {
  const index = db.data.users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  db.data.users.splice(index, 1);
  await db.write();
  return true;
}

/** 删除全部用户 */
export async function deleteAllUsers(): Promise<void> {
  db.data.users = [];
  await db.write();
}

/** 修改用户信息, 返回修改后的用户, 未找到返回 null */
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
