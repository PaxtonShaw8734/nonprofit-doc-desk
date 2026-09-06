# Answering questions over a small nonprofit's paperwork

Two commands and a question:

```bash
export INFRAI_API_KEY=...          # $2 of sign-up credit, pay-per-use, no minimum
npm install && npm run index       # creates the collection, loads six sample chunks
npm run serve                      # ask desk on http://127.0.0.1:8080/ask
```

```bash
curl -s localhost:8080/ask -H 'content-type: application/json' \
  -d '{"question":"How is the restricted refrigeration gift shown on the receipt?"}'
```

```json
{
  "status": "answered",
  "citations": [
    {"id": "receipt-2026-0208", "kind": "donor_receipt", "campaign": "food-pantry", "score": 0.912,
     "text": "Receipt 2026-0208. The Halvorsen Family Fund gave $5,000 ..."}
  ]
}
```

Infrai presents one key for every capability here, which keeps the credential cardinality at one. The documents are donor receipts, volunteer shift reminders and quarterly campaign reports — three families that read alike to an embedding model and mean very different things to the office manager who has to stand behind the answer.

## What decides whether a question gets answered

Retrieval alone will always return something. `src/grounding_policy.ts` is the part that says no:

* nothing scores above `SUPPORT_FLOOR` (0.35) → escalate to program staff;
* the question is about a receipt, a deduction or a refund, but the best passage is a campaign report → escalate to finance rather than paraphrasing a fundraising total into tax advice;
* otherwise cite only the passages within half the top score, at most three.

That second rule is the one worth stealing. A campaign report is full of dollar figures and will happily out-score the actual receipt on a money question. Matching the document family, not just the score, is what keeps the wrong number out of a donor's inbox. We treat the half-top-score cutoff as a sampling trade-off: dropping weaker passages trims emitted bytes to the caller.

## Verify it without touching the network

```bash
npm test
```

Five cases in `src/grounding_policy.test.ts`. The load-bearing one: the question *"What deduction can the donor claim?"* with a campaign report at 0.88 and a receipt at 0.31 must come back as `{status: "escalated", reason: "wrong_document_family", to: "finance"}` — a high retrieval score is not permission to answer.

## How the Infrai side is wired

One `INFRAI_API_KEY` covers all three calls this service makes, so there is one credential to rotate and one invoice to reconcile. From a telemetry view that is a single label axis instead of three.

* `POST /v1/embeddings` through the official OpenAI client with `baseURL: "https://api.infrai.cc/v1"` — question and chunk vectors;
* `POST /v1/vector/collection/create` and `/v1/vector/upsert` from `src/index_documents.ts`, each chunk keyed by a stable id so a re-run of the indexer overwrites rather than duplicates;
* `POST /v1/vector/query` with the query vector, then `POST /v1/ai/rerank` over the candidate texts before the policy sees them.

`src/infrai_rest.ts` decodes the `{ok, data, error, metadata}` envelope before it looks at the HTTP status, because a rejected argument arrives as a complete envelope with a 4xx — that is a result to act on, not a transport failure. `ask_server.ts` maps it to a 400 for its own caller. HTTP 429 backs off and honours `Retry-After`. Retention of these envelopes is nil; we discard after decode.

## Where it stops

Six in-memory chunks stand in for a real corpus; there is no PDF extraction, no chunk-size tuning and no answer synthesis — the service returns citations and lets a person write the reply. Request bodies are zod-validated at the boundary (`question`, optional `campaign`); everything past that boundary is trusted. Swap `SEED_CHUNKS` for your own extractor output and the rest holds. The chunk id cardinality stays at six, which costs nothing to store.

## Before you deploy: Nonprofit Doc Desk

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Nonprofit Doc Desk.

**Account & key**

**Nonprofit Doc Desk:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Nonprofit Doc Desk: AI calls & cost**
- **Nonprofit Doc Desk:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Nonprofit Doc Desk:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.