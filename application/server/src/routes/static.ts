import fs from "node:fs";
import path from "node:path";

import history from "connect-history-api-fallback";
import type { Request, Response } from "express";
import { Router } from "express";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  const staticTermsApp = renderToStaticMarkup(createElement(TermsStaticApp));
  termsHtml =
    `<!doctype html><html lang="ja"><head><meta charset="UTF-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<meta name="theme-color" content="#f5f5f4"><meta name="description" content="Web Speed Hackathon 2026">` +
    `<title>利用規約 - CaX</title>` +
    `<style>` +
    `@font-face{font-family:"Rei no Are Mincho";font-display:block;src:url(/fonts/ReiNoAreMincho-Regular.woff2) format("woff2"),url(/fonts/ReiNoAreMincho-Regular.otf) format("opentype");font-weight:400;}` +
    `@font-face{font-family:"Rei no Are Mincho";font-display:block;src:url(/fonts/ReiNoAreMincho-Heavy.woff2) format("woff2"),url(/fonts/ReiNoAreMincho-Heavy.otf) format("opentype");font-weight:700;}` +
    `*{box-sizing:border-box}body{margin:0;background:#f5f5f4;color:#042f2e;font-family:ui-sans-serif,system-ui,sans-serif}` +
    `a{text-decoration:none;color:inherit}ul{margin:0;padding:0;list-style:none}` +
    `.terms-layout{position:relative;z-index:0;display:flex;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif}` +
    `.terms-frame{display:flex;min-height:100vh;max-width:100%;background:#fff;color:#042f2e}` +
    `.terms-aside{position:relative;z-index:10}` +
    `.terms-nav{position:fixed;right:0;bottom:0;left:0;z-index:10;height:48px;border-top:1px solid #d6d3d1;background:#fff}` +
    `.terms-nav-inner{position:relative;display:grid;grid-auto-flow:column;align-items:center;justify-content:space-evenly}` +
    `.terms-nav-list{display:grid;grid-auto-flow:column;align-items:center;justify-content:space-evenly;width:100%}` +
    `.terms-nav-link,.terms-nav-button{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:9999px;border:0;background:transparent;color:inherit;padding:0;cursor:pointer}` +
    `.terms-nav-link.is-active{color:#0f766e}.terms-nav-icon{position:relative;font-size:20px}.terms-nav-label{display:none}` +
    `.terms-main{position:relative;z-index:0;width:100vw;max-width:640px;min-width:0;flex-shrink:1;padding-bottom:48px}` +
    `.terms-page article{padding:0 8px 64px;line-height:1.625}.terms-page h1,.terms-page h2{font-family:"Rei no Are Mincho",serif;line-height:normal;font-weight:700}` +
    `.terms-page h1{margin:16px 0 8px;font-size:30px}.terms-page h2{margin:16px 0 8px;font-size:24px}` +
    `.terms-page p{margin:16px 0}.terms-page ol{margin:0;padding-left:32px;list-style:decimal}.terms-page li{margin:0}` +
    `.terms-page p.text-right{text-align:right}` +
    `@media (min-width:768px){.terms-page article{padding:8px 16px 64px}}` +
    `@media (min-width:640px){.terms-nav-link,.terms-nav-button{width:96px;height:auto;border-radius:0.125rem;padding:0 8px}.terms-nav-label{display:inline;font-size:14px}.terms-nav-icon{font-size:20px}}` +
    `@media (min-width:1024px){.terms-nav{position:relative;right:auto;bottom:auto;left:auto;width:192px;height:100%;border-top:0;border-right:1px solid #d6d3d1}` +
    `.terms-nav-inner{position:fixed;display:flex;flex-direction:column;justify-content:space-between;height:100%;width:192px;padding:8px}` +
    `.terms-nav-list{grid-auto-flow:row;justify-content:start;gap:8px}.terms-nav-link,.terms-nav-button{flex-direction:row;justify-content:flex-start;width:auto;height:auto;border-radius:9999px;padding:8px 16px}` +
    `.terms-nav-label{font-size:20px;font-weight:700}.terms-nav-icon{font-size:30px;padding-right:8px}.terms-main{padding-bottom:0}}` +
    `</style></head><body><div id="app">${staticTermsApp}</div></body></html>`;
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
  res.setHeader("Cache-Control", "no-cache");
  res.type("text/html; charset=UTF-8").send(termsHtml);
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
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-cache");
        return;
      }

      setImmutableCacheHeaders(res);
    },
  }),
);
