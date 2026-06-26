import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser middleware
  app.use(express.json());

  // Simple LRU cache for proxied media files to avoid repeated remote fetches and load instantly
  const mediaCache = new Map<string, { buffer: Buffer; contentType: string; headers: any }>();
  const MAX_MEDIA_CACHE_SIZE = 150;

  // Proxy request to bypass CORS for images/videos
  app.get("/api/proxy", async (req, res) => {
    try {
      const { url, dl } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).send("No URL provided");
      }

      // Check if media is already cached in memory (only cache if it's not a Range request)
      const isRangeRequest = !!req.headers.range;
      if (!isRangeRequest && !dl && mediaCache.has(url)) {
        const cachedMedia = mediaCache.get(url)!;
        res.setHeader("Content-Type", cachedMedia.contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("X-Cache", "HIT");
        return res.send(cachedMedia.buffer);
      }

      const headers: any = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      };
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const response = await fetch(url, { headers });
      if (!response.ok && response.status !== 206) {
        return res
          .status(response.status)
          .send(`Failed to fetch media: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);

      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const contentRange = response.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);

      const acceptRanges = response.headers.get("accept-ranges");
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

      res.status(response.status); // Forward 206 if it's a partial content
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      if (dl === "1") {
        const ext = contentType?.includes("video") ? "mp4" : "jpg";
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="ig_media_${Date.now()}.${ext}"`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Store in Cache if not a Range request and cache is not too full
      if (!isRangeRequest && !dl && buffer.length < 5 * 1024 * 1024) { // Only cache files < 5MB to keep memory low
        if (mediaCache.size >= MAX_MEDIA_CACHE_SIZE) {
          // Delete first entry (oldest)
          const firstKey = mediaCache.keys().next().value;
          if (firstKey !== undefined) {
            mediaCache.delete(firstKey);
          }
        }
        mediaCache.set(url, {
          buffer,
          contentType,
          headers: {
            "Content-Type": contentType,
          },
        });
      }

      res.send(buffer);
    } catch (e: any) {
      console.error("[Proxy Error]:", e.message);
      res.status(500).send("Proxy error");
    }
  });

  const rapidApiKey = "f2a97f0d4fmsh3f12358e8168654p190e98jsn798748b183c4";
  const rapidApiHost = "instagram120.p.rapidapi.com";

  // Simple in-memory cache
  const cache = new Map<string, { data: any; expiry: number }>();
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  const fetchWithCache = async (
    cacheKey: string,
    fetcher: () => Promise<any>,
  ) => {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    const data = await fetcher();
    cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
    return data;
  };

  // API Route: Posts only
  app.get("/api/posts/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const { maxId = "" } = req.query;
      const cacheKey = `posts_${username}_${maxId}`;
      const data = await fetchWithCache(cacheKey, async () => {
        const response = await fetch(
          `https://${rapidApiHost}/api/instagram/posts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": rapidApiHost,
              "x-rapidapi-key": rapidApiKey,
            },
            body: JSON.stringify({ username, maxId }),
          },
        );
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API returned ${response.status}: ${errText}`);
        }
        return await response.json();
      });
      return res.json(data);
    } catch (error: any) {
      console.error("[Posts fetching error]:", error);
      return res.status(500).json({ error: "Failed to fetch posts", message: error.message });
    }
  });

  // API Route: User Info only
  app.get("/api/user-info/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const cacheKey = `user_info_${username}`;
      const data = await fetchWithCache(cacheKey, async () => {
        const response = await fetch(
          `https://${rapidApiHost}/api/instagram/userInfo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": rapidApiHost,
              "x-rapidapi-key": rapidApiKey,
            },
            body: JSON.stringify({ username }),
          },
        );
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API returned ${response.status}: ${errText}`);
        }
        return await response.json();
      });
      return res.json(data);
    } catch (error: any) {
      console.error("[User Info fetching error]:", error);
      return res.status(500).json({ error: "Failed to fetch user info", message: error.message });
    }
  });

  // API Route: Profile and Posts
  app.get("/api/profile/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const { maxId = "" } = req.query;

      const cacheKey = `profile_${username}_${maxId}`;
      const data = await fetchWithCache(cacheKey, async () => {
        const postsPromise = fetch(
          `https://${rapidApiHost}/api/instagram/posts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": rapidApiHost,
              "x-rapidapi-key": rapidApiKey,
            },
            body: JSON.stringify({ username, maxId }),
          },
        );

        let userInfoPromise = Promise.resolve(null);
        if (!maxId) {
          userInfoPromise = fetch(
            `https://${rapidApiHost}/api/instagram/userInfo`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-rapidapi-host": rapidApiHost,
                "x-rapidapi-key": rapidApiKey,
              },
              body: JSON.stringify({ username }),
            },
          );
        }

        const [postsResponse, userInfoResponse] = await Promise.all([postsPromise, userInfoPromise]);

        if (!postsResponse.ok) {
          const errText = await postsResponse.text();
          console.error("RapidAPI Error Body:", errText);
          let parsedMessage = errText;
          try {
            const parsed = JSON.parse(errText);
            if (parsed.message) parsedMessage = parsed.message;
          } catch (e) {}
          throw new Error(`API returned ${postsResponse.status}: ${parsedMessage}`);
        }
        
        const postsData = await postsResponse.json();
        
        if (userInfoResponse && userInfoResponse.ok) {
           try {
               const uiData = await userInfoResponse.json();
               if (uiData.result && uiData.result[0] && uiData.result[0].user) {
                   postsData.user_info = uiData.result[0].user;
               }
           } catch(e) {}
        }

        return postsData;
      });

      return res.json(data);
    } catch (error: any) {
      console.error("[Instagram fetching error]:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch profile", message: error.message });
    }
  });

  // API Route: Stories
  app.get("/api/stories/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const cacheKey = `stories_${username}`;
      const data = await fetchWithCache(cacheKey, async () => {
        const response = await fetch(
          `https://${rapidApiHost}/api/instagram/stories`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": rapidApiHost,
              "x-rapidapi-key": rapidApiKey,
            },
            body: JSON.stringify({ username }),
          },
        );

        if (!response.ok) {
          const errText = await response.text();
          let parsedMessage = errText;
          try {
            const parsed = JSON.parse(errText);
            if (parsed.message) parsedMessage = parsed.message;
          } catch (e) {}
          throw new Error(`API returned ${response.status}: ${parsedMessage}`);
        }
        return await response.json();
      });
      return res.json(data);
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: "Failed to fetch stories", message: error.message });
    }
  });

  // API Route: Highlights
  app.get("/api/highlights/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const cacheKey = `highlights_${username}`;
      const data = await fetchWithCache(cacheKey, async () => {
        const response = await fetch(
          `https://${rapidApiHost}/api/instagram/highlights`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": rapidApiHost,
              "x-rapidapi-key": rapidApiKey,
            },
            body: JSON.stringify({ username }),
          },
        );

        if (!response.ok) {
          const errText = await response.text();
          let parsedMessage = errText;
          try {
            const parsed = JSON.parse(errText);
            if (parsed.message) parsedMessage = parsed.message;
          } catch (e) {}
          throw new Error(`API returned ${response.status}: ${parsedMessage}`);
        }
        return await response.json();
      });
      return res.json(data);
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: "Failed to fetch highlights", message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
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
