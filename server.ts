import express from "express";
import path from "path";
import cors from "cors";
import axios from "axios";
import { snapsave } from "snapsave-media-downloader";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// API to extract Instagram media URL
app.post("/api/extract", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes("instagram.com")) {
    return res.status(400).json({ error: "Invalid Instagram URL" });
  }

  try {
    // Clean URL
    const cleanUrl = url.split("?")[0];
    
    // Try to use snapsave to fetch media
    const result = await snapsave(cleanUrl);
    
    if (result && result.success && result.data && result.data.media && result.data.media.length > 0) {
      console.log(`Successfully extracted ${result.data.media.length} media items via snapsave.`);
      
      const mediaList = result.data.media.map((m: any) => ({
        url: m.url,
        type: m.type === "video" ? "video" : "image",
        thumbnail: m.thumbnail || m.url,
        quality: "HD"
      }));

      return res.json({
        media: mediaList,
        title: "Instagram Media", // Snapsave doesn't always provide title, so we use a default
      });
    } else {
      return res.status(404).json({ error: "Could not find media content. Instagram might be blocking this request or the account is private." });
    }

  } catch (error: any) {
    console.error("Extraction error:", error.message);
    res.status(500).json({ error: "Failed to fetch Instagram content. It might be a private post or Instagram is blocking the server." });
  }
});

// Proxy to download or stream the file (bypasses CORS)
app.get("/api/proxy", async (req, res) => {
  const { url, filename, download } = req.query;

  if (!url) {
    return res.status(400).send("URL is required");
  }

  try {
    const targetUrl = url as string;
    const isRapidCdn = targetUrl.includes("rapidcdn.app") || targetUrl.includes("snapcdn");
    
    const headers: any = {
      "User-Agent": getRandomUserAgent(),
    };

    // Only send Instagram referer if we are fetching directly from Instagram CDN
    if (!isRapidCdn) {
      headers["Referer"] = "https://www.instagram.com/";
    }

    const response = await axios({
      method: "get",
      url: targetUrl,
      responseType: "stream",
      headers,
    });

    const contentType = response.headers["content-type"];
    if (typeof contentType === "string") {
      res.setHeader("Content-Type", contentType);
    }

    if (download === "true") {
      res.setHeader("Content-Disposition", `attachment; filename="${filename || "instagram_media.mp4"}"`);
    } else {
      res.setHeader("Content-Disposition", "inline");
    }

    response.data.pipe(res);
  } catch (error: any) {
    console.error("Proxy error for URL:", url);
    console.error(error.message);
    res.status(500).send("Failed to proxy media");
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
