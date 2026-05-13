# POI Mapping — uživatelův seznam ↔ Map Genie

## Co je tohle za soubor?

**Cheat sheet pro klikání v `/geo/calibrate`.** Aplikace ho NEČTE — je to jen
referenční tabulka, do které koukáš, když přidáváš POI v UI.

Pro každou ze 70 položek tvého seznamu je tu řádek s:
- **POI ID** — co napíšeš do pole "ID" v editoru
- **CZ název** — co napíšeš do pole "Název"
- **Kategorie** — co vybereš v select-boxu
- **MG ID** — `číslo` znamená "je v Map Genie, importuje se přes Anchor & import tab".
  `MANUAL` znamená "Map Genie ji nemá, klikni ji ručně v Přidat POI tabu"
- **Description** — co napíšeš do pole "Popis"
- **Aliases** — co napíšeš do pole "Aliasy" (oddělené čárkou)

## Workflow

1. **Projdi tabulku, oprav co se ti nelíbí** (CZ jména, aliasy, kategorie). To je
   subjektivní — jméno "Pošta" ti může být lepší než "GoPostal", nebo naopak.
2. **`/geo/calibrate` → Anchor & import**:
   - 6 defaultních kotev se nahraje samo (z `src/modules/geo/data/anchorsCalibration.ts`)
     — fit má Δ ≤ 0.0005 po Mercator projekci. Stačí použít, nemusíš klikat znova.
   - V seznamu vlevo zaškrtni vše s MG ID z tabulky (Mission Row, LSIA, atd.)
   - "Zkopírovat TS" → paste do `pois.ts`
3. **`/geo/calibrate` → Přidat POI**:
   - Pro každý `MANUAL` řádek vyplň formulář podle tabulky + klikni na mapě
   - "Zkopírovat TS" → paste do `pois.ts`

> **Tech note:** Map Genie renderuje mapu v Web Mercator projekci, ale ukládá
> `latitude` jako raw stupně. `mgLatLngToVec2` (v `src/modules/geo/logic/transform.ts`)
> aplikuje forward Mercator `y = log(tan(π/4 + lat·π/360))` před affine fitem —
> jinak by žádný počet kotev nestačil. Pro `longitude` se projekce nedělá
> (Mercator x je lineární v lng).

## Souhrn

| Kategorie | Počet | s MG match | MANUAL |
|---|---|---|---|
| landmark | 42 | 33 | 9 |
| pd | 5 | 5 | 0 |
| fire | 1 | 1 | 0 |
| ems | 1 | 1 | 0 |
| ammu | 1 | 1 | 0 |
| street | 20 | 0 | 20 |
| **TOTAL** | **70** | **41** | **29** |

20 ulic je tak jako tak MANUAL (Map Genie nemá polyliny). 9 MANUAL landmarků jsou
položky, které Map Genie skutečně nemá v datech (Maze Bank Arena, G6 Tower,
Pink Cage Motel, towns, atd.).

---

## Landmarks (42)

