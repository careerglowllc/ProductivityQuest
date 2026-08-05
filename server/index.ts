import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runStartupMigrations } from "./migrations";
import { apiLimiter } from "./rateLimiters";

const app = express();

// ── Security headers ─────────────────────────────────────────────────────
// Adds industry-standard protections: HSTS, X-Content-Type-Options (nosniff),
// X-Frame-Options (clickjacking), Referrer-Policy, and removes the
// X-Powered-By fingerprint header. Content-Security-Policy is disabled here
// because this app relies on Vite HMR (dev) and several inline scripts in
// index.html (theme init) plus third-party chart/export libraries — a strict
// CSP would need careful per-directive tuning to avoid breaking the app, so
// it's intentionally left off rather than shipping a broken or falsely-safe
// policy. The other headers below still provide meaningful protection.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.disable("x-powered-by"); // belt-and-suspenders; helmet also does this

// Session setup
const pgStore = connectPg(session);
const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  ttl: 7 * 24 * 60 * 60 * 1000, // 1 week
  tableName: "sessions",
});

sessionStore.on('error', (error: any) => {
  console.error('❌ Session store error:', error);
});

app.set("trust proxy", 1);
app.use(session({
  secret: process.env.SESSION_SECRET!,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    sameSite: 'lax',
  },
}));

app.use(express.json({ limit: "40mb" }));
app.use(express.urlencoded({ extended: false, limit: "40mb" }));

// General API rate limiting — generous, just a safety net against runaway
// scripts/scraping. Auth-specific endpoints have their own stricter limiters
// applied directly in routes.ts.
app.use("/api", apiLimiter);

app.use((req, res, next) => {
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
  // Run essential migrations before starting the server
  await runStartupMigrations();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
