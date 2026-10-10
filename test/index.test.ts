import { describe, expect, it } from "vitest";
import {
  METHODS,
  MILUI_SPELLINGS,
  albam,
  atbash,
  gematria,
  hebrewNumeral,
  letterValues,
  parseHebrewNumeral,
} from "../src/index.js";

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

  it("Genesis 1:1 with full niqqud and cantillation is 2701", () => {
    expect(gematria("בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃")).toBe(2701);
  });

  it("normalizes presentation forms and Yiddish ligatures", () => {
    expect(gematria("\uFB2A")).toBe(300); // שׁ presentation form
    expect(gematria("\uFB4F")).toBe(31); // אל ligature
    expect(gematria("\uFB21")).toBe(1); // wide alef
    expect(gematria("\u05F0\u05F1\u05F2")).toBe(12 + 16 + 20); // װ ױ ײ
    expect(gematria("שָׁלוֹם".normalize("NFD"))).toBe(gematria("שָׁלוֹם".normalize("NFC")));
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

  it("boneeh restarts each word, so a phrase is the sum of its words", () => {
    expect(gematria("אחד", "boneeh")).toBe(1 + 9 + 13); // 23
    expect(gematria("א ב", "boneeh")).toBe(1 + 2);
    expect(gematria("אחד אחד", "boneeh")).toBe(46);
    expect(letterValues("אב אב", "boneeh").map((l) => l.value)).toEqual([1, 3, 1, 3]);
  });

  it("haakhor — value × position, restarting each word", () => {
    expect(gematria("אב", "haakhor")).toBe(1 * 1 + 2 * 2);
    expect(gematria("אב אב", "haakhor")).toBe(10);
  });

  it("maqaf and other punctuation separate words (positional methods)", () => {
    // maqaf lives in the Hebrew points block — it must not be stripped as a mark
    expect(gematria("בית־ספר", "haakhor")).toBe(gematria("בית ספר", "haakhor"));
    expect(gematria("בית־ספר", "boneeh")).toBe(gematria("בית ספר", "boneeh"));
    expect(gematria("בית-ספר", "haakhor")).toBe(gematria("בית ספר", "haakhor"));
    expect(gematria("שלום,עולם", "haakhor")).toBe(gematria("שלום עולם", "haakhor"));
    expect(gematria("אב׀אב", "haakhor")).toBe(10); // paseq
    expect(atbash("בית־ספר")).toBe("שמא חוג");
  });

  it("geresh, gershayim and quotes do not break a word", () => {
    expect(gematria('רמב"ם', "haakhor")).toBe(gematria("רמבם", "haakhor"));
    expect(gematria("רמב״ם", "haakhor")).toBe(gematria("רמבם", "haakhor"));
  });

  it("milui — spelled-out letter names", () => {
    expect(gematria("א", "milui")).toBe(111); // אלף
    expect(gematria("שלום", "milui")).toBe(360 + 74 + 13 + 80); // שין למד ואו מם
    // overridable spellings (הי tradition instead of הא)
    expect(gematria("ה", "milui", { spellings: { ...MILUI_SPELLINGS, ה: "הי" } })).toBe(15);
    expect(gematria("ה", "milui")).toBe(6); // default הא
  });

  it("milui — partial spelling overrides fall back to the defaults", () => {
    expect(gematria("שלום", "milui", { spellings: { ה: "הי" } })).toBe(527);
    expect(gematria("ו", "milui", { spellings: { ו: "וָיו" } })).toBe(22); // niqqud ignored
    expect(gematria("ם", "milui")).toBe(80); // finals use the base letter's name
  });

  it("milui — rejects spellings that are not Hebrew letters", () => {
    expect(() => gematria("ה", "milui", { spellings: { ה: "h" } })).toThrow(RangeError);
    expect(() => gematria("ה", "milui", { spellings: { ה: "" } })).toThrow(RangeError);
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

  it("strict mode allows invisible formatting and Hebrew punctuation", () => {
    expect(gematria("\u200Fשלום\u200E", "hechrachi", { strict: true })).toBe(376); // RLM / LRM
    expect(gematria("שָ\u034Fלוֹם", "hechrachi", { strict: true })).toBe(376); // CGJ
    expect(gematria("בית־ספר׃", "hechrachi", { strict: true })).toBe(gematria("ביתספר"));
    expect(() => gematria("שלום-עולם", "hechrachi", { strict: true })).toThrow(/U\+002D/);
  });

  it("validates arguments in every function", () => {
    // @ts-expect-error — runtime check
    expect(() => gematria("שלום", "foo")).toThrow(RangeError);
    // @ts-expect-error — runtime check
    expect(() => gematria("", "foo")).toThrow(RangeError);
    // @ts-expect-error — runtime check
    expect(() => letterValues("א", "foo")).toThrow(RangeError);
    // @ts-expect-error — runtime check
    expect(() => gematria(null)).toThrow(TypeError);
    // @ts-expect-error — runtime check
    expect(() => atbash(42)).toThrow(TypeError);
    // @ts-expect-error — runtime check
    expect(() => albam(undefined)).toThrow(TypeError);
  });

  it("exports all 13 methods", () => {
    expect(METHODS).toHaveLength(13);
    for (const m of METHODS) {
      expect(typeof gematria("שלום", m)).toBe("number");
    }
  });
});

describe("hebrewNumeral", () => {
  it("writes units, tens and hundreds", () => {
    expect(hebrewNumeral(1)).toBe("א׳");
    expect(hebrewNumeral(18)).toBe("י״ח");
    expect(hebrewNumeral(400)).toBe("ת׳");
    expect(hebrewNumeral(613)).toBe("תרי״ג");
    expect(hebrewNumeral(500)).toBe("ת״ק");
    expect(hebrewNumeral(999)).toBe("תתקצ״ט");
  });

  it("writes 15 and 16 as ט״ו and ט״ז", () => {
    expect(hebrewNumeral(15)).toBe("ט״ו");
    expect(hebrewNumeral(16)).toBe("ט״ז");
    expect(hebrewNumeral(115)).toBe("קט״ו");
    expect(hebrewNumeral(916)).toBe("תתקט״ז");
  });

  it("writes thousands with a geresh, as in years", () => {
    expect(hebrewNumeral(5786)).toBe("ה׳תשפ״ו");
    expect(hebrewNumeral(5001)).toBe("ה׳א׳");
    expect(hebrewNumeral(5015)).toBe("ה׳ט״ו");
    expect(hebrewNumeral(5000)).toBe("ה׳");
    expect(hebrewNumeral(15786)).toBe("טו׳תשפ״ו");
  });

  it("supports ASCII and bare styles", () => {
    expect(hebrewNumeral(5786, { punctuation: "ascii" })).toBe(`ה'תשפ"ו`);
    expect(hebrewNumeral(1, { punctuation: "ascii" })).toBe("א'");
    expect(hebrewNumeral(786, { punctuation: "none" })).toBe("תשפו");
  });

  it("rejects non-integers and out-of-range values", () => {
    for (const n of [0, -1, 1.5, NaN, Infinity, 1_000_000]) {
      expect(() => hebrewNumeral(n)).toThrow(RangeError);
    }
    // @ts-expect-error — runtime check
    expect(() => hebrewNumeral(5, { punctuation: "fancy" })).toThrow(RangeError);
  });
});

describe("parseHebrewNumeral", () => {
  it("reads numerals in either punctuation style", () => {
    expect(parseHebrewNumeral("ט״ו")).toBe(15);
    expect(parseHebrewNumeral("ה׳")).toBe(5);
    expect(parseHebrewNumeral("ה׳תשפ״ו")).toBe(5786);
    expect(parseHebrewNumeral(`ה'תשפ"ו`)).toBe(5786);
    expect(parseHebrewNumeral("תשפו")).toBe(786);
    expect(parseHebrewNumeral(" ה׳א׳ ")).toBe(5001);
    expect(parseHebrewNumeral("ער")).toBe(270);
  });

  it("round-trips every number below a million (except exact thousands)", () => {
    for (let n = 1; n < 1_000_000; n += n < 2000 ? 1 : 997) {
      if (n % 1000) expect(parseHebrewNumeral(hebrewNumeral(n))).toBe(n);
    }
  });

  it("rejects things that are not numerals", () => {
    for (const s of ["", "׳", "ט ו", "12", "ה׳׳א", "׳א", "abc"]) {
      expect(() => parseHebrewNumeral(s)).toThrow(RangeError);
    }
    // @ts-expect-error — runtime check
    expect(() => parseHebrewNumeral(15)).toThrow(TypeError);
  });
});