| POI ID | CZ název | MG ID | MG title | Description | Aliases |
|---|---|---|---|---|---|
| `landmark.lsia` | Letiště Los Santos | 12815 | Los Santos International Airport | Mezinárodní letiště Los Santos | lsia, letiste, letiste ls, airport, los santos airport, mezinarodni letiste |
| `landmark.maze-bank-arena` | Maze Bank Arena | MANUAL | — | Velký kruhový stadion na jihu Los Santos | arena, stadion, mb arena, maze arena |
| `landmark.doky` | Doky | 12861 | Pier 400 | Hlavní přístav v jižním LS (kontejnerový terminál) | dock, doks, pier 400, pristav |
| `landmark.industrialni-zona` | Industriální zóna | 13243 | Darnell Bros Textile Factory | La Mesa industriální oblast (továrny) | industrial, fabriky, prumysl, la mesa, darnell bros |
| `landmark.ropne-vrty` | Ropné vrty | 13995 | Murrieta Oil Field | Ropné pole v Murrieta Heights | oil field, vrty, ropa, murrieta oil |
| `landmark.mirror-park` | Mirror Park | 13501 | Mirror Park | Hipsterská čtvrť východně od Vinewood | mirror, mirror lake |
| `landmark.casino` | Casino | 24674 | Diamond Casino | Diamond Casino & Resort u East Vinewood | diamond casino, kasino, diamond, casino resort |
| `landmark.mega-mall` | Mega Mall | 13700 | Rockford Plaza Mall | Velké nákupní centrum Rockford Plaza | rockford plaza, mall, nakupni centrum, plaza |
| `landmark.maze-bank-tower` | Maze Bank Tower | 12950 | Maze Bank Tower | Nejvyšší mrakodrap v Pillbox Hill | maze bank, maze tower, mrakodrap, maze |
| `landmark.posta` | Pošta | 12869 | GoPostal Building | Centrální budova GoPostal v Pillbox Hill | gopostal, post office, postal, gopostal building |
| `landmark.g6` | G6 | MANUAL | — | Eclipse Towers / G6 v Vinewood Hills | eclipse towers, g6 tower, eclipse |
| `landmark.arcadius` | Arcadius | 15199 | Arcadius Business Center | Arcadius Business Center v centru | arcadius business center, arcadius tower, abc |
| `landmark.weazel` | Weazel | 13299 | Weazel News Building | Sídlo Weazel News v Rockford Hills | weazel news, weazel building, news, weazel plaza |
| `landmark.vodni-mesto` | Vodní město | MANUAL | — | Vespucci Canals (Benátky LS) | canals, vespucci canals, vodni mesto vespucci, benatky |
| `landmark.gym-u-plaze` | Gym u pláže | 14097 | Muscle Sands Gym | Posilovna na Vespucci Beach | muscle sands, gym, vespucci gym, beach gym |
| `landmark.molo` | Molo | 13236 | Del Perro Pier | Del Perro Pier s ruským kolem | del perro pier, pier, ruske kolo, molo del perro |
| `landmark.life-invader` | Life Invader | 13552 | Life Invader Building | Sídlo Life Invader v East Vinewood | life invader, lifeinvader, life invander, social network |
| `landmark.klenotnictvi` | Klenotnictví | 13701 | Jewelry Store | Vangelico Fine Jewelers na Portola Drive | vangelico, jewelry, jewelry store, klenoty |
| `landmark.radnice` | Radnice | 14085 | Rockford Hills City Hall | Rockford Hills City Hall (radnice) | city hall, rockford city hall, radnice rockford |
| `landmark.lsc` | LSC | 12611 | Los Santos Customs | Los Santos Customs (servis) v Burton | los santos customs, customs, autoservis, ls customs |
| `landmark.rockford-plaza` | Rockford Plaza | 14114 | Rockford Plaza | Plaza v Rockford Hills | rockford, plaza, rockford hills plaza |
| `landmark.pink-cage-motel` | Pink Cage Motel | MANUAL | — | Motel v East Vinewood | pink cage, motel, pink motel |
| `landmark.hlavni-banka` | Hlavní banka | 13644 | Pacific Standard Bank | Hlavní banka v Pillbox Hill | pacific standard, pacific standard bank, banka, main bank |
| `landmark.hriste-golf` | Golfové hřiště | 12632 | Los Santos Golf Club | Los Santos Golf Club v Richman | golf club, golf, golfove hriste, ls golf, country club |
| `landmark.hrbitov` | Hřbitov | 14102 | Cemetary | Hill Valley Church Cemetery v East Vinewood | cemetery, cemetary, hill valley cemetery, hrbitov hill valley |
| `landmark.observator` | Observatoř | 13326 | Galileo Observatory | Galileova hvězdárna nad Vinewood | observatory, galileo, hvezdarna, galileo observatory |
| `landmark.divadlo` | Divadlo | 14108 | The Oriental Theater | The Oriental Theater na Vinewood Boulevard | oriental theater, theater, divadlo oriental, vinewood theater |
| `landmark.vinewood-sign` | Vinewood Sign | 13324 | Vinewood Sign | Velký nápis Vinewood na svahu Mt. Josiah | vinewood, vinewood napis, cedule, vinewood cedule, hollywood sign |
| `landmark.power-station` | Power Station | 13915 | Power Station | Palmer-Taylor Power Station v Mirror Park | palmer taylor, power station, elektrarna, palmer power |
| `landmark.vetrne-elektrarny` | Větrné elektrárny | 13633 | Ron Alternates Wind Farm | Ron Alternates Wind Farm v Grand Senora | wind farm, vetrniky, ron wind farm, vetrne elektrarny |
| `landmark.prehrada` | Přehrada | 13631 | Land Act Reservoir | Land Act Reservoir | land act reservoir, reservoir, dam, prehrada land act |
| `landmark.veznice` | Věznice | 13748 | Boilingbroke Peniteniary | Bolingbroke Penitentiary u Tatavian Mountains | bolingbroke, veznice, prison, penitentiary |
| `landmark.letiste-sandy` | Letiště Sandy | 14358 | Sandy Shores Airfield | Sandy Shores Airfield | sandy airfield, sandy letisto, airfield sandy, sandy shores airfield |
| `landmark.fort-zancudo` | Fort Zancudo | 13014 | Fort Zancudo Military Base | Vojenská základna Fort Zancudo | fort zancudo, zancudo, military base, vojenska zakladna |
| `landmark.vinice` | Vinice | 13497 | Marlowe Vineyards | Marlowe Vineyards (vinice v Tongva Hills) | marlowe vineyards, vineyard, vinice tongva, tongva hills |
| `landmark.legion-square` | Legion Square | 13311 | Legion Square | Legion Square v centru Los Santos | legion, legion sq, square, downtown ls |
| `landmark.pdm` | PDM | 13254 | Premium Deluxe Motorsport | Premium Deluxe Motorsport v Strawberry | premium deluxe, premium deluxe motorsport, pdm, autobazar |

