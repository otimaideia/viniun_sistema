export interface MTPropertyPortal {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  logo_url: string | null;
  url_portal: string | null;
  formato_export: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MTPortalQueue {
  id: string;
  tenant_id: string;
  property_id: string;
  portal_id: string;
  destaque: boolean;
  status: string;
  last_exported_at: string | null;
  error_message: string | null;
  created_at: string;
  // Joins
  property?: { id: string; titulo: string; ref_code: string };
  portal?: MTPropertyPortal;
}

export interface MTPortalLog {
  id: string;
  tenant_id: string;
  portal_id: string;
  property_id: string | null;
  action: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
}
