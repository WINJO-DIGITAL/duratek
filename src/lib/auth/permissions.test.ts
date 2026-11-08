import { describe, expect, it } from "vitest";
import { allows, type AccountRole, type AccountStatus, type Permission } from "./permissions";

const acc = (role: AccountRole, status: AccountStatus = "approved", permissions: Permission[] = []) => ({ role, status, permissions });

describe("allows", () => {
  it("super admin may do anything while active", () => {
    expect(allows(acc("super_admin"), "view_audit")).toBe(true);
    expect(allows(acc("super_admin", "pending"), "manage_pricing")).toBe(true);
    expect(allows(acc("super_admin", "suspended"), "manage_pricing")).toBe(false);
  });
  it("admin only what was granted", () => {
    expect(allows(acc("admin", "approved", ["manage_pricing"]), "manage_pricing")).toBe(true);
    expect(allows(acc("admin", "approved", ["manage_pricing"]), "manage_accounts")).toBe(false);
    expect(allows(acc("admin", "rejected", ["manage_pricing"]), "manage_pricing")).toBe(false);
  });
  it("trade and stockist accounts and visitors have no admin rights, whatever the list says", () => {
    expect(allows(acc("trade", "approved", ["manage_pricing"]), "manage_pricing")).toBe(false);
    expect(allows(acc("stockist", "approved", ["view_audit"]), "view_audit")).toBe(false);
    expect(allows(null, "view_reports")).toBe(false);
  });
});
