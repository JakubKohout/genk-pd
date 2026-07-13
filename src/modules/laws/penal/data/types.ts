export type PenalCategory =
  | 'obecna'
  | 'zivot-zdravi'
  | 'svoboda'
  | 'sexualni'
  | 'majetek'
  | 'doprava'
  | 'verejna-bezpecnost'
  | 'spravedlnost'
  | 'environmental'
  | 'morni'
  | 'ostatni';

export interface PenalSubParagraph {
  id: string;
  description: string;
}

export interface PenalParagraph {
  id: string;
  number: string;
  title: string;
  description: string;
  aliases: string[];
  category: PenalCategory;
  subs: PenalSubParagraph[];
}

export interface ExpectedAnswer {
  paragraphId: string;
  subId?: string;
}

export interface PenalScenario {
  id: string;
  ref: string;
  /** Krátký titulek scénky (2-4 slova) pro chip v LawSidePanel. */
  title?: string;
  prompt: string;
  expected: ExpectedAnswer[];
  educationalNote?: string;
}
