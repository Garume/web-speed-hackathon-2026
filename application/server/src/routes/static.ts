import fs from "node:fs";
import path from "node:path";

import history from "connect-history-api-fallback";
import { Router } from "express";
import serveStatic from "serve-static";

import { Post } from "@web-speed-hackathon-2026/server/src/models";
import {
  CLIENT_DIST_PATH,
  PUBLIC_PATH,
  UPLOAD_PATH,
} from "@web-speed-hackathon-2026/server/src/paths";

export const staticRouter = Router();

type PageInjection = {
  inlineData: string;
  preloadHints: string;
};

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

const HTML_SNAPSHOT_PATHS = [
  "/",
  "/posts/ff93a168-ea7c-4202-9879-672382febfda",
  "/posts/fe6712a1-d9e4-4f6a-987d-e7d08b7f8a46",
  "/posts/fff790f5-99ea-432f-8f79-21d3d49efd1a",
  "/posts/fefe75bd-1b7a-478c-8ecc-2c1ab38b821e",
];

const htmlSnapshotCache = new Map<string, string>();

export function clearHtmlCache() {
  htmlSnapshotCache.clear();
}

export async function warmHtmlCache() {
  if (!baseHtml) {
    return;
  }

  await Promise.allSettled(HTML_SNAPSHOT_PATHS.map((reqPath) => warmHtmlSnapshot(reqPath)));
}

async function buildPageInjections(reqPath: string): Promise<PageInjection | null> {
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
      return { preloadHints, inlineData };
    }

    if (reqPath.startsWith("/posts/")) {
      const postId = reqPath.split("/")[2];
      if (postId) {
        const post = await Post.findByPk(postId);
        if (post) {
          preloadHints += getPostMediaHint(post);
          inlineData = `<script>window.__INITIAL_POST__=${JSON.stringify(post)};</script>`;
          return { preloadHints, inlineData };
        }
      }
    }
  } catch {
    // Silently fail
  }

  return null;
}

async function buildInjectedHtml(reqPath: string): Promise<string | null> {
  const injections = await buildPageInjections(reqPath);
  if (injections == null) {
    return null;
  }

  let html = baseHtml;
  if (injections.preloadHints) {
    html = html.replace("</head>", `${injections.preloadHints}</head>`);
  }
  if (injections.inlineData) {
    html = html.replace("<div id=\"app\">", `${injections.inlineData}<div id="app">`);
  }
  return html;
}

async function warmHtmlSnapshot(reqPath: string) {
  const html = await buildInjectedHtml(reqPath);
  if (html == null) {
    htmlSnapshotCache.delete(reqPath);
    return;
  }

  htmlSnapshotCache.set(reqPath, html);
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

  res.setHeader("Content-Type", "text/html; charset=UTF-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(htmlSnapshotCache.get(req.path) ?? baseHtml);
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
