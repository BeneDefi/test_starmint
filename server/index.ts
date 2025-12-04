import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const app = express();

// ✅ Required for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Trust proxy: enable for Replit/Render/Heroku/etc.
if (process.env.NODE_ENV === "production" || process.env.REPL_ID) {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", false);
}

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        mediaSrc: ["'self'"],
        frameAncestors: [
          "'self'",
          "https://warpcast.com",
          "https://*.warpcast.com",
          "https://farcaster.xyz",
          "https://*.farcaster.xyz",
          "https://frames.neynar.com",
          "https://*.frames.neynar.com",
          "https://client.warpcast.com",
          "https://miniapp.warpcast.com",
          "https://*.replit.com",
          "https://*.repl.co",
          "https://*.replit.dev",
          "https://*.onrender.com",
          "*" // Allow all origins for maximum compatibility
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // Required for Coinbase Wallet SDK
    frameguard: false, // Disable X-Frame-Options since we're using CSP frame-ancestors
  })
);

app.use(
  cors({
    origin: true, // Allow all origins for frame embedding compatibility
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many API requests, please try again later." },
});

app.use(limiter);
app.use("/api", apiLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const pathUrl = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathUrl.startsWith("/api")) {
      let logLine = `${req.method} ${pathUrl} ${res.statusCode} in ${duration}ms`;
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
  const server = await registerRoutes(app);

  // ✅ Centralized error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error ${status}: ${message}`);
    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    }
    res.status(status).json({ message });
  });

  // ✅ Always serve Farcaster manifest
  const manifestPath = path.resolve(process.cwd(), "public/.well-known");
  console.log("Serving Farcaster manifest from:", manifestPath);
  app.use("/.well-known", express.static(manifestPath));

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);

    // ✅ Catch-all fallback for React Router
    const clientDist = path.resolve(process.cwd(), "client/dist");
    app.get("*", (req, res) => {
      const indexPath = path.join(clientDist, "index.html");
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("index.html not found");
      }
    });
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`🚀 Serving on port ${port}`);
    }
  );
})();
