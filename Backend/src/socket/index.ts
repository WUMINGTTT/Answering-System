import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { getGameState, updateGameState, resetGameState } from './gameState.js';
import { getAllQuestions } from '../data-access/questionDao.js';

let io: SocketIOServer | null = null;

/** 初始化 Socket.IO 并绑定到 HTTP 服务器 */
export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // 开发阶段允许所有来源，生产环境应限制
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('客户端已连接：', socket.id);

    // 客户端请求当前状态（页面刷新 / 首次打开）
    socket.on('client:requestState', () => {
      const state = getGameState();
      socket.emit('state:current', state);
    });

    // 管理员推送完整游戏状态
    socket.on('admin:syncState', (patch: Record<string, unknown>) => {
      const updated = updateGameState(patch);
      // 广播给所有客户端（含发送方）
      io?.emit('state:updated', updated);
    });

    // 管理员重置游戏状态
    socket.on('admin:resetState', () => {
      const state = resetGameState();
      io?.emit('state:updated', state);
    });

    // 展示页清除当前题目（返回风险题列表）
    socket.on('display:clearQuestion', () => {
      const updated = updateGameState({ currentQuestion: null, currentRiskCode: null, showAnswer: false });
      io?.emit('state:updated', updated);
    });

    // 展示页点击风险题卡片 → 选中题目并标记为已使用
    socket.on('display:selectRiskQuestion', async (payload: { questionId: string; riskCode: string }) => {
      const questions = await getAllQuestions();
      const question = questions.find((q) => q.id === payload.questionId);
      if (!question) return;

      const current = getGameState();
      const usedIds = [...current.usedRiskQuestionIds];
      if (!usedIds.includes(payload.questionId)) {
        usedIds.push(payload.questionId);
      }

      const updated = updateGameState({
        currentQuestion: question,
        currentRiskCode: payload.riskCode,
        showAnswer: false,
        usedRiskQuestionIds: usedIds,
      });
      io?.emit('state:updated', updated);
    });

    socket.on('disconnect', (reason) => {
      console.log('客户端已断开：', socket.id, '原因：', reason);
    });
  });

  return io;
}

/** 获取已初始化的 Socket.IO 实例（未初始化返回 null） */
export function getIO(): SocketIOServer | null {
  return io;
}
