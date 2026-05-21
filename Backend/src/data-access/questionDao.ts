import { customAlphabet } from 'nanoid';
import type { Question, CreateQuestion, UpdateQuestion } from '../types/question.js';
import { db, initDb } from './db.js';

const generateId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10,
);

/** 新增题目，返回带 id 的完整题目 */
export async function createQuestion(
  data: CreateQuestion,
): Promise<Question> {
  await initDb();
  const question: Question = { id: generateId(), ...data };
  db.data.questions.push(question);
  await db.write();
  return question;
}

/** 按 id 获取题目, 未找到返回 undefined */
export async function getQuestion(
  id: string,
): Promise<Question | undefined> {
  await initDb();
  return db.data.questions.find((q) => q.id === id);
}

/** 获取全部题目 */
export async function getAllQuestions(): Promise<Question[]> {
  await initDb();
  return db.data.questions;
}

/** 修改题目, 返回修改后的题目, 未找到返回 null */
export async function updateQuestion(
  id: string,
  data: UpdateQuestion,
): Promise<Question | null> {
  await initDb();
  const index = db.data.questions.findIndex((q) => q.id === id);
  if (index === -1) return null;
  db.data.questions[index] = { ...db.data.questions[index], ...data };
  await db.write();
  return db.data.questions[index];
}

/** 删除题目, 返回是否删除成功 */
export async function deleteQuestion(id: string): Promise<boolean> {
  await initDb();
  const index = db.data.questions.findIndex((q) => q.id === id);
  if (index === -1) return false;
  db.data.questions.splice(index, 1);
  await db.write();
  return true;
}

/** 删除全部题目 */
export async function deleteAllQuestions(): Promise<void> {
  await initDb();
  db.data.questions = [];
  await db.write();
}
