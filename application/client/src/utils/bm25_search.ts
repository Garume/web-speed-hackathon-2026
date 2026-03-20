import { BM25 } from "bayesian-bm25";
import type { Tokenizer, IpadicFeatures } from "kuromoji";

const STOP_POS = new Set(["助詞", "助動詞", "記号"]);

export interface SuggestionIndex {
  candidates: string[];
  bm25: BM25;
}

/**
 * 形態素解析で内容語トークン（名詞、動詞、形容詞など）を抽出
 */
export function extractTokens(tokens: IpadicFeatures[]): string[] {
  return tokens
    .filter((t) => t.surface_form !== "" && t.pos !== "" && !STOP_POS.has(t.pos))
    .map((t) => t.surface_form.toLowerCase());
}

export function createSuggestionIndex(
  tokenizer: Tokenizer<IpadicFeatures>,
  candidates: string[],
): SuggestionIndex {
  const bm25 = new BM25({ k1: 1.2, b: 0.75 });
  const tokenizedCandidates = candidates.map((candidate) =>
    extractTokens(tokenizer.tokenize(candidate)),
  );
  bm25.index(tokenizedCandidates);
  return { candidates, bm25 };
}

/**
 * BM25で候補をスコアリングして、クエリと類似度の高い上位10件を返す
 */
export function filterSuggestionsBM25(index: SuggestionIndex, queryTokens: string[]): string[] {
  if (queryTokens.length === 0) return [];

  const scores = index.bm25.getScores(queryTokens);
  const results = index.candidates.map((text, i) => ({ text, score: scores[i] }));

  // スコアが高い（＝類似度が高い）ものが下に来るように、上位10件を取得する
  return results
    .filter((s) => s.score > 0)
    .sort((a, b) => a.score - b.score)
    .slice(-10)
    .map((s) => s.text);
}
