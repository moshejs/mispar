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
 * `strict: true`.
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
  | "boneeh" // building: running total re-added at each letter
  | "haakhor" // positional: value × position within the word
  | "milui" // full spelling: value of each letter's spelled-out name
  | "atbash" // standard value after the atbash cipher
  | "albam"; // standard value after the albam cipher

export interface GematriaOptions {
  /** Throw on characters that are not Hebrew, whitespace, or marks. Default false (ignore them). */
  strict?: boolean;
  /**
   * Milui only: override the letter-name spellings. Spellings vary by
   * tradition (הא/הי, ואו/ויו, פה/פא, תו/תיו) — see MILUI_SPELLINGS for the
   * defaults used here.
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

// Hebrew points and cantillation marks (niqqud, ta'amim, meteg, etc.)
const MARKS_RE = /[֑-ׇ]/g;
// Hebrew punctuation treated as a word separator (maqaf) or ignored entirely
const MAQAF = "־";
const IGNORED_PUNCT_RE = /[׳״'"]/g; // geresh, gershayim + ASCII lookalikes

const HEBREW_LETTER_RE = /^[א-ת]$/;

function normalizeFinal(ch: string): string {
  return FINAL_TO_BASE[ch] ?? ch;
}

/**
 * Tokenize into words of Hebrew letters (marks stripped, maqaf = separator).
 * Each word keeps the original letters (finals preserved).
 */
function tokenize(text: string, strict: boolean): string[][] {
  const cleaned = text
    .replace(MARKS_RE, "")
    .replace(IGNORED_PUNCT_RE, "")
    .replace(new RegExp(MAQAF, "g"), " ");
  const words: string[][] = [];
  let current: string[] = [];
  for (const ch of cleaned) {
    if (HEBREW_LETTER_RE.test(ch)) {
      current.push(ch);
    } else if (/\s/.test(ch)) {
      if (current.length) words.push(current);
      current = [];
    } else if (strict) {
      throw new RangeError(`Non-Hebrew character in strict mode: "${ch}" (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`);
    }
    // non-Hebrew, non-space characters are ignored when not strict
  }
  if (current.length) words.push(current);
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
      const spellings = opts.spellings ?? MILUI_SPELLINGS;
      const name = spellings[normalizeFinal(ch)];
      if (!name) throw new RangeError(`No milui spelling for letter "${ch}"`);
      let sum = 0;
      for (const c of name) sum += standardValue(c);
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
  const strict = opts.strict ?? false;
  const words = tokenize(text, strict);

  switch (method) {
    case "katan-mispari": {
      let total = 0;
      for (const w of words) for (const ch of w) total += standardValue(ch);
      return digitalRoot(total);
    }
    case "boneeh": {
      // Running total re-added at each letter: for values v1…vn within the
      // whole text, sum of prefix sums.
      let running = 0;
      let total = 0;
      for (const w of words) {
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
  if (method === "katan-mispari") {
    throw new RangeError('"katan-mispari" reduces the total — no per-letter values');
  }
  const words = tokenize(text, opts.strict ?? false);
  const out: LetterValue[] = [];
  let running = 0;
  for (const w of words) {
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
