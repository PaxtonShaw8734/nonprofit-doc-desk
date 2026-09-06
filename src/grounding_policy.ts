import type { DocKind } from "./nonprofit_docs.ts";

export interface ScoredChunk {
  id: string;
  kind: DocKind;
  campaign: string;
  text: string;
  score: number;
}

export interface Answered {
  status: "answered";
  citations: ScoredChunk[];
}

export interface Escalated {
  status: "escalated";
  reason: "no_supporting_document" | "wrong_document_family";
  to: "program_staff" | "finance";
}

export type Decision = Answered | Escalated;

/** Below this rerank score a passage is treated as unrelated to the question. */
export const SUPPORT_FLOOR = 0.35;
/** A citation must be within this fraction of the best passage to be shown. */
export const CITATION_RATIO = 0.5;
export const MAX_CITATIONS = 3;

/**
 * The one decision this service makes: answer from the documents, or hand the
 * question to a human. Money questions are held to the stricter rule — if the
 * best passage is not a donor receipt, finance answers it, not the retriever.
 */
export function decide(question: string, ranked: ScoredChunk[]): Decision {
  const sorted = [...ranked].sort((a, b) => b.score - a.score);
  const best = sorted[0];

  if (!best || best.score < SUPPORT_FLOOR) {
    return { status: "escalated", reason: "no_supporting_document", to: "program_staff" };
  }

  if (asksAboutMoney(question) && best.kind !== "donor_receipt") {
    return { status: "escalated", reason: "wrong_document_family", to: "finance" };
  }

  const cutoff = best.score * CITATION_RATIO;
  return {
    status: "answered",
    citations: sorted.filter((c) => c.score >= cutoff).slice(0, MAX_CITATIONS),
  };
}

const MONEY_WORDS = ["receipt", "deduct", "tax", "refund", "gift amount", "donation amount", "acknowledgement"];

export function asksAboutMoney(question: string): boolean {
  const q = question.toLowerCase();
  return MONEY_WORDS.some((w) => q.includes(w));
}
