import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError } from "./infrai_rest.ts";
import { retrievePassages } from "./retrieve_passages.ts";
import { decide } from "./grounding_policy.ts";

const AskBody = z.object({
  question: z.string().min(8).max(500),
  campaign: z.enum(["winter-coats", "food-pantry"]).optional(),
});

const PORT = Number(process.env.PORT ?? 8080);

const server = createServer(async (req, res) => {
  const send = (status: number, payload: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };

  if (req.method !== "POST" || req.url !== "/ask") {
    send(404, { error: "POST /ask" });
    return;
  }

  const raw = await new Promise<string>((resolve) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => resolve(buf));
  });

  let body: z.infer<typeof AskBody>;
  try {
    body = AskBody.parse(JSON.parse(raw));
  } catch (err) {
    send(400, { error: "invalid_request", detail: err instanceof z.ZodError ? err.issues : "malformed json" });
    return;
  }

  try {
    const ranked = await retrievePassages(body.question, body.campaign);
    const decision = decide(body.question, ranked);
    if (decision.status === "escalated") {
      send(200, { status: "escalated", reason: decision.reason, assigned_to: decision.to });
      return;
    }
    send(200, {
      status: "answered",
      citations: decision.citations.map((c) => ({
        id: c.id,
        kind: c.kind,
        campaign: c.campaign,
        score: Number(c.score.toFixed(3)),
        text: c.text,
      })),
    });
  } catch (err) {
    // A rejected argument is the caller's problem and stays a 4xx here.
    if (err instanceof InfraiError) {
      const status = err.status >= 400 && err.status < 500 ? 400 : 502;
      send(status, { error: err.code });
      return;
    }
    send(502, { error: "upstream_unavailable" });
  }
});

server.listen(PORT, () => console.log(`ask desk on http://127.0.0.1:${PORT}/ask`));
