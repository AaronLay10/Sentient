export interface Client {
  id: string;
  name: string;
  slug?: string;
  active?: boolean;
  created_at: Date;
  updated_at?: Date;
}
