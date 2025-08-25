import express from 'express';
import expressWs from 'express-ws';
import { registerRoutes } from './routes';
import { log } from './vite';
import cors from 'cors';

const app = express();
const { app: wsApp } = expressWs(app);

// --- Middleware ---
wsApp.use(cors({ origin: 'https://pritsinghlaw.netlify.app' }));
wsApp.use(express.json());
wsApp.use(express.urlencoded({ extended: false }));

// --- Main Application Logic ---
(async () => {
  // Register all your API and WebSocket routes
  const server = await registerRoutes(wsApp);

  // Get the port from Render's environment variable
 const port = parseInt(process.env.PORT, 10) || 5000;
server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
}, () => {
    log(`serving on port ${port}`);
});
})();
