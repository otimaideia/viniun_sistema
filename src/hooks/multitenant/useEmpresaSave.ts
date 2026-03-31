import { supabase } from '@/integrations/supabase/client';

interface SaveEmpresaParams {
  isEditing: boolean;
  tenantId?: string;
  tenantData: Record<string, unknown>;
  brandingData: Record<string, unknown>;
  modulosSelecionados: string[];
}

/**
 * Hook to orchestrate saving a tenant (empresa) with branding and modules.
 * Handles create and update flows for mt_tenants, mt_tenant_branding, mt_tenant_modules.
 */
export function useEmpresaSave() {
  const save = async ({
    isEditing,
    tenantId: existingTenantId,
    tenantData,
    brandingData,
    modulosSelecionados,
  }: SaveEmpresaParams): Promise<string> => {
    let tenantId = existingTenantId;

    if (isEditing && tenantId) {
      // Update existing tenant
      const { error } = await supabase
        .from('mt_tenants')
        .update(tenantData)
        .eq('id', tenantId);
      if (error) throw error;
    } else {
      // Create new tenant
      const { data, error } = await supabase
        .from('mt_tenants')
        .insert(tenantData)
        .select()
        .single();
      if (error) throw error;
      tenantId = data.id;
    }

    // Save branding
    const fullBrandingData = { tenant_id: tenantId, ...brandingData };

    if (isEditing) {
      const { data: existingBranding } = await supabase
        .from('mt_tenant_branding')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();

      if (existingBranding) {
        await supabase
          .from('mt_tenant_branding')
          .update(brandingData)
          .eq('tenant_id', tenantId);
      } else {
        await supabase.from('mt_tenant_branding').insert(fullBrandingData);
      }
    } else {
      await supabase.from('mt_tenant_branding').insert(fullBrandingData);
    }

    // Save modules
    if (isEditing) {
      await supabase
        .from('mt_tenant_modules')
        .delete()
        .eq('tenant_id', tenantId);
    }

    const modulesToInsert = modulosSelecionados.map((moduleId) => ({
      tenant_id: tenantId,
      module_id: moduleId,
      is_enabled: true,
    }));

    if (modulesToInsert.length > 0) {
      await supabase.from('mt_tenant_modules').insert(modulesToInsert);
    }

    return tenantId!;
  };

  return { save };
}
