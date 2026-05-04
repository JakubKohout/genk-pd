# LEA quiz — draft otázek (k revizi)

Toto je **draft surového obsahu** pro modul `laws/lea`. Po schválení ho převedu do TS
literálu (analogicky `src/modules/codes/data/codes.ts`). Zdroj: `docs/lea.md`.

Datová struktura (cílová):

```ts
interface AnswerItem {
  id: string;       // "lea.16.B.3b"
  quote: string;    // plné zákonné znění — text v chipu i v autocomplete
  aliases: string[];// volné formy přijímané jako match (po normalize: lowercase + strip diakritika + trim)
  ref: string;      // "§16 B 3b"
}

interface Question {
  id: string;       // "lea.16.B"
  prompt: string;
  ref: string;      // "§16 B"
  items: AnswerItem[];
}
```

Skóre per otázka: rozsah `-3..+3`, delta `+2 / -2`, mastered (vypadne z poolu) na `+3`.

---

## Q1 — §7 Prokazování příslušnosti

**prompt:** Vyjmenuj, čím se příslušník státní ozbrojené složky prokazuje svou příslušností před prováděním úkonu.

**ref:** §7 A

**items (3):**

1. `§7 A 1a` — quote: *„stejnokrojem"*
   - aliases: `stejnokroj`, `stejnokroje`, `stejnokrojem`, `uniforma`, `uniformou`, `uniformy`
2. `§7 A 2a` — quote: *„odznakem"*
   - aliases: `odznak`, `odznakem`, `odznaky`, `badge`, `badgem`
3. `§7 A 3a` — quote: *„ústním zvoláním"*
   - aliases: `ústní zvolání`, `ústním zvoláním`, `zvolání`, `zvoláním`, `ústně`, `slovně`, `slovem`, `verbálně`

---

## Q2 — §9A Omezení osobní svobody (kdy)

**prompt:** Kdy má příslušník státní ozbrojené složky pravomoc omezit osobní svobodu osoby?

**ref:** §9 A

**items (7):**

1. `§9 A 1a` — quote: *„kdy osoba ohrožuje život svůj, život nebo zdraví jiných osob"*
   - aliases: `ohrožení života`, `ohrožuje život`, `ohrožuje zdraví`, `ohrožuje sebe`, `ohrožuje druhé`, `ohrožení sebe a druhých`, `ohrožuje život a zdraví`
2. `§9 A 2a` — quote: *„kdy osoba poškozuje osobní nebo veřejný majetek"*
   - aliases: `poškozuje majetek`, `poškození majetku`, `ničí majetek`, `ničení majetku`, `poškozuje veřejný majetek`, `poškozuje cizí majetek`, `vandalismus`
3. `§9 A 3a` — quote: *„kdy vykonává činnost souvisejících s §33 (Předvedení), §34 (Zadržení), §35 (Souhlas se zadržením) a §36 (Zatčení)"*
   - aliases: `činnost dle §33`, `§33`, `§34`, `§35`, `§36`, `předvedení`, `zadržení`, `zatčení`, `činnost dle paragrafů 33-36`
4. `§9 A 4a` — quote: *„kdy osoba odmítne nebo nemůže prokázat svou totožnost"*
   - aliases: `odmítne prokázat totožnost`, `nemůže prokázat totožnost`, `neprokáže totožnost`, `bez dokladů`, `bez prokázání totožnosti`, `odmítnutí totožnosti`
5. `§9 A 5a` — quote: *„kdy se jedná o osobu, po které bylo vyhlášeno pátrání"*
   - aliases: `vyhlášené pátrání`, `pátrání`, `pátraná osoba`, `osoba v pátrání`, `hledaná osoba`, `vyhlášené pátrání po osobě`
6. `§9 A 6a` — quote: *„kdy osoba byla přistižena při jednání, které má znaky činu dle §26B (Přestupek), je-li důvodná obava, že bude v tomto jednání pokračovat nebo mařit objasnění věci"*
   - aliases: `přistižena při činu §26 b`, `přistižení §26b`, `přistižena při přestupku`, `přestupek a obava z pokračování`, `přestupek s obavou maření`, `§26b při činu`
