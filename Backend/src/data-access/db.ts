/**
 * 数据库初始化模块
 *
 * 【技术学习】本文件使用 LowDB 作为数据库解决方案：
 * - LowDB 是一个轻量级的 JSON 文件数据库，适合小型项目和原型开发
 * - 它将数据存储为 JSON 文件，无需安装传统数据库（如 MySQL、MongoDB）
 * - 数据库文件位置：Backend/data/db.json
 *
 * 本模块负责：
 * 1. 定义数据库的 Schema（数据结构）
 * 2. 确保数据目录和文件存在
 * 3. 创建并导出 db 实例供其他模块使用
 */

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Question } from '../types/question.js';
import type { User } from '../types/user.js';

/**
 * Schema 接口定义了数据库的整体结构
 *
 * 【技术学习】TypeScript 的接口(interface)用于定义数据的"形状"
 * 这里定义了数据库包含两个集合：
 * - questions: 存储所有题目的数组
 * - users: 存储所有用户的数组
 *
 * 对应的 JSON 文件结构示例：
 * {
 *   "questions": [ { id: "abc", title: "...", ... }, ... ],
 *   "users": [ { id: "xyz", username: "...", ... }, ... ]
 * }
 */
export interface Schema {
  questions: Question[];
  users: User[];
}

/**
 * 计算数据库文件的绝对路径
 *
 * 【技术学习】
 * - import.meta.dirname: ES Module 中获取当前文件所在目录的方式
 *   在 CommonJS 中通常用 __dirname，但在 ES Module 中不可用，需要使用 import.meta.dirname
 * - resolve(): 将相对路径解析为绝对路径
 *   这里将 '../data/db.json' 解析为完整的文件系统路径
 */
const DB_PATH = resolve(import.meta.dirname, '../data/db.json');

/**
 * 确保数据目录存在
 *
 * 【技术学习】
 * - dirname(): 从完整路径中提取目录部分
 *   例如 '/project/data/db.json' -> '/project/data'
 * - existsSync(): 同步检查文件/目录是否存在
 * - mkdirSync(): 同步创建目录，recursive: true 表示递归创建多层目录
 */
const DB_DIR = dirname(DB_PATH);
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

/**
 * 确保数据库文件存在，不存在则创建并初始化
 *
 * 【技术学习】这是"防御性编程"的体现：
 * - 程序启动时检查必要文件是否存在
 * - 如果不存在，自动创建并写入初始数据
 * - 避免运行时因文件缺失而报错
 */
if (!existsSync(DB_PATH)) {
  console.log('初始化数据库');
  // 创建空的数据库结构，questions 和 users 都是空数组
  writeFileSync(DB_PATH, JSON.stringify({ questions: [], users: [] }), 'utf-8');
}

/**
 * 创建数据库适配器和 LowDB 实例
 *
 * 【技术学习】
 * - JSONFile: LowDB 的文件适配器，负责将数据读写到 JSON 文件
 *   它封装了文件读写操作，让我们无需手动处理 fs 模块
 * - Low: LowDB 的核心类，提供 read() 和 write() 方法
 *   第二个参数 { questions: [], users: [] } 是默认值，
 *   当数据库文件为空时使用此默认结构
 */
const adapter = new JSONFile<Schema>(DB_PATH);
export const db = new Low<Schema>(adapter, { questions: [], users: [] });

/**
 * 异步初始化数据库
 *
 * 【技术学习】为什么需要异步初始化？
 * - LowDB 的 read() 方法是异步的（返回 Promise）
 * - 它需要从文件系统读取 JSON 文件并解析
 * - 应用启动时必须先调用此函数，确保数据加载到内存中
 * - 之后对 db.data 的操作才能正常进行
 *
 * 调用方式（通常在服务器启动时）：
 * await initDb();
 * // 现在可以安全地使用 db.data.questions 和 db.data.users
 */
export async function initDb(): Promise<void> {
  await db.read();
}
