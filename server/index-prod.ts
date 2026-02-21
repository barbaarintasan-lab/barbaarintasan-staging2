import fs from "node:fs";
import { type Server } from "node:http";
import path from "node:path";

import express, { type Express, type Request } from "express";

import runApp from "./app";
import { getSheekoHtml } from "./sheekoTemplate";

export async function serveStatic(app: Express, server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Security headers for all responses
  app.use((_req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        // unsafe-inline required for Vite-built SPA inline scripts; unsafe-eval required by framer-motion/livekit
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        // https: wildcard needed for dynamic user content images from various CDNs
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://api.stripe.com https://api.openai.com wss://*.livekit.cloud wss:",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://drive.google.com",
        "media-src 'self' blob: https:",
        "worker-src 'self' blob:",
      ].join("; "),
    );
    next();
  });

  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  app.use(express.static(distPath, {
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }));

  app.get("*", (req, res) => {
    if (req.path.startsWith('/sheeko')) {
      const sheekoHtml = getSheekoHtml(distPath);
      res.set({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }).send(sheekoHtml);
    } else {
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}

(async () => {
  await runApp(serveStatic);
})();