7. `§9 A 7a` — quote: *„kdy osoba není trestně odpovědná a byla přistižena při jednání, které má znaky činu dle §26A (Trestný čin), je-li důvodná obava, že bude v tomto jednání pokračovat nebo mařit objasnění věci"*
   - aliases: `trestně neodpovědný pachatel §26a`, `nezletilý při §26a`, `trestně neodpovědná osoba`, `osoba bez trestní odpovědnosti`, `nezletilý páchá §26a`

---

## Q4 — §9B Omezení osobní svobody (čím)

**prompt:** Jakými prostředky může být omezena osobní svoboda osoby?

**ref:** §9 B

**items (3):**

1. `§9 B 1` — quote: *„služební pouta"*
   - aliases: `služební pouta`, `pouta`, `policejní pouta`, `pouty`, `pouto`, `pouty na ruce`
2. `§9 B 2` — quote: *„stahovací pásky"*
   - aliases: `stahovací pásky`, `stahovací páska`, `pásky`, `páska`, `stahovák`, `stahovacími páskami`, `zip ties`
3. `§9 B 3` — quote: *„výzva dle §16 (Výzva)"*
   - aliases: `výzva`, `výzva dle §16`, `§16`, `institut výzvy`, `výzvou`

---

## Q5 — §10 Polehčující okolnosti

**prompt:** Vyjmenuj polehčující okolnosti, ke kterým mohou státní ozbrojené složky, státní zastupitelství a soudy přihlédnout.

**ref:** §10

**items (11):**

1. `§10 A` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) poprvé a pod vlivem okolností na něm nezávislých"*
   - aliases: `poprvé`, `poprvé a pod vlivem okolností`, `prvopachatel`, `nezávislé okolnosti`, `okolnosti nezávislé na pachateli`, `čin poprvé`
2. `§10 B` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) v silném rozrušení, ze soucitu nebo z nedostatku životních zkušeností"*
   - aliases: `silné rozrušení`, `rozrušení`, `soucit`, `ze soucitu`, `nedostatek životních zkušeností`, `nedostatek zkušeností`, `mladá nezkušená osoba`
3. `§10 C` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) pod tlakem závislosti nebo podřízenosti"*
   - aliases: `závislost`, `podřízenost`, `tlak závislosti`, `tlak podřízenosti`, `pod tlakem závislosti`, `vztah podřízenosti`
4. `§10 D` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) pod vlivem hrozby nebo nátlaku"*
   - aliases: `hrozba`, `nátlak`, `pod hrozbou`, `pod nátlakem`, `vyhrožování`, `donucení`, `pod vlivem hrozby`
5. `§10 E` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) pod vlivem tíživých osobních nebo rodinných poměrů, které si sám nezpůsobil"*
   - aliases: `tíživé poměry`, `tíživé osobní poměry`, `tíživé rodinné poměry`, `osobní poměry`, `rodinné poměry`, `nezavinil si poměry`, `nezavinil situaci`
6. `§10 F` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) odvraceje útok nebo jiné nebezpečí, aniž byly zcela splněny podmínky nutné obrany nebo krajní nouze, a nebo překročil meze přípustného rizika nebo meze jiné okolnosti vylučující protiprávnost"*
   - aliases: `nutná obrana překročena`, `excesivní obrana`, `překročená nutná obrana`, `krajní nouze překročena`, `excesivní krajní nouze`, `překročení mezí obrany`, `přípustné riziko překročeno`, `nedokonalá nutná obrana`
7. `§10 G` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) v právním omylu, kterého se bylo možno vyvarovat"*
   - aliases: `právní omyl`, `vyvarovatelný omyl`, `v právním omylu`, `omyl v právu`, `omyl o právu`
8. `§10 H` — quote: *„přičinil se o odstranění škodlivých následků trestného činu nebo dobrovolně nahradil způsobenou škodu"*
   - aliases: `nahrazení škody`, `nahradil škodu`, `dobrovolná náhrada škody`, `odstranil následky`, `odstranění škodlivých následků`, `napravil škodu`
9. `§10 I` — quote: *„svůj čin dle §26 (Trestný čin a přestupek) sám oznámil státním ozbrojeným složkám, státnímu zastupitelství či soudu"*
   - aliases: `sám oznámil čin`, `přihlásil se`, `přiznal se sám`, `samo-oznámení`, `sám se udal`, `dobrovolně oznámil čin`
