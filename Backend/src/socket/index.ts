import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { getGameState, updateGameState, resetGameState, updatePlayerStatuses } from './gameState.js';
import { getAllQuestions } from '../data-access/questionDao.js';
import { addScore } from '../data-access/scoreDao.js';

let io: SocketIOServer | null = null;

/** userId → socket.id 映射，用于向指定选手推送结果 */
const playerSockets = new Map<string, string>();

/** userId → nickname 映射 */
const playerNicknames = new Map<string, string>();

/** 页面会话追踪：socket.id → { pageType, userId?, nickname? } */
interface SessionInfo {
  pageType: 'home' | 'login' | 'admin' | 'display' | 'player';
  userId?: string;
  nickname?: string;
}
const pageSessions = new Map<string, SessionInfo>();

/** 获取状态并注入选手答题状态 */
function getStateWithStatuses() {
  updatePlayerStatuses(playerSockets, playerNicknames);
  return getGameState();
}

/** 向所有管理页推送会话状态更新 */
function broadcastSessions() {
  const sessions = {
    home: 0,
    login: 0,
    admin: 0,
    display: 0,
    player: 0,
    players: [] as { userId: string; nickname: string }[],
  };
  for (const info of pageSessions.values()) {
    if (info.pageType === 'home') sessions.home++;
    else if (info.pageType === 'login') sessions.login++;
    else if (info.pageType === 'admin') sessions.admin++;
    else if (info.pageType === 'display') sessions.display++;
    else if (info.pageType === 'player') {
      sessions.player++;
      if (info.userId) {
        sessions.players.push({ userId: info.userId, nickname: info.nickname || '' });
      }
    }
  }
  // 推送给所有管理页
  for (const [sid, info] of pageSessions.entries()) {
    if (info.pageType === 'admin') {
      io?.to(sid).emit('admin:sessionUpdate', sessions);
    }
  }
}

/** 初始化 Socket.IO 并绑定到 HTTP 服务器 */
export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('客户端已连接：', socket.id);

    // ── 会话注册（所有页面连接时调用） ──
    socket.on('session:register', (info: SessionInfo) => {
      pageSessions.set(socket.id, info);
      if (info.pageType === 'player' && info.userId) {
        playerSockets.set(info.userId, socket.id);
      }
      console.log('会话注册：', info.pageType, info.userId || '', 'socket:', socket.id);
      broadcastSessions();
    });

    // ── 管理页请求会话状态 ──
    socket.on('admin:requestSessions', () => {
      broadcastSessions();
    });

    // ── 选手注册（关联 userId 与 socket，并更新会话信息） ──
    socket.on('player:register', (userId: string, nickname?: string) => {
      playerSockets.set(userId, socket.id);
      if (nickname) playerNicknames.set(userId, nickname);
      // 更新会话中的选手信息
      const existing = pageSessions.get(socket.id);
      if (existing) {
        existing.userId = userId;
        existing.nickname = nickname || '';
      } else {
        pageSessions.set(socket.id, { pageType: 'player', userId, nickname: nickname || '' });
      }
      console.log('选手已注册：', userId, 'socket:', socket.id);
      broadcastSessions();
    });

    // ── 选手查询自己的答题状态（页面刷新后恢复） ──
    socket.on('player:checkStatus', (userId: string) => {
      const state = getGameState();
      const questionId = state.currentQuestion?.id;
      if (!questionId) {
        socket.emit('player:myStatus', { questionId: null, submitted: false, result: null });
        return;
      }
      const submitted = !!state.pendingAnswers[questionId]?.[userId];
      const stored = state.answerResults[questionId]?.[userId] || null;
      socket.emit('player:myStatus', {
        questionId,
        submitted,
        result: stored
          ? {
              correct: stored.correct,
              score: stored.score,
              timeout: stored.timeout,
              correctAnswers: state.currentQuestion?.answers || [],
            }
          : null,
      });
    });

    // ── 客户端请求当前状态（页面刷新 / 首次打开） ──
    socket.on('client:requestState', () => {
      const state = getStateWithStatuses();
      socket.emit('state:current', state);
    });

    // ── 管理员推送完整游戏状态 ──
    socket.on('admin:syncState', (patch: Record<string, unknown>) => {
      const prev = getGameState();

      // 检测答题倒计时结束（true → false），触发自动评分
      if (
        prev.isAnswerCounting === true &&
        patch.isAnswerCounting === false &&
        prev.currentQuestion
      ) {
        evaluateAnswers(prev.currentQuestion.id, prev);
      }

      updateGameState(patch);
      const stateWithStatus = getStateWithStatuses();
      io?.emit('state:updated', stateWithStatus);
    });

    // ── 管理员重置游戏状态 ──
    socket.on('admin:resetState', () => {
      resetGameState();
      const state = getStateWithStatuses();
      io?.emit('state:updated', state);
    });

    // ── 展示页清除当前题目（返回风险题列表） ──
    socket.on('display:clearQuestion', () => {
      updateGameState({ currentQuestion: null, currentRiskCode: null, showAnswer: false });
      const state = getStateWithStatuses();
      io?.emit('state:updated', state);
    });

    // ── 展示页点击风险题卡片 → 选中题目并标记为已使用 ──
    socket.on('display:selectRiskQuestion', async (payload: { questionId: string; riskCode: string }) => {
      const questions = await getAllQuestions();
      const question = questions.find((q) => q.id === payload.questionId);
      if (!question) return;

      const current = getGameState();
      const usedIds = [...current.usedRiskQuestionIds];
      if (!usedIds.includes(payload.questionId)) {
        usedIds.push(payload.questionId);
      }

      updateGameState({
        currentQuestion: question,
        currentRiskCode: payload.riskCode,
        showAnswer: false,
        usedRiskQuestionIds: usedIds,
      });
      const state = getStateWithStatuses();
      io?.emit('state:updated', state);
    });

    // ── 选手提交答案 ──
    socket.on('player:submitAnswer', (payload: { userId: string; questionId: string; answers: string[] }) => {
      const current = getGameState();

      // 仅在答题倒计时运行中接受提交
      if (!current.isAnswerCounting) return;
      if (current.currentQuestion?.id !== payload.questionId) return;

      // 每人每题仅保留最后一次提交
      if (!current.pendingAnswers[payload.questionId]) {
        current.pendingAnswers[payload.questionId] = {};
      }
      current.pendingAnswers[payload.questionId][payload.userId] = payload.answers;

      updateGameState({ pendingAnswers: { ...current.pendingAnswers } });

      // 告知选手已收到提交，并广播更新状态到管理页
      socket.emit('player:answerReceived', { questionId: payload.questionId });
      const state = getStateWithStatuses();
      io?.emit('state:updated', state);
    });

    // ── 断开清理 ──
    socket.on('disconnect', (reason) => {
      console.log('客户端已断开：', socket.id, '原因：', reason);
      // 清理选手映射
      for (const [uid, sid] of playerSockets.entries()) {
        if (sid === socket.id) {
          playerSockets.delete(uid);
          break;
        }
      }
      // 清理会话并广播
      pageSessions.delete(socket.id);
      broadcastSessions();
    });
  });

  return io;
}

