import type { LawText } from '../types';

export const SASP_TEXT: LawText[] = [
  {
    id: 'sasp.text.rto.1',
    source: 'sasp',
    theme: 'rto',
    kind: 'text',
    prompt: 'Přelož rádiové hlášení do normálního jazyka.',
    scenario: 'Na kanálu 1 zazní: „Tom-1, William-44, 10-11 Route 68, 10-32 pozitivní."',
    answer: 'Dispečink, detektiv č. 44 hlásí dopravní kontrolu na Route 68, osoba je ozbrojena.',
    aliases: [
      'William-44 hlásí zastavení vozidla na Route 68, zbraň potvrzena',
      'detektiv 44 zastavil vozidlo na Route 68, má zbraň',
      'Tom-1, William-44 zastavuje na Route 68, 10-32 pozitivní',
      'dispečink, William-44, traffic stop Route 68, zbraň',
    ],
    note: 'William je volací znak DBI. 10-11 = dopravní kontrola (traffic stop). 10-32 pozitivní = osoba je ozbrojená.',
  },
  {
    id: 'sasp.text.zasah.felony-code',
    source: 'sasp',
    theme: 'zasah',
    kind: 'text',
    prompt: 'Jaký rádiový kód se hlásí při zahájení felony stopu?',
    answer: 'Code 5',
    aliases: [
      'kód 5',
      'code five',
      'pětka',
    ],
    note: 'Felony stop se zahajuje hlášením „Code 5" a polohou. Např. „Viktor-15, Code 5, letiště Sandy Shores, červený sedan, 10-32 pozitivní."',
  },
];
