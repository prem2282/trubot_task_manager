import http from 'http';
import app from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { initSocket } from './sockets';

async function start() {
  await connectDatabase();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
    console.log(`API docs: http://localhost:${env.PORT}/api-docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
