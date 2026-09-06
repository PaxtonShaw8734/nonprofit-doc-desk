import test from "node:test";
import assert from "node:assert/strict";
import { decide, asksAboutMoney, type ScoredChunk } from "./grounding_policy.ts";

const receipt = (score: number): ScoredChunk => ({
  id: "receipt-2026-0208",
  kind: "donor_receipt",
  campaign: "food-pantry",
  text: "restricted gift, $5,000",
  score,
});

const report = (score: number): ScoredChunk => ({
  id: "campaign-q1-report",
  kind: "campaign_report",
  campaign: "winter-coats",
  text: "412 donors, $86,400 raised",
  score,
});

test("a receipt question backed by a receipt is answered with the receipt cited", () => {
  const d = decide("How is the restricted gift shown on the tax receipt?", [receipt(0.91), report(0.2)]);
  assert.equal(d.status, "answered");
  assert.deepEqual(d.status === "answered" ? d.citations.map((c) => c.id) : [], ["receipt-2026-0208"]);
});

test("a receipt question whose best match is a campaign report goes to finance", () => {
  const d = decide("What deduction can the donor claim?", [report(0.88), receipt(0.31)]);
  assert.deepEqual(d, { status: "escalated", reason: "wrong_document_family", to: "finance" });
});

test("nothing above the support floor goes to program staff", () => {
  const d = decide("Do you take dog food donations?", [report(0.12), receipt(0.05)]);
  assert.deepEqual(d, { status: "escalated", reason: "no_supporting_document", to: "program_staff" });
});

test("weak passages are dropped instead of padding the citation list", () => {
  const d = decide("When do shift reminders go out?", [report(0.8), receipt(0.3)]);
  assert.equal(d.status === "answered" && d.citations.length, 1);
});

test("volunteer wording is not treated as a money question", () => {
  assert.equal(asksAboutMoney("Who covers a cancelled shift?"), false);
});