10. `§10 J` — quote: *„přispěl zejména jako spolupracující obviněný k objasňování trestné činnosti spáchané členy organizované skupiny, ve spojení s organizovanou skupinou nebo ve prospěch organizované zločinecké skupiny - neplatí pro skutky zmíněné v §43 (Dohoda o vině a trestu)"*
    - aliases: `spolupracující obviněný`, `spolupráce s policií`, `spolupracoval na objasnění`, `pomohl objasnit organizovaný zločin`, `koruní svědek`, `spolupracující svědek`, `spolupracoval s vyšetřováním`
11. `§10 K` — quote: *„činu dle §26 (Trestný čin a přestupek) upřímně litoval"*
    - aliases: `upřímná lítost`, `litoval`, `upřímně litoval`, `lítost`, `kál se`, `činil pokání`, `upřímně se kál`

---

## Q6 — §11 Přitěžující okolnosti

**prompt:** Vyjmenuj přitěžující okolnosti, ke kterým mohou státní ozbrojené složky, státní zastupitelství a soudy přihlédnout.

**ref:** §11

**items (8):**

1. `§11 A` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) surovým nebo trýznivým způsobem, zákeřně, se zvláštní lstí nebo jiným obdobným způsobem"*
   - aliases: `surový způsob`, `trýznivý způsob`, `zákeřně`, `se zvláštní lstí`, `lest`, `lstivě`, `surově`, `trýznivě`, `mučivě`
2. `§11 B` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) využívaje něčí nouze, tísně, bezbrannosti, závislosti nebo podřízenosti"*
   - aliases: `zneužití nouze`, `využití tísně`, `využití bezbrannosti`, `využití závislosti`, `využití podřízenosti`, `nouze oběti`, `tíseň oběti`, `bezbranná oběť`
3. `§11 C` — quote: *„ke spáchání činu dle §26 (Trestný čin a přestupek) zneužil svého zaměstnání, postavení nebo funkce"*
   - aliases: `zneužití zaměstnání`, `zneužití postavení`, `zneužití funkce`, `zneužil pozici`, `zneužil úřad`, `využití pozice`
4. `§11 D` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) vůči osobě podílející se na záchraně života a zdraví nebo na ochraně majetku"*
   - aliases: `čin vůči záchranáři`, `útok na záchranáře`, `útok na hasiče`, `vůči osobě chránící majetek`, `proti záchraně života`, `čin vůči ochránci`
5. `§11 E` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) ke škodě dítěte, osoby blízké, těhotné, nemocné, zdravotně postižené, vysokého věku nebo nemohoucí"*
   - aliases: `dítě`, `těhotná`, `nemocná osoba`, `senior`, `vysoký věk`, `osoba blízká`, `zdravotně postižený`, `nemohoucí`, `slabší oběť`, `čin proti dítěti`, `čin proti seniorovi`
6. `§11 F` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) za výjimečného stavu, krizové situace, živelní pohromy nebo jiné události vážně ohrožující život, veřejný pořádek nebo majetek, anebo na území, na němž je prováděna nebo byla provedena evakuace"*
   - aliases: `výjimečný stav`, `krizová situace`, `živelní pohroma`, `evakuace`, `čin za výjimečného stavu`, `čin při krizi`, `čin při katastrofě`
7. `§11 G` — quote: *„spáchal čin dle §26 (Trestný čin a přestupek) jako organizátor, jako člen organizované skupiny nebo člen spolčení"*
   - aliases: `organizátor`, `organizovaná skupina`, `člen organizované skupiny`, `spolčení`, `člen spolčení`, `gang`, `člen gangu`
8. `§11 H` — quote: *„byl již pro čin dle §26 (Trestný čin a přestupek) odsouzen neboli se dopouští recidivy"*
   - aliases: `recidiva`, `recidivista`, `dříve odsouzen`, `opakované odsouzení`, `recidivně`, `znovu pachatel`

---

## Q7 — §12A Cely (koho lze umístit)

**prompt:** Jakou osobu může příslušník státní ozbrojené složky umístit do cely?

**ref:** §12 A

**items (3):**

