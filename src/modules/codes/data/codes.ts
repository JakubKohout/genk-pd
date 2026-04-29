export type Importance = 'mandatory' | 'rare' | 'unnecessary';

export type Code = {
  /** Canonical id, e.g. "10-44". */
  id: string;
  /** Numeric portion (after the "10-" prefix). Used for "same decade" distractor logic. */
  number: number;
  /** Czech meaning shown to the user. A/B variants are merged with " / ". */
  meaning: string;
  importance: Importance;
};

/**
 * Source of truth: docs/codes.md (table "Desítkové kódy").
 *
 * A/B variants are merged into one record per the brainstorming decision.
 * When merging different importances, the higher importance wins
 * (mandatory > rare > unnecessary).
 */
export const CODES: readonly Code[] = [
  { id: '10-0', number: 0, meaning: 'Vizuální kontakt ztracen', importance: 'mandatory' },
  { id: '10-1', number: 1, meaning: 'Změňte frekvenci', importance: 'mandatory' },
  { id: '10-2', number: 2, meaning: 'Negativní', importance: 'rare' },
  { id: '10-3', number: 3, meaning: 'Ticho na vysílačce', importance: 'mandatory' },
  { id: '10-4', number: 4, meaning: 'Ok, rozumím', importance: 'mandatory' },
  { id: '10-5', number: 5, meaning: 'Přestávka', importance: 'mandatory' },
  { id: '10-6', number: 6, meaning: 'Zaneprázdněn', importance: 'rare' },
  { id: '10-7', number: 7, meaning: 'Mimo službu', importance: 'mandatory' },
  { id: '10-8', number: 8, meaning: 'Ve službě', importance: 'mandatory' },
  { id: '10-9', number: 9, meaning: 'Opakujte hlášení', importance: 'mandatory' },
  { id: '10-10', number: 10, meaning: 'Napadení (Fight in progress)', importance: 'mandatory' },
  { id: '10-11', number: 11, meaning: 'Traffic stop – kde, čeho, 10-32', importance: 'mandatory' },
  { id: '10-12', number: 12, meaning: 'Samostatná jízda', importance: 'mandatory' },
  { id: '10-13', number: 13, meaning: 'Střelba, „shots fired"', importance: 'mandatory' },
  {
    id: '10-14',
    number: 14,
    meaning: 'Distribuce nelegálních látek / pytláctví',
    importance: 'mandatory',
  },
  { id: '10-15', number: 15, meaning: 'Převoz zadrženého – kam', importance: 'mandatory' },
  { id: '10-16', number: 16, meaning: 'Krádež vozidla', importance: 'mandatory' },
  { id: '10-17', number: 17, meaning: 'Podezřelá osoba', importance: 'unnecessary' },
  { id: '10-18', number: 18, meaning: 'Vykrádání bankomatu', importance: 'mandatory' },
  { id: '10-19', number: 19, meaning: 'Vandalismus', importance: 'mandatory' },
  { id: '10-20', number: 20, meaning: 'Lokace', importance: 'mandatory' },
  { id: '10-21', number: 21, meaning: 'Update lokace', importance: 'mandatory' },
  { id: '10-22', number: 22, meaning: 'Ignorujte příkaz', importance: 'mandatory' },
  { id: '10-23', number: 23, meaning: 'Dorazil na scénu', importance: 'mandatory' },
  { id: '10-24', number: 24, meaning: 'Opouštím scénu', importance: 'rare' },
  { id: '10-25', number: 25, meaning: 'Podezřelá aktivita', importance: 'mandatory' },
  { id: '10-30', number: 30, meaning: 'Hledaná osoba', importance: 'unnecessary' },
  { id: '10-32', number: 32, meaning: 'Je potřeba asistence – počet', importance: 'mandatory' },
  { id: '10-41', number: 41, meaning: 'Zahájení patroly – směr', importance: 'mandatory' },
  { id: '10-42', number: 42, meaning: 'Ukončení patroly', importance: 'mandatory' },
  { id: '10-43', number: 43, meaning: 'Podejte informace', importance: 'unnecessary' },
  { id: '10-44', number: 44, meaning: 'Osoba zemřela', importance: 'rare' },
  { id: '10-49', number: 49, meaning: 'Vražda', importance: 'rare' },
  { id: '10-50', number: 50, meaning: 'Dopravní nehoda', importance: 'mandatory' },
  { id: '10-51', number: 51, meaning: 'Potřebuji odtahovku', importance: 'mandatory' },
  { id: '10-52', number: 52, meaning: 'Potřebuji záchranku', importance: 'mandatory' },
  { id: '10-53', number: 53, meaning: 'Potřebuji hasiče', importance: 'mandatory' },
  { id: '10-54', number: 54, meaning: 'Potřebuji koronéra', importance: 'rare' },
  { id: '10-55', number: 55, meaning: 'Potřebuji dopravní vyšetřování', importance: 'rare' },
  { id: '10-60', number: 60, meaning: 'Ozbrojen střelnou zbraní', importance: 'unnecessary' },
  { id: '10-62', number: 62, meaning: 'Únos', importance: 'mandatory' },
  { id: '10-66', number: 66, meaning: 'Bezohledný řidič', importance: 'unnecessary' },
  { id: '10-67', number: 67, meaning: 'Vykradení vozidla', importance: 'mandatory' },
  { id: '10-68', number: 68, meaning: 'Ozbrojená loupež', importance: 'mandatory' },
  { id: '10-69', number: 69, meaning: 'Asistence na recepci', importance: 'mandatory' },
  { id: '10-70', number: 70, meaning: 'Pěší nahánění – Suspect uniká', importance: 'mandatory' },
  { id: '10-71', number: 71, meaning: 'Žádám Supervisora na scénu', importance: 'rare' },
  { id: '10-80', number: 80, meaning: 'Ujíždění hlídce', importance: 'mandatory' },
  {
    id: '10-90',
    number: 90,
    meaning: 'Napomenutí policisty/záchranáře',
    importance: 'unnecessary',
  },
  { id: '10-95', number: 95, meaning: 'Suspect in custody / v poutech', importance: 'mandatory' },
  { id: '10-97', number: 97, meaning: 'Na cestě – kód', importance: 'mandatory' },
  { id: '10-98', number: 98, meaning: 'Pokračuji v hlídce – kam', importance: 'mandatory' },
  {
    id: '10-99',
    number: 99,
    meaning: 'Officer v nouzi (panic button) / nehoda',
    importance: 'mandatory',
  },
  { id: '10-100', number: 100, meaning: 'Officer down', importance: 'mandatory' },
];

const codesById: Map<string, Code> = new Map(CODES.map((c) => [c.id, c]));
const codesByNumber: Map<number, Code> = new Map(CODES.map((c) => [c.number, c]));

export function findCodeById(id: string): Code | undefined {
  return codesById.get(id);
}

export function findCodeByNumber(n: number): Code | undefined {
  return codesByNumber.get(n);
}

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  mandatory: 'Povinný',
  rare: 'Zřídka',
  unnecessary: 'Nepotřebný',
};
