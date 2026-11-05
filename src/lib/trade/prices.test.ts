import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ userSupabase: vi.fn() }));

import { effectivePrices } from "./prices";

describe("effectivePrices", () => {
  it("uses the tier price, and an account price over it", () => {
    const m = effectivePrices(
      [
        { finish_id: "a", price_per_m2_pence: 2222 },
        { finish_id: "b", price_per_m2_pence: 2222 },
      ],
      [{ finish_id: "b", price_per_m2_pence: 1800 }],
    );
    expect(m.get("a")).toEqual({ pence: 2222, isAccountPrice: false });
    expect(m.get("b")).toEqual({ pence: 1800, isAccountPrice: true });
    expect(m.get("c")).toBeUndefined();
  });
  it("can hold an account price for a finish the tier does not cover", () => {
    expect(effectivePrices([], [{ finish_id: "z", price_per_m2_pence: 900 }]).get("z")?.isAccountPrice).toBe(true);
  });
});
