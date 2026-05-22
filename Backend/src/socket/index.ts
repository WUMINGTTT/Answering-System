import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

/** 初始化 Socket.IO 并绑定到 HTTP 服务器 */
export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server);

  io.on('connection', (socket) => {
    console.log('客户端已连接：', socket.id);

    socket.on('disconnect', () => {
      console.log('客户端已断开：', socket.id);
    });
  });

  return io;
}

/** 获取已初始化的 Socket.IO 实例（未初始化返回 null） */
export function getIO(): SocketIOServer | null {
  return io;
}
