/**
 * 游戏状态管理模块 (Game State)
 *
 * 【技术学习】设计思路：
 *   本模块采用"单例状态"模式——整个应用只有唯一一个 state 对象，
 *   所有客户端看到的游戏状态都来源于此。这保证了状态的一致性。
 *
 * 【技术学习】联合类型作为状态机：
 *   GameStatus 使用联合类型 'waiting' | 'required' | 'quick-answer' | 'risk' | 'ranking'
 *   来定义游戏的合法阶段。TypeScript 的联合类型天然适合表达有限状态机，
 *   编译器会帮你检查是否处理了所有可能的状态。
 *
 * 【技术学习】浅拷贝返回状态的原因：
 *   getGameState() 返回的是 { ...state }（浅拷贝），而不是直接返回 state 对象本身。
 *   这样做的目的是：防止外部代码直接修改内部状态，强制所有修改都通过 updateGameState() 进行，
 *   从而保证状态变更是可追踪、可控制的。
 *
 * 【技术学习】updatePlayerStatuses 的状态推导逻辑：
 *   根据选手的在线状态和答题记录，自动推导出每个选手的当前状态：
 *   - 已提交答案 → 'submitted'
 *   - 倒计时运行中但未提交 → 'answering'
 *   - 其他情况 → 'waiting'
 */

import type { Question } from '../types/question.js';

/**
 * 游戏阶段（联合类型，作为状态机）
 * - waiting:       等待开始
 * - required:      必答题阶段
 * - quick-answer:  抢答题阶段
 * - risk:          风险题阶段
 * - ranking:       排名展示阶段
 */
export type GameStatus = 'waiting' | 'required' | 'quick-answer' | 'risk' | 'ranking';

/** 排名条目：记录每位选手的排名、昵称和总分 */
export interface PlayerRanking {
  rank: number;
  nickname: string;
  totalScore: number;
}

/** 选手答题状态：用于实时展示每位选手的答题进度 */
export interface PlayerAnswerStatus {
  userId: string;
  nickname: string;
  status: 'waiting' | 'answering' | 'submitted';
}

/** 抢答记录：记录每次抢答事件的详细信息 */
export interface BuzzRecord {
  userId: string;
  nickname: string;
  timestamp: number;
  early: boolean; // true = 提前抢答（倒计时未结束），视为无效
}

/**
 * 核心游戏状态接口
 * 存储在服务端，通过 Socket.IO 实时同步到所有客户端（管理页、展示页、选手页）
 */
export interface GameState {
  /** 当前游戏阶段 */
  status: GameStatus;

  /** 当前正在作答的题目（null 表示暂无题目） */
  currentQuestion: Question | null;

  /** 风险题阶段：当前选中的风险题代码 */
  currentRiskCode: string | null;

  /** 是否显示正确答案（用于展示页高亮显示） */
  showAnswer: boolean;

  /** 必答题倒计时时长（秒） */
  answerDuration: number;

  /** 抢答题倒计时时长（秒） */
  quickAnswerDuration: number;

  /** 必答题倒计时结束时间戳（用于判断是否自然结束） */
  answerEndTime: number | null;

  /** 抢答题倒计时结束时间戳 */
  quickAnswerEndTime: number | null;

  /** 必答题倒计时是否正在运行 */
  isAnswerCounting: boolean;

  /** 抢答题倒计时是否正在运行 */
  isQuickAnswerCounting: boolean;

  /** 排名列表（用于排名展示阶段） */
  rankings: PlayerRanking[];

  /** 风险题阶段：管理员当前的分值筛选（0 = 全部显示） */
  riskScoreFilter: number;

  /** 风险题阶段：已被选择过的题目 ID 列表（防止重复选题） */
  usedRiskQuestionIds: string[];

  /**
   * 选手答题记录
   * 结构：题目ID → 用户ID → 选手提交的答案数组
   * 示例：{ "q1": { "user1": ["A", "C"] } }
   */
  pendingAnswers: Record<string, Record<string, string[]>>;

  /**
   * 答题结果（评分完成后写入）
   * 结构：题目ID → 用户ID → { 正确与否, 得分, 是否已提交, 是否超时 }
   */
  answerResults: Record<string, Record<string, { correct: boolean; score: number; submitted: boolean; timeout: boolean }>>;

  /** 服务端当前时间戳（客户端用它来校准本地时钟，减少倒计时误差） */
  serverTime: number;

  /** 当前题目下的选手答题状态列表（必答题阶段用于实时展示进度） */
  playerStatuses: PlayerAnswerStatus[];

  /** 抢答记录：题目ID → 该题目的所有抢答事件列表 */
  buzzRecords: Record<string, BuzzRecord[]>;

  /** 当前题目抢答获胜者（第一个有效抢答的选手），null 表示尚无获胜者 */
  buzzWinner: { userId: string; nickname: string; timestamp: number } | null;

