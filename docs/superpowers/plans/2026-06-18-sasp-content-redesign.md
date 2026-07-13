# SASP Content Redesign (Fáze 3, + Fáze 2 folded) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Nahradit adaptovaný SASP obsah nativně autorovaným, redesignovaným obsahem v `src/modules/law/data/sasp/` dle design specu: dedup duplikátů, 4 match sety, scénáře, legal/procedurální otázky, anti-leak vůči zkoušce, a všechny multi-choice s **≥5 možnostmi** (a vícenásobně správnými, kde to dává smysl — Fáze 2 složená sem).

**Architecture:** Autorovat SASP otázky přímo jako `LawQuestion` literály v `src/modules/law/data/sasp/{choice,text,enumeration,match}.ts` (`source:'sasp'`), sloučit do `SASP_LAW_QUESTIONS`, a v `law/data/index.ts` nahradit `adaptSaspQuestions()` tímto polem. LEA + Penal adaptéry zůstávají. Strukturu vynucují validační testy; věcnou správnost a anti-leak zajišťuje autoring z manuálu + adversariální review.

**Zdroje pro autoring (subagenti je MUSÍ číst):**
- `docs/sasp-manual.md` — důvěrný zdroj faktů (na disku, gitignored). Číst pro fakta, NEcommitovat jeho obsah.
- `docs/superpowers/specs/2026-06-17-sasp-exam-prep-redesign-design.md` — §7 anti-leak pravidla, §8 rozsah, §9 zkoušková coverage matice, §10 inventář otázek po tématech (R/RW/N tagy). TENTO inventář je závazný blueprint.

**Anti-leak (z §7 specu) — závazné:**
1. Žádná doslovná formulace ze zkoušky. 2. ŽÁDNÉ konkrétní detaily ze zkoušky: ulice Hawick Avenue, Elgin Avenue; banka jako orientační bod; pláž Vespucci; „modrý sedan"; 120 mph; Sgt Daniel Dallas; znaky V-10, V-23; řetězec `V-23 10-6 10-1 7`. Scénáře = vlastní vymyšlené detaily. 3. Žádné 1:1 zrcadlení. 4. Jiný úhel. 5. Pokrýt znalost, ne framing.

**ID konvence (prefix `sasp.` zachován, unikátní napříč law poolem):**
- choice: `sasp.choice.<topic>.<n>`
- scenario (choice/text se `scenario`): `sasp.scenario.<topic>.<n>`
- text: `sasp.text.<topic>.<n>`
- enumeration (ordered): `sasp.enum.<topic>.<slug>`
- match: `sasp.match.<topic>.<slug>`
- 8 témat = SASP topic→law theme: pojmy/hodnosti/jednani/rto/vybava/zasah/zadrzeni/kriminalistika.

**Tech:** TS literály typu `LawQuestion` z `@/modules/law/data/types`. Vitest validace. `@/`→`src/`.

---

### Task 1: Native SASP data scaffolding + validation harness

**Files:** Create `src/modules/law/data/sasp/choice.ts`, `text.ts`, `enumeration.ts`, `match.ts`, `index.ts`, `sasp.test.ts`.

Scaffolding s PRÁZDNÝMI exporty (obsah doplní topic tasky), sloučení + validační testy nad tím, co bude existovat.

- [ ] **Step 1:** Create each data file exporting a typed empty array, e.g. `choice.ts`:
```ts
import type { LawChoice } from '../types';
export const SASP_CHOICE: LawChoice[] = [];
```
`text.ts` → `SASP_TEXT: LawText[]`; `enumeration.ts` → `SASP_ENUM: LawEnumeration[]`; `match.ts` → `SASP_MATCH: LawMatch[]`. Import the right types from `../types`.

- [ ] **Step 2:** `index.ts`:
```ts
import { SASP_CHOICE } from './choice';
import { SASP_TEXT } from './text';
import { SASP_ENUM } from './enumeration';
import { SASP_MATCH } from './match';
import type { LawQuestion } from '../types';

export const SASP_LAW_QUESTIONS: readonly LawQuestion[] = [
  ...SASP_CHOICE, ...SASP_TEXT, ...SASP_ENUM, ...SASP_MATCH,
];
```