## Towns (5) — všechny MANUAL (Map Genie nemá town markers, jen labely na mapě)

| POI ID | CZ název | MG ID | MG title | Description | Aliases |
|---|---|---|---|---|---|
| `landmark.sandy-shores` | Sandy Shores | MANUAL | — | Pouštní město v Grand Senora | sandy shores, sandy, mestecko sandy |
| `landmark.grapeseed` | Grapeseed | MANUAL | — | Zemědělské městečko severovýchodně od Alamo Sea | grapeseed, mestecko grapeseed |
| `landmark.paleto-bay` | Paleto | MANUAL | — | Pobřežní město Paleto Bay na severu | paleto, paleto bay, mestecko paleto |
| `landmark.north-chumash` | North Chumash | MANUAL | — | Vesnice severně od Chumash na pobřeží | north chumash, severni chumash |
| `landmark.chumash` | Chumash | MANUAL | — | Pobřežní vesnice západně od státu | chumash, vesnice chumash |

## PD stanice (5)

| POI ID | CZ název | MG ID | MG title | Description | Aliases |
|---|---|---|---|---|---|
| `pd.mission-row` | Mission Row PD | 12657 | Mission Row Police Department | Hlavní stanice LSPD v centru | mission row, mrpd, lspd hq, mission row pd |
| `pd.vespucci` | Vespucci PD | 12624 | Vespucci Police Department | Stanice LSPD u pláže Vespucci | vespucci police, vespucci pd, vespucci station, beach pd |
| `pd.davis` | Davis Sheriff | 12666 | Davis Sheriff's Station | Šerifská stanice v Davis na jihu LS | davis station, davis sheriff station, davis pd |
| `pd.sandy-shores` | Sandy Shores Sheriff | 12723 | Sandy Shores Sheriff Station | Šerifská stanice v Sandy Shores | sandy sheriff, sandy station, sandy shores station |
| `pd.paleto` | Paleto Bay Sheriff | 12694 | Paleto Bay Police Station | Šerifská stanice v Paleto Bay | paleto sheriff, paleto station, paleto pd |

## Hasiči (1)

| POI ID | CZ název | MG ID | MG title | Description | Aliases |
|---|---|---|---|---|---|
| `fire.hq` | Hasiči | 13309 | Fire Department Headquarters | Hlavní stanice LSFD v Rockford Hills | hasici, lsfd, fire dept, fire station, fire department hq |

## EMS (1)

| POI ID | CZ název | MG ID | MG title | Description | Aliases |
|---|---|---|---|---|---|
| `ems.pillbox` | Pillbox | 12711 | Pillbox Hill Medical Center | Pillbox Hill Medical Center (centrální nemocnice) | pillbox hill, pillbox medical, nemocnice, hospital, medical center, ems |

## Ammu-Nation (1)

