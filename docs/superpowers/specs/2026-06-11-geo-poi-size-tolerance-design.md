# Geo POI — variabilní klikací tolerance dle velikosti

## Problém

Hit-test bodových POI (`/geo/blind`) používá fixní práh `HIT_THRESHOLD = 0.03`.
Velké rozlehlé oblasti (letiště, doky, města, ropné pole) tím dostávají stejně
malou klikací zónu jako pinpoint budovy (Maze Bank Tower). Uživatel chce
variabilní toleranci — velké oblasti = velká zóna, malé stavby = malá zóna.
Všechny dotčené POI jsou ve stejné kategorii `landmark`, takže per-kategorie
řešení nestačí; rozlišení musí být per-POI.

## Řešení: velikostní tiery

Volitelné pole `size` na POI s 5 tiery mapovanými na normalizované prahy.

### Typ (`data/types.ts`)

```ts
export type POISize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';
// POIBase:
size?: POISize;   // vynechané = 'medium'
```

Žije na `POIBase`, ale prakticky ovlivňuje jen point POI. Polyline (ulice) si
drží svou perpendikulární toleranci `POLYLINE_HIT_TOLERANCE = 0.015` beze změny.

### Hit-test (`logic/hitTest.ts`)

```ts
export const SIZE_THRESHOLDS: Record<POISize, number> = {
  tiny: 0.015, small: 0.025, medium: 0.035, large: 0.055, huge: 0.09,
};
```

`evaluateClick` pro point: `threshold = SIZE_THRESHOLDS[poi.size ?? 'medium']`.
Explicitní `threshold` parametr zůstává (override pro testy/callery); když není
předán, derivuje se z `size` místo dřívějšího plochého `0.03`. `HIT_THRESHOLD`
zůstává jako alias `medium` (0.035) kvůli zpětné kompatibilitě.

Default se posouvá `0.03 → 0.035` (medium). Mírně tolerantnější baseline.

### Velikostní přiřazení (per-POI v `pois.ts`)

- **huge (0.09):** lsia, fort-zancudo, doky, industrialni-zona, ropne-vrty,
  mirror-park, sandy-shores, grapeseed, paleto-bay, vodni-mesto
- **large (0.055):** prehrada, veznice, vinice, vetrne-elektrarny, hriste-golf,
  letiste-sandy, maze-bank-arena
- **medium (0.035, default):** casino, mega-mall, legion-square, power-station,
  molo, gym-u-plaze, hrbitov, observator, vinewood-sign, north-chumash, chumash
- **small (0.025):** pillbox, pdm, posta, arcadius, life-invader, klenotnictvi,
  radnice, lsc, rockford-plaza, hlavni-banka, divadlo, g6, pink-cage-motel,
  weazel, maze-bank-tower, pd.vespucci, pd.vinewood, fire.hq, ems.central,
  ammu.downtown
- **tiny (0.015):** žádné (tier zůstává k dispozici pro budoucí pinpoint POI)

Downtown cluster (legion-square, pillbox, maze-bank-tower, arcadius,
hlavni-banka) je záměrně držen small/medium — velké poloměry by se v husté
zástavbě překrývaly a klik by byl nejednoznačný.

## Testy

- `hitTest.test.ts`: assert prahů jednotlivých tierů na hranici (hit těsně
  uvnitř, miss těsně vně) pro point POI; default = medium když `size` chybí.
- `pois.test.ts`: validace, že každé přítomné `size` je jedna z 5 hodnot.
- `hitTest.streets.test.ts`: beze změny (polyline tolerance netknutá).
- `npm run test:all` zelené.

## Mimo rozsah

- Vizualizace poloměru jako kružnice v `/geo/calibrate` / debug overlay pro
  vizuální ladění. Lze přidat později.
- Per-tier persistované UI preference.
