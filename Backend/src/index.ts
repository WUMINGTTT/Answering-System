import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import questionRoutes from './routers/questionRoutes.js';
import scoreRoutes from './routers/scoreRoutes.js';
import userRoutes from './routers/userRoutes.js';
import { initDb } from './data-access/db.js';
import { initSocket } from './socket/index.js';

await initDb();

const app = express();
const server = createServer(app);
initSocket(server);

app.use(express.json());
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({ message: '系统API接口正在运行' });
});

app.use('/api/questions', questionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/:id/scores', scoreRoutes);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
