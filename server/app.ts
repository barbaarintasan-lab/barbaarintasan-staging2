import { type Server } from "node:http";
import path from "node:path";
import crypto from "node:crypto";

import express, { type Express, type Request, Response, NextFunction } from "express";
import { registerRoutes, registerHealthCheck } from "./routes";
import { startCronJobs } from "./cron";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';

// Memory usage monitoring - logs every 60 seconds
setInterval(() => {
  const m = process.memoryUsage();
  console.log({
    rss: Math.round(m.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(m.heapUsed / 1024 / 1024) + 'MB',
  });
}, 60000);

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

// Serve attached_assets folder for static images (flashcards, etc.)
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Serve course images from the built public folder (for Fly.io production)
// In production, dist/public/course-images contains the images
// In development, client/public/course-images contains them
const courseImagesPath = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'dist', 'public', 'course-images')
  : path.join(process.cwd(), 'client', 'public', 'course-images');
app.use('/course-images', express.static(courseImagesPath));

// Register health check endpoint first (before any middleware that might slow it down)
registerHealthCheck(app);

// Initialize Stripe schema and sync data
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[STRIPE] DATABASE_URL not found, skipping Stripe initialization');
    return;
  }

  try {
    console.log('[STRIPE] Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('[STRIPE] Schema ready');

    const stripeSync = await getStripeSync();

    console.log('[STRIPE] Setting up managed webhook...');
    // Use custom domain for production, fallback to Replit domain for development
    const customDomain = 'appbarbaarintasan.com';
    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const webhookBaseUrl = isProduction ? `https://${customDomain}` : `https://${replitDomain}`;
    
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      if (result?.webhook?.url) {
        console.log(`[STRIPE] Webhook configured: ${result.webhook.url}`);
      } else {
        console.log('[STRIPE] Webhook setup skipped (no URL returned)');
        console.log('[STRIPE] NOTE: Configure webhook manually in Stripe Dashboard:');
        console.log(`[STRIPE]   URL: https://${customDomain}/api/stripe/webhook`);
        console.log('[STRIPE]   Events: checkout.session.completed');
      }
    } catch (webhookError) {
      console.log('[STRIPE] Webhook setup skipped:', webhookError);
      console.log('[STRIPE] NOTE: Configure webhook manually in Stripe Dashboard:');
      console.log(`[STRIPE]   URL: https://${customDomain}/api/stripe/webhook`);
    }

    console.log('[STRIPE] Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('[STRIPE] Data synced'))
      .catch((err: any) => console.error('[STRIPE] Error syncing:', err));
  } catch (error) {
    console.error('[STRIPE] Initialization failed:', error);
  }
}

// Initialize Stripe (async, non-blocking)
initStripe().catch(console.error);

// Test endpoint to verify webhook is accessible
app.get('/api/stripe/webhook-test', (req, res) => {
  console.log('[STRIPE] Webhook test endpoint accessed');
  res.json({ 
    status: 'ok', 
    message: 'Stripe webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// Register Stripe webhook route BEFORE express.json() - needs raw Buffer
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log('[STRIPE WEBHOOK] ====== WEBHOOK REQUEST RECEIVED ======');
    console.log('[STRIPE WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2));
    
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      console.error('[STRIPE WEBHOOK] ERROR: Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('[STRIPE WEBHOOK] ERROR: Body is not a Buffer, type:', typeof req.body);
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      console.log('[STRIPE WEBHOOK] Processing webhook with payload size:', req.body.length, 'bytes');
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      console.log('[STRIPE WEBHOOK] ====== WEBHOOK PROCESSED SUCCESSFULLY ======');
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('[STRIPE WEBHOOK] ERROR:', error.message);
      console.error('[STRIPE WEBHOOK] Stack:', error.stack);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

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
      log(`[STAGING] Cron jobs disabled in staging environment`);
    } else {
      startCronJobs();
    }
  });
}
