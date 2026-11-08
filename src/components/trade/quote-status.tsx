import { cn } from "@/lib/cn";
import { STATUS_LABELS, type QuoteStatus } from "@/lib/trade/quote-status";

const TONE: Record<QuoteStatus, string> = {
  draft: "border-navy/20 text-ink-muted",
  sent: "border-navy/40 text-navy",
  accepted: "border-green-ink text-green-ink",
  declined: "border-error/60 text-error",
};

export function QuoteStatusChip({ status }: { status: QuoteStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-control border px-2.5 py-0.5 text-[0.8125rem] font-medium", TONE[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
