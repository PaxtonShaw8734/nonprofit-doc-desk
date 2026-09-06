/** The three document families this desk answers over. */
export type DocKind = "donor_receipt" | "volunteer_reminder" | "campaign_report";

export interface DocChunk {
  /** Stable id: a re-run of the indexer overwrites the same vector. */
  id: string;
  kind: DocKind;
  campaign: string;
  text: string;
}

export const COLLECTION = "nonprofit-docs";

export const SEED_CHUNKS: DocChunk[] = [
  {
    id: "receipt-2026-0114",
    kind: "donor_receipt",
    campaign: "winter-coats",
    text:
      "Receipt 2026-0114. Marisol Vega gave $250 to the winter coats campaign on 14 January 2026. " +
      "No goods or services were provided in exchange. Tax ID 47-0000000. Receipts are issued within three business days.",
  },
  {
    id: "receipt-2026-0208",
    kind: "donor_receipt",
    campaign: "food-pantry",
    text:
      "Receipt 2026-0208. The Halvorsen Family Fund gave $5,000 to the food pantry on 8 February 2026, " +
      "restricted to refrigeration equipment. A restricted gift is acknowledged with the restriction named on the receipt.",
  },
  {
    id: "volunteer-shift-policy",
    kind: "volunteer_reminder",
    campaign: "food-pantry",
    text:
      "Volunteer shift reminders go out 48 hours before the shift and again the morning of. " +
      "A volunteer who cancels inside 24 hours is asked to pick a replacement shift in the same month.",
  },
  {
    id: "volunteer-minors",
    kind: "volunteer_reminder",
    campaign: "winter-coats",
    text:
      "Volunteers under 16 need a signed guardian form on file before the first shift, and the reminder email " +
      "for those shifts includes the form link.",
  },
  {
    id: "campaign-q1-report",
    kind: "campaign_report",
    campaign: "winter-coats",
    text:
      "Winter coats, Q1 2026: 412 donors, $86,400 raised against an $80,000 target, 1,180 coats distributed. " +
      "Program spend was 82 percent of funds raised. Board reporting is due the fifteenth of the month after quarter end.",
  },
  {
    id: "campaign-pantry-report",
    kind: "campaign_report",
    campaign: "food-pantry",
    text:
      "Food pantry, Q1 2026: 96 donors, $41,200 raised, 3,900 households served, 620 volunteer hours logged. " +
      "The refrigeration grant is tracked separately from general pantry funds.",
  },
];
