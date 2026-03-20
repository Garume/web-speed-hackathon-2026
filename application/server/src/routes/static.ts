import fs from "node:fs";
import path from "node:path";

import history from "connect-history-api-fallback";
import { Router } from "express";
import serveStatic from "serve-static";

import { Post } from "@web-speed-hackathon-2026/server/src/models";
import { User } from "@web-speed-hackathon-2026/server/src/models";
import {
  CLIENT_DIST_PATH,
  PUBLIC_PATH,
  UPLOAD_PATH,
} from "@web-speed-hackathon-2026/server/src/paths";

export const staticRouter = Router();

function setImmutableCacheHeaders(
  res: Parameters<NonNullable<serveStatic.ServeStaticOptions["setHeaders"]>>[0],
) {
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
}

// Read HTML at startup for dynamic preload injection
let baseHtml = "";
try {
  baseHtml = fs.readFileSync(path.join(CLIENT_DIST_PATH, "index.html"), "utf8");
} catch {
  // Will be populated after build
}

function getPostImageHint(post: any): string {
  const images = post.images;
  if (images && images.length > 0) {
    return `<link rel="preload" href="/images/${images[0].id}.webp" as="image" type="image/webp" fetchpriority="high">`;
  }
  return "";
}

function getPostMediaHint(post: any): string {
  const hint = getPostImageHint(post);
  if (hint) return hint;
  const movie = post.movie;
  if (movie) {
    return `<link rel="preload" href="/movies/${movie.id}.mp4" as="video" fetchpriority="high">`;
  }
  return "";
}

// Cache preload hints to avoid DB queries on every request
const hintsCache = new Map<string, { html: string; time: number }>();
const CACHE_TTL = 60000; // 1 minute

async function getPageInjections(reqPath: string): Promise<{ preloadHints: string; inlineData: string }> {
  const cached = hintsCache.get(reqPath);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return JSON.parse(cached.html);
  }

  let preloadHints = "";
  let inlineData = "";

  try {
    if (reqPath === "/") {
      // Home page: inline first posts to eliminate API round-trip
      const posts = await Post.findAll({ limit: 10, offset: 0 });
      if (posts.length > 0) {
        inlineData = `<script>window.__INITIAL_POSTS__=${JSON.stringify(posts)};</script>`;
        // Only preload images (not videos - too heavy, steals bandwidth from JS)
        for (const post of posts) {
          const hint = getPostImageHint(post);
          if (hint) {
            preloadHints += hint;
            break;
          }
        }
      }
    } else if (reqPath.startsWith("/posts/")) {
      const postId = reqPath.split("/")[2];
      if (postId) {
        const post = await Post.findByPk(postId);
        if (post) {
          preloadHints += getPostMediaHint(post);
          inlineData = `<script>window.__INITIAL_POST__=${JSON.stringify(post)};</script>`;
        }
      }
    } else if (reqPath.startsWith("/users/")) {
      const username = reqPath.split("/")[2];
      if (username) {
        const user = await User.findOne({
          where: {
            username,
          },
        });

        if (user) {
          const posts = await Post.findAll({
            limit: 10,
            offset: 0,
            where: {
              userId: user.id,
            },
          });

          inlineData = `<script>window.__INITIAL_USER__=${JSON.stringify(user)};window.__INITIAL_TIMELINE__=${JSON.stringify(posts)};</script>`;
        }
      }
    }
  } catch {
    // Silently fail
  }

  const result = { preloadHints, inlineData };
  hintsCache.set(reqPath, { html: JSON.stringify(result), time: Date.now() });
  return result;
}

// Handle SPA routes with dynamic preload hints - BEFORE history() and serve-static
staticRouter.use(async (req, res, next) => {
  // Skip if no base HTML yet
  if (!baseHtml) {
    return next();
  }

  // Skip static file requests (have file extensions) and API routes
  const lastSegment = req.path.split("/").pop() || "";
  if (lastSegment.includes(".") || req.path.startsWith("/api/")) {
    return next();
  }

  // This is a SPA route - serve HTML with dynamic preload hints
  try {
    const { preloadHints, inlineData } = await getPageInjections(req.path);
    let html = baseHtml;
    if (preloadHints) {
      html = html.replace("</head>", `${preloadHints}</head>`);
    }
    if (inlineData) {
      html = html.replace("<div id=\"app\">", `${inlineData}<div id="app">`);
    }
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(html);
  } catch {
    next();
  }
});

// Fallback: SPA support for any routes not caught above
staticRouter.use(history());

staticRouter.use(
  serveStatic(UPLOAD_PATH, {
    setHeaders: setImmutableCacheHeaders,
  }),
);

staticRouter.use(
  serveStatic(PUBLIC_PATH, {
    setHeaders: setImmutableCacheHeaders,
  }),
);

staticRouter.use(
  serveStatic(CLIENT_DIST_PATH, {
    setHeaders: (res, filePath) => {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-cache");
        return;
      }

      setImmutableCacheHeaders(res);
    },
  }),
);
