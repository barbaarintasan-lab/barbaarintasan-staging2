import { type Server } from "node:http";
import path from "node:path";

import express, { type Express, type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes, registerHealthCheck } from "./routes";
import { ensureDailyContentAvailable, startCronJobs } from "./cron";
// STRIPE DISABLED - not needed for this app
// import { runMigrations } from 'stripe-replit-sync';
// import { getStripeSync } from './stripeClient';
// import { WebhookHandlers } from './webhookHandlers';


export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

registerHealthCheck(app);

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

const staticCacheOptions = { maxAge: '7d', immutable: false };
const hashedAssetCache = { maxAge: '1y', immutable: true };

app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'), staticCacheOptions));

const courseImagesPath = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'dist', 'public', 'course-images')
  : path.join(process.cwd(), 'client', 'public', 'course-images');
app.use('/course-images', express.static(courseImagesPath, staticCacheOptions));

if (process.env.NODE_ENV === 'production') {
  app.use('/assets', express.static(path.join(process.cwd(), 'dist', 'public', 'assets'), hashedAssetCache));
}

// STRIPE DISABLED - all Stripe functionality removed

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

      if (duration > 500) {
        log(`SLOW: ${req.method} ${path} - ${duration}ms`, "perf");
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const isStaging = process.env.STAGING === 'true';
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    if (isStaging) {
      log(`[STAGING] Cron schedules disabled; running daily content self-heal only`);
      setTimeout(() => {
        ensureDailyContentAvailable("staging-startup");
      }, 3000);

      // Keep staging content fresh without enabling all cron jobs.
      setInterval(() => {
        ensureDailyContentAvailable("staging-hourly-self-heal");
      }, 60 * 60 * 1000);
    } else {
      startCronJobs();
    }
  });
}
