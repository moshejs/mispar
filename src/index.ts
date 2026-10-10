/**
 * mispar — Hebrew gematria, all the classical methods.
 *
 * מספר ("number"). Computes the numerical value of Hebrew text under the
 * classical counting methods: hechrachi (standard), gadol, katan, siduri,
 * katan mispari, perati, meshulash, kidmi, bone'eh, ha'akhor, milui, and the
 * atbash/albam cipher values.
 *
 * Niqqud and cantillation marks are stripped automatically; final letters
 * are handled per method. Non-Hebrew characters are ignored unless
 * `strict: true`. Also converts numbers to and from Hebrew numerals
 * (hebrewNumeral / parseHebrewNumeral).
 */

export type Method =
  | "hechrachi" // standard absolute value (א=1 … ת=400)
  | "gadol" // finals count 500–900
  | "katan" // single-digit reduction per letter
  | "siduri" // ordinal position (א=1 … ת=22)
  | "katan-mispari" // digital root of the standard total
  | "perati" // each letter squared
  | "meshulash" // each letter cubed
  | "kidmi" // cumulative: each letter = sum of standard values up to it
  | "boneeh" // building: running total re-added at each letter of a word
  | "haakhor" // positional: value × position within the word
  | "milui" // full spelling: value of each letter's spelled-out name
  | "atbash" // standard value after the atbash cipher
  | "albam"; // standard value after the albam cipher

export interface GematriaOptions {
  /** Throw on characters that are not Hebrew, whitespace, or marks. Default false (ignore them). */
  strict?: boolean;
  /**
   * Milui only: override letter-name spellings, e.g. `{ ה: "הי", ו: "ויו" }`.
   * Letters not listed keep the defaults in MILUI_SPELLINGS. Spellings vary
   * by tradition (הא/הי, ואו/ויו, פה/פא, תו/תיו); niqqud in them is ignored.
   */
  spellings?: Readonly<Record<string, string>>;
}

export interface LetterValue {
  letter: string;
  value: number;
}

const ALPHABET = "אבגדהוזחטיכלמנסעפצקרשת";

const STANDARD: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
};

const FINAL_TO_BASE: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

const GADOL_FINALS: Record<string, number> = { ך: 500, ם: 600, ן: 700, ף: 800, ץ: 900 };

/**
 * Default milui (full-spelling) letter names. One common tradition —
 * spellings vary (e.g. הא/הי, ואו/ויו, פה/פא, תו/תיו); override via
 * options.spellings.
 */
export const MILUI_SPELLINGS: Readonly<Record<string, string>> = {
  א: "אלף", ב: "בית", ג: "גימל", ד: "דלת", ה: "הא", ו: "ואו", ז: "זין",
  ח: "חית", ט: "טית", י: "יוד", כ: "כף", ל: "למד", מ: "מם", נ: "נון",
  ס: "סמך", ע: "עין", פ: "פה", צ: "צדי", ק: "קוף", ר: "ריש", ש: "שין", ת: "תו",
};

export const METHODS: readonly Method[] = [
  "hechrachi", "gadol", "katan", "siduri", "katan-mispari", "perati",
  "meshulash", "kidmi", "boneeh", "haakhor", "milui", "atbash", "albam",
];

// Combining marks (niqqud, ta'amim, meteg, CGJ, …) and invisible format
// characters (RLM/LRM, ZWJ/ZWNJ, bidi embeddings): dropped without breaking
// the word. Note the Hebrew points block U+0591–U+05C7 also contains
// punctuation (maqaf U+05BE, paseq U+05C0, sof pasuq U+05C3, nun hafukha
// U+05C6), which \p{M} does not match — those separate words below.
const INVISIBLE_RE = /[\p{M}\p{Cf}]/u;
// Geresh, gershayim + ASCII lookalikes: abbreviation/numeral marks inside a
// word (רמב״ם), so ignored without breaking the word
const IN_WORD_PUNCT = "׳״'\"";
// Hebrew punctuation that separates words: maqaf, paseq, sof pasuq, nun hafukha
const HEBREW_SEPARATORS = "־׀׃׆";
// Yiddish ligatures have no Unicode decomposition
const LIGATURES: Record<string, string> = { װ: "וו", ױ: "וי", ײ: "יי" };

