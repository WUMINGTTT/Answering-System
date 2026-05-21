import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Question } from '../types/question.js';

export interface Schema {
  questions: Question[];
}

const DB_PATH = resolve(import.meta.dirname, '../data/db.json');

const DB_DIR = dirname(DB_PATH);
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

if (!existsSync(DB_PATH)) {
  console.log('初始化数据库');
  writeFileSync(DB_PATH, JSON.stringify({ questions: [] }), 'utf-8');
}

const adapter = new JSONFile<Schema>(DB_PATH);
export const db = new Low<Schema>(adapter, { questions: [] });

export async function initDb(): Promise<void> {
  await db.read();
}
