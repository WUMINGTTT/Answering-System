import type { Question } from '../types/question.js';

/** 游戏阶段 */
export type GameStatus = 'waiting' | 'required' | 'quick-answer' | 'risk' | 'ranking';

/** 排名条目 */
export interface PlayerRanking {
  rank: number;
  nickname: string;
  totalScore: number;
}

/** 选手答题状态 */
export interface PlayerAnswerStatus {
  userId: string;
  nickname: string;
  status: 'waiting' | 'answering' | 'submitted';
}

/** 抢答记录 */
export interface BuzzRecord {
  userId: string;
  nickname: string;
  timestamp: number;
  early: boolean; // true = 提前抢答（倒计时未结束）
}

/** 存储在服务端、跨页面同步的游戏状态 */
export interface GameState {
  status: GameStatus;
  currentQuestion: Question | null;
  currentRiskCode: string | null;
  showAnswer: boolean;
  answerDuration: number;
  quickAnswerDuration: number;
  answerEndTime: number | null;
  quickAnswerEndTime: number | null;
  isAnswerCounting: boolean;
  isQuickAnswerCounting: boolean;
  rankings: PlayerRanking[];
  /** 风险题阶段：管理员当前的分值筛选（0 = 全部） */
  riskScoreFilter: number;
  /** 风险题阶段：已被选择过的题目 ID 列表 */
  usedRiskQuestionIds: string[];
  /** 选手答题记录：questionId → userId → 选手提交的答案数组 */
  pendingAnswers: Record<string, Record<string, string[]>>;
  /** 答题结果：questionId → userId → 得分信息 */
  answerResults: Record<string, Record<string, { correct: boolean; score: number; submitted: boolean; timeout: boolean }>>;
  /** 服务端时间戳（用于客户端校准倒计时时钟偏差） */
  serverTime: number;
  /** 当前题目下的选手答题状态（必答题阶段） */
  playerStatuses: PlayerAnswerStatus[];
  /** 抢答记录：questionId → 抢答事件列表 */
  buzzRecords: Record<string, BuzzRecord[]>;
  /** 当前题目抢答获胜者（第一个有效抢答的选手） */
  buzzWinner: { userId: string; nickname: string; timestamp: number } | null;
  /** 抢答是否已开放（抢答倒计时自然结束后为 true） */
  buzzOpen: boolean;
}

/** 默认游戏状态 */
function createDefaultState(): GameState {
  return {
    status: 'waiting',
    currentQuestion: null,
    currentRiskCode: null,
    showAnswer: false,
    answerDuration: 30,
    quickAnswerDuration: 10,
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

let state: GameState = createDefaultState();

/** 获取当前游戏状态（只读副本） */
export function getGameState(): GameState {
  return { ...state, currentQuestion: state.currentQuestion ? { ...state.currentQuestion } : null, serverTime: Date.now() };
}

/** 更新游戏状态（部分合并） */
export function updateGameState(patch: Partial<GameState>): GameState {
  state = { ...state, ...patch };
  return getGameState();
}

/** 重置为默认状态 */
export function resetGameState(): GameState {
  state = createDefaultState();
  return getGameState();
}

/** 更新选手答题状态（仅在线选手，由 socket 层在广播前调用） */
export function updatePlayerStatuses(
  onlinePlayers: Map<string, string>,
  knownPlayers: Map<string, string>,
): void {
  const questionId = state.currentQuestion?.id;
  const pending = questionId ? (state.pendingAnswers[questionId] || {}) : {};
  const isCounting = state.isAnswerCounting;

  const statuses: PlayerAnswerStatus[] = [];

  for (const [userId] of onlinePlayers.entries()) {
    const nickname = knownPlayers.get(userId) || userId;
    const hasSubmitted = !!pending[userId];

    if (hasSubmitted) {
      statuses.push({ userId, nickname, status: 'submitted' });
    } else if (isCounting) {
      statuses.push({ userId, nickname, status: 'answering' });
    } else {
      statuses.push({ userId, nickname, status: 'waiting' });
    }
  }

  state.playerStatuses = statuses;
}
