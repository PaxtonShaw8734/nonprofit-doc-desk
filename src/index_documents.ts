import { post } from "./infrai_rest.ts";
import { embed, EMBED_DIMENSION } from "./embeddings.ts";
import { COLLECTION, SEED_CHUNKS } from "./nonprofit_docs.ts";

/**
 * Creates the collection and loads the sample documents. Each chunk carries its
 * own stable id, so running this twice leaves the same six vectors behind.
 */
async function main(): Promise<void> {
  await post("/v1/vector/collection/create", {
    collection: COLLECTION,
    dimension: EMBED_DIMENSION,
    metric: "cosine",
    metadata: { owner: "nonprofit-doc-desk" },
  });

  const vectors = (await embed(SEED_CHUNKS.map((c) => c.text))).map((values, i) => ({
    id: SEED_CHUNKS[i].id,
    values,
    metadata: {
      kind: SEED_CHUNKS[i].kind,
      campaign: SEED_CHUNKS[i].campaign,
      text: SEED_CHUNKS[i].text,
    },
  }));

  await post("/v1/vector/upsert", { collection: COLLECTION, vectors });
  console.log(`indexed ${vectors.length} chunks into ${COLLECTION}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