- [ ] **Step 3: write validation test** `src/modules/law/data/sasp/sasp.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { normalize } from '@/shared/text/normalize';
import { SASP_LAW_QUESTIONS } from './index';
import { LAW_THEMES } from '../types';

describe('SASP native content (structure)', () => {
  it('all source sasp + valid theme + sasp. id prefix', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      expect(q.source).toBe('sasp');
      expect(LAW_THEMES).toContain(q.theme);
      expect(q.id.startsWith('sasp.')).toBe(true);
    }
  });
  it('unique ids', () => {
    const ids = SASP_LAW_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('choice: >=5 options, >=1 correct, correctIndices in range, distinct options', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'choice') continue;
      expect(q.options.length).toBeGreaterThanOrEqual(5);
      expect(q.correctIndices.length).toBeGreaterThanOrEqual(1);
      for (const ci of q.correctIndices) {
        expect(ci).toBeGreaterThanOrEqual(0);
        expect(ci).toBeLessThan(q.options.length);
      }
      const norm = q.options.map(normalize);
      expect(new Set(norm).size).toBe(norm.length);
    }
  });
  it('text: aliases do not collide with answer after normalize', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'text') continue;
      const a = normalize(q.answer);
      for (const al of q.aliases) expect(normalize(al)).not.toBe(a);
    }
  });
  it('match: >=2 pairs, unique left labels and unique right values', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'match') continue;
      expect(q.pairs.length).toBeGreaterThanOrEqual(2);
      const lefts = q.pairs.map((p) => p.left);
      const rights = q.pairs.map((p) => p.right);
      expect(new Set(lefts).size).toBe(lefts.length);
      expect(new Set(rights).size).toBe(rights.length);
    }
  });
  it('enumeration: non-empty expected, valid matcher', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'enumeration') continue;
      expect(q.expected.length).toBeGreaterThanOrEqual(2);
      expect(['alias', 'paragraph']).toContain(q.matcher);
    }
  });
});
```
These pass vacuously while arrays are empty; they bite as content is added.

- [ ] **Step 4:** `npx vitest run src/modules/law/data/sasp/sasp.test.ts` — PASS (vacuous). `npx tsc -b` clean.

