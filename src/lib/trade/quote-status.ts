export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};
