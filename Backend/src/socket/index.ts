/**
 * Socket.IO 主模块 (Socket Handler)
 *
 * 【技术学习】Socket.IO 是什么？
 *   Socket.IO 是一个基于 WebSocket 协议的实时通信库，它在 WebSocket 之上封装了：
 *   - 自动重连机制
 *   - 事件驱动的消息模式（类似 EventEmitter）
 *   - 房间（Room）和命名空间（Namespace）功能
 *   - 降级方案（当 WebSocket 不可用时自动回退到轮询）
 *
 * 【技术学习】事件驱动编程模式：
 *   与 HTTP 的"请求-响应"模式不同，Socket.IO 采用"事件驱动"模式：
 *   - 客户端和服务器都可以主动发送事件（emit）
 *   - 双方都可以监听事件（on）
 *   - 通信是双向的、实时的，不需要客户端反复请求
 *
 * 【技术学习】核心概念：
 *   - socket:  代表一个客户端连接，是服务器与该客户端之间的通信通道
 *   - io:      代表整个 Socket.IO 服务器，可以向所有客户端广播消息
 *   - emit:    发送一个事件（可以携带数据）
 *   - on:      监听一个事件（当事件触发时执行回调函数）
 *
 * 【技术学习】广播 vs 定向推送：
 *   - io.emit('event', data)        → 向所有连接的客户端广播
 *   - io.to(sid).emit('event', data) → 只向指定 socket.id 的客户端推送
 *   - socket.emit('event', data)    → 只向当前连接的客户端推送（等同于 io.to(socket.id).emit）
 */

import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { getGameState, updateGameState, resetGameState, updatePlayerStatuses } from './gameState.js';
import { getAllQuestions } from '../data-access/questionDao.js';
import { addScore } from '../data-access/scoreDao.js';

// Socket.IO 服务器实例（模块级变量，initSocket 初始化后才能使用）
let io: SocketIOServer | null = null;

/**
 * userId → socket.id 映射表
 *
 * 【技术学习】为什么需要这个映射？
 *   Socket.IO 用 socket.id 标识每个连接，但业务逻辑用 userId 标识用户。
 *   当我们想给某个用户推送消息时，需要知道他的 socket.id。
 *   这个 Map 就是两者之间的"翻译表"。
 */
const playerSockets = new Map<string, string>();

/**
 * userId → nickname 映射表
 * 用于在广播选手状态时显示昵称，而不是显示难读的 userId
 */
const playerNicknames = new Map<string, string>();

/**
 * 页面会话追踪：socket.id → 会话信息
 *
 * 【技术学习】pageSessions 的作用：
 *   服务器需要知道每个连接来自哪种页面（首页、管理页、展示页、选手页），
 *   这样才能：
 *   1. 向管理页推送在线统计信息
 *   2. 区分不同页面类型的客户端
 *   3. 在客户端断开时正确清理对应的数据
 */
interface SessionInfo {
  /** 页面类型 */
  pageType: 'home' | 'login' | 'admin' | 'display' | 'player';
  /** 用户ID（选手页才有） */
  userId?: string;
  /** 昵称（选手页才有） */
  nickname?: string;
}
const pageSessions = new Map<string, string>();

/** 获取状态并注入选手答题状态（内部辅助函数） */
function getStateWithStatuses() {
  // 先根据当前在线选手和游戏状态，推导每位选手的答题状态
  updatePlayerStatuses(playerSockets, playerNicknames);
  return getGameState();
}

/**
 * 向所有管理页广播会话状态更新
 *
 * 【技术学习】这个函数遍历所有连接，统计各页面类型的在线数量，
 * 然后只推送给管理页客户端（pageType === 'admin'），
 * 实现了"定向广播"——只通知需要知道这些信息的客户端。
 */
function broadcastSessions() {
  // 统计各页面类型的在线数量
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
  // 只推送给所有管理页客户端
  for (const [sid, info] of pageSessions.entries()) {
    if (info.pageType === 'admin') {
      io?.to(sid).emit('admin:sessionUpdate', sessions);
    }
  }
}

