# mispar

Hebrew **gematria** with all the classical counting methods — not just the standard count — plus Hebrew numerals in both directions. מספר, "number." Zero dependencies.

```
npm install mispar
```

## Why

Most gematria packages on npm do one thing: the standard count. But the tradition has *many* counting methods — final letters as 500–900, ordinal values, digit reduction, squares, spelled-out letter names, the atbash and albam ciphers — and they're exactly what gematria tooling needs.

```ts
import { gematria, letterValues, atbash } from "mispar";

gematria("חי");                    // 18
gematria("שלום");                  // 376
gematria("שָׁלוֹם");                 // 376 — niqqud stripped automatically

gematria("אלהים");                 // 86
gematria("אלהים", "gadol");        // 646 — final ם counts as 600
gematria("אמת", "katan");          // 9   — per-letter digit reduction
gematria("אמת", "katan-mispari");  // 9   — digital root of 441
gematria("א", "milui");            // 111 — אלף, the letter spelled out

atbash("בראשית");                  // the cipher as a string transform
letterValues("שלום");              // [{letter:"ש",value:300}, …] — build a calculator
```

## The 13 methods

| Method | What it counts |
| --- | --- |
| `hechrachi` *(default)* | standard absolute values, א=1 … ת=400 |
| `gadol` | finals ך ם ן ף ץ count 500–900 |
| `katan` | each letter reduced to one digit (י=1, ק=1) |
| `siduri` | ordinal position, א=1 … ת=22 (finals count as their base letter; some tables give them 23–27) |
| `katan-mispari` | digital root of the standard total |
| `perati` | each letter's value squared |
| `meshulash` | each letter's value cubed |
| `kidmi` | cumulative: each letter = sum of all values up to it (י=55) |
| `boneeh` | building: the running total re-added at every letter of a word (אחד = 1+9+13 = 23) |
| `haakhor` | positional: value × position in the word |
| `milui` | each letter's spelled-out name (א→אלף=111); spellings overridable |
| `atbash` | standard value after the א↔ת cipher |
| `albam` | standard value after the א↔ל cipher |

Also exported: **`atbash(text)`** / **`albam(text)`** as string transforms, **`letterValues(text, method?)`** for per-letter breakdowns, **`METHODS`**, and **`MILUI_SPELLINGS`** (the default naming tradition). Pass variants through `options.spellings`, e.g. `{ ה: "הי", ו: "ויו" }`. Letters you don't list keep the defaults.

## Hebrew numerals

```ts
import { hebrewNumeral, parseHebrewNumeral } from "mispar";

hebrewNumeral(18);                              // "י״ח"
hebrewNumeral(15);                              // "ט״ו" — never יה
hebrewNumeral(5);                               // "ה׳"
hebrewNumeral(5786);                            // "ה׳תשפ״ו"
hebrewNumeral(5786, { punctuation: "ascii" });  // `ה'תשפ"ו`
hebrewNumeral(786, { punctuation: "none" });    // "תשפו"

parseHebrewNumeral("ה׳תשפ״ו");                  // 5786
parseHebrewNumeral('תשפ"ו');                    // 786
```

`hebrewNumeral` takes an integer from 1 to 999,999: gershayim go before the last letter, a single letter takes a geresh, 15 and 16 are ט״ו and ט״ז, and thousands are written as their own letters followed by a geresh. An exact multiple of 1000 (5000 → `ה׳`) reads the same as a units numeral, so `parseHebrewNumeral` reads that back as 5. The parser accepts ׳ ״ or ASCII ' ", ignores niqqud, counts finals as their base letter, and doesn't enforce letter order (ער and רע are both 270).

(`gematria("ט״ו")` is also 15, but `gematria` ignores the thousands geresh, so use `parseHebrewNumeral` for years.)

## Input handling

- Niqqud, cantillation and other combining marks are stripped, as are invisible formatting characters (RLM/LRM, ZWJ/ZWNJ).
- Text is NFKD-normalized, so presentation forms (שׁ U+FB2A, wide letters, the אל ligature) count as plain letters; the Yiddish ligatures װ ױ ײ count as two letters.
- Geresh and gershayim (׳ ״, or ASCII ' ") are ignored inside a word, so רמב״ם is one word.
- Whitespace, maqaf (־), paseq (׀), sof pasuq (׃) and any other punctuation separate words. Only the positional methods (`boneeh`, `haakhor`) and the `atbash`/`albam` string transforms depend on where words break.
- Other non-Hebrew characters are ignored unless `{ strict: true }`, which throws a `RangeError` on them.
- An unknown method throws `RangeError`. A non-string input throws `TypeError`.

## Related

By the same author: [Gamatria](https://gamatria.vercel.app) — a gematria search engine over the Tanakh and Mishnah — and a [fixed-income toolkit](https://github.com/moshejs/32nds) if your numerology runs to bonds instead.

## Author

Built by **[Moshe Malka](https://moshemalka.com)** — engineering leader in New York City. Studio work at [Quentin.Code](https://www.quentin.software/).

MIT © Moshe Malka
