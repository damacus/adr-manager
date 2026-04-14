export interface Adr {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';
  date: string;
  author: string;
  context: string;
  decision: string;
  consequences: string;
}

export interface GitConfig {
  provider: 'github' | 'gitlab';
  repo: string;
  branch: string;
}