1. `§12 A 1a` — quote: *„Zadrženou"*
   - aliases: `zadržená`, `zadrženou`, `zadržený`, `zadržení`, `zadržená osoba`
2. `§12 A 2a` — quote: *„Zatčenou"*
   - aliases: `zatčená`, `zatčenou`, `zatčený`, `zatčení`, `zatčená osoba`
3. `§12 A 3a` — quote: *„Předvedenou, nelze-li pro odpor osoby zajistit úkony dle §13 (Prokázání totožnosti)"*
   - aliases: `předvedená`, `předvedenou`, `předvedený`, `předvedení`, `předvedená osoba`, `předvedení s odporem`, `předvedená pro odpor`

---

## Q8 — §12C Cely (oddělené umísťování)

**prompt:** Jaké osoby se do cel státních ozbrojených složek umísťují odděleně?

**ref:** §12 C

**items (4):**

1. `§12 C 1c` — quote: *„Různého pohlaví"*
   - aliases: `různé pohlaví`, `muži a ženy`, `oddělit muže a ženy`, `pohlaví`, `oddělené pohlaví`
2. `§12 C 2c` — quote: *„Zadržené a zatčené"*
   - aliases: `zadržení a zatčení`, `zadržené a zatčené`, `oddělit zadržené od zatčených`, `zadržené od zatčených`
3. `§12 C 3c` — quote: *„U kterých lze předpokládat agresivní chování"*
   - aliases: `agresivní`, `agresivní osoby`, `agresivní chování`, `předpokládaná agrese`, `agresivní zadržený`
4. `§12 C 4c` — quote: *„Pod vlivem drog nebo alkoholu"*
   - aliases: `pod vlivem drog`, `pod vlivem alkoholu`, `opilý`, `intoxikovaný`, `pod vlivem návykové látky`, `pod vlivem`, `drogy`, `alkohol`

---

## Q9 — §15 Odebrání zbraně

**prompt:** Kdy má příslušník státní ozbrojené složky pravomoc odebrat zbraň?

**ref:** §15 A

**items (5):**

1. `§15 A 1a` — quote: *„že zbraň není registrována"*
   - aliases: `neregistrovaná zbraň`, `zbraň není registrovaná`, `zbraň bez registrace`, `chybějící registrace`, `bez registrace`
2. `§15 A 2a` — quote: *„že její majitel nevlastní zbrojní průkaz"*
   - aliases: `bez zbrojního průkazu`, `chybějící zbrojní průkaz`, `nemá zbroják`, `nemá zbrojní průkaz`, `bez zp`
3. `§15 A 3a` — quote: *„že se jedná o ilegálně vlastněnou zbraň"*
   - aliases: `ilegální zbraň`, `nelegální zbraň`, `nelegálně vlastněná zbraň`, `ilegálně vlastněná`, `načerno`, `na černo`, `bez povolení`
4. `§15 A 4a` — quote: *„že byl soudem vydán příkaz k odebrání zbraně"*
   - aliases: `soudní příkaz`, `příkaz soudu`, `příkaz k odebrání`, `soud nařídil odebrání`, `rozhodnutí soudu o odebrání`
5. `§15 A 5a` — quote: *„že může sloužit pro účely trestního řízení"*
   - aliases: `pro trestní řízení`, `pro účely trestního řízení`, `důkaz v trestním řízení`, `zbraň jako důkaz`, `pro vyšetřování`

---

## Q10 — §16B Výzva (způsoby provedení)

**prompt:** Vyjmenuj způsoby, jakými příslušník státní ozbrojené složky provádí výzvu.

**ref:** §16 B

**items (5):**

1. `§16 B 1b` — quote: *„ústně"*
   - aliases: `ústně`, `ústní`, `slovně`, `slovem`, `verbálně`, `mluvenou výzvou`
2. `§16 B 2b` — quote: *„písemně s upozorněním o postihu"*
   - aliases: `písemně`, `písemná výzva`, `písemně s upozorněním`, `písemné upozornění`, `písemná forma`, `na papíře`
