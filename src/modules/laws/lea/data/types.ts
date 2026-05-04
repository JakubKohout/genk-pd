export interface AnswerItem {
  id: string;
  quote: string;
  aliases: string[];
  ref: string;
}

export interface Question {
  id: string;
  prompt: string;
  description: string;
  ref: string;
  items: AnswerItem[];
}