- [ ] **Step 5: commit:**
```bash
git add src/modules/law/data/sasp
git commit -m "feat(law): native SASP data scaffolding + structure validation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Tasks 2–9: Author content per topic

Each topic task: READ `docs/sasp-manual.md` (facts) + spec §7/§9/§10 (anti-leak rules, exam matrix, inventory). Author that topic's questions into the appropriate native file(s), appending to the exported arrays. Choice questions MUST have ≥5 options; mark multiple correct where the manual supports it. Scenarios use INVENTED details (anti-leak). After each, run `npx vitest run src/modules/law/data/sasp/sasp.test.ts` + `npx tsc -b` (green) and commit.

For EACH topic task, the implementer appends literals like:
```ts
// choice.ts
export const SASP_CHOICE: LawChoice[] = [
  { id: 'sasp.choice.terms.1', source: 'sasp', theme: 'pojmy', kind: 'choice',
    prompt: '…', options: ['…','…','…','…','…'], correctIndices: [0], note: '…' },
  // …
];
```
(Match sets in `match.ts`, scenarios with `scenario` field in `choice.ts`/`text.ts`, ordered/legal enumerations in `enumeration.ts`.)

- [ ] **Task 2 — pojmy** (~6 choice): per spec §10 "pojmy". loupež vs krádež (≥5 opts, fix filler), §10 prokázání příslušnosti, definice TČ, TČ vs přestupek, zadržení vs zatčení, trestní odpovědnost (14 let/příčetnost). Commit `feat(law): SASP pojmy content`.

- [ ] **Task 3 — hodnosti** (~5): match `sasp.match.hodnosti.callsigns` (divize↔call-sign, 9 párů: SWAT David, DBI William, Canine Charlie, GIU George, TEU Sierra, Marine Ocean, Air Air, Motorbike Marry, Park Rangers Ranger); choice "která hodnost je Staff" (≥5 opts); ordered enum `sasp.enum.hodnosti.ladder` (žebříček hodností bez DBI, matcher alias, ordered); scenario `sasp.scenario.hodnosti.1` (sestava hodností na místě → kdo velí, invented). Commit `feat(law): SASP hodnosti content (callsign match + ladder)`.

- [ ] **Task 4 — jednani** (~6): badge number civilistovi, k čemu BN (stížnost), scenario BN kolegy (invented context), povinnost zasáhnout, pořadová příprava (zaklepat), zdravit nejvyšší hodnost. (NO oslovování — removed per user.) ≥5 opts each. Commit `feat(law): SASP jednani content`.

- [ ] **Task 5 — rto** (~7): match `sasp.match.rto.channels` (F1, F4/F5, F6, F7, F8, F9, F10 ↔ účel, 7 párů); match `sasp.match.rto.priorities` (P1↔všechny dostupné+Code 3; P2↔v okolí+Code 3; P3↔vhodný počet+Code 2; P4↔jedna jednotka); choice detektivové=Henry (reword, ≥5), běžná dvojice=Adam (≥5), po příchodu Tom-1 10-8 (≥5); scenario zahájení patroly (invented loc/rank); scenario(text) dekódovat call (INVENTED codes, not exam's). Commit `feat(law): SASP rto content (channels + priorities match)`.

- [ ] **Task 6 — vybava** (~14 choice): taser dosah 10m, "taser taser taser", ne těhotné, obušek nohy/ruce, "shots fired"+poloha, preferovat taser/obušek, Panic A (10-99), Panic B (nehoda), bodycam nepřetržitě, dashcam nejde vypnout, Tint Meter (SGT/TEU), odmítnutí krev. testu=požil, tester nestačí, výbava vozu (multi-correct: co patří). All ≥5 opts. (NO field sobriety/bodycam-stahování/obušek-páka — removed per user.) Commit `feat(law): SASP vybava content`.

- [ ] **Task 7 — zasah** (~26): traffic/felony/pursuit/roadblock/vyjednávání per spec §10 "zasah". Scenarios (invented details): hlášení po zastavení, bez dokladů, pursuit hlášení, žádost o PIT, shots fired+10-99A, 10-50 koordinace, zahájení (if not in rto). Choice (≥5): nesdělovat přestupek na začátku, bezpečnostní důvod úhlu zastavení, vystoupí→návrat, začnou vystupovat→10-32, nesouhlas→zadržet, 14 dní, ukončení Code 4/10-98, fotka z radaru až na stanici, min jednotek felony, kdy felony, nezastaví dobrovolně→vytáhnout, kufr s asistencí, role secondary, PIT od SGT, PIT zamítnut→žádat znovu, PIT podmínky, max 2 spikes, předjíždění výjimka, perimetr úhlopříčky, roadblock zásady, proč roadblock, breach 3× volání, breach 2 jednotky, výkupné 2000/SGT+, velitel nepřistupuje na nesmysly, priorita=život rukojmích, vyjednavač skrytý/nikdy zády, BOX samovolně→Code 5. ordered enum `sasp.enum.zasah.felony-order` (pořadí vystupování osob u felony). text `sasp.text.zasah.felony-code` (Code 5). Commit `feat(law): SASP zasah content`.

- [ ] **Task 8 — zadrzeni** (~12 choice, legal z manuálu, ≥5 opts): zadržení 4P max 3h, do 3h se nezapočítává právník/soud, kdy NELZE zkrácené řízení (>20 let), instance SOS→SZ→státní→vrchní soud, poučení §11 (právo nevypovídat), poučení musí být na bodycam jinak nelze použít, použití zbraně §23, donucovací prostředky §21 (výzva/upuštění), vazba 48h, cely §15 oddělení, odebrání zbraně §18 (+vrátit 24h), předvedení max 1h. Commit `feat(law): SASP zadrzeni (legal) content`.

- [ ] **Task 9 — kriminalistika** (~12): match `sasp.match.kriminalistika.traces` (druh stopy↔co identifikuje, 6 párů: daktyloskopické/balistické/trasologické/mechanoskopické/biologické/chemické); choice (≥5): přímý balistický důkaz, pozitivní GSR, GSR blízkost 2m/5m, stopa vs důkaz, neodkladné úkony, zánik stop, relevantní události, přímý vs nepřímý důkaz, DNA databáze (násilné), biologické stopy (rukavice/sterilní). Commit `feat(law): SASP kriminalistika content (traces match)`.

For each: **Step A** append content; **Step B** run sasp.test.ts (PASS) + tsc (clean); **Step C** commit. If any structural test fails, fix the content. Report counts authored per kind.

---

### Task 10: Wire native SASP content into the pool; drop adaptSasp

**Files:** Modify `src/modules/law/data/index.ts`; delete `src/modules/law/data/adaptSasp.ts` + `adaptSasp.test.ts`; modify `e2e/fixtures/seed.ts`.

- [ ] **Step 1:** In `law/data/index.ts`, replace `...adaptSaspQuestions()` with `...SASP_LAW_QUESTIONS` (import from `./sasp`). Remove the `adaptSasp` import.
- [ ] **Step 2:** `git rm src/modules/law/data/adaptSasp.ts src/modules/law/data/adaptSasp.test.ts`.
- [ ] **Step 3:** Update `law/data/index.test.ts`: the merge-length test must now be LEA + Penal scenarios + `SASP_LAW_QUESTIONS.length` (no longer references adaptSasp). Keep unique-id + valid source/theme tests.
- [ ] **Step 4:** Update `e2e/fixtures/seed.ts`: `SASP_QUESTION_IDS` must become the NEW native SASP ids (derive from `SASP_LAW_QUESTIONS` ids, or hardcode the new list). `LAW_QUESTION_IDS` = LEA + Penal scenario + new SASP ids. Keep `pinNextLawQuestion` working.
- [ ] **Step 5:** `npx tsc -b` clean; `npm test` green; `npm run test:e2e` green (the law e2e specs may pin old SASP ids like `sasp.test.terms.1` — update them to a new id such as `sasp.choice.pojmy.1`). Fix any spec referencing removed ids.
- [ ] **Step 6: commit:**
```bash
git add -A
git commit -m "feat(law): use native SASP content in pool, drop adaptSasp

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Adversarial anti-leak + dedup review (no code unless issues)

