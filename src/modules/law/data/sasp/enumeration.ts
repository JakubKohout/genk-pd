import type { LawEnumeration } from '../types';

export const SASP_ENUM: LawEnumeration[] = [
  {
    id: 'sasp.enum.hodnosti.ladder',
    source: 'sasp',
    theme: 'hodnosti',
    title: 'Žebříček hodností SASP',
    kind: 'enumeration',
    matcher: 'alias',
    ordered: true,
    prompt:
      'Vypiš hodnosti SASP od nejvyšší po nejnižší (bez detektivní DBI větve). Každou na samostatný řádek.',
    expected: [
      { key: 'Captain', label: 'Captain' },
      { key: 'Lieutenant', label: 'Lieutenant' },
      { key: 'Sergeant II', label: 'Sergeant II' },
      { key: 'Sergeant', label: 'Sergeant' },
      { key: 'Lead Senior Trooper', label: 'Lead Senior Trooper' },
      { key: 'Senior Trooper', label: 'Senior Trooper' },
      { key: 'Trooper', label: 'Trooper' },
      { key: 'Junior Trooper', label: 'Junior Trooper' },
      { key: 'Trainee', label: 'Trainee' },
      { key: 'Cadet', label: 'Cadet' },
    ],
    note: 'Pořadí: Captain → Lieutenant → Sergeant II → Sergeant → Lead Senior Trooper → Senior Trooper → Trooper → Junior Trooper → Trainee → Cadet. Detektivní větev (Detective III / Detective II / Detective) patří pod DBI a do tohoto žebříčku nespadá.',
  },
  {
    id: 'sasp.enum.zasah.felony-order',
    source: 'sasp',
    theme: 'zasah',
    title: 'Pořadí vystupování při Code 5',
    kind: 'enumeration',
    matcher: 'alias',
    ordered: true,
    prompt:
      'Vypiš správné pořadí, ve kterém osoby vystupují z vozidla při felony stopu. Každou na samostatný řádek.',
    expected: [
      {
        key: 'ridic',
        label: 'Řidič',
        aliases: ['driver', 'ridic'],
      },
      {
        key: 'spolujezdec',
        label: 'Spolujezdec',
        aliases: ['passenger', 'spolujezdec vpredu', 'spolujezdec vpředu', 'predni spolujezdec', 'přední spolujezdec'],
      },
      {
        key: 'pasazer-za-ridicem',
        label: 'Pasažér za řidičem',
        aliases: ['pasazer za ridicem', 'zadni levy', 'zadní levý', 'levy zadni', 'levý zadní'],
      },
      {
        key: 'pasazer-za-spolujezdcem',
        label: 'Pasažér za spolujezdcem',
        aliases: ['pasazer za spolujezdcem', 'zadni pravy', 'zadní pravý', 'pravy zadni', 'pravý zadní'],
      },
    ],
    note: 'Pořadí při felony stopu: Řidič → Spolujezdec → Pasažér za řidičem → Pasažér za spolujezdcem.',
  },
];