3. `§16 B 3b` — quote: *„výstražným zvukovým a rozhlasovým zařízením s výrazným světlem modré či červené barvy nebo jejich kombinací"*
   - aliases: `maják`, `majákem`, `majáku`, `majáky`, `majáků`, `výstražné světlo`, `výstražná světla`, `výstražným světlem`, `výstražných světel`, `modré světlo`, `červené světlo`, `modré a červené světlo`, `siréna`, `sirénou`, `výstražné zvukové zařízení`, `výstražné zařízení`, `blikačka`, `s majákem`, `houkačka`, `houkačkou`
4. `§16 B 4b` — quote: *„varovným výstřelem"*
   - aliases: `varovný výstřel`, `varovným výstřelem`, `výstražný výstřel`, `výstřel do vzduchu`, `varovná střela`, `varovně vystřelit`
5. `§16 B 5b` — quote: *„gestem"*
   - aliases: `gesto`, `gestem`, `posunkem`, `signálem`, `rukou`, `gestikulace`

---

## Q11 — §17A Vstup do obydlí nebo na pozemek

**prompt:** Kdy má příslušník státní ozbrojené složky pravomoc vstoupit do obydlí nebo na pozemek?

**ref:** §17 A

**items (6):**

1. `§17 A 1a` — quote: *„má souhlas k zadržení dle §35 (Souhlas se zadržením), souhlas k zatčení dle §36 (Zatčení) nebo k domovní prohlídce dle §38 (Domovní prohlídka) či dobrovolný souhlas osob, jež se v daný moment nacházejí na pozemku či obydlí nebo samotného majitele"*
   - aliases: `souhlas k zadržení`, `souhlas k zatčení`, `souhlas k domovní prohlídce`, `dobrovolný souhlas`, `souhlas majitele`, `souhlas obyvatele`, `§35`, `§36`, `§38`, `souhlas s prohlídkou`
2. `§17 A 2a` — quote: *„přes obydlí nebo pozemek probíhá pronásledování osoby"*
   - aliases: `pronásledování`, `pronásledování pachatele`, `pronásledování osoby`, `pronásleduje pachatele`, `přes pozemek probíhá pronásledování`, `chase`
3. `§17 A 3a` — quote: *„je to nezbytné pro ochranu života nebo zdraví osob či pro odvrácení ohrožení bezpečnosti"*
   - aliases: `ochrana života`, `ochrana zdraví`, `odvrácení ohrožení`, `záchrana života`, `záchrana zdraví`, `nezbytné pro ochranu života`, `život v ohrožení`
4. `§17 A 4a` — quote: *„má důvodné podezření, že se na místě nachází zemřelý"*
   - aliases: `zemřelý`, `mrtvý`, `mrtvá osoba`, `tělo`, `podezření na mrtvolu`, `mrtvola`, `nález těla`, `možný zemřelý`
5. `§17 A 5a` — quote: *„příslušník státní ozbrojené složky přímo a jasně spatří protiprávní jednání nebo nelegální předměty či zbraně v obydlí nebo na pozemku"*
   - aliases: `přímý výhled na čin`, `vidí protiprávní jednání`, `vidí nelegální předměty`, `vidí zbraně`, `plain view`, `na očích`, `v přímém dohledu`, `vidí ze zvenku`
6. `§17 A 6a` — quote: *„je vyhlášen výjimečný stav"*
   - aliases: `výjimečný stav`, `vyhlášený výjimečný stav`, `nouzový stav`, `výjimka`

---

## Q12 — §18A Zastavení dopravního prostředku za účelem prohledání

**prompt:** Kdy má příslušník státní ozbrojené složky pravomoc zastavit dopravní prostředek a uskutečnit jeho prohlídku?

**ref:** §18 A

**items (6):**

1. `§18 A 1a` — quote: *„pronásleduje pachatele činu dle §26A (Trestný čin)"*
   - aliases: `pronásleduje pachatele`, `pronásledování pachatele §26a`, `chase trestného činu`, `pronásleduje §26a`
2. `§18 A 2a` — quote: *„pátrá po pachateli činu dle §26A (Trestný čin)"*
   - aliases: `pátrá po pachateli`, `pátrání po pachateli §26a`, `pátrání §26a`, `pátrá po trestném činu`
