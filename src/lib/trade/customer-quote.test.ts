import { describe, expect, it } from "vitest";
import { groupByRoom, toCustomerQuote } from "./customer-quote";

describe("customer copy", () => {
  it("carries sell prices and branding, and drops every cost", () => {
    const copy = toCustomerQuote(
      {
        reference: "Q-0001", status: "draft", customerName: "Mrs Smith", siteAddress: "1 High St", sitePostcode: "LA9 4AA", notes: "", validUntil: null,
        vatRateBp: 2000, sentAt: null, createdAt: "2026-11-09T10:00:00Z", respondedAt: null,
        lines: [{ kind: "flooring", finishId: null, roomName: "Kitchen", description: "Keswick Oak", quantity: 10, unit: "pack", unitSellPence: 6875, unitCostPence: 4911 }],
      },
      { companyName: "A Floors", contactName: "Sam", phone: null, email: null, website: null, address: null, logoPath: null, brandColour: "#2B5D3A", footer: "" },
    );
    const json = JSON.stringify(copy);
    expect(json).not.toMatch(/cost|4911|margin|contingency/i);
    expect(copy.lines[0]).toEqual({ kind: "flooring", finish_id: null, room_name: "Kitchen", description: "Keswick Oak", quantity: 10, unit: "pack", unit_sell_pence: 6875 });
    expect(copy.trader.brand_colour).toBe("#2B5D3A");
  });

  it("groups lines by room, general lines last", () => {
    const g = groupByRoom([{ room_name: null, n: 1 }, { room_name: "Kitchen", n: 2 }, { room_name: "Hall", n: 3 }, { room_name: "Kitchen", n: 4 }]);
    expect(g.map((x) => [x.room, x.lines.map((l) => l.n)])).toEqual([["Kitchen", [2, 4]], ["Hall", [3]], [null, [1]]]);
  });
});