const HEBREW_LETTER_RE = /^[א-ת]$/;

function normalizeFinal(ch: string): string {
  return FINAL_TO_BASE[ch] ?? ch;
}

function codePoint(ch: string): string {
  return `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
}

function assertString(text: unknown): asserts text is string {
  if (typeof text !== "string") throw new TypeError(`Expected a string, got ${text === null ? "null" : typeof text}`);
}

function assertMethod(method: unknown): asserts method is Method {
  if (!(METHODS as readonly unknown[]).includes(method)) {
    throw new RangeError(`Unknown method "${String(method)}" — expected one of: ${METHODS.join(", ")}`);
  }
}

/**
 * Tokenize into words of Hebrew letters. Text is NFKD-normalized first, so
 * presentation forms (שׁ U+FB2A, wide letters, the אל ligature U+FB4F) become
 * plain letters. Marks are stripped; whitespace, maqaf and any other
 * punctuation separate words. Each word keeps the original letters (finals
 * preserved).
 */
function tokenize(text: string, strict: boolean): string[][] {
  assertString(text);
  const words: string[][] = [];
  let current: string[] = [];
  const breakWord = () => {
    if (current.length) words.push(current);
    current = [];
  };
  for (const raw of text.normalize("NFKD")) {
    for (const ch of LIGATURES[raw] ?? raw) {
      if (HEBREW_LETTER_RE.test(ch)) {
        current.push(ch);
      } else if (INVISIBLE_RE.test(ch) || IN_WORD_PUNCT.includes(ch)) {
        // dropped; the word continues
      } else if (/\s/.test(ch) || HEBREW_SEPARATORS.includes(ch)) {
        breakWord();
      } else if (strict) {
        throw new RangeError(`Non-Hebrew character in strict mode: "${ch}" (${codePoint(ch)})`);
      } else {
        breakWord(); // other characters are ignored, but still end the word
      }
    }
  }
  breakWord();
  return words;
}

function standardValue(ch: string): number {
  return STANDARD[normalizeFinal(ch)]!;
}

function katanValue(ch: string): number {
  let v = standardValue(ch);
  while (v % 10 === 0) v /= 10;
  return v;
}

function siduriValue(ch: string): number {
  return ALPHABET.indexOf(normalizeFinal(ch)) + 1;
}

const KIDMI: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let running = 0;
  for (const ch of ALPHABET) {
    running += STANDARD[ch]!;
    out[ch] = running;
  }
  return out;
})();

function digitalRoot(n: number): number {
  return n === 0 ? 0 : 1 + ((n - 1) % 9);
}

function cipherMap(pair: (i: number) => number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < 22; i++) out[ALPHABET[i]!] = ALPHABET[pair(i)]!;
  return out;
}

const ATBASH_MAP = cipherMap((i) => 21 - i);
const ALBAM_MAP = cipherMap((i) => (i + 11) % 22);

function applyCipher(text: string, map: Record<string, string>, strict: boolean): string {
  const words = tokenize(text, strict);
  return words.map((w) => w.map((ch) => map[normalizeFinal(ch)]!).join("")).join(" ");
}

/** The atbash cipher (א↔ת, ב↔ש, …) as a string transform. Finals are normalized. */
export function atbash(text: string, opts: GematriaOptions = {}): string {
  return applyCipher(text, ATBASH_MAP, opts.strict ?? false);
}

/** The albam cipher (א↔ל, ב↔מ, …) as a string transform. Finals are normalized. */
export function albam(text: string, opts: GematriaOptions = {}): string {
  return applyCipher(text, ALBAM_MAP, opts.strict ?? false);
}

function perLetterValue(ch: string, method: Method, opts: GematriaOptions): number {
  switch (method) {
    case "hechrachi":
      return standardValue(ch);
    case "gadol":
      return GADOL_FINALS[ch] ?? standardValue(ch);
    case "katan":
      return katanValue(ch);
    case "siduri":
      return siduriValue(ch);
    case "perati": {
      const v = standardValue(ch);
      return v * v;
    }
    case "meshulash": {
      const v = standardValue(ch);
      return v * v * v;
    }
    case "kidmi":
      return KIDMI[normalizeFinal(ch)]!;
    case "milui": {
      const base = normalizeFinal(ch);
      const name = opts.spellings?.[base] ?? MILUI_SPELLINGS[base]!;
      // niqqud allowed in a spelling; anything else but letters is an error
      const letters = [...String(name).normalize("NFKD")].filter((c) => !INVISIBLE_RE.test(c));
      if (!letters.length || !letters.every((c) => HEBREW_LETTER_RE.test(c))) {
        throw new RangeError(`Milui spelling for "${base}" must be Hebrew letters, got "${name}"`);
      }
      let sum = 0;
      for (const c of letters) sum += standardValue(c);
      return sum;
    }
    case "atbash":
      return standardValue(ATBASH_MAP[normalizeFinal(ch)]!);
    case "albam":
      return standardValue(ALBAM_MAP[normalizeFinal(ch)]!);
    default:
      throw new RangeError(`"${method}" is not a per-letter method`);
  }
}

/**
 * The gematria of Hebrew text under a method (default: hechrachi, the
 * standard count).
 *
 * ```ts
 * gematria("חי");                 // 18
 * gematria("שלום");               // 376
 * gematria("אלהים", "gadol");     // 646 — final ם counts 600
 * gematria("אמת", "katan-mispari"); // 9 — digital root of 441
 * gematria("שָׁלוֹם");              // 376 — niqqud stripped
 * ```
 */
export function gematria(text: string, method: Method = "hechrachi", opts: GematriaOptions = {}): number {
  assertMethod(method);
  const strict = opts.strict ?? false;
  const words = tokenize(text, strict);

  switch (method) {
    case "katan-mispari": {
      let total = 0;
      for (const w of words) for (const ch of w) total += standardValue(ch);
      return digitalRoot(total);
    }
    case "boneeh": {
      // Running total re-added at each letter: for values v1…vn of a word,
      // the sum of its prefix sums. Restarts each word, like haakhor, so a
      // phrase's value is the sum of its words' values.
      let total = 0;
      for (const w of words) {
        let running = 0;
        for (const ch of w) {
          running += standardValue(ch);
          total += running;
        }
      }
      return total;
    }
    case "haakhor": {
      // value × position, positions restart per word
      let total = 0;
      for (const w of words) {
        w.forEach((ch, i) => {
          total += standardValue(ch) * (i + 1);
        });
      }
      return total;
    }
    default: {
      let total = 0;
      for (const w of words) for (const ch of w) total += perLetterValue(ch, method, opts);
      return total;
    }
  }
}

/**
 * Per-letter contributions to the total, in order (words flattened).
 * Not defined for "katan-mispari" (the reduction applies to the total).
 */
export function letterValues(
  text: string,
  method: Method = "hechrachi",
  opts: GematriaOptions = {},
): LetterValue[] {
  assertMethod(method);
  if (method === "katan-mispari") {
    throw new RangeError('"katan-mispari" reduces the total — no per-letter values');
  }
  const words = tokenize(text, opts.strict ?? false);
  const out: LetterValue[] = [];
  for (const w of words) {
    let running = 0;
    w.forEach((ch, i) => {
      let value: number;
      if (method === "boneeh") {
        running += standardValue(ch);
        value = running;
      } else if (method === "haakhor") {
        value = standardValue(ch) * (i + 1);
      } else {
        value = perLetterValue(ch, method, opts);
      }
      out.push({ letter: ch, value });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hebrew numerals (number ↔ letters, as used for dates, chapters and years)
// ---------------------------------------------------------------------------

export interface NumeralOptions {
  /**
   * How to mark the numeral: "unicode" (default) uses geresh ׳ and gershayim
   * ״; "ascii" uses ' and "; "none" writes bare letters.
   */
  punctuation?: "unicode" | "ascii" | "none";
}

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];

/** Letters for 1–999, with ט״ו / ט״ז in place of the divine-name spellings. */
function lettersBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const tail = rest === 15 ? "טו" : rest === 16 ? "טז" : TENS[Math.floor(rest / 10)]! + ONES[rest % 10]!;
  return HUNDREDS[h]! + tail;
}

/**
 * Write a positive integer (1 – 999,999) as a Hebrew numeral.
 *
 * Gershayim go before the last letter, a single letter takes a geresh, and
 * 15/16 are written ט״ו/ט״ז. Thousands are written as their own letters
 * followed by a geresh, as in Hebrew years.
 *
 * ```ts
 * hebrewNumeral(18);    // "י״ח"
 * hebrewNumeral(15);    // "ט״ו"
 * hebrewNumeral(5);     // "ה׳"
 * hebrewNumeral(5786);  // "ה׳תשפ״ו"
 * hebrewNumeral(786, { punctuation: "ascii" }); // 'תשפ"ו'
 * ```
 *
 * An exact multiple of 1000 (5000 → "ה׳") reads the same as a units numeral;
 * write such numbers out in words if that matters.
 */
export function hebrewNumeral(n: number, opts: NumeralOptions = {}): string {
  if (!Number.isInteger(n) || n < 1 || n > 999_999) {
    throw new RangeError(`Hebrew numerals need an integer from 1 to 999999, got ${n}`);
  }
  const style = opts.punctuation ?? "unicode";
  if (style !== "unicode" && style !== "ascii" && style !== "none") {
    throw new RangeError(`Unknown punctuation "${String(style)}" — expected "unicode", "ascii" or "none"`);
  }
  const geresh = style === "unicode" ? "׳" : style === "ascii" ? "'" : "";
  const gershayim = style === "unicode" ? "״" : style === "ascii" ? '"' : "";
  const mark = (letters: string) =>
    letters.length === 1 ? letters + geresh : letters.slice(0, -1) + gershayim + letters.slice(-1);

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  let out = thousands ? lettersBelow1000(thousands) + geresh : "";
  if (rest) out += mark(lettersBelow1000(rest));
  return out;
}

const GERESHES = "׳'";
const GERSHAYIM = "״\"";

/**
 * Read a Hebrew numeral back into a number — the inverse of hebrewNumeral.
 *
 * A geresh followed by more letters marks thousands (ה׳תשפ״ו → 5786); a
 * trailing geresh or gershayim just marks the numeral. ASCII ' and " are
 * accepted, niqqud is ignored, and final letters count as their base letters.
 * Letter order is not enforced (רע and ער both read 270). Throws RangeError
 * on anything else, including empty input.
 *
 * ```ts
 * parseHebrewNumeral("ט״ו");      // 15
 * parseHebrewNumeral("ה׳תשפ״ו");  // 5786
 * parseHebrewNumeral('תשפ"ו');    // 786
 * ```
 */
export function parseHebrewNumeral(text: string): number {
  assertString(text);
  const chars = [...text.trim().normalize("NFKD")].filter((c) => !INVISIBLE_RE.test(c));
  const fail = (why: string): never => {
    throw new RangeError(`Not a Hebrew numeral: "${text}" (${why})`);
  };
  let thousands = 0;
  let units = 0;
  let letters = 0;
  let sawThousands = false;
  chars.forEach((ch, i) => {
    if (HEBREW_LETTER_RE.test(ch)) {
      units += standardValue(ch);
      letters++;
    } else if (GERESHES.includes(ch) && i < chars.length - 1) {
      if (sawThousands || !units) fail("misplaced geresh");
      thousands = units;
      units = 0;
      sawThousands = true;
    } else if (!(GERESHES.includes(ch) || GERSHAYIM.includes(ch))) {
      fail(`unexpected character ${codePoint(ch)}`);
    }
  });
  if (!letters) fail("no letters");
  if (sawThousands && !units) fail("nothing after the thousands geresh");
  return thousands * 1000 + units;
}
