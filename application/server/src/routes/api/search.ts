import { Router } from "express";
import { QueryTypes } from "sequelize";

import { Post } from "@web-speed-hackathon-2026/server/src/models";
import { parseSearchQuery } from "@web-speed-hackathon-2026/server/src/utils/parse_search_query.js";
import { sendCachedJson, trySendCachedJson } from "@web-speed-hackathon-2026/server/src/utils/response_cache";

export const searchRouter = Router();

type PostSummary = {
  createdAt: Date;
  id: string;
};

async function findPostSummariesByText(
  limit: number | undefined,
  searchTerm: string | null,
  sinceDate?: Date,
  untilDate?: Date,
): Promise<PostSummary[]> {
  if (searchTerm == null) {
    return [];
  }

  const replacements: Record<string, Date | number | string> = {
    limit: limit ?? -1,
    searchTerm,
  };
  const conditions = ["text LIKE :searchTerm"];

  if (sinceDate != null) {
    replacements["sinceDate"] = sinceDate;
    conditions.push("createdAt >= :sinceDate");
  }
  if (untilDate != null) {
    replacements["untilDate"] = untilDate;
    conditions.push("createdAt <= :untilDate");
  }

  const rows = await Post.sequelize!.query<{ createdAt: string; id: string }>(
    `
      SELECT id, createdAt
      FROM Posts
      WHERE ${conditions.join(" AND ")}
      ORDER BY createdAt DESC, id DESC
      LIMIT :limit
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    },
  );

  return rows.map((post) => ({
    createdAt: new Date(post.createdAt),
    id: post.id,
  }));
}

async function findPostSummariesByUser(
  limit: number | undefined,
  searchTerm: string | null,
  sinceDate?: Date,
  untilDate?: Date,
): Promise<PostSummary[]> {
  if (searchTerm == null) {
    return [];
  }

  const replacements: Record<string, Date | number | string> = {
    limit: limit ?? -1,
    searchTerm,
  };
  const conditions = ["(Users.username LIKE :searchTerm OR Users.name LIKE :searchTerm)"];

  if (sinceDate != null) {
    replacements["sinceDate"] = sinceDate;
    conditions.push("Posts.createdAt >= :sinceDate");
  }
  if (untilDate != null) {
    replacements["untilDate"] = untilDate;
    conditions.push("Posts.createdAt <= :untilDate");
  }

  const rows = await Post.sequelize!.query<{ createdAt: string; id: string }>(
    `
      SELECT Posts.id AS id, Posts.createdAt AS createdAt
      FROM Posts
      INNER JOIN Users ON Posts.userId = Users.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY Posts.createdAt DESC, Posts.id DESC
      LIMIT :limit
    `,
    {
      replacements,
      type: QueryTypes.SELECT,
    },
  );

  return rows.map((post) => ({
    createdAt: new Date(post.createdAt),
    id: post.id,
  }));
}

searchRouter.get("/search", async (req, res) => {
  if (trySendCachedJson(res, req.originalUrl)) {
    return;
  }

  const query = req.query["q"];

  if (typeof query !== "string" || query.trim() === "") {
    return sendCachedJson(res, req.originalUrl, []);
  }

  const { keywords, sinceDate, untilDate } = parseSearchQuery(query);

  if (!keywords && !sinceDate && !untilDate) {
    return sendCachedJson(res, req.originalUrl, []);
  }

  const searchTerm = keywords ? `%${keywords}%` : null;
  const limit = req.query["limit"] != null ? Number(req.query["limit"]) : undefined;
  const offset = req.query["offset"] != null ? Number(req.query["offset"]) : undefined;
  const pageWindow = (limit ?? 0) + (offset ?? 0);
  const sourceLimit = limit != null ? Math.max(pageWindow * 5, limit) : undefined;

  const [postsByText, postsByUser] = await Promise.all([
    findPostSummariesByText(sourceLimit, searchTerm, sinceDate ?? undefined, untilDate ?? undefined),
    findPostSummariesByUser(sourceLimit, searchTerm, sinceDate ?? undefined, untilDate ?? undefined),
  ]);

  const mergedSummaries = new Map<string, PostSummary>();
  for (const post of [...postsByText, ...postsByUser]) {
    const current = mergedSummaries.get(post.id);
    if (current == null || current.createdAt.getTime() < post.createdAt.getTime()) {
      mergedSummaries.set(post.id, post);
    }
  }

  const sortedIds = [...mergedSummaries.values()]
    .sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id),
    )
    .map((post) => post.id);

  const pageIds = sortedIds.slice(offset || 0, (offset || 0) + (limit || sortedIds.length));
  if (pageIds.length === 0) {
    return sendCachedJson(res, req.originalUrl, []);
  }

  const posts = await Post.findAll({
    where: {
      id: pageIds,
    },
  });

  const postMap = new Map(posts.map((post) => [post.id, post]));
  const result = pageIds
    .map((postId) => postMap.get(postId))
    .filter((post): post is NonNullable<typeof post> => post != null);

  return sendCachedJson(res, req.originalUrl, result);
});
