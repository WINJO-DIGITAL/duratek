/**
 * Contact details shown at the foot of every page (locations, phone, email,
 * opening hours, social profiles).
 *
 * WAITING ON THE CLIENT. Leave these empty until the real details are
 * supplied: nothing is invented, and the footer block hides itself while
 * both lists are empty. Owner-editable in admin later; for now, edit here.
 */

export interface ContactLocation {
  /** Short label shown as the heading, e.g. "Head office" or "Showroom". */
  name: string;
  /** Address lines, ending with the postcode line. */
  address: string[];
  phone?: string;
  email?: string;
  /** e.g. [{ days: "Mon to Fri", time: "8.30am to 5.00pm" }, { days: "Sat, Sun and bank holidays", time: "Closed" }] */
  hours?: { days: string; time: string }[];
}

export type SocialNetwork = "facebook" | "instagram" | "pinterest" | "linkedin" | "youtube";

export interface SocialProfile {
  network: SocialNetwork;
  url: string;
}

export const CONTACT_LOCATIONS: ContactLocation[] = [];

export const SOCIAL_PROFILES: SocialProfile[] = [];

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

/** "01234 567890" -> "+441234567890" for tel: links (UK numbers). */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("0")) return `tel:+44${digits.slice(1)}`;
  return `tel:${digits}`;
}
