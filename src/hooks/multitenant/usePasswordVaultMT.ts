import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  VaultEntry,
  VaultFolder,
  VaultAccessLog,
  VaultShare,
  VaultHistory,
  VaultFilters,
  VaultEntryFormData,
  VaultFolderFormData,
} from '@/types/password-vault';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://supabase-app.yeslaserpraiagrande.com.br';

// =============================================================================
// Helper: Call vault-api Edge Function
// =============================================================================
async function callVaultApi(
  endpoint: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Nao autenticado');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/vault-api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na API do cofre');
  return data;
}

// =============================================================================
// HOOK: usePasswordVaultMT
// CRUD principal do cofre de senhas
// =============================================================================
export function usePasswordVaultMT(filters: VaultFilters = {}) {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel, user } = useTenantContext();

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mt_password_vault')
        .select(`
          *,
          folder:mt_password_vault_folders(id, nome, icone, cor)
        `)
        .is('deleted_at', null)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });

      // Tenant/franchise filter
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'user' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      // Apply filters
      if (filters.categoria) {
        query = query.eq('categoria', filters.categoria);
      }
      if (filters.folder_id !== undefined) {
        if (filters.folder_id === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', filters.folder_id);
        }
      }
      if (filters.is_favorite) {
        query = query.eq('is_favorite', true);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.search) {
        query = query.ilike('nome', `%${filters.search}%`);
      }
      if (filters.expires_soon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query
          .not('expires_at', 'is', null)
          .lte('expires_at', thirtyDaysFromNow.toISOString());
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setEntries(data || []);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Erro ao carregar cofre');
      setError(e);
      console.error('[Vault] Erro ao carregar:', e.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenant, franchise, accessLevel, filters.categoria, filters.folder_id, filters.is_favorite, filters.search, filters.expires_soon, filters.tags]);

  useEffect(() => {
    if (tenant || accessLevel === 'platform') {
      fetchEntries();
    }
  }, [fetchEntries, tenant, accessLevel]);

  // Create entry
  const createEntry = useCallback(async (formData: VaultEntryFormData) => {
    if (!tenant && accessLevel !== 'platform') {
      throw new Error('Tenant nao definido');
    }

    try {
      // Encrypt the value via Edge Function
      const encrypted = await callVaultApi('encrypt', { value: formData.value });

      const { data, error: insertError } = await supabase
        .from('mt_password_vault')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          folder_id: formData.folder_id || null,
          nome: formData.nome,
          descricao: formData.descricao || null,
          url: formData.url || null,
          categoria: formData.categoria,
          tags: formData.tags || [],
          username: formData.username || null,
          encrypted_value: encrypted.encrypted_value as string,
          value_preview: encrypted.value_preview as string,
          strength_score: encrypted.strength_score as number,
          notas: formData.notas || null,
          campos_extras: formData.campos_extras || {},
          expires_at: formData.expires_at || null,
          rotation_days: formData.rotation_days || null,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Credencial salva com sucesso');
      await fetchEntries();
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar credencial';
      toast.error(msg);
      throw err;
    }
  }, [tenant, franchise, accessLevel, user, fetchEntries]);

  // Update entry
  const updateEntry = useCallback(async (id: string, formData: Partial<VaultEntryFormData>) => {
    try {
      const updates: Record<string, unknown> = {
        updated_by: user?.id,
      };

      // If value changed, re-encrypt
      if (formData.value) {
        const encrypted = await callVaultApi('encrypt', {
          value: formData.value,
          entryId: id,
        });
        updates.encrypted_value = encrypted.encrypted_value;
        updates.value_preview = encrypted.value_preview;
        updates.strength_score = encrypted.strength_score;
        updates.last_rotated_at = new Date().toISOString();
      }

      // Map other fields
      if (formData.nome !== undefined) updates.nome = formData.nome;
      if (formData.descricao !== undefined) updates.descricao = formData.descricao;
      if (formData.url !== undefined) updates.url = formData.url || null;
      if (formData.categoria !== undefined) updates.categoria = formData.categoria;
      if (formData.tags !== undefined) updates.tags = formData.tags;
      if (formData.username !== undefined) updates.username = formData.username || null;
      if (formData.notas !== undefined) updates.notas = formData.notas || null;
      if (formData.campos_extras !== undefined) updates.campos_extras = formData.campos_extras;
      if (formData.expires_at !== undefined) updates.expires_at = formData.expires_at || null;
      if (formData.rotation_days !== undefined) updates.rotation_days = formData.rotation_days || null;
      if (formData.folder_id !== undefined) updates.folder_id = formData.folder_id || null;

      // Fetch current entry for history comparison
      const { data: currentEntry } = await supabase
        .from('mt_password_vault')
        .select('nome, descricao, url, categoria, username, tags, notas, expires_at, rotation_days, folder_id')
        .eq('id', id)
        .single();

      const { data, error: updateError } = await supabase
        .from('mt_password_vault')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Record history of changes
      if (currentEntry && tenant) {
        const changedFields: string[] = [];
        const oldValues: Record<string, unknown> = {};
        const newValues: Record<string, unknown> = {};

        const trackableFields = ['nome', 'descricao', 'url', 'categoria', 'username', 'tags', 'notas', 'expires_at', 'rotation_days', 'folder_id'] as const;
        for (const field of trackableFields) {
          const oldVal = currentEntry[field];
          const newVal = updates[field];
          if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changedFields.push(field);
            oldValues[field] = oldVal;
            newValues[field] = newVal;
          }
        }
        if (formData.value) {
          changedFields.push('encrypted_value');
        }

        if (changedFields.length > 0) {
          await supabase.from('mt_password_vault_history').insert({
            vault_entry_id: id,
            tenant_id: tenant.id,
            changed_by: user?.id,
            changed_fields: changedFields,
            old_values: oldValues,
            new_values: newValues,
          });
        }
      }

      toast.success('Credencial atualizada');
      await fetchEntries();
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      toast.error(msg);
      throw err;
    }
  }, [user, fetchEntries]);

  // Soft delete
  const deleteEntry = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('mt_password_vault')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Credencial removida');
      await fetchEntries();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover';
      toast.error(msg);
      throw err;
    }
  }, [fetchEntries]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    try {
      await supabase
        .from('mt_password_vault')
        .update({ is_favorite: !entry.is_favorite })
        .eq('id', id);

      await fetchEntries();
    } catch (err) {
      console.error('[Vault] Toggle favorite error:', err);
    }
  }, [entries, fetchEntries]);

  // Reveal value (decrypt via Edge Function)
  const revealValue = useCallback(async (entryId: string): Promise<string> => {
    try {
      const result = await callVaultApi('decrypt', { entryId });
      return result.value as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao revelar valor';
      toast.error(msg);
      throw err;
    }
  }, []);

  // Stats
  const stats = {
    total: entries.length,
    expiringSoon: entries.filter((e) => {
      if (!e.expires_at) return false;
      const daysUntil = (new Date(e.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 30 && daysUntil >= 0;
    }).length,
    expired: entries.filter((e) => {
      if (!e.expires_at) return false;
      return new Date(e.expires_at) < new Date();
    }).length,
    favorites: entries.filter((e) => e.is_favorite).length,
    byCategory: Object.fromEntries(
      ['credencial', 'api_key', 'token', 'certificado', 'env_var', 'conexao_db', 'integracao'].map(
        (cat) => [cat, entries.filter((e) => e.categoria === cat).length]
      )
    ),
  };

  return {
    entries,
    isLoading,
    error,
    stats,
    refetch: fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    toggleFavorite,
    revealValue,
  };
}

// =============================================================================
// HOOK: usePasswordVaultEntryMT
// Detalhe de uma entrada individual com logs, shares e historico
// =============================================================================
export function usePasswordVaultEntryMT(entryId: string | undefined) {
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [accessLog, setAccessLog] = useState<VaultAccessLog[]>([]);
  const [shares, setShares] = useState<VaultShare[]>([]);
  const [history, setHistory] = useState<VaultHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, user } = useTenantContext();

  const fetchEntry = useCallback(async () => {
    if (!entryId) return;
    setIsLoading(true);

    try {
      // Fetch entry
      const { data: entryData, error: entryError } = await supabase
        .from('mt_password_vault')
        .select(`
          *,
          folder:mt_password_vault_folders(id, nome, icone, cor)
        `)
        .eq('id', entryId)
        .single();

      if (entryError) throw entryError;
      setEntry(entryData);

      // Fetch access log (last 50)
      const { data: logData } = await supabase
        .from('mt_password_vault_access_log')
        .select('*')
        .eq('vault_entry_id', entryId)
        .order('created_at', { ascending: false })
        .limit(50);

      setAccessLog(logData || []);

      // Fetch shares
      const { data: sharesData } = await supabase
        .from('mt_password_vault_shares')
        .select('*')
        .eq('vault_entry_id', entryId)
        .eq('is_active', true);

      setShares(sharesData || []);

      // Fetch history (last 20)
      const { data: historyData } = await supabase
        .from('mt_password_vault_history')
        .select('*')
        .eq('vault_entry_id', entryId)
        .order('created_at', { ascending: false })
        .limit(20);

      setHistory(historyData || []);
    } catch (err) {
      console.error('[Vault] Erro ao carregar entrada:', err);
    } finally {
      setIsLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  // Share with user
  const shareWith = useCallback(async (
    sharedWithUserId: string,
    permission: 'view' | 'edit' = 'view',
    expiresAt?: string
  ) => {
    if (!entryId || !tenant || !user) return;

    try {
      const { error: shareError } = await supabase
        .from('mt_password_vault_shares')
        .upsert({
          tenant_id: tenant.id,
          vault_entry_id: entryId,
          shared_with_user_id: sharedWithUserId,
          shared_by_user_id: user.id,
          permission,
          expires_at: expiresAt || null,
          is_active: true,
        }, {
          onConflict: 'vault_entry_id,shared_with_user_id',
        });

      if (shareError) throw shareError;

      toast.success('Compartilhado com sucesso');
      await fetchEntry();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao compartilhar';
      toast.error(msg);
    }
  }, [entryId, tenant, user, fetchEntry]);

  // Revoke share
  const revokeShare = useCallback(async (shareId: string) => {
    try {
      await supabase
        .from('mt_password_vault_shares')
        .update({ is_active: false })
        .eq('id', shareId);

      toast.success('Compartilhamento revogado');
      await fetchEntry();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao revogar';
      toast.error(msg);
    }
  }, [fetchEntry]);

  return {
    entry,
    accessLog,
    shares,
    history,
    isLoading,
    refetch: fetchEntry,
    shareWith,
    revokeShare,
  };
}

// =============================================================================
// HOOK: usePasswordVaultFoldersMT
// Gestao de pastas do cofre
// =============================================================================
export function usePasswordVaultFoldersMT() {
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel, user } = useTenantContext();

  const fetchFolders = useCallback(async () => {
    setIsLoading(true);

    try {
      let query = supabase
        .from('mt_password_vault_folders')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Count entries per folder
      const { data: entryCounts } = await supabase
        .from('mt_password_vault')
        .select('folder_id')
        .is('deleted_at', null);

      const countMap = new Map<string, number>();
      entryCounts?.forEach((e) => {
        if (e.folder_id) {
          countMap.set(e.folder_id, (countMap.get(e.folder_id) || 0) + 1);
        }
      });

      const foldersWithCount = (data || []).map((f) => ({
        ...f,
        entry_count: countMap.get(f.id) || 0,
      }));

      setFolders(foldersWithCount);
    } catch (err) {
      console.error('[Vault] Erro ao carregar pastas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant, franchise, accessLevel]);

  useEffect(() => {
    if (tenant || accessLevel === 'platform') {
      fetchFolders();
    }
  }, [fetchFolders, tenant, accessLevel]);

  // Build tree structure
  const folderTree = folders.reduce<VaultFolder[]>((tree, folder) => {
    if (!folder.parent_id) {
      const children = folders.filter((f) => f.parent_id === folder.id);
      tree.push({ ...folder, children });
    }
    return tree;
  }, []);

  const createFolder = useCallback(async (formData: VaultFolderFormData) => {
    if (!tenant && accessLevel !== 'platform') throw new Error('Tenant nao definido');

    try {
      const { data, error } = await supabase
        .from('mt_password_vault_folders')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          nome: formData.nome,
          descricao: formData.descricao || null,
          icone: formData.icone || 'Folder',
          cor: formData.cor || '#6B7280',
          parent_id: formData.parent_id || null,
          ordem: formData.ordem || 0,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Pasta criada');
      await fetchFolders();
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar pasta';
      toast.error(msg);
      throw err;
    }
  }, [tenant, franchise, accessLevel, user, fetchFolders]);

  const updateFolder = useCallback(async (id: string, formData: Partial<VaultFolderFormData>) => {
    try {
      const { error } = await supabase
        .from('mt_password_vault_folders')
        .update(formData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Pasta atualizada');
      await fetchFolders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar pasta';
      toast.error(msg);
      throw err;
    }
  }, [fetchFolders]);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      // Move entries out of folder first
      await supabase
        .from('mt_password_vault')
        .update({ folder_id: null })
        .eq('folder_id', id);

      // Soft delete folder
      await supabase
        .from('mt_password_vault_folders')
        .update({ is_active: false })
        .eq('id', id);

      toast.success('Pasta removida');
      await fetchFolders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover pasta';
      toast.error(msg);
      throw err;
    }
  }, [fetchFolders]);

  return {
    folders,
    folderTree,
    isLoading,
    refetch: fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
