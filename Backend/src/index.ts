import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import questionRoutes from './routers/questionRoutes.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Answering System API is running' });
});

app.use('/api/questions', questionRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
