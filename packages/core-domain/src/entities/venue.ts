export interface Venue {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}
