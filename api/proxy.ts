import axios from "axios";

const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
}
