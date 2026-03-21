import fs from "node:fs";
import path from "node:path";

import history from "connect-history-api-fallback";
import type { Request, Response } from "express";
import { Router } from "express";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import serveStatic from "serve-static";

import { Post } from "@web-speed-hackathon-2026/server/src/models";
import {
  CLIENT_DIST_PATH,
  PUBLIC_PATH,
  UPLOAD_PATH,
} from "@web-speed-hackathon-2026/server/src/paths";
import { TermsStaticApp } from "@web-speed-hackathon-2026/server/src/utils/TermsStaticApp";

export const staticRouter = Router();

type PageInjection = {
  heroImage: string;
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

let termsHtml = "";
try {
  const termsTemplate = fs.readFileSync(path.join(CLIENT_DIST_PATH, "terms.html"), "utf8");
  const termsAppHtml = renderToString(createElement(TermsStaticApp));
  termsHtml = termsTemplate.replace('<div id="app"></div>', `<div id="app">${termsAppHtml}</div>`);
} catch {
  // Will be populated after build
}

function getHeroImageTag(imageId: string): string {
  return (
    `<img id="lcp-hero" src="/images/${imageId}.jpg" alt="" fetchpriority="high" loading="eager" ` +
    `decoding="async" style="position:fixed;top:0;left:0;width:100vw;height:56.25vw;max-height:50vh;` +
    `object-fit:cover;z-index:-1;pointer-events:none;opacity:0.01">`
  );
}

function getPostImageHint(post: any): string {
  const images = post.images;
  if (images && images.length > 0) {
    return `<link rel="preload" href="/images/${images[0].id}.jpg" as="image" fetchpriority="high">`;
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
  let heroImage = "";
  let preloadHints = "";
  let inlineData = "";

  try {
    if (reqPath === "/") {
      const posts = await Post.findAll({ limit: 10, offset: 0 });
      if (posts.length > 0) {
        inlineData = `<script>window.__INITIAL_POSTS__=${JSON.stringify(posts)};</script>`;
        for (const post of posts) {
          const images = (post as any).images;
          if (images && images.length > 0) {
            const imageId = images[0].id;
            preloadHints += `<link rel="preload" href="/images/${imageId}.jpg" as="image" fetchpriority="high">`;
            heroImage = getHeroImageTag(imageId);
            break;
          }
        }
      }
      return { heroImage, inlineData, preloadHints };
    }

    if (reqPath.startsWith("/posts/")) {
      const postId = reqPath.split("/")[2];
      if (postId) {
        const post = await Post.findByPk(postId);
        if (post) {
          preloadHints += getPostMediaHint(post);
          inlineData = `<script>window.__INITIAL_POST__=${JSON.stringify(post)};</script>`;
          const images = (post as any).images;
          if (images && images.length > 0) {
            heroImage = getHeroImageTag(images[0].id);
          }
          return { heroImage, inlineData, preloadHints };
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
  if (injections.heroImage) {
    html = html.replace("<div id=\"app\">", `${injections.heroImage}<div id="app">`);
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

function sendTermsHtml(_req: Request, res: Response) {
  const html = termsHtml || baseHtml;
  if (!html) {
    res.status(503).end();
    return;
  }

  res.setHeader("Cache-Control", "no-cache");
  res.type("text/html; charset=UTF-8").send(html);
}

staticRouter.get("/terms", sendTermsHtml);
staticRouter.get("/terms/", sendTermsHtml);

staticRouter.use(async (req, res, next) => {
  if (!baseHtml) {
    return next();
  }

  const lastSegment = req.path.split("/").pop() || "";
  if (lastSegment.includes(".") || req.path.startsWith("/api/")) {
    return next();
  }

  res.setHeader("Content-Type", "text/html; charset=UTF-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(htmlSnapshotCache.get(req.path) ?? baseHtml);
});

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
      const basename = path.basename(filePath);
      if (basename === "index.html" || basename === "terms.html") {
        res.setHeader("Cache-Control", "no-cache");
        return;
      }

      setImmutableCacheHeaders(res);
    },
  }),
);
