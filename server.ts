import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser middleware
  app.use(express.json());

  // Proxy request to bypass CORS for images/videos
  app.get("/api/proxy", async (req, res) => {
    try {
      const { url, dl } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).send("No URL provided");
      }

      const headers: any = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      };
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
        console.log(`[Proxy] Range request: ${req.headers.range} for ${url}`);
      } else {
        console.log(`[Proxy] Full request for ${url}`);
      }

      const response = await fetch(url, { headers });
      console.log(`[Proxy] Response status: ${response.status} ${response.statusText} for ${url}`);
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

      // Stream the response directly to avoid memory buffering delays and improve TTFB
      if (response.body) {
        const bodyType = response.body.constructor.name;
        if (bodyType === "ReadableStream") {
          try {
            for await (const chunk of response.body as any) {
              res.write(chunk);
            }
            res.end();
          } catch (streamErr) {
            console.error("[Proxy Stream Error]:", streamErr);
            if (!res.headersSent) {
              res.status(500).end();
            } else {
              res.end();
            }
          }
        } else if (typeof (response.body as any).pipe === 'function') {
          (response.body as any).pipe(res);
        } else {
          res.send(Buffer.from(await response.arrayBuffer()));
        }
      } else {
        res.end();
      }
    } catch (e: any) {
      console.error("[Proxy Error]:", e.stack || e.message || e);
      require('fs').writeFileSync('proxy-error.log', e.stack || e.message || String(e));
      if (!res.headersSent) {
        res.status(500).send("Proxy error");
      }
    }
  });

  const rapidApiKey = "f2a97f0d4fmsh3f12358e8168654p190e98jsn798748b183c4";
  const rapidApiHost = "instagram120.p.rapidapi.com";

  // Translate low-level API error messages to helpful user messages
  const translateError = (message: string): string => {
    if (!message) return "The profile could not be loaded. Please try again.";
    const lower = message.toLowerCase();
    if (
      lower.includes("download link not found") ||
      lower.includes("link not found") ||
      lower.includes("page not found") ||
      lower.includes("not found")
    ) {
      return "This profile is private, restricted, or does not exist. Please verify that the username is spelled correctly and the account is public.";
    }
    return message;
  };

  const isClientError = (message: string): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
      lower.includes("download link not found") ||
      lower.includes("link not found") ||
      lower.includes("page not found") ||
      lower.includes("not found") ||
      lower.includes("invalid") ||
      lower.includes("required")
    );
  };

  const logRapidApiError = (context: string, status: number, errText: string): string => {
    let parsedMessage = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.message) parsedMessage = parsed.message;
    } catch (e) {}
    
    if (isClientError(parsedMessage)) {
      console.warn(`[RapidAPI Warning] ${context} (status ${status}):`, parsedMessage);
    } else {
      console.error(`[RapidAPI Error] ${context} (status ${status}):`, parsedMessage);
    }
    return parsedMessage;
  };

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
          const parsedMsg = logRapidApiError("posts fetch", response.status, errText);
          throw new Error(`API returned ${response.status}: ${parsedMsg}`);
        }
        const parsed = await response.json();
        if (parsed && parsed.success === false) {
          throw new Error(parsed.message || "Failed to fetch posts");
        }
        return parsed;
      });
      return res.json(data);
    } catch (error: any) {
      const isClient = isClientError(error.message);
      if (isClient) {
        console.warn("[Posts fetching warning]:", error.message);
        return res.status(404).json({ error: "Failed to fetch posts", message: translateError(error.message) });
      } else {
        console.error("[Posts fetching error]:", error);
        return res.status(500).json({ error: "Failed to fetch posts", message: translateError(error.message) });
      }
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
          const parsedMsg = logRapidApiError("userInfo fetch", response.status, errText);
          throw new Error(`API returned ${response.status}: ${parsedMsg}`);
        }
        const parsed = await response.json();
        if (parsed && parsed.success === false) {
          throw new Error(parsed.message || "Failed to fetch user info");
        }
        return parsed;
      });
      return res.json(data);
    } catch (error: any) {
      const isClient = isClientError(error.message);
      if (isClient) {
        console.warn("[User Info fetching warning]:", error.message);
        return res.status(404).json({ error: "Failed to fetch user info", message: translateError(error.message) });
      } else {
        console.error("[User Info fetching error]:", error);
        return res.status(500).json({ error: "Failed to fetch user info", message: translateError(error.message) });
      }
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
          const parsedMessage = logRapidApiError("profile posts fetch", postsResponse.status, errText);
          throw new Error(`API returned ${postsResponse.status}: ${parsedMessage}`);
        }
        
        const postsData = await postsResponse.json();
        if (postsData && postsData.success === false) {
          throw new Error(postsData.message || "Failed to fetch profile");
        }
        
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
      const isClient = isClientError(error.message);
      if (isClient) {
        console.warn("[Instagram fetching warning]:", error.message);
        return res
          .status(404)
          .json({ error: "Failed to fetch profile", message: translateError(error.message) });
      } else {
        console.error("[Instagram fetching error]:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch profile", message: translateError(error.message) });
      }
    }
  });

  // API Route: Stories
  app.get("/api/stories/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const highlightId = req.query.highlight_id as string;
      const cacheKey = highlightId ? `stories_${username}_${highlightId}` : `stories_${username}`;
      const data = await fetchWithCache(cacheKey, async () => {
        const bodyPayload: any = { username };
        if (highlightId) {
          bodyPayload.highlight_id = highlightId;
        }
        
        const response = await fetch(
          `https://${rapidApiHost}/api/instagram/stories`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": rapidApiHost,
              "x-rapidapi-key": rapidApiKey,
            },
            body: JSON.stringify(bodyPayload),
          },
        );

        if (!response.ok) {
          const errText = await response.text();
          const parsedMessage = logRapidApiError("stories fetch", response.status, errText);
          throw new Error(`API returned ${response.status}: ${parsedMessage}`);
        }
        const parsed = await response.json();
        if (parsed && parsed.success === false) {
          throw new Error(parsed.message || "Failed to fetch stories");
        }
        return parsed;
      });
      return res.json(data);
    } catch (error: any) {
      const isClient = isClientError(error.message);
      if (isClient) {
        console.warn("[Stories fetching warning]:", error.message);
        return res
          .status(404)
          .json({ error: "Failed to fetch stories", message: translateError(error.message) });
      } else {
        console.error("[Stories fetching error]:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch stories", message: translateError(error.message) });
      }
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
          const parsedMessage = logRapidApiError("highlights fetch", response.status, errText);
          throw new Error(`API returned ${response.status}: ${parsedMessage}`);
        }
        const parsed = await response.json();
        if (parsed && parsed.success === false) {
          throw new Error(parsed.message || "Failed to fetch highlights");
        }
        return parsed;
      });
      return res.json(data);
    } catch (error: any) {
      const isClient = isClientError(error.message);
      if (isClient) {
        console.warn("[Highlights fetching warning]:", error.message);
        return res
          .status(404)
          .json({ error: "Failed to fetch highlights", message: translateError(error.message) });
      } else {
        console.error("[Highlights fetching error]:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch highlights", message: translateError(error.message) });
      }
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
