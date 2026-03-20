import { Router } from "express";
import { FindOptions, Includeable, Op, Order, WhereOptions } from "sequelize";

import { Post, User } from "@web-speed-hackathon-2026/server/src/models";
import { parseSearchQuery } from "@web-speed-hackathon-2026/server/src/utils/parse_search_query.js";

export const searchRouter = Router();

function buildPostInclude(userWhere?: WhereOptions): Includeable[] {
  return [
    {
      model: User.unscoped(),
      as: "user",
      attributes: ["id", "username", "name", "description", "createdAt"],
      include: [{ association: "profileImage", attributes: ["id", "alt"] }],
      required: true,
      ...(userWhere == null ? {} : { where: userWhere }),
    },
    {
      association: "images",
      through: { attributes: [] },
    },
    { association: "movie" },
    { association: "sound" },
  ];
}

function buildPostQueryBase(): Pick<FindOptions, "attributes" | "include" | "order" | "subQuery"> {
  return {
    attributes: {
      exclude: ["userId", "movieId", "soundId"],
    },
    include: buildPostInclude(),
    order: [
      ["id", "DESC"],
      ["images", "createdAt", "ASC"],
    ] as Order,
    subQuery: false,
  };
}

searchRouter.get("/search", async (req, res) => {
  const query = req.query["q"];

  if (typeof query !== "string" || query.trim() === "") {
    return res.status(200).type("application/json").send([]);
  }

  const { keywords, sinceDate, untilDate } = parseSearchQuery(query);

  // キーワードも日付フィルターもない場合は空配列を返す
  if (!keywords && !sinceDate && !untilDate) {
    return res.status(200).type("application/json").send([]);
  }

  const searchTerm = keywords ? `%${keywords}%` : null;
  const limit = req.query["limit"] != null ? Number(req.query["limit"]) : undefined;
  const offset = req.query["offset"] != null ? Number(req.query["offset"]) : undefined;
  const pageWindow = (limit ?? 0) + (offset ?? 0);
  const sourceLimit = limit != null ? Math.max(pageWindow * 5, limit) : undefined;

  // 日付条件を構築
  const dateConditions: Record<symbol, Date>[] = [];
  if (sinceDate) {
    dateConditions.push({ [Op.gte]: sinceDate });
  }
  if (untilDate) {
    dateConditions.push({ [Op.lte]: untilDate });
  }
  const dateWhere =
    dateConditions.length > 0 ? { createdAt: Object.assign({}, ...dateConditions) } : {};

  // テキスト検索条件
  const textWhere = searchTerm ? { text: { [Op.like]: searchTerm } } : {};

  const postsByText = await Post.unscoped().findAll({
    ...buildPostQueryBase(),
    limit: sourceLimit,
    where: {
      ...textWhere,
      ...dateWhere,
    },
  });

  // ユーザー名/名前での検索（キーワードがある場合のみ）
  let postsByUser: typeof postsByText = [];
  if (searchTerm) {
    postsByUser = await Post.unscoped().findAll({
      ...buildPostQueryBase(),
      include: buildPostInclude({
        [Op.or]: [{ username: { [Op.like]: searchTerm } }, { name: { [Op.like]: searchTerm } }],
      }),
      limit: sourceLimit,
      where: dateWhere,
    });
  }

  const postIdSet = new Set<string>();
  const mergedPosts: typeof postsByText = [];

  for (const post of [...postsByText, ...postsByUser]) {
    if (!postIdSet.has(post.id)) {
      postIdSet.add(post.id);
      mergedPosts.push(post);
    }
  }

  mergedPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const result = mergedPosts.slice(offset || 0, (offset || 0) + (limit || mergedPosts.length));

  return res.status(200).type("application/json").send(result);
});
