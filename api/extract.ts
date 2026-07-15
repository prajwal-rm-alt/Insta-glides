import { snapsave } from "snapsave-media-downloader";

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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body || {};

  if (!url || !url.includes("instagram.com")) {
    return res.status(400).json({ error: "Invalid Instagram URL" });
  }

  try {
    const cleanUrl = url.split("?")[0];
    const result = await snapsave(cleanUrl);
    
    if (result && result.success && result.data && result.data.media && result.data.media.length > 0) {
      const mediaList = result.data.media.map((m: any) => ({
        url: m.url,
        type: m.type === "video" ? "video" : "image",
        thumbnail: m.thumbnail || m.url,
        quality: "HD"
      }));

      return res.status(200).json({
        media: mediaList,
        title: "Instagram Media", 
      });
    } else {
      return res.status(404).json({ error: "Could not find media content." });
    }
  } catch (error: any) {
    console.error("Extraction error:", error.message);
    return res.status(500).json({ error: "Failed to fetch Instagram content." });
  }
}
