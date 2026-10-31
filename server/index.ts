import { createServerApp } from './app.ts';

const PORT = process.env.PORT || 3001;
const { app } = createServerApp();

app.listen(PORT, () => {
  console.log(`[ShaadiSaathi Server] Running on http://localhost:${PORT}`);
});
