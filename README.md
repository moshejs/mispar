# mispar

Hebrew **gematria** with all the classical counting methods — not just the standard count. מספר, "number." Zero dependencies.

```
npm install mispar
```

## Why

Every gematria package on npm does one thing: the standard count (and the venerable [`gematriya`](https://www.npmjs.com/package/gematriya) converts numerals ↔ Hebrew letters, which is a different job entirely). But the tradition has *many* counting methods — final letters as 500–900, ordinal values, digit reduction, squares, spelled-out letter names, the atbash and albam ciphers — and they're exactly what gematria tooling needs.

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
| `siduri` | ordinal position, א=1 … ת=22 |
| `katan-mispari` | digital root of the standard total |
| `perati` | each letter's value squared |
| `meshulash` | each letter's value cubed |
| `kidmi` | cumulative: each letter = sum of all values up to it (י=55) |
| `boneeh` | building: the running total re-added at every letter |
| `haakhor` | positional: value × position in the word |
| `milui` | each letter's spelled-out name (א→אלף=111); spellings overridable |
| `atbash` | standard value after the א↔ת cipher |
| `albam` | standard value after the א↔ל cipher |

Also exported: **`atbash(text)`** / **`albam(text)`** as string transforms, **`letterValues(text, method?)`** for per-letter breakdowns, **`METHODS`**, and **`MILUI_SPELLINGS`** (the default naming tradition — variants like הי/ואו/פא/תיו can be passed via `options.spellings`).

Niqqud and cantillation are stripped automatically; maqaf (־) separates words; non-Hebrew characters are ignored unless `{ strict: true }`.

## Related

By the same author: [Gamatria](https://gamatria.vercel.app) — a gematria search engine over the Tanakh and Mishnah — and a [fixed-income toolkit](https://github.com/moshejs/32nds) if your numerology runs to bonds instead.

## Author

Built by **[Moshe Malka](https://moshemalka.com)** — engineering leader in New York City. Studio work at [Quentin.Code](https://www.quentin.software/).

MIT © Moshe Malka
