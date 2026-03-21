import path from "path";

import type { IpadicFeatures, Tokenizer } from "kuromoji";

import { PUBLIC_PATH } from "@web-speed-hackathon-2026/server/src/paths";

export type SearchSentimentResult = {
  label: "positive" | "negative" | "neutral";
  score: number;
};

const sentimentCache = new Map<string, SearchSentimentResult>();
let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

async function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  tokenizerPromise ??= (async () => {
    const { default: kuromoji } = await import("kuromoji");
    const builder = kuromoji.builder({
      dicPath: path.join(PUBLIC_PATH, "dicts"),
    });

    return new Promise<Tokenizer<IpadicFeatures>>((resolve, reject) => {
      builder.build((error, tokenizer) => {
        if (error != null) {
          reject(error);
          return;
        }

        resolve(tokenizer);
      });
    });
  })();

  return tokenizerPromise;
}

export async function analyzeSearchSentiment(text: string): Promise<SearchSentimentResult> {
  const normalizedText = text.trim();
  if (normalizedText.length === 0) {
    return {
      label: "neutral",
      score: 0,
    };
  }

  const cached = sentimentCache.get(normalizedText);
  if (cached != null) {
    return cached;
  }

  const [{ default: analyze }, tokenizer] = await Promise.all([
    import("negaposi-analyzer-ja"),
    getTokenizer(),
  ]);
  const score = analyze(tokenizer.tokenize(normalizedText));

  let label: SearchSentimentResult["label"] = "neutral";
  if (score > 0.1) {
    label = "positive";
  } else if (score < -0.1) {
    label = "negative";
  }

  const result = { label, score };
  sentimentCache.set(normalizedText, result);
  return result;
}
