import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { GENERAL_CONTACT } from "@/lib/contact";

/**
 * "Ask for documents" as an email to the general inbox. Renders nothing until
 * the client supplies the address in src/lib/contact.ts: no dead links.
 */
export function AskForDocuments({
  look = "button",
  label = "Ask for documents",
  className,
}: {
  look?: "button" | "link";
  label?: string;
  className?: string;
}) {
  const email = GENERAL_CONTACT.email;
  if (!email) return null;
  const href = `mailto:${email}?subject=${encodeURIComponent("Duratek documents")}`;
  return (
    <a
      href={href}
      className={cn(
        look === "button"
          ? buttonClass("primary")
          : "inline-flex min-h-tap items-center text-navy underline underline-offset-4 hover:text-green-ink",
        className,
      )}
    >
      {label}
    </a>
  );
}
