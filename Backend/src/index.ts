import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import questionRoutes from './routers/questionRoutes.js';
import scoreRoutes from './routers/scoreRoutes.js';
import userRoutes from './routers/userRoutes.js';
import { initDb } from './data-access/db.js';

await initDb();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Answering System API is running' });
});

app.use('/api/questions', questionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/:id/scores', scoreRoutes);

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