/** 获取已初始化的 Socket.IO 实例（未初始化返回 null） */
export function getIO(): SocketIOServer | null {
  return io;
}

// ── 内部：答题倒计时结束后自动评分 ──

async function evaluateAnswers(questionId: string, prevState: ReturnType<typeof getGameState>) {
  const question = prevState.currentQuestion;
  if (!question) return;

  const pending = prevState.pendingAnswers[questionId] || {};
  const results: Record<string, { correct: boolean; score: number; submitted: boolean; timeout: boolean }> = {};

  // 判断倒计时是自然结束还是强制停止
  const now = Date.now();
  const isNaturalExpiry = prevState.answerEndTime !== null && now >= prevState.answerEndTime - 500;

  const correctSet = new Set(question.answers.map((a) => a.trim().toLowerCase()));

  // ── 处理已提交的答案 ──
  for (const [userId, submittedAnswers] of Object.entries(pending)) {
    const submittedSet = new Set(submittedAnswers.map((a) => a.trim().toLowerCase()));
    const isCorrect =
      submittedSet.size === correctSet.size &&
      [...submittedSet].every((a) => correctSet.has(a));

    const score = isCorrect ? question.score : 0;
    const reason = isCorrect
      ? `答题正确 +${question.score}分 [${questionId}]`
      : `答题错误 - 0分 [${questionId}]`;

    try {
      await addScore(userId, { score, reason });
    } catch { /* 用户可能已被删除 */ }

    results[userId] = { correct: isCorrect, score, submitted: true, timeout: false };
  }

  // ── 自然结束时：未提交的在线选手记为超时 ──
  if (isNaturalExpiry) {
    for (const [userId] of playerSockets.entries()) {
      if (results[userId]) continue; // 已提交，跳过

      const reason = `超时未答 - 0分 [${questionId}]`;
      try {
        await addScore(userId, { score: 0, reason });
      } catch { /* 忽略 */ }

      results[userId] = { correct: false, score: 0, submitted: false, timeout: true };
    }
  }

  // ── 推送结果给每个选手 ──
  for (const [userId, result] of Object.entries(results)) {
    const sid = playerSockets.get(userId);
    if (sid) {
      io?.to(sid).emit('player:answerResult', {
        questionId,
        correct: result.correct,
        score: result.score,
        correctAnswers: question.answers,
        timeout: result.timeout,
      });
    }
  }

  // 持久化结果
  const current = getGameState();
  updateGameState({
    answerResults: {
      ...current.answerResults,
      [questionId]: results,
    },
  });
}
