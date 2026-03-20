import { Router } from "express";
import httpErrors from "http-errors";

import { Comment, Post } from "@web-speed-hackathon-2026/server/src/models";
import { clearHtmlCache, warmHtmlCache } from "@web-speed-hackathon-2026/server/src/routes/static";
import {
  invalidateResponseCacheByPrefix,
  sendCachedJson,
  trySendCachedJson,
} from "@web-speed-hackathon-2026/server/src/utils/response_cache";

export const postRouter = Router();

postRouter.get("/posts", async (req, res) => {
  if (trySendCachedJson(res, req.originalUrl)) {
    return;
  }

  const posts = await Post.findAll({
    limit: req.query["limit"] != null ? Number(req.query["limit"]) : undefined,
    offset: req.query["offset"] != null ? Number(req.query["offset"]) : undefined,
  });

  return sendCachedJson(res, req.originalUrl, posts);
});

postRouter.get("/posts/:postId", async (req, res) => {
  if (trySendCachedJson(res, req.originalUrl)) {
    return;
  }

  const post = await Post.findByPk(req.params.postId);

  if (post === null) {
    throw new httpErrors.NotFound();
  }

  return sendCachedJson(res, req.originalUrl, post);
});

postRouter.get("/posts/:postId/comments", async (req, res) => {
  if (trySendCachedJson(res, req.originalUrl)) {
    return;
  }

  const posts = await Comment.findAll({
    limit: req.query["limit"] != null ? Number(req.query["limit"]) : undefined,
    offset: req.query["offset"] != null ? Number(req.query["offset"]) : undefined,
    where: {
      postId: req.params.postId,
    },
  });

  return sendCachedJson(res, req.originalUrl, posts);
});

postRouter.post("/posts", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const post = await Post.create(
    {
      ...req.body,
      userId: req.session.userId,
    },
    {
      include: [
        {
          association: "images",
          through: { attributes: [] },
        },
        { association: "movie" },
        { association: "sound" },
      ],
    },
  );

  invalidateResponseCacheByPrefix("/api/v1/posts", "/api/v1/search");
  clearHtmlCache();
  void warmHtmlCache();
  return res.status(200).type("application/json").send(post);
});