  /** 抢答是否已开放（抢答倒计时自然结束后变为 true，选手此时抢答才有效） */
  buzzOpen: boolean;
}

/**
 * 创建默认游戏状态（用于初始化和重置）
 * 【技术学习】将默认值集中在一个函数中，避免重复代码，便于维护
 */
function createDefaultState(): GameState {
  return {
    status: 'waiting',
    currentQuestion: null,
    currentRiskCode: null,
    showAnswer: false,
    answerDuration: 30,        // 默认 30 秒答题时间
    quickAnswerDuration: 10,   // 默认 10 秒抢答倒计时
    answerEndTime: null,
    quickAnswerEndTime: null,
    isAnswerCounting: false,
    isQuickAnswerCounting: false,
    rankings: [],
    riskScoreFilter: 0,
    usedRiskQuestionIds: [],
    pendingAnswers: {},
    answerResults: {},
    serverTime: Date.now(),
    playerStatuses: [],
    buzzRecords: {},
    buzzWinner: null,
    buzzOpen: false,
  };
}

// 模块内部的状态单例（外部无法直接访问，只能通过导出的函数操作）
let state: GameState = createDefaultState();

/**
 * 获取当前游戏状态（只读副本）
 *
 * 【技术学习】为什么要返回副本而非直接返回 state？
 *   1. 外部拿到的是一个新对象，对它的修改不会影响内部状态
 *   2. 强制所有状态变更都走 updateGameState()，保证变更可追踪
 *   3. 这里用的是"浅拷贝"（{ ...state }），对于基础类型字段没问题；
 *      对于嵌套对象（如 currentQuestion）也做了浅拷贝，防止意外修改
 */
export function getGameState(): GameState {
  return {
    ...state,
    // currentQuestion 是嵌套对象，需要额外做一层浅拷贝
    currentQuestion: state.currentQuestion ? { ...state.currentQuestion } : null,
    // 每次获取状态时刷新服务端时间戳，供客户端校准时钟
    serverTime: Date.now(),
  };
}

/**
 * 更新游戏状态（部分合并）
 * @param patch - 需要更新的字段（只需传入要修改的字段，其余保持不变）
 *
 * 【技术学习】Partial<GameState> 是 TypeScript 的工具类型，
 * 表示 GameState 的所有字段都是可选的，这样可以只传入需要更新的部分。
 */
export function updateGameState(patch: Partial<GameState>): GameState {
  state = { ...state, ...patch }; // 浅合并：用 patch 中的字段覆盖 state 中的对应字段
  return getGameState();
}

/**
 * 重置为默认状态（管理员重新开始游戏时调用）
 */
export function resetGameState(): GameState {
  state = createDefaultState();
  return getGameState();
}

/**
 * 更新选手答题状态（由 socket 层在广播前调用）
 *
 * 【技术学习】状态推导逻辑：
 *   本函数不是让选手主动报告自己的状态，而是由服务端根据已知信息自动推导：
 *
 *   对于每个在线选手，判断逻辑如下：
 *   1. 如果该选手在当前题目的 pendingAnswers 中有记录 → status = 'submitted'（已提交）
 *   2. 如果必答题倒计时正在运行（isAnswerCounting = true） → status = 'answering'（作答中）
 *   3. 其他情况 → status = 'waiting'（等待中）
 *
 * @param onlinePlayers - 在线选手映射表 (userId → socketId)
 * @param knownPlayers  - 已知选手映射表 (userId → nickname)，用于获取昵称
 */
export function updatePlayerStatuses(
  onlinePlayers: Map<string, string>,
  knownPlayers: Map<string, string>,
): void {
  const questionId = state.currentQuestion?.id;
  // 获取当前题目的所有已提交答案，如果没有则为空对象
  const pending = questionId ? (state.pendingAnswers[questionId] || {}) : {};
  const isCounting = state.isAnswerCounting;

  const statuses: PlayerAnswerStatus[] = [];

  // 遍历所有在线选手，推导其状态
  for (const [userId] of onlinePlayers.entries()) {
    const nickname = knownPlayers.get(userId) || userId; // 没有昵称则用 userId 代替
    const hasSubmitted = !!pending[userId]; // 是否已提交答案

    if (hasSubmitted) {
      // 情况1：已提交答案
      statuses.push({ userId, nickname, status: 'submitted' });
    } else if (isCounting) {
      // 情况2：倒计时运行中，尚未提交 → 正在作答
      statuses.push({ userId, nickname, status: 'answering' });
    } else {
      // 情况3：其他情况 → 等待中
      statuses.push({ userId, nickname, status: 'waiting' });
    }
  }

  // 将推导出的状态列表写入游戏状态
  state.playerStatuses = statuses;
}
