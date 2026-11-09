/** Account roles and administrative permissions, matching the database enums. */
export type AccountRole = "super_admin" | "admin" | "trade" | "stockist";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

export const PERMISSIONS = [
  { value: "manage_accounts", label: "Trade accounts", help: "Review applications, approve, suspend, tiers and account prices" },
  { value: "manage_pricing", label: "Pricing", help: "Price lists, RRPs, tiers, promotions, volume and future prices" },
  { value: "manage_products", label: "Products", help: "Finishes, variants, collections, photographs, inspiration" },
  { value: "manage_stockists", label: "Where to buy", help: "Stockists and online retailers" },
  { value: "manage_samples", label: "Samples", help: "Sample requests (customers' personal details)" },
  { value: "manage_documents", label: "Documents", help: "Technical sheets, warranties, certificates" },
  { value: "manage_settings", label: "Settings", help: "System settings such as the VAT rate" },
  { value: "view_reports", label: "Overview", help: "Demand figures on the overview" },
  { value: "view_audit", label: "Audit log", help: "Who changed what, and when" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["value"];

export const ROLE_LABELS: Record<AccountRole, string> = {
  super_admin: "Super administrator",
  admin: "Administrator",
  trade: "Trade customer",
  stockist: "Stockist",
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "Waiting for approval",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const isAdminRole = (r: AccountRole) => r === "super_admin" || r === "admin";

/** Mirrors public.has_permission: a working super administrator may do anything; an administrator what they were granted. */
export function allows(
  account: { role: AccountRole; status: AccountStatus; permissions: readonly Permission[] } | null,
  permission: Permission,
): boolean {
  if (!account || account.status === "rejected" || account.status === "suspended") return false;
  if (account.role === "super_admin") return true;
  return account.role === "admin" && account.permissions.includes(permission);
}

/** The admin screens, each behind its permission, in tab order. */
export const ADMIN_AREAS = [
  { href: "/admin", label: "Overview", permission: "view_reports" },
  { href: "/admin/analytics", label: "Analytics", permission: "view_reports" },
  { href: "/admin/accounts", label: "Trade accounts", permission: "manage_accounts" },
  { href: "/admin/prices", label: "Prices", permission: "manage_pricing" },
  { href: "/admin/finishes", label: "Finishes", permission: "manage_products" },
  { href: "/admin/samples", label: "Samples", permission: "manage_samples" },
  { href: "/admin/stockists", label: "Where to buy", permission: "manage_stockists" },
  { href: "/admin/enquiries", label: "Enquiries", permission: "manage_stockists" },
  { href: "/admin/documents", label: "Documents", permission: "manage_documents" },
  { href: "/admin/settings", label: "Settings", permission: "manage_settings" },
  { href: "/admin/privacy", label: "Privacy", permission: "manage_settings" },
  { href: "/admin/audit", label: "Audit log", permission: "view_audit" },
] as const satisfies readonly { href: string; label: string; permission: Permission }[];

export type AdminArea = (typeof ADMIN_AREAS)[number]["href"];
