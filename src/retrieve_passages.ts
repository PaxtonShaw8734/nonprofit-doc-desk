import { post } from "./infrai_rest.ts";
import { embedOne } from "./embeddings.ts";
import { COLLECTION, type DocKind } from "./nonprofit_docs.ts";
import type { ScoredChunk } from "./grounding_policy.ts";

interface QueryHit {
  id?: string;
  score?: number;
  metadata?: { kind?: DocKind; campaign?: string; text?: string };
}

interface RerankHit {
  index?: number;
  score?: number;
  relevance_score?: number;
}

/** Retrieve, then rerank, then hand the scored passages to the policy. */
export async function retrievePassages(
  question: string,
  campaign?: string,
): Promise<ScoredChunk[]> {
  const embedding = await embedOne(question);

  const hits = await post<{ matches?: QueryHit[] } | QueryHit[]>("/v1/vector/query", {
    collection: COLLECTION,
    embedding,
    top_k: 8,
    include_metadata: true,
    ...(campaign ? { filter: { campaign } } : {}),
  });

  const matches = Array.isArray(hits) ? hits : hits.matches ?? [];
  const chunks = matches.map((m) => ({
    id: m.id ?? "",
    kind: (m.metadata?.kind ?? "campaign_report") as DocKind,
    campaign: m.metadata?.campaign ?? "",
    text: m.metadata?.text ?? "",
    score: m.score ?? 0,
  }));
  if (chunks.length === 0) return [];

  const reranked = await post<{ results?: RerankHit[] } | RerankHit[]>("/v1/ai/rerank", {
    query: question,
    candidates: chunks.map((c) => c.text),
    top_k: 4,
  });

  const results = Array.isArray(reranked) ? reranked : reranked.results ?? [];
  return results
    .map((r) => {
      const source = chunks[r.index ?? -1];
      if (!source) return null;
      return { ...source, score: r.relevance_score ?? r.score ?? source.score };
    })
    .filter((c): c is ScoredChunk => c !== null);
}
