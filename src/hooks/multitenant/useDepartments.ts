import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { Department } from '@/types/multitenant';

// =============================================================================
// HOOK: useDepartments
// Gerencia departamentos com suporte a hierarquia (subdepartamentos)
// Níveis: Global (tenant_id=NULL) → Tenant → Franquia
// =============================================================================

interface UseDepartmentsOptions {
  includeGlobal?: boolean;  // Incluir departamentos globais
  franchiseId?: string;     // Filtrar por franquia específica
}

export function useDepartments(options: UseDepartmentsOptions = {}) {
  const { includeGlobal = true, franchiseId } = options;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise } = useTenantContext();

  // Carregar departamentos
  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Construir query baseada no contexto
      let query = supabase
        .from('mt_departments')
        .select(`
          *,
          parent:mt_departments!parent_id(id, codigo, nome, cor)
        `)
        .eq('is_active', true)
        .order('ordem', { ascending: true });

      // Filtrar por escopo
      const currentFranchiseId = franchiseId || franchise?.id;
      const tenantId = tenant?.id;

      if (currentFranchiseId) {
        // Franquia específica: ver globais + tenant + franquia
        if (includeGlobal) {
          query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId},franchise_id.eq.${currentFranchiseId}`);
        } else {
          query = query.eq('franchise_id', currentFranchiseId);
        }
      } else if (tenantId) {
        // Tenant: ver globais + tenant
        if (includeGlobal) {
          query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
        } else {
          query = query.eq('tenant_id', tenantId);
        }
      } else {
        // Apenas globais
        query = query.is('tenant_id', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Contar usuários por departamento
      const { data: userCounts } = await supabase
        .from('mt_user_departments')
        .select('department_id')
        .eq('is_active', true);

      const countMap = new Map<string, number>();
      userCounts?.forEach((uc) => {
        const count = countMap.get(uc.department_id) || 0;
        countMap.set(uc.department_id, count + 1);
      });

      // Adicionar contagem e nível de escopo
      const departmentsWithMeta = (data || []).map((dept) => ({
        ...dept,
        user_count: countMap.get(dept.id) || 0,
        scope: dept.franchise_id ? 'franchise' : dept.tenant_id ? 'tenant' : 'global',
      })) as Department[];

      setDepartments(departmentsWithMeta);
    } catch (err) {
      console.error('Erro ao carregar departamentos:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar departamentos'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, franchiseId, includeGlobal]);

  // Criar departamento
  const createDepartment = useCallback(async (data: Partial<Department>): Promise<Department> => {
    const { data: created, error: createError } = await supabase
      .from('mt_departments')
      .insert({
        tenant_id: data.tenant_id || tenant?.id || null,
        franchise_id: data.franchise_id || null,
        parent_id: data.parent_id || null,
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        cor: data.cor || '#6B7280',
        icone: data.icone || 'Building2',
        ordem: data.ordem || 0,
        is_active: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    await fetchDepartments();
    return created as Department;
  }, [fetchDepartments, tenant?.id]);

  // Atualizar departamento
  const updateDepartment = useCallback(async (id: string, data: Partial<Department>): Promise<Department> => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Só atualizar campos que foram passados
    if (data.parent_id !== undefined) updateData.parent_id = data.parent_id;
    if (data.codigo !== undefined) updateData.codigo = data.codigo;
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.cor !== undefined) updateData.cor = data.cor;
    if (data.icone !== undefined) updateData.icone = data.icone;
    if (data.ordem !== undefined) updateData.ordem = data.ordem;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: updated, error: updateError } = await supabase
      .from('mt_departments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchDepartments();
    return updated as Department;
  }, [fetchDepartments]);

  // Deletar departamento (soft delete)
  const deleteDepartment = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('mt_departments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchDepartments();
  }, [fetchDepartments]);

  // Carregar ao montar
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Agrupar por hierarquia (para exibição em árvore)
  const departmentTree = departments.reduce((acc, dept) => {
    if (!dept.parent_id) {
      acc.push({
        ...dept,
        children: departments.filter(d => d.parent_id === dept.id),
      });
    }
    return acc;
  }, [] as (Department & { children: Department[] })[]);

  return {
    departments,
    departmentTree,
    isLoading,
    error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    refetch: fetchDepartments,
  };
}

// =============================================================================
// HOOK: useDepartment (singular)
// Carrega um departamento específico por ID
// =============================================================================

export function useDepartment(departmentId: string | undefined) {
  const [department, setDepartment] = useState<Department | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDepartment = useCallback(async () => {
    if (!departmentId) {
      setDepartment(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_departments')
        .select(`
          *,
          parent:mt_departments!parent_id(id, codigo, nome, cor, icone),
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .eq('id', departmentId)
        .single();

      if (fetchError) throw fetchError;

      // Buscar subdepartamentos
      const { data: children } = await supabase
        .from('mt_departments')
        .select('id, codigo, nome, cor, icone, ordem')
        .eq('parent_id', departmentId)
        .eq('is_active', true)
        .order('ordem');

      // Buscar usuários do departamento
      const { data: users } = await supabase
        .from('mt_user_departments')
        .select(`
          id, is_primary, assigned_at,
          user:mt_users(id, nome, email, avatar_url)
        `)
        .eq('department_id', departmentId)
        .eq('is_active', true);

      setDepartment({
        ...data,
        children: children || [],
        users: users || [],
      } as Department);
    } catch (err) {
      console.error('Erro ao carregar departamento:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar departamento'));
    } finally {
      setIsLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchDepartment();
  }, [fetchDepartment]);

  return { department, isLoading, error, refetch: fetchDepartment };
}

