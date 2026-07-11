import { describe, expect, it } from "vitest";
import { METHODS, MILUI_SPELLINGS, albam, atbash, gematria, letterValues } from "../src/index.js";

describe("hechrachi (standard)", () => {
  it("computes the classic values", () => {
    expect(gematria("חי")).toBe(18);
    expect(gematria("שלום")).toBe(376);
    expect(gematria("תורה")).toBe(611);
    expect(gematria("אמת")).toBe(441);
    expect(gematria("אלהים")).toBe(86);
  });

  it("final letters count as their base letters", () => {
    expect(gematria("מים")).toBe(90);
    expect(gematria("ץ")).toBe(90);
  });

  it("strips niqqud and cantillation", () => {
    expect(gematria("שָׁלוֹם")).toBe(376);
    expect(gematria("בְּרֵאשִׁית")).toBe(gematria("בראשית"));
  });

  it("sums across words; maqaf separates words", () => {
    expect(gematria("שלום עולם")).toBe(376 + 146);
    expect(gematria("בית־ספר")).toBe(gematria("בית ספר"));
  });

  it("empty and non-Hebrew-only input is 0", () => {
    expect(gematria("")).toBe(0);
    expect(gematria("hello 123")).toBe(0);
  });
});

describe("the method family", () => {
  it("gadol — finals count 500–900", () => {
    expect(gematria("אלהים", "gadol")).toBe(646); // ם = 600
    expect(gematria("ץ", "gadol")).toBe(900);
    expect(gematria("צ", "gadol")).toBe(90); // non-final unchanged
  });

  it("katan — per-letter digit reduction", () => {
    expect(gematria("אמת", "katan")).toBe(9); // 1 + 4 + 4
    expect(gematria("תשרק", "katan")).toBe(4 + 3 + 2 + 1);
  });

  it("katan-mispari — digital root of the standard total", () => {
    expect(gematria("אמת", "katan-mispari")).toBe(9); // 441 → 9
    expect(gematria("חי", "katan-mispari")).toBe(9); // 18 → 9
    expect(gematria("", "katan-mispari")).toBe(0);
  });

  it("siduri — ordinal positions", () => {
    expect(gematria("אבת", "siduri")).toBe(1 + 2 + 22);
    expect(gematria("שלום", "siduri")).toBe(21 + 12 + 6 + 13); // 52
  });

  it("perati and meshulash — squares and cubes", () => {
    expect(gematria("אב", "perati")).toBe(1 + 4);
    expect(gematria("שלום", "perati")).toBe(90000 + 900 + 36 + 1600);
    expect(gematria("אב", "meshulash")).toBe(1 + 8);
  });

  it("kidmi — cumulative alphabet values", () => {
    expect(gematria("א", "kidmi")).toBe(1);
    expect(gematria("ב", "kidmi")).toBe(3);
    expect(gematria("י", "kidmi")).toBe(55);
    expect(gematria("אי", "kidmi")).toBe(56);
    expect(gematria("ת", "kidmi")).toBe(1495);
  });

  it("boneeh — running total re-added at each letter", () => {
    expect(gematria("אבג", "boneeh")).toBe(1 + 3 + 6); // prefix sums
  });

  it("haakhor — value × position, restarting each word", () => {
    expect(gematria("אב", "haakhor")).toBe(1 * 1 + 2 * 2);
    expect(gematria("אב אב", "haakhor")).toBe(10);
  });

  it("milui — spelled-out letter names", () => {
    expect(gematria("א", "milui")).toBe(111); // אלף
    expect(gematria("שלום", "milui")).toBe(360 + 74 + 13 + 80); // שין למד ואו מם
    // overridable spellings (הי tradition instead of הא)
    expect(gematria("ה", "milui", { spellings: { ...MILUI_SPELLINGS, ה: "הי" } })).toBe(15);
    expect(gematria("ה", "milui")).toBe(6); // default הא
  });
});

describe("ciphers", () => {
  it("atbash transforms and values", () => {
    expect(atbash("אבת")).toBe("תשא");
    expect(gematria("אבת", "atbash")).toBe(400 + 300 + 1);
    expect(atbash("שלום עולם")).toContain(" "); // words preserved
  });

  it("albam transforms and values", () => {
    expect(albam("א")).toBe("ל");
    expect(albam("ל")).toBe("א");
    expect(gematria("א", "albam")).toBe(30);
    expect(gematria("כ", "albam")).toBe(400); // כ → ת
  });

  it("atbash is an involution", () => {
    expect(atbash(atbash("בראשית"))).toBe("בראשית");
  });
});

describe("letterValues", () => {
  it("returns per-letter contributions", () => {
    expect(letterValues("שלום")).toEqual([
      { letter: "ש", value: 300 },
      { letter: "ל", value: 30 },
      { letter: "ו", value: 6 },
      { letter: "ם", value: 40 },
    ]);
  });

  it("handles positional methods", () => {
    expect(letterValues("אבג", "boneeh").map((l) => l.value)).toEqual([1, 3, 6]);
    expect(letterValues("אב", "haakhor").map((l) => l.value)).toEqual([1, 4]);
  });

  it("rejects katan-mispari", () => {
    expect(() => letterValues("אמת", "katan-mispari")).toThrow(RangeError);
  });
});

describe("strict mode and exports", () => {
  it("ignores non-Hebrew by default, throws in strict mode", () => {
    expect(gematria("שלום! (peace)")).toBe(376);
    expect(() => gematria("שלום x", "hechrachi", { strict: true })).toThrow(/Non-Hebrew/);
    expect(gematria("שלום׳״", "hechrachi", { strict: true })).toBe(376); // geresh/gershayim ok
  });

  it("exports all 13 methods", () => {
    expect(METHODS).toHaveLength(13);
    for (const m of METHODS) {
      expect(typeof gematria("שלום", m)).toBe("number");
    }
  });
});
