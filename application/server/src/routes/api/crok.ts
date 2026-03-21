import { Router } from "express";
import httpErrors from "http-errors";

import { QaSuggestion } from "@web-speed-hackathon-2026/server/src/models";

export const crokRouter = Router();
const SSE_CHUNK_SIZE = 140;
const SSE_CHUNK_INTERVAL_MS = 32;
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

function splitResponseIntoChunks(content: string, maxLength = SSE_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    let end = Math.min(start + maxLength, content.length);

    if (end < content.length) {
      const paragraphBreak = content.lastIndexOf("\n\n", end);
      const lineBreak = content.lastIndexOf("\n", end);
      const spaceBreak = content.lastIndexOf(" ", end);
      const candidate = Math.max(paragraphBreak >= 0 ? paragraphBreak + 2 : -1, lineBreak >= 0 ? lineBreak + 1 : -1, spaceBreak >= 0 ? spaceBreak + 1 : -1);

      if (candidate > start + Math.floor(maxLength / 2)) {
        end = candidate;
      }
    }

    chunks.push(content.slice(start, end));
    start = end;
  }

  return chunks;
}

crokRouter.get("/crok", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const flushableResponse = res as typeof res & { flush?: () => void };
  const responseChunks = splitResponseIntoChunks(response);
  let messageId = 0;
  let isClosed = false;

  req.on("close", () => {
    isClosed = true;
  });

  for (const chunk of responseChunks) {
    if (isClosed || res.closed) {
      res.end();
      return;
    }

    const data = JSON.stringify({ text: chunk, done: false });
    res.write(`event: message\nid: ${messageId++}\ndata: ${data}\n\n`);
    flushableResponse.flush?.();

    if (chunk !== responseChunks[responseChunks.length - 1]) {
      await sleep(SSE_CHUNK_INTERVAL_MS);
    }
  }

  if (!isClosed && !res.closed) {
    const data = JSON.stringify({ text: "", done: true });
    res.write(`event: message\nid: ${messageId}\ndata: ${data}\n\n`);
    flushableResponse.flush?.();
  }

  res.end();
});