// =============================================================================
// HOOK: useUserDepartments
// Gerencia associação usuário ↔ departamento
// =============================================================================

export function useUserDepartments(userId?: string) {
  const [userDepartments, setUserDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDepartments = useCallback(async () => {
    if (!userId) {
      setUserDepartments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('mt_user_departments')
        .select(`
          *,
          department:mt_departments(id, codigo, nome, cor, icone, parent_id)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      setUserDepartments(data || []);
    } catch (err) {
      console.error('Erro ao carregar departamentos do usuário:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const assignDepartment = useCallback(async (
    targetUserId: string,
    departmentId: string,
    isPrimary: boolean = false
  ) => {
    const { data, error } = await supabase
      .from('mt_user_departments')
      .upsert({
        user_id: targetUserId,
        department_id: departmentId,
        is_primary: isPrimary,
        is_active: true,
        assigned_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,department_id',
      })
      .select()
      .single();

    if (error) throw error;

    await fetchUserDepartments();
    return data;
  }, [fetchUserDepartments]);

  const unassignDepartment = useCallback(async (
    targetUserId: string,
    departmentId: string
  ) => {
    const { error } = await supabase
      .from('mt_user_departments')
      .update({ is_active: false })
      .eq('user_id', targetUserId)
      .eq('department_id', departmentId);

    if (error) throw error;

    await fetchUserDepartments();
  }, [fetchUserDepartments]);

  const setPrimaryDepartment = useCallback(async (
    targetUserId: string,
    departmentId: string
  ) => {
    // Primeiro, remover is_primary de todos
    await supabase
      .from('mt_user_departments')
      .update({ is_primary: false })
      .eq('user_id', targetUserId);

    // Depois, definir o novo primário
    const { error } = await supabase
      .from('mt_user_departments')
      .update({ is_primary: true })
      .eq('user_id', targetUserId)
      .eq('department_id', departmentId);

    if (error) throw error;

    await fetchUserDepartments();
  }, [fetchUserDepartments]);

  useEffect(() => {
    fetchUserDepartments();
  }, [fetchUserDepartments]);

  return {
    userDepartments,
    isLoading,
    assignDepartment,
    unassignDepartment,
    setPrimaryDepartment,
    refetch: fetchUserDepartments,
  };
}

export default useDepartments;
