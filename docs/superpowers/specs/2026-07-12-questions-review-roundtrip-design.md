# Review round-trip pro otázky Teorie (markdown export/import)

Datum: 2026-07-12
Stav: schváleno uživatelem (návrh), čeká na implementaci

## Problém

Dataset `LAW_QUESTIONS` (137 otázek, `src/modules/law/data/questions.ts`) může
upravovat jen technicky zdatný člověk. Potřebujeme souhrnnou podobu, kterou
méně technický recenzent projde, upraví texty a promaže otázky — a změny se
automatizovaně propíšou zpět do TS.

## Řešení

Markdown jako plná obousměrná serializace datasetu. Zdroj pravdy zůstává
`questions.ts`; markdown je přechodný review artefakt (negeneruje se do gitu).

Workflow: `npm run questions:export` → soubor `docs/questions-review.md`
k recenzentovi → vrátí upravený → `npm run questions:import <cesta>` →
`npm test` → commit.

### Markdown formát

- Úvodní legenda pro recenzenta: jak zaškrtávat správné odpovědi, jak smazat
  otázku, že `;` odděluje aliasy/keywords, které řádky needitovat bez rozmyslu
  (metadata, `klíč:`).
- Otázky seskupené `## <zdroj> — <téma>`; každá otázka sekce:

```markdown
### <title> `<id>`
- typ: výběr | téma: vybava | ref: §7 A        (ref jen pokud existuje)
**Zadání:** …
**Scénka:** …                                   (jen pokud otázka scénku má)
**Možnosti:** (zaškrtnuté = správné)
- [x] …
- [ ] …
**Vysvětlivka:** …                              (jen pokud note existuje)
```

- Per kind:
  - `choice`: checkboxový seznam možností (výše).
  - `text`: `**Odpověď:**` + `**Aliasy:**` (oddělené `;`).
  - `enumeration`: číslovaný seznam položek; pod každou odsazené řádky
    `aliasy: …; …`, `keywords: …; …`, `klíč: <key>` (+ `sub: <subId>` pokud
    existuje). Metadata řádek nese matcher (`výčet (aliasy)` /
    `výčet (paragrafy)`) a u ordered `pořadí závazné: ano`.
  - `match`: markdown tabulka, záhlaví = `leftLabel` / `rightLabel`.
- ID v backticks na konci nadpisu = kotva identity pro round-trip.
- **Smazání otázky:** samostatný řádek `SMAZAT` kdekoli v sekci otázky.
- Přidávání nových otázek přes markdown NENÍ v rozsahu — nové otázky vznikají
  dál přímo v TS.

### Architektura

Čisté funkce v `src/modules/law/review/` (vzor: `formatPoisTs`
v `geo/logic/calibrate.ts`), tenké CLI wrappery ve `scripts/`:

- `serializeQuestions.ts` — `readonly LawQuestion[] → string` (markdown).
- `parseQuestionsMd.ts` — `string → { questions: LawQuestion[]; deletedIds: string[] }`.
  Chybové hlášky česky, s číslem řádku (např. „řádek 214: možnost bez
  checkboxu — očekávám `- [x]` nebo `- [ ]`").
- `formatQuestionsTs.ts` — `readonly LawQuestion[] → string` — celý obsah
  `questions.ts` (header komentář + import + literál), stabilní formátování
  (single quotes, trailing commas, escapování apostrofů) → čisté git diffy.
- `scripts/questions-export.ts` — importuje `LAW_QUESTIONS`, zapíše
  `docs/questions-review.md`.
- `scripts/questions-import.ts <cesta.md>` — parse → validace → přepíše:
  1. `src/modules/law/data/questions.ts` (kompletní regenerace literálu),
  2. `e2e/fixtures/seed.ts` — přegeneruje `LEA_QUESTION_IDS`,
     `PENAL_SCENARIO_IDS`, `SASP_QUESTION_IDS` (v pořadí datasetu) včetně
     count komentářů (Gotcha 43 tím řeší strojově),
  3. `src/modules/law/data/questions.test.ts` — per-source counts + total
     (cílený regex replace čtyř čísel).
  Vypíše souhrn (počet otázek, smazané IDs) a připomene `npm test`.
- Spouštění TS skriptů: nová devDependency `tsx`; npm skripty
  `questions:export`, `questions:import`.

### Validace

- Parser (rychlé, lidské hlášky): duplicitní/neznámý formát ID, neznámý typ,
  choice ≥5 možností a ≥1 správná, enumeration ≥1 položka, match ≥3 páry,
  title ≤40 znaků, prázdná povinná pole.
- Hlubší invarianty (kolize keywords/aliasů, ID prefixy, paragraph klíče,
  min. délka keyword tokenů) NEduplikovat — po importu je chytí existující
  `questions.test.ts` při `npm test`.

### Testy

- **Round-trip test** (vitest, `src/modules/law/review/roundtrip.test.ts`):
  `parse(serialize(LAW_QUESTIONS))` je deep-equal `LAW_QUESTIONS` a
  `deletedIds` prázdné — běží nad celým reálným datasetem, žádné ruční
  fixtures. Garantuje bezztrátovost každého pole včetně keywords/subId/ref.
- Testy parseru na chybové stavy (chybějící checkbox, neznámé ID, SMAZAT,
  rozbitá tabulka) s malými inline fixtures.
- Test `formatQuestionsTs`: vygenerovaný TS pro malý fixture odpovídá
  očekávanému snippetu; plná věrnost reálného souboru se ověří jednorázově
  při implementaci (regenerát == současný soubor po whitespace normalizaci
  není vyžadován — formát se může lišit, důležitá je sémantická shoda, kterou
  drží round-trip test + `npm test` po regeneraci).

### Mimo rozsah

- Přidávání otázek přes markdown.
- Editace jiných datasetů (codes, geo, paragraphs.ts).
- Automatický běh `npm test` uvnitř import skriptu (jen připomínka).
- Commit/verzování review markdownu (`docs/questions-review.md` jde do
  `.gitignore`).