3. `§18 A 3a` — quote: *„má důvodné podezření pátrat po nelegálních zbraních, munici, omamných nebo psychotropních látkách nebo předmětech určených k výrobě omamných a psychotropních látek"*
   - aliases: `nelegální zbraně`, `nelegální munice`, `omamné látky`, `psychotropní látky`, `drogy`, `výroba drog`, `prekurzory`, `předměty pro výrobu drog`, `pátrání po drogách`, `pátrání po zbraních`
4. `§18 A 4a` — quote: *„má důvodné podezření pátrat po věcech pocházejících z trestné činnosti a nebo související s trestnou činností"*
   - aliases: `věci z trestné činnosti`, `kradené věci`, `věci související s trestnou činností`, `pátrání po kradených věcech`, `výnos trestné činnosti`
5. `§18 A 5a` — quote: *„má důvodné podezření pátrat po hledaných nebo pohřešovaných osobách"*
   - aliases: `hledané osoby`, `pohřešované osoby`, `pátrání po osobě`, `hledaný`, `pohřešovaný`, `nezvěstný`
6. `§18 A 6` — quote: *„je vyhlášen výjimečný stav"*
   - aliases: `výjimečný stav`, `vyhlášený výjimečný stav`, `nouzový stav`

---

## Q13 — §19A Prohledání osoby

**prompt:** Kdy má příslušník státní ozbrojené složky pravomoc prohledat osobu?

**ref:** §19 A

**items (4):**

1. `§19 A 1a` — quote: *„že má důvodné podezření, že by u sebe osoba mohla mít nelegální předměty nebo předměty spojené s trestnou činností"*
   - aliases: `nelegální předměty u osoby`, `předměty trestné činnosti`, `podezření na nelegální předměty`, `podezření na věci trestné činnosti`, `u sebe nelegální věci`
2. `§19 A 2a` — quote: *„že je osoba v režimu dle §34 (Zadržení), §35 (Souhlas se zadržením), §36 (Zatčení)"*
   - aliases: `§34`, `§35`, `§36`, `předvedení`, `zadržení`, `zatčení`, `osoba v režimu §34-36`, `předvedená zadržená zatčená`
3. `§19 A 3a` — quote: *„že dochází k umístění osoby do vozidla státní složky"*
   - aliases: `umístění do služebního vozidla`, `do policejního vozu`, `posazení do vozu`, `umístění do vozidla státní složky`, `nakládá osobu do vozidla`
4. `§19 A 4a` — quote: *„je vyhlášen výjimečný stav"*
   - aliases: `výjimečný stav`, `vyhlášený výjimečný stav`, `nouzový stav`

---

## Q14 — §21A Donucovací prostředky

**prompt:** Vyjmenuj donucovací prostředky podle Law Enforcement Act.

**ref:** §21 A

**items (13):**

1. `§21 A 1a` — quote: *„Hmaty, chvaty, údery a kopy"*
   - aliases: `hmaty`, `chvaty`, `údery`, `kopy`, `hmaty chvaty údery kopy`, `pěstní souboj`, `boj zblízka`, `hmaty a chvaty`
2. `§21 A 2a` — quote: *„Obušek"*
   - aliases: `obušek`, `obuškem`, `pendrek`, `pendrekem`, `tonfa`
3. `§21 A 3a` — quote: *„Paralyzér"*
   - aliases: `paralyzér`, `paralyzérem`, `taser`, `taserem`, `paralizér`, `elektrický paralyzér`
4. `§21 A 4a` — quote: *„Zastavovací pás"*
   - aliases: `zastavovací pás`, `zastavovací pásy`, `bodec`, `bodce`, `stinger`, `pás na zastavení`, `bodcový pás`
5. `§21 A 5a` — quote: *„Služební pes"*
   - aliases: `služební pes`, `pes`, `psem`, `policejní pes`, `k9`, `k-9`
6. `§21 A 6a` — quote: *„Vodní stříkač"*
   - aliases: `vodní stříkač`, `vodní stříkačem`, `vodní dělo`, `vodní děla`
7. `§21 A 7a` — quote: *„Úder střelnou zbraní"*
   - aliases: `úder střelnou zbraní`, `úder zbraní`, `úder pažbou`, `pažbou`, `pistolwhip`, `úhoz zbraní`
8. `§21 A 8a` — quote: *„Varovný výstřel"*
   - aliases: `varovný výstřel`, `varovným výstřelem`, `výstražný výstřel`, `výstřel do vzduchu`
