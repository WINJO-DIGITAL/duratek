import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "./csv";

describe("csv", () => {
  it("quotes and escapes", () => {
    expect(csvField('Say "hi", then go')).toBe('"Say ""hi"", then go"');
    expect(csvField(null)).toBe('""');
    expect(csvField(["Keswick Oak", "Fellside Oak"])).toBe('"Keswick Oak; Fellside Oak"');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvField("=HYPERLINK(\"http://x\")")).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvField("+44 1539 000000")).toBe('"\'+44 1539 000000"');
    expect(csvField("@SUM(A1)")).toBe('"\'@SUM(A1)"');
  });

  it("builds rows with CRLF line ends", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe('"a","b"\r\n"1","x"\r\n');
  });
});
