// server.ts (ama index.ts)
import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import type { Express } from "express";
import express from "express";
import { nanoid } from "nanoid";
import { createServer as createViteServer, createLogger } from "vite";

import runApp from "./app";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // ✅ Serve static files from public folder
  // assetlinks.json waa public/.well-known/assetlinks.json
  app.use(express.static(path.join(import.meta.dirname, "..", "public")));

  // Vite middleware
  app.use(vite.middlewares);

  // All other routes (SPA fallback)
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip static asset requests handled by express.static
    if (url.startsWith('/attached_assets/')) {
      return next();
    }

    try {
      // Separate HTML for /sheeko routes
      const isSheeko = url.startsWith('/sheeko');
      const htmlFile = isSheeko ? "sheeko.html" : "index.html";

      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        htmlFile
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// Boot the app
(async () => {
  const app = express();
  const server = app.listen(process.env.PORT || 8080, () => {
    console.log('Server running');
  });

  await runApp(() => setupVite(app, server));
})();
