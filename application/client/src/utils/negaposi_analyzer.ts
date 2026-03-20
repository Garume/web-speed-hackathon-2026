import type { Tokenizer, IpadicFeatures } from "kuromoji";

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;
const sentimentCache = new Map<string, SentimentResult>();

async function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  tokenizerPromise ??= (async () => {
    const { default: kuromojiModule } = await import("kuromoji");
    const builder = kuromojiModule.builder({ dicPath: "/dicts" });
    return new Promise<Tokenizer<IpadicFeatures>>((resolve, reject) => {
      builder.build((err, tokenizer) => {
        if (err) {
          reject(err);
        } else {
          resolve(tokenizer);
        }
      });
    });
  })();

  return tokenizerPromise;
}

type SentimentResult = {
  score: number;
  label: "positive" | "negative" | "neutral";
};

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const normalizedText = text.trim();
  const cached = sentimentCache.get(normalizedText);
  if (cached != null) {
    return cached;
  }

  const [{ default: analyze }, tokenizer] = await Promise.all([
    import("negaposi-analyzer-ja"),
    getTokenizer(),
  ]);
  const tokens = tokenizer.tokenize(normalizedText);

  const score = analyze(tokens);

  let label: SentimentResult["label"];
  if (score > 0.1) {
    label = "positive";
  } else if (score < -0.1) {
    label = "negative";
  } else {
    label = "neutral";
  }

  const result = { score, label };
  sentimentCache.set(normalizedText, result);
  return result;
}
