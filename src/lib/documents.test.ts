import { describe, expect, it } from "vitest";
import { documentPath } from "./documents";

describe("document paths", () => {
  it("cleans names and can't escape the type folder", () => {
    expect(documentPath("tech_sheet", "Keswick Oak TECH sheet.PDF", "abc")).toBe("tech_sheet/abc-keswick-oak-tech-sheet.pdf");
    expect(documentPath("brochure", "../../etc/passwd", "x")).toBe("brochure/x-etc-passwd.pdf");
    expect(documentPath("warranty", "€€€.pdf", "y")).toBe("warranty/y-document.pdf");
  });
});
