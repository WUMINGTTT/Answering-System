import type { Question } from '../types/question.js';

/** 游戏阶段 */
export type GameStatus = 'waiting' | 'required' | 'quick-answer' | 'risk' | 'ranking';

/** 排名条目 */
export interface PlayerRanking {
  rank: number;
  nickname: string;
  totalScore: number;
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
  };
}

let state: GameState = createDefaultState();

/** 获取当前游戏状态（只读副本） */
export function getGameState(): GameState {
  return { ...state, currentQuestion: state.currentQuestion ? { ...state.currentQuestion } : null };
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
