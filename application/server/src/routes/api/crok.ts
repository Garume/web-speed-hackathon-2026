import { Router } from "express";
import httpErrors from "http-errors";

import { QaSuggestion } from "@web-speed-hackathon-2026/server/src/models";

export const crokRouter = Router();
const response = `結論から言うね。TypeScript の template literal type は、文字列リテラル型を組み合わせて新しい型を作る仕組みです。

\`type EventName<T extends string> = \`on\${Capitalize<T>}\`\` のように書けるので、文字列ベースの API を型安全に表現できます。

## 第六章：最終疾走と到達

- Union 型と組み合わせると、候補文字列をまとめて展開できます。
- 条件付き型や mapped types と併用すると、イベント名やルーティングキーの自動生成に向いています。
- React ではコンポーネントの prop 名や action type の規約化にも使えます。

\`\`\`ts
type Route = "home" | "search";
type RouteKey = \`page:\${Route}\`;
\`\`\`

必要なら次に、実運用での落とし穴と React の useTransition の例も続けて説明できます。`;

crokRouter.get("/crok/suggestions", async (_req, res) => {
  const suggestions = await QaSuggestion.findAll({ logging: false });
  res.json({ suggestions: suggestions.map((s) => s.question) });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

crokRouter.get("/crok", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let messageId = 0;

  await sleep(150);

  if (!res.closed) {
    const data = JSON.stringify({ text: response, done: false });
    res.write(`event: message\nid: ${messageId++}\ndata: ${data}\n\n`);
  }

  if (!res.closed) {
    await sleep(40);
    const data = JSON.stringify({ text: "", done: true });
    res.write(`event: message\nid: ${messageId}\ndata: ${data}\n\n`);
  }

  res.end();
});
