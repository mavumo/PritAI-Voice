import express, { type Request, Response, NextFunction } from "express";
import expressWs from "express-ws";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();
const { app: wsApp } = expressWs(app);
wsApp.use(express.json());
wsApp.use(express.urlencoded({ extended: false }));
wsApp.use(express.urlencoded({ extended: false }));

// Add these lines to enable CORS for your Netlify frontend
const corsOptions = {
    origin: 'https://pritsinghlaw.netlify.app',
    optionsSuccessStatus: 200
};
wsApp.use(cors(corsOptions));

wsApp.use((req, res, next) => {
    // ... rest of your code
});

wsApp.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(wsApp);

  wsApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (wsApp.get("env") === "development") {
    await setupVite(wsApp as any, server);
  } else {
     // We are serving the client from Netlify, so we don't need this.
    // serveStatic(wsApp as any);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
const port = parseInt(process.env.PORT, 10) || 5000;

server.listen(port, () => {
    log(`serving on port ${port}`);
});
})(); // This is the corrected syntax