9. `§21 A 9a` — quote: *„Pouta či stahovací pásky"*
   - aliases: `pouta`, `pouty`, `pouto`, `stahovací pásky`, `stahovací páska`, `pásky`, `policejní pouta`
10. `§21 A 10a` — quote: *„Vytlačování vozidlem"*
    - aliases: `vytlačování vozidlem`, `vytlačit vozidlem`, `pit manévr`, `pit`, `vytlačení vozem`, `tlačení vozidla`
11. `§21 A 11a` — quote: *„Zahrazení cesty vozidlem"*
    - aliases: `zahrazení cesty`, `zahrazení vozidlem`, `blokáda vozidlem`, `roadblock`, `blokáda silnice`, `zahrazení silnice vozem`
12. `§21 A 12a` — quote: *„Zábleskový granát"*
    - aliases: `zábleskový granát`, `záblesk`, `flashbang`, `omračující granát`, `zábleskovým granátem`, `flash granát`
13. `§21 A 13a` — quote: *„Beanbag"*
    - aliases: `beanbag`, `beanbagy`, `beanbagem`, `pytlík`, `pytlíkový náboj`, `gumový náboj`, `bean bag`

---

## Q15 — §23B Použití zbraně (kdy)

**prompt:** Kdy má příslušník státní ozbrojené složky pravomoc použít zbraň?

**ref:** §23 B

**items (6):**

1. `§23 B 1b` — quote: *„nutné obrany nebo krajní nouze"*
   - aliases: `nutná obrana`, `krajní nouze`, `sebeobrana`, `nutná obrana nebo krajní nouze`, `obrana`
2. `§23 B 2b` — quote: *„že nebezpečná osoba nereaguje na jeho výzvy k opuštění úkrytu nebo se nevzdá"*
   - aliases: `nereaguje na výzvu`, `nereaguje na výzvy`, `neopouští úkryt`, `nevzdá se`, `neuposlechne výzvu k vyjití`, `osoba v úkrytu nereaguje`
3. `§23 B 3b` — quote: *„že je osoba ozbrojena a nereaguje na výzvu k zahození zbraně"*
   - aliases: `ozbrojený nereaguje`, `nezahodil zbraň`, `nezahazuje zbraň`, `ozbrojená osoba neuposlechne`, `odmítá zahodit zbraň`
4. `§23 B 4b` — quote: *„že nebezpečná osoba se snaží utéct a není jiný způsob, jak by ji bylo možné zadržet"*
   - aliases: `útěk nebezpečné osoby`, `prchá`, `utíká a nelze zadržet`, `útěk pachatele`, `nelze jinak zadržet`, `útěk a žádný jiný způsob`
5. `§23 B 5b` — quote: *„že dopravní prostředek nelze zastavit jiným způsobem"*
   - aliases: `nelze zastavit vozidlo`, `vozidlo nelze zastavit jinak`, `dopravní prostředek nelze zastavit`, `auto nelze zastavit jinak`, `žádný jiný způsob zastavení`
6. `§23 B 6` — quote: *„je vyhlášen výjimečný stav"*
   - aliases: `výjimečný stav`, `vyhlášený výjimečný stav`, `nouzový stav`

---

## Q16 — §37 Operativně pátrací prostředky

**prompt:** Vyjmenuj operativně pátrací prostředky, které si státní ozbrojená složka může vyžádat u státního zástupce či soudce při vyšetřování činu dle §26A (Trestný čin).

**ref:** §37

**items (5):**

1. `§37 A` — quote: *„Se sledováním osob(y)"*
   - aliases: `sledování`, `sledování osoby`, `sledování osob`, `surveillance`, `sledovačka`, `sledovat osobu`
2. `§37 B` — quote: *„Vydání elektronické komunikace. (výpisy hovorů a SMS, Birdy, Instapic a Sparky komunikace)"*
   - aliases: `elektronická komunikace`, `výpisy hovorů`, `výpisy sms`, `vydání elektronické komunikace`, `birdy`, `instapic`, `sparky`, `odposlech`, `odposlechy`, `výpisy komunikace`
