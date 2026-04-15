export type AdrStatus =
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'deprecated'
  | 'superseded'
  | 'unknown';

export interface Adr {
  id: string;
  title: string;
  status: AdrStatus;
  date: string;
  author: string;
  context: string;
  decision: string;
  consequences: string;
  relatedAdrId?: string;
  url?: string;
}
