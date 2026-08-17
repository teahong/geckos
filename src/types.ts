export interface Gecko {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'unknown';
  has_tail: boolean;
  birth_date: string; // ISO date string
}

export interface Metric {
  id: string;
  gecko_id: string;
  recorded_at: string; // ISO datetime string
  weight: number; // in grams
  temperature: number; // in Celsius
  humidity: number; // percentage
  type: 'metric';
}

export interface Feeding {
  id: string;
  gecko_id: string;
  fed_at: string; // ISO datetime string
  feed_type: 'superfood' | 'insect';
  amount_g: number;
  is_dusted: boolean;
  memo: string;
  type: 'feeding';
}

export type HistoryItem = Metric | Feeding;
