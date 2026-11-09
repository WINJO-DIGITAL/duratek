import { crc32, deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { isWholeImage, sniffImage } from "./files";

const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = () => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.concat([Buffer.from([0, 1, 2, 3, 4, 5, 6]), Buffer.from([0, 1, 2, 3, 4, 5, 6])]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
const u8 = (b: Buffer) => new Uint8Array(b);

describe("sniffImage", () => {
  it("knows the accepted types from their first bytes", () => {
    expect(sniffImage(u8(png()))).toBe("image/png");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImage(u8(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")])))).toBe("image/webp");
    expect(sniffImage(u8(Buffer.concat([Buffer.alloc(4), Buffer.from("ftypavif")])))).toBe("image/avif");
  });
  it("refuses SVG, HTML, scripts, PDFs and empty files, whatever they are called", () => {
    for (const s of ['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">', "<html><script>1</script>", "<?php echo 1;", "%PDF-1.4", "GIF89a", ""]) {
      expect(sniffImage(new Uint8Array(Buffer.from(s)))).toBeNull();
    }
  });
});

describe("isWholeImage", () => {
  it("accepts a well-formed PNG", () => expect(isWholeImage(u8(png()), "image/png")).toBe(true));
  it("refuses a PNG with anything after its end (a polyglot)", () => {
    expect(isWholeImage(u8(Buffer.concat([png(), Buffer.from("<script>alert(1)</script>")])), "image/png")).toBe(false);
    expect(isWholeImage(u8(Buffer.concat([png(), Buffer.alloc(10)])), "image/png")).toBe(false);
  });
  it("refuses a truncated PNG and one that doesn't start with its header chunk", () => {
    const p = png();
    expect(isWholeImage(u8(p.subarray(0, p.length - 5)), "image/png")).toBe(false);
    expect(isWholeImage(u8(Buffer.concat([p.subarray(0, 8), chunk("tEXt", Buffer.from("x")), p.subarray(8)])), "image/png")).toBe(false);
    expect(isWholeImage(u8(p.subarray(0, 8)), "image/png")).toBe(false);
  });
  it("needs a JPEG to end with its end marker", () => {
    expect(isWholeImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 0xff, 0xd9]), "image/jpeg")).toBe(true);
    expect(isWholeImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 0xff, 0xd9, 0x3c, 0x73]), "image/jpeg")).toBe(false);
  });
  it("needs a WebP's declared size to match the file", () => {
    const body = Buffer.concat([Buffer.from("WEBP"), Buffer.from("VP8 "), Buffer.alloc(8)]);
    const size = Buffer.alloc(4); size.writeUInt32LE(body.length);
    const ok = Buffer.concat([Buffer.from("RIFF"), size, body]);
    expect(isWholeImage(u8(ok), "image/webp")).toBe(true);
    expect(isWholeImage(u8(Buffer.concat([ok, Buffer.from("junk")])), "image/webp")).toBe(false);
  });
});
