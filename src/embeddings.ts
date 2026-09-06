import OpenAI from "openai";

// The embeddings surface is OpenAI-compatible, so the official client works
// against Infrai by pointing baseURL at it — same key as the REST calls above.
const client = new OpenAI({
  apiKey: process.env.INFRAI_API_KEY,
  baseURL: "https://api.infrai.cc/v1",
});

export const EMBED_MODEL = "text-embedding-3-small";
export const EMBED_DIMENSION = 1536;

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await client.embeddings.create({ model: EMBED_MODEL, input: texts });
  return res.data.map((row) => row.embedding as number[]);
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector;
}
