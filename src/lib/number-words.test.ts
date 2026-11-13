import { describe, expect, it } from "vitest";
import { countWord } from "./number-words";

describe("countWord", () => {
  it("spells small counts and falls back to digits", () => {
    expect(countWord(0)).toBe("No");
    expect(countWord(11)).toBe("Eleven");
    expect(countWord(15)).toBe("Fifteen");
    expect(countWord(21)).toBe("21");
  });
});