/**
 * 初始化 Socket.IO 服务器并绑定到 HTTP 服务器
 *
 * 【技术学习】为什么 Socket.IO 要绑定到 HTTP 服务器？
 *   WebSocket 连接需要先通过 HTTP 协议进行"握手"（Handshake），
 *   之后才升级为 WebSocket 协议。因此 Socket.IO 需要复用 HTTP 服务器的端口。
 *   这样 HTTP 请求和 WebSocket 连接可以共用同一个端口（如 3000）。
 *
 * @param server - Node.js 的 HTTP 服务器实例
 * @returns 初始化后的 Socket.IO 服务器实例
 */
export function initSocket(server: HttpServer): SocketIOServer {
  // 创建 Socket.IO 服务器，配置 CORS 允许跨域连接
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',           // 允许所有来源（开发阶段方便调试）
      methods: ['GET', 'POST'],
    },
  });

  /**
   * 【技术学习】io.on('connection') — 连接生命周期
   *   当任何一个客户端成功建立 WebSocket 连接时，这个回调函数会被触发。
   *   参数 socket 代表这个新连接的客户端，后续所有与该客户端的通信都通过它进行。
   *   当客户端断开连接时，会触发 socket.on('disconnect') 事件。
   */
  io.on('connection', (socket) => {
    console.log('客户端已连接：', socket.id);

    // ═══════════════════════════════════════════════════════════════
    // 会话注册（所有页面连接时都会调用）
    // ═══════════════════════════════════════════════════════════════
    socket.on('session:register', (info: SessionInfo) => {
      // 记录该连接来自哪种页面
      pageSessions.set(socket.id, info);

      // 如果是选手页面，同时建立 userId → socketId 的映射
      if (info.pageType === 'player' && info.userId) {
        playerSockets.set(info.userId, socket.id);
      }

      console.log('会话注册：', info.pageType, info.userId || '', 'socket:', socket.id);
      // 通知所有管理页更新在线统计
      broadcastSessions();
    });

    // ═══════════════════════════════════════════════════════════════
    // 管理页请求会话状态（手动刷新在线列表）
    // ═══════════════════════════════════════════════════════════════
    socket.on('admin:requestSessions', () => {
      broadcastSessions();
    });

    // ═══════════════════════════════════════════════════════════════
    // 选手注册（关联 userId 与 socket，并更新会话信息）
    // ═══════════════════════════════════════════════════════════════
    socket.on('player:register', (userId: string, nickname?: string) => {
      // 建立 userId → socket.id 映射，方便后续定向推送
      playerSockets.set(userId, socket.id);
      if (nickname) playerNicknames.set(userId, nickname);

      // 更新已有的会话信息（如果已注册过），或创建新会话
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

    // ═══════════════════════════════════════════════════════════════
    // 选手查询自己的答题状态（页面刷新后恢复状态用）
    // ═══════════════════════════════════════════════════════════════
    socket.on('player:checkStatus', (userId: string) => {
      const state = getGameState();
      const questionId = state.currentQuestion?.id;

      // 如果当前没有题目，告知选手无需作答
      if (!questionId) {
        socket.emit('player:myStatus', { questionId: null, submitted: false, result: null });
        return;
      }

      // 查询该选手是否已提交当前题目的答案
      const submitted = !!state.pendingAnswers[questionId]?.[userId];
      // 查询该选手是否已有评分结果
      const stored = state.answerResults[questionId]?.[userId] || null;

      // 向该选手推送其个人答题状态
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

    // ═══════════════════════════════════════════════════════════════
    // 客户端请求当前游戏状态（页面刷新 / 首次打开时调用）
    // ═══════════════════════════════════════════════════════════════
    socket.on('client:requestState', () => {
      // 获取完整状态（含选手答题状态），只推送给请求者
      const state = getStateWithStatuses();
      socket.emit('state:current', state);
    });

    // ═══════════════════════════════════════════════════════════════
    // 管理员推送游戏状态更新（核心事件）
    // ═══════════════════════════════════════════════════════════════
    socket.on('admin:syncState', (patch: Record<string, unknown>) => {
      const prev = getGameState();

      // ── 自动评分触发：检测必答题倒计时是否从 true 变为 false ──
      // 当管理员停止倒计时（倒计时结束），自动对已提交的答案进行评分
      if (
        prev.isAnswerCounting === true &&
        patch.isAnswerCounting === false &&
        prev.currentQuestion
      ) {
        evaluateAnswers(prev.currentQuestion.id, prev);
      }

      // ── 抢答题：抢答倒计时开始时，清空上一轮的抢答记录 ──
      if (patch.isQuickAnswerCounting === true && prev.isQuickAnswerCounting === false) {
        (patch as Record<string, unknown>).buzzOpen = true;      // 开放抢答
        (patch as Record<string, unknown>).buzzWinner = null;    // 清空获胜者
        (patch as Record<string, unknown>).buzzRecords = {};     // 清空抢答记录
      }

      // ── 抢答题：检测抢答倒计时被停止 ──
      if (
        prev.isQuickAnswerCounting === true &&
        patch.isQuickAnswerCounting === false &&
        prev.currentQuestion?.category === 'quick-answer'
      ) {
        // 判断是"自然结束"还是"手动停止"
        // 自然结束：倒计时时间已过（允许 2 秒容差）
        const isNaturalExpiry =
          prev.quickAnswerEndTime !== null &&
          Date.now() >= prev.quickAnswerEndTime - 2000;

        if (!isNaturalExpiry) {
          // 手动停止：关闭抢答
          (patch as Record<string, unknown>).buzzOpen = false;
        }
        // 自然结束时保持 buzzOpen = true，选手仍可继续抢答
      }

      // ── 题目切换时清空抢答状态（不留存旧数据） ──
      const newQuestion = patch.currentQuestion as import('../types/question.js').Question | undefined | null;
      if (newQuestion !== undefined && newQuestion?.id !== prev.currentQuestion?.id) {
        (patch as Record<string, unknown>).buzzOpen = false;
        (patch as Record<string, unknown>).buzzWinner = null;
        (patch as Record<string, unknown>).buzzRecords = {};
      }

      // ── 阶段切换离开抢答题时，也清空抢答状态 ──
      if (patch.status !== undefined && patch.status !== prev.status && patch.status !== 'quick-answer') {
        (patch as Record<string, unknown>).buzzOpen = false;
        (patch as Record<string, unknown>).buzzWinner = null;
        (patch as Record<string, unknown>).buzzRecords = {};
      }

      // 合并更新游戏状态
      updateGameState(patch);
      // 获取含选手状态的完整状态，广播给所有客户端
      const stateWithStatus = getStateWithStatuses();
      io?.emit('state:updated', stateWithStatus);
    });

    // ═══════════════════════════════════════════════════════════════
    // 管理员重置游戏状态
    // ═══════════════════════════════════════════════════════════════
    socket.on('admin:resetState', () => {
      resetGameState();
      const state = getStateWithStatuses();
      io?.emit('state:updated', state); // 广播重置后的状态
    });

    // ═══════════════════════════════════════════════════════════════
    // 展示页清除当前题目（返回风险题列表）
    // ═══════════════════════════════════════════════════════════════
    socket.on('display:clearQuestion', () => {
      updateGameState({
        currentQuestion: null,
        currentRiskCode: null,
        showAnswer: false,
        buzzOpen: false,
        buzzWinner: null,
        buzzRecords: {},
      });
      const state = getStateWithStatuses();
      io?.emit('state:updated', state);
    });

    // ═══════════════════════════════════════════════════════════════
    // 展示页选择风险题卡片 → 选中题目并标记为已使用
    // ═══════════════════════════════════════════════════════════════
    socket.on('display:selectRiskQuestion', async (payload: { questionId: string; riskCode: string }) => {
      // 从数据库获取题目详情
      const questions = await getAllQuestions();
      const question = questions.find((q) => q.id === payload.questionId);
      if (!question) return; // 题目不存在，忽略

      const current = getGameState();
      // 将题目加入已使用列表（防止同一题被选两次）
      const usedIds = [...current.usedRiskQuestionIds];
      if (!usedIds.includes(payload.questionId)) {
        usedIds.push(payload.questionId);
      }

      // 更新游戏状态：设置当前题目、风险题代码、重置显示答案状态
      updateGameState({
        currentQuestion: question,
        currentRiskCode: payload.riskCode,
        showAnswer: false,
        usedRiskQuestionIds: usedIds,
      });
      const state = getStateWithStatuses();
      io?.emit('state:updated', state); // 广播给所有客户端
    });

    // ═══════════════════════════════════════════════════════════════
    // 选手抢答
    //
    // 【技术学习】抢答逻辑详解：
    //   1. 选手点击抢答按钮，发送 'player:buzz' 事件
    //   2. 服务器判断：
    //      - 是否在抢答题阶段？
    //      - 题目是否匹配？
    //      - 是否重复抢答？（防止刷新页面绕过前端限制）
    //      - 是"提前抢答"还是"有效抢答"？
    //   3. 提前抢答（early）：倒计时尚未结束就按了抢答按钮，视为无效
    //   4. 有效抢答（valid）：倒计时已结束 + 抢答已开放 + 首次抢答
    //   5. 第一个有效抢答者被记录为 buzzWinner（获胜者）
    //   6. 服务器向该选手推送抢答结果，并广播状态更新
    // ═══════════════════════════════════════════════════════════════
    socket.on('player:buzz', (payload: { userId: string; questionId: string }) => {
      const current = getGameState();

      // 安全检查：仅在抢答题阶段接受抢答
      if (current.status !== 'quick-answer') return;
      // 检查题目是否匹配（防止旧题目的延迟抢答）
      if (!current.currentQuestion || current.currentQuestion.id !== payload.questionId) return;

      // 拒绝重复抢答（每人每题只能抢答一次）
      const qId = payload.questionId;
      const alreadyBuzzed = (current.buzzRecords[qId] || []).some(
        (r) => r.userId === payload.userId
      );
      if (alreadyBuzzed) return;

      const now = Date.now();
      const nickname = playerNicknames.get(payload.userId) || payload.userId;

      // 判断是否提前抢答：倒计时尚未结束时抢答，视为无效
      const early = current.isQuickAnswerCounting ||
        (current.quickAnswerEndTime !== null && now < current.quickAnswerEndTime);

      // 判断是否为有效抢答：不在倒计时中 + 抢答已开放
      const valid = !early && current.buzzOpen;

      // 创建抢答记录
      const buzzRecord = {
        userId: payload.userId,
        nickname,
        timestamp: now,
        early,
      };

      // 将抢答记录追加到该题目的记录列表中
      const records = [...(current.buzzRecords[qId] || []), buzzRecord];
      const patch: Record<string, unknown> = {
        buzzRecords: { ...current.buzzRecords, [qId]: records },
      };

      // 首个有效抢答者记为获胜者（但不关闭抢答，其他选手仍可抢答）
      if (valid && !current.buzzWinner) {
        patch.buzzWinner = { userId: payload.userId, nickname, timestamp: now };
      }

      updateGameState(patch);

      // 向该选手推送抢答结果（告知是否有效、是否获胜）
      socket.emit('player:buzzResult', {
        questionId: payload.questionId,
        valid,
        early,
        winner: valid
          ? (current.buzzWinner || { userId: payload.userId, nickname })
          : current.buzzWinner,
      });

      // 广播更新后的状态给所有客户端
      const state = getStateWithStatuses();
      io?.emit('state:updated', state);
    });

    // ═══════════════════════════════════════════════════════════════
    // 选手提交答案
    // ═══════════════════════════════════════════════════════════════
    socket.on('player:submitAnswer', (payload: { userId: string; questionId: string; answers: string[] }) => {
      const current = getGameState();

      // 安全检查：仅在答题倒计时运行中接受提交
      if (!current.isAnswerCounting) return;
      // 检查题目是否匹配
      if (current.currentQuestion?.id !== payload.questionId) return;

      // 每人每题只保留最后一次提交（覆盖之前的答案）
      if (!current.pendingAnswers[payload.questionId]) {
        current.pendingAnswers[payload.questionId] = {};
      }
      current.pendingAnswers[payload.questionId][payload.userId] = payload.answers;

      // 更新状态（注意：这里只更新 pendingAnswers，不触发评分）
      updateGameState({ pendingAnswers: { ...current.pendingAnswers } });

      // 告知该选手已收到提交
      socket.emit('player:answerReceived', { questionId: payload.questionId });
      // 广播更新状态（管理页可以看到选手的答题进度变化）
      const state = getStateWithStatuses();
      io?.emit('state:updated', state);
    });

    // ═══════════════════════════════════════════════════════════════
    // 断开连接清理
    //
    // 【技术学习】为什么需要手动清理？
    //   当客户端断开连接时，它在服务器端注册的映射关系（playerSockets、
    //   playerNicknames、pageSessions）不会自动删除。
    //   如果不手动清理，会导致：
    //   1. 内存泄漏（映射表无限增长）
    //   2. 向已断开的 socket 推送消息（浪费资源）
    //   3. 管理页显示的在线人数不准确
    // ═══════════════════════════════════════════════════════════════
    socket.on('disconnect', (reason) => {
      console.log('客户端已断开：', socket.id, '原因：', reason);

      // 清理选手映射：找到并删除该 socket 对应的 userId 条目
      for (const [uid, sid] of playerSockets.entries()) {
        if (sid === socket.id) {
          playerSockets.delete(uid);
          break; // 找到后立即退出循环
        }
      }

      // 清理会话记录
      pageSessions.delete(socket.id);
      // 通知管理页更新在线统计
      broadcastSessions();
    });
  });

  return io;
}

/**
 * 获取已初始化的 Socket.IO 实例
 * 在其他模块中可以通过此函数获取 io 实例，用于向客户端推送消息
 * 注意：如果尚未调用 initSocket()，返回 null
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * 答题倒计时结束后的自动评分逻辑
 *
 * 【技术学习】evaluateAnswers 函数的工作流程：
 *   1. 判断是"自然结束"还是"强制停止"
 *   2. 遍历所有已提交的答案，与正确答案比对
 *   3. 计算得分并写入数据库
 *   4. 如果是自然结束，未提交的选手记为超时
 *   5. 向每个选手推送个人评分结果（定向推送）
 *   6. 将评分结果持久化到游戏状态中
 *
 * @param questionId - 被评分的题目 ID
 * @param prevState  - 倒计时结束前一刻的游戏状态快照
 */
async function evaluateAnswers(questionId: string, prevState: ReturnType<typeof getGameState>) {
  const question = prevState.currentQuestion;
  if (!question) return;

  // 获取该题目的所有已提交答案
  const pending = prevState.pendingAnswers[questionId] || {};
  const results: Record<string, { correct: boolean; score: number; submitted: boolean; timeout: boolean }> = {};

  // 判断倒计时是自然结束还是强制停止
  // 自然结束：当前时间已超过 endTime（允许 500ms 容差）
  const now = Date.now();
  const isNaturalExpiry = prevState.answerEndTime !== null && now >= prevState.answerEndTime - 500;

  // 【技术学习】将正确答案转为 Set，方便后续用 .has() 快速查找
  // 统一转小写并去空格，实现大小写不敏感的比较
  const correctSet = new Set(question.answers.map((a) => a.trim().toLowerCase()));

  // ── 处理已提交的答案 ──
  for (const [userId, submittedAnswers] of Object.entries(pending)) {
    // 将选手提交的答案也转为 Set
    const submittedSet = new Set(submittedAnswers.map((a) => a.trim().toLowerCase()));

    // 判断是否完全正确：答案数量相同 + 每个答案都在正确集合中
    const isCorrect =
      submittedSet.size === correctSet.size &&
      [...submittedSet].every((a) => correctSet.has(a));

    const score = isCorrect ? question.score : 0;
    const reason = isCorrect
      ? `答题正确 +${question.score}分 [${questionId}]`
      : `答题错误 - 0分 [${questionId}]`;

    // 将得分写入数据库
    try {
      await addScore(userId, { score, reason });
    } catch { /* 用户可能已被删除，忽略错误 */ }

    results[userId] = { correct: isCorrect, score, submitted: true, timeout: false };
  }

  // ── 自然结束时：未提交的在线选手记为超时 ──
  if (isNaturalExpiry) {
    for (const [userId] of playerSockets.entries()) {
      if (results[userId]) continue; // 已提交的跳过

      const reason = `超时未答 - 0分 [${questionId}]`;
      try {
        await addScore(userId, { score: 0, reason });
      } catch { /* 忽略 */ }

      results[userId] = { correct: false, score: 0, submitted: false, timeout: true };
    }
  }

  // ── 定向推送：向每个选手推送其个人评分结果 ──
  // 【技术学习】这里使用 io.to(sid).emit() 而非 io.emit()，
  // 因为每个选手的评分结果不同，需要分别推送。
  for (const [userId, result] of Object.entries(results)) {
    const sid = playerSockets.get(userId);
    if (sid) {
      io?.to(sid).emit('player:answerResult', {
        questionId,
        correct: result.correct,
        score: result.score,
        correctAnswers: question.answers, // 附带正确答案，供选手页显示
        timeout: result.timeout,
      });
    }
  }

  // ── 将评分结果持久化到游戏状态 ──
  const current = getGameState();
  updateGameState({
    answerResults: {
      ...current.answerResults,
      [questionId]: results,
    },
  });
}
