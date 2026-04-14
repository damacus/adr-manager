export interface Adr {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded' | 'unknown';
  date: string;
  author: string;
  context: string;
  decision: string;
  consequences: string;
}
