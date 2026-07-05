/**
 * 题目数据访问对象 (DAO - Data Access Object)
 *
 * 【技术学习】DAO 模式是一种常用的设计模式：
 * - 将数据访问逻辑与业务逻辑分离
 * - 提供统一的接口来操作数据（增删改查 CRUD）
 * - 底层数据库变化时，只需修改 DAO，不影响上层代码
 *
 * CRUD 操作说明：
 * - Create: 创建新数据（createQuestion）
 * - Read:   读取数据（getQuestion, getAllQuestions）
 * - Update: 更新数据（updateQuestion）
 * - Delete: 删除数据（deleteQuestion, deleteAllQuestions）
 *
 * 本模块管理题目的所有数据库操作
 */

import { customAlphabet } from 'nanoid';
import type { Question, CreateQuestion, UpdateQuestion } from '../types/question.js';
import { db } from './db.js';

/**
 * 创建自定义 ID 生成器
 *
 * 【技术学习】nanoid 是一个轻量级的唯一 ID 生成库：
 * - 比传统的 uuid 更短、更快
 * - customAlphabet() 允许自定义字符集和长度
 *
 * 参数说明：
 * - 第一个参数：使用的字符集（这里只用大小写字母，共 52 个字符）
 * - 第二个参数：生成的 ID 长度（这里为 10 位）
 *
 * 生成的 ID 示例：'aBcDeFgHiJ'、'xYzAbCdEfG'
 * 这种纯字母 ID 在 URL 中更友好，且避免了数字和特殊字符的混淆
 */
const generateId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10,
);

/**
 * 新增题目
 *
 * 【技术学习】函数签名说明：
 * - async: 表示这是异步函数，内部可以使用 await
 * - data: CreateQuestion: 使用 TypeScript 类型约束参数，确保传入正确的数据结构
 * - Promise<Question>: 返回值是 Promise，resolve 时包含完整的题目对象
 *
 * 操作步骤：
 * 1. 生成唯一 ID，与传入的数据合并（展开运算符 ...data）
 * 2. 将新题目添加到内存中的数组
 * 3. 调用 db.write() 将数据持久化到 JSON 文件
 * 4. 返回创建的题目（包含生成的 ID）
 */
export async function createQuestion(
  data: CreateQuestion,
): Promise<Question> {
  const question: Question = { id: generateId(), ...data };
  // push() 将元素添加到数组末尾
  db.data.questions.push(question);
  // 必须调用 write() 才能将内存中的修改保存到文件
  await db.write();
  return question;
}

/**
 * 按 ID 获取单个题目
 *
 * 【技术学习】Array.find() 方法：
 * - 遍历数组，返回第一个满足条件的元素
 * - 如果没有找到，返回 undefined
 * - 这里使用箭头函数 (q) => q.id === id 作为查找条件
 * - 不会修改原数组（只读操作）
 */
export async function getQuestion(
  id: string,
): Promise<Question | undefined> {
  return db.data.questions.find((q) => q.id === id);
}

/**
 * 获取全部题目
 *
 * 【技术学习】这里直接返回数组的引用
 * - 由于返回的是引用，外部代码对返回值的修改会影响数据库
 * - 在简单应用中这是可接受的
 * - 更安全的做法是返回数组的副本：return [...db.data.questions]
 */
export async function getAllQuestions(): Promise<Question[]> {
  return db.data.questions;
}

/**
 * 修改题目
 *
 * 【技术学习】更新操作的实现模式：
 * 1. 使用 findIndex() 查找元素在数组中的位置
 *    - 找到返回索引（0, 1, 2...）
 *    - 未找到返回 -1
 * 2. 使用展开运算符合并旧数据和新数据
 *    - { ...old, ...new } 新数据会覆盖旧数据中的同名字段
 *    - 例如：旧数据 {id: "1", title: "旧标题", score: 10}
 *    - 新数据 {title: "新标题"}
 *    - 合并后 {id: "1", title: "新标题", score: 10}
 * 3. 直接通过索引替换数组中的元素
 *
 * 返回值：成功返回更新后的题目，未找到返回 null
 */
export async function updateQuestion(
  id: string,
  data: UpdateQuestion,
): Promise<Question | null> {
  const index = db.data.questions.findIndex((q) => q.id === id);
  if (index === -1) return null;
  // 合并原有数据和新数据，新数据覆盖旧数据的同名字段
  db.data.questions[index] = { ...db.data.questions[index], ...data };
  await db.write();
  return db.data.questions[index];
}

/**
 * 删除单个题目
 *
 * 【技术学习】Array.splice() 方法：
 * - 参数1：要删除元素的起始索引
 * - 参数2：要删除的元素数量
 * - splice(index, 1) 表示从 index 位置删除 1 个元素
 * - 与 delete 运算符不同，splice 会改变数组长度
 *
 * 返回 boolean 表示操作是否成功：
 * - true: 成功删除
 * - false: 未找到对应题目
 */
export async function deleteQuestion(id: string): Promise<boolean> {
  const index = db.data.questions.findIndex((q) => q.id === id);
  if (index === -1) return false;
  db.data.questions.splice(index, 1);
  await db.write();
  return true;
}

/**
 * 删除全部题目
 *
 * 【技术学习】清空数组的两种方式：
 * 1. db.data.questions = [];      （重新赋值空数组，这里使用的方式）
 * 2. db.data.questions.length = 0; （修改数组长度属性）
 *
 * 注意：不能使用 db.data.questions = [] 直接赋值以外的方式
 * 因为 LowDB 需要通过 db.data 引用来追踪数据变化
 */
export async function deleteAllQuestions(): Promise<void> {
  db.data.questions = [];
  await db.write();
}