- [ ] Dispatch a reviewer (this task is a review, not implementation): give it the FULL list of forbidden exam specifics (§7) + the 26-theme coverage matrix (§9) and have it READ every authored SASP question in `src/modules/law/data/sasp/`. It must flag: (a) any verbatim/near-verbatim exam phrasing; (b) any forbidden specific detail (Hawick/Elgin/Vespucci/modrý sedan/120mph/Daniel Dallas/V-10/V-23/the radio string); (c) any 1:1 mirror where a single practice question obviously equals a single exam question; (d) any remaining duplicate facts across questions; (e) choice questions with <5 options or implausible distractors. Output a list of question ids to fix.
- [ ] If issues found, dispatch a fix implementer to rewrite those questions (keep structure tests green), then re-review. Loop until clean.
- [ ] Commit any fixes: `fix(law): anti-leak + dedup pass on SASP content`.

---

### Task 12: CLAUDE.md + final verification + content checkpoint

- [ ] Update `CLAUDE.md`: SASP section now describes the unified `law` module content (formats incl. match/scenario/multi-choice), the native `law/data/sasp/` location, counts, anti-leak note, and that `adaptSasp` is gone. Update test counts.
- [ ] `npx tsc -b` clean; `npm test` green (report counts); `npm run test:e2e` green (report counts).
- [ ] Present a CONTENT summary to the user for review (counts per topic/kind, the 4 match sets, sample scenarios) — this is exam-prep content in the user's domain; they should sanity-check accuracy + anti-leak before it's considered final. (No merge — branch stays open for Fáze 4 cleanup.)

---

## Notes / NOT in this phase
- LEA + Penal content unchanged (only SASP redesigned). Old `src/modules/sasp/` module becomes dead after Task 10 (its tests still pass in-tree); its removal + old LEA/Penal modules + schema v8 is **Fáze 4 (úklid)**.
- The verbatim 26 exam questions are intentionally NOT committed to git; anti-leak authoring/review works from the forbidden-specifics list in spec §7.