| POI ID | CZ název | MG ID | MG title | Description | Aliases |
|---|---|---|---|---|---|
| `ammu.downtown` | Ammunition | 12727 | Ammu-Nation (downtown LS) | Ammu-Nation v centru Los Santos | ammunition, ammu-nation, ammu nation, ammu, zbrojarna, zbrane |

## Streets / Highways (20) — všechny MANUAL (polyliny se traceují v editoru)

| POI ID | CZ název | Description | Aliases |
|---|---|---|---|
| `street.del-perro-fwy` | Del Perro Fwy | Pobřežní dálnice na západě LS | del perro, del perro freeway, del perro highway |
| `street.la-puerta-fwy` | La Puerta Fwy | Dálnice jižně od centra LS | la puerta, puerta freeway, la puerta highway |
| `street.olympic-fwy` | Olympic Fwy | Hlavní východo-západní dálnice centrem LS | olympic, olympic freeway, olympic highway |
| `street.elysian-fields-fwy` | Elysian Fields Fwy | Dálnice okolo přístavu a Elysian Island | elysian, elysian fields, elysian fwy |
| `street.los-santos-fwy` | Los Santos Fwy | Severo-jižní dálnice přes východní LS | los santos, ls freeway, ls fwy |
| `street.palomino-fwy` | Palomino Fwy | Východní dálnice směrem na Palomino Highlands | palomino, palomino freeway |
| `street.senora-fwy` | Senora Fwy | Severo-jižní dálnice na východě státu | senora, senora freeway |
| `street.goh` | Great Ocean Hwy | Pobřežní silnice podél západního pobřeží (GOH) | goh, great ocean highway, route 1, pobrezni |
| `street.route-68` | Route 68 | Východo-západní silnice přes Sandy Shores | 68, r68, route sixty-eight |
| `street.vespucci-blvd` | Vespucci Blvd | Bulvár ve Vespucci podél pláže | vespucci, vespucci boulevard, vespucci bulvar |
| `street.san-andreas-ave` | San Andreas Ave | Hlavní třída v centru LS | san andreas, san andreas avenue |
| `street.palomino-ave` | Palomino Ave | Bulvár v Palomino Highlands | palomino avenue, palomino ave |
| `street.calais-ave` | Calais Ave | Bulvár v Mirror Park / Vinewood East | calais, calais avenue |
| `street.alta-street` | Alta Street | Hlavní třída čtvrti Alta | alta, alta st |
| `street.innocence-blvd` | Innocence Blvd | Bulvár v Strawberry | innocence, innocence boulevard, innocence bulvar |
| `street.el-rancho-blvd` | El Rancho Blvd | Bulvár v Rancho | el rancho, rancho, el rancho boulevard |
| `street.popular-st` | Popular St | Ulice v centru LS | popular, popular street |
| `street.las-lagunas-blvd` | Las Lagunas Blvd | Bulvár v Mission Row / Pillbox | las lagunas, las lagunas boulevard, lagunas |
| `street.vinewood-blvd` | Vinewood Boulevard | Hlavní bulvár Vinewoodu | vinewood blvd, vinewood, vinewood bulvar |
| `street.west-eclipse-blvd` | West Eclipse Blvd | Bulvár v West Vinewood | west eclipse, eclipse, west eclipse boulevard |

---

## Stále MANUAL — Map Genie je nemá

Tyto **9 položek** opravdu chybí v Map Genie a musíš je naklikat v `Přidat POI` tabu:

- **Maze Bank Arena** — GTA Online After Hours DLC content, MG nemá
- **G6 (Eclipse Towers)** — Eclipse Towers existují v MG jen jako Apartment (id 13485), což je interiér ne tower jako landmark
- **Pink Cage Motel** — MG má jen Paleto Forest Motel a Abandoned Motel, ne ten specifický
- **Vodní město** — Vespucci Canals jako oblast není markerem; mají jen "Vespucci Canals Skatepark" (id 13812), což je jen skatepark
- **Sandy Shores** (město) — town label, ne marker
- **Grapeseed** — town label
- **Paleto** (město) — town label (Paleto Bay PD station je marker, ale ne město jako celek)
- **North Chumash** — vesnice, label
- **Chumash** — vesnice, label

Plus 20 ulic. Celkem **29 MANUAL položek** = ~30 min ručního klikání.
