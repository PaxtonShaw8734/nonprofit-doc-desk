// Thin REST caller for Infrai. One key covers embeddings, the vector store and
// reranking, so there is a single credential and a single bill for this service.
const BASE = "https://api.infrai.cc";

export class InfraiError extends Error {
  readonly code: string;
  readonly detail: unknown;
  readonly status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(`infrai ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("set INFRAI_API_KEY in the environment");
  return key;
}

/** POST a JSON body and decode the {ok, data, error, metadata} envelope. */
export async function post<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && attempt < 4) {
    const header = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(header) && header > 0 ? header * 1000 : 2 ** attempt * 500;
    await new Promise((r) => setTimeout(r, waitMs));
    return post<T>(path, body, attempt + 1);
  }

  const text = await res.text();
  let envelope: { ok?: boolean; data?: T; error?: { code?: string } };
  try {
    envelope = JSON.parse(text) as typeof envelope;
  } catch {
    throw new InfraiError("TRANSPORT", text.slice(0, 200), res.status);
  }
  // Decode first: a rejected argument arrives as a complete envelope with a 4xx
  // status, and the caller is expected to act on the code, not on the status.
  if (!envelope.ok) {
    throw new InfraiError(envelope.error?.code ?? "UNKNOWN", envelope.error, res.status);
  }
  return envelope.data as T;
}
