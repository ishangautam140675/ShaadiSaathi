import { createServerApp } from './app.ts';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const PORT = Number(process.env.PORT) || 3001;
const { app, appDb } = createServerApp();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ShaadiSaathi Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV} mode`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`[ShaadiSaathi Server] Received ${signal}. Closing gracefully...`);
  server.close(() => {
    try {
      appDb.close();
      console.log('[ShaadiSaathi Server] Database connection closed.');
    } catch (err) {
      console.error('[ShaadiSaathi Server] Error closing database:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
