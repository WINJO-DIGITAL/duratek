import { describe, expect, it } from "vitest";
import { ALLOWED_MIME, documentPath, sniffMime } from "./documents";

const bytes = (...b: (number | string)[]) => new Uint8Array(b.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe("document paths", () => {
  it("cleans names and can't escape the type folder", () => {
    expect(documentPath("tech_sheet", "Keswick Oak TECH sheet.PDF", "abc")).toBe("tech_sheet/abc-keswick-oak-tech-sheet.pdf");
    expect(documentPath("brochure", "../../etc/passwd", "x")).toBe("brochure/x-etc-passwd.pdf");
    expect(documentPath("warranty", "€€€.pdf", "y")).toBe("warranty/y-document.pdf");
  });
  it("uses the real extension for images and archives", () => {
    expect(documentPath("marketing_photo", "Room scene.JPG", "z", "jpg")).toBe("marketing_photo/z-room-scene.jpg");
  });
});

describe("file type from the first bytes", () => {
  it("recognises the accepted types", () => {
    expect(sniffMime(bytes("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffMime(bytes(0x89, "PNG", 0x0d))).toBe("image/png");
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMime(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("image/webp");
    expect(sniffMime(bytes(0x50, 0x4b, 0x03, 0x04))).toBe("application/zip");
  });
  it("refuses scripts, SVG and anything else, whatever it is called", () => {
    expect(sniffMime(bytes("<svg xmlns"))).toBeNull();
    expect(sniffMime(bytes("<script>alert(1)</script>"))).toBeNull();
    expect(sniffMime(bytes("MZ"))).toBeNull();
  });
});

describe("what each document type may be", () => {
  it("keeps guides and certificates to PDF, and photography to images", () => {
    expect(ALLOWED_MIME.warranty).toEqual(["application/pdf"]);
    expect(ALLOWED_MIME.marketing_photo).not.toContain("application/pdf");
    expect(ALLOWED_MIME.brand_asset).toContain("application/zip");
    expect(Object.values(ALLOWED_MIME).flat()).not.toContain("image/svg+xml");
  });
});
