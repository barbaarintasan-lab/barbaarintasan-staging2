import fs from "node:fs";
import path from "node:path";
import express from "express";

const router = express.Router();
const ONE_YEAR_CACHE = "public, max-age=31536000, immutable";

function resolvePublicRoot() {
  const roots = [
    path.join(process.cwd(), "dist", "public"),
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "client", "public"),
  ];

  for (const candidate of roots) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return roots[0];
}

function withAudioHeaders(res) {
  res.setHeader("Cache-Control", ONE_YEAR_CACHE);
  res.setHeader("Content-Type", "audio/mpeg");
}

// GET /api/audio/alphabet/:file
router.get("/api/audio/alphabet/:file", async (req, res) => {
  try {
    const fileName = String(req.params.file || "").trim();

    // Keep filenames strict to avoid path traversal
    if (!/^[a-z0-9_-]+\.mp3$/i.test(fileName)) {
      return res.status(400).json({ error: "Invalid file name" });
    }

    const publicRoot = resolvePublicRoot();
    const filePath = path.join(publicRoot, "tts", "alphabet", fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    withAudioHeaders(res);
    return res.sendFile(filePath);
  } catch (error) {
    console.error("[AUDIO] alphabet route error:", error);
    return res.status(500).json({ error: "Failed to load alphabet audio" });
  }
});

function pad3(value) {
  return String(value).padStart(3, "0");
}

function resolveQuranCdnUrl(surah, ayah, reciterFolder = "Husary_Muallim_128kbps") {
  const s = pad3(surah);
  const a = pad3(ayah);
  return `https://everyayah.com/data/${reciterFolder}/${s}${a}.mp3`;
}

// GET /api/audio/quran/:surah/:ayah
// Query:
//   ?stream=1 -> proxy/stream audio
//   ?reciter=Husary_Muallim_128kbps -> change reciter folder
router.get("/api/audio/quran/:surah/:ayah", async (req, res) => {
  try {
    const surah = Number.parseInt(String(req.params.surah), 10);
    const ayah = Number.parseInt(String(req.params.ayah), 10);

    if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
      return res.status(400).json({ error: "Invalid surah" });
    }

    if (!Number.isInteger(ayah) || ayah < 1 || ayah > 286) {
      return res.status(400).json({ error: "Invalid ayah" });
    }

    const reciterFolder = String(req.query.reciter || "Husary_Muallim_128kbps");
    const audioUrl = resolveQuranCdnUrl(surah, ayah, reciterFolder);

    if (String(req.query.stream || "0") === "1") {
      const upstream = await fetch(audioUrl);
      if (!upstream.ok || !upstream.body) {
        return res.status(502).json({ error: "Upstream audio not available" });
      }

      withAudioHeaders(res);
      // Convert web stream to node stream and pipe
      const { Readable } = await import("node:stream");
      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.pipe(res);
      return;
    }

    return res.json({
      audioUrl,
      reciter: "Husary",
      ayah,
      surah,
    });
  } catch (error) {
    console.error("[AUDIO] quran route error:", error);
    return res.status(500).json({ error: "Failed to fetch quran audio" });
  }
});

export function registerAudioRoutes(app) {
  app.use(router);
}

export default router;
