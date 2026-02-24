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

  app.use("/.well-known", express.static(path.join(distPath, ".well-known"), {
    dotfiles: "allow",
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Content-Type", "application/json");
    },
  }));

  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  app.use(express.static(distPath, {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
      if (filePath.endsWith(".json")) {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
      if (filePath.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/)) {
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      }
    },
  }));

  let indexHtmlCache: string | null = null;
  let sheekoHtmlCache: string | null = null;

  app.get("*", (req, res) => {
    if (req.path.startsWith('/sheeko')) {
      if (!sheekoHtmlCache) {
        sheekoHtmlCache = getSheekoHtml(distPath);
      }
      res.set({
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }).send(sheekoHtmlCache);
    } else {
      if (!indexHtmlCache) {
        indexHtmlCache = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
      }
      res.set({
        "Content-Control": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }).send(indexHtmlCache);
    }
  });
}

(async () => {
  await runApp(serveStatic);
})();