3. `§37 C` — quote: *„Předstíraný nákup věcí pocházejících nebo sloužících k trestné činnosti"*
   - aliases: `předstíraný nákup`, `fingovaný nákup`, `nákup pod záminkou`, `předstíraný obchod`, `kontrolovaný nákup`
4. `§37 D` — quote: *„K užití agenta zastírajícího svou příslušnost k státní ozbrojené složce"*
   - aliases: `agent`, `agent v utajení`, `nasazený agent`, `tajný agent`, `undercover`, `policista v utajení`, `agent zastírající příslušnost`, `infiltrace`
5. `§37 E` — quote: *„Vydání právně závazných písemností"*
   - aliases: `vydání písemností`, `vydání dokumentů`, `právně závazné písemnosti`, `úřední dokumenty`, `vydání závazných listin`, `vydání právních dokumentů`

---

## Q17 — Odebrání zbrojního průkazu (Firearm Act)

**prompt:** Za jakých okolností odebíráme zbrojní průkaz?

**ref:** §4 FA

**items (1):**

1. `§4 A a) FA` — quote: *„záznam v rejstříku trestů (jakýkoliv trestný čin)"*
   - aliases: `záznam v rejstříku trestů`, `rejstřík trestů`, `trestní rejstřík`, `jakýkoliv trestný čin`, `jakýkoli trestný čin`, `spáchání trestného činu`, `trestný čin`, `odsouzení za trestný čin`, `odsouzení`, `záznam v rejstříku`, `záznam`, `pravomocné odsouzení`

---

## Q18 — Odebrání řidičského průkazu (Penal Code)

**prompt:** Za jakých okolností odebíráme řidičský průkaz?

**ref:** §34, §36, §37, §58 PC

**items (4):**

1. `§37 c) PC` — quote: *„překročení rychlosti od 31 mph"*
   - aliases: `překročení rychlosti`, `překročení rychlosti od 31 mph`, `překročení rychlosti o 31 mph`, `překročení o 31 mph`, `rychlost od 31 mph`, `31 mph`, `rychlost nad 31 mph`, `překročení limitu o 31`, `§37c`
2. `§34 c) PC` — quote: *„zavinění dopravní nehody s těžkou újmou na zdraví"*
   - aliases: `dopravní nehoda s těžkou újmou`, `nehoda s těžkou újmou`, `nehoda s těžkým ublížením na zdraví`, `těžká újma na zdraví`, `těžké ublížení na zdraví`, `těžké zranění při nehodě`, `zavinění nehody s těžkou újmou`, `zavinění nehody s těžkým ublížením`, `§34c`
3. `§36 PC` — quote: *„řízení pod vlivem alkoholu nebo omamných látek"*
   - aliases: `řízení pod vlivem`, `řízení pod vlivem alkoholu`, `řízení pod vlivem drog`, `řízení pod vlivem návykové látky`, `řízení opilý`, `jízda pod vlivem`, `řidič pod vlivem`, `pod vlivem alkoholu`, `pod vlivem drog`, `pod vlivem návykové látky`, `§36`
4. `§58 PC` — quote: *„útěk řidiče vozidla"*
   - aliases: `útěk`, `útěk řidiče`, `útěk vozidlem`, `útěk před policií`, `útěk před hlídkou`, `únik vozidlem`, `unikání vozidlem`, `unikání`, `§58`, `§58b`

---

## Souhrn

| #  | §    | Položek |
|----|------|---------|
| 1  | §7   | 3 |
| 2  | §9 A | 7 |
| 3  | §9 B | 3 |
| 4  | §10  | 11 |
| 5  | §11  | 8 |
| 6  | §12 A| 3 |
| 7  | §12 C| 4 |
| 8  | §15  | 5 |
| 9  | §16 B| 5 |
| 10 | §17 A| 6 |
| 11 | §18 A| 6 |
| 12 | §19 A| 4 |
| 13 | §21 A| 13 |
| 14 | §23 B| 6 |
| 15 | §37  | 5 |
| 16 | §4 FA (zbrojní průkaz) | 1 |
| 17 | §34/§36/§37/§58 PC (řidičský průkaz) | 4 |
| **∑** | **17 otázek** | **94 položek** |

Aliasů celkem: ~490 (cca 5–6 na položku, u "majáku" a víceslovných pojmů víc).
