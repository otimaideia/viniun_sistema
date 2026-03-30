import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TENANT_ID = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465';

export interface PublicCategory {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  imagem_url: string | null;
  cor: string | null;
  url_slug: string | null;
  ordem: number;
  children?: PublicCategory[];
}

function buildCategoryTree(categories: PublicCategory[]): PublicCategory[] {
  const map = new Map<string, PublicCategory>();
  const roots: PublicCategory[] = [];

  // Index all categories by id
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  // Build tree by linking children to parents
  const allEntries = Array.from(map.values());
  for (const cat of allEntries) {
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(cat);
    } else {
      roots.push(cat);
    }
  }

  // Sort children by ordem
  const sortByOrdem = (a: PublicCategory, b: PublicCategory) => a.ordem - b.ordem;
  for (const cat of allEntries) {
    if (cat.children && cat.children.length > 0) {
      cat.children.sort(sortByOrdem);
    }
  }
  roots.sort(sortByOrdem);

  // Remove empty children arrays for cleaner data
  for (const cat of allEntries) {
    if (cat.children && cat.children.length === 0) {
      delete cat.children;
    }
  }

  return roots;
}

export function useCategoriasPublicas() {
  const query = useQuery<PublicCategory[]>({
    queryKey: ['public-categorias', TENANT_ID],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mt_service_categories')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return (data ?? []) as PublicCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change very rarely
  });

  const categories = query.data ?? [];

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories]
  );

  const getCategoryBySlug = useCallback(
    (slug: string): PublicCategory | undefined => {
      return categories.find((c) => c.url_slug === slug);
    },
    [categories]
  );

  const getCategoryPath = useCallback(
    (categoryId: string): PublicCategory[] => {
      const path: PublicCategory[] = [];
      let currentId: string | null = categoryId;

      while (currentId) {
        const cat = categories.find((c) => c.id === currentId);
        if (!cat) break;
        path.unshift(cat);
        currentId = cat.parent_id;
      }

      return path;
    },
    [categories]
  );

  const getSubcategories = useCallback(
    (parentId: string): PublicCategory[] => {
      return categories
        .filter((c) => c.parent_id === parentId)
        .sort((a, b) => a.ordem - b.ordem);
    },
    [categories]
  );

  return {
    categories,
    categoryTree,
    getCategoryBySlug,
    getCategoryPath,
    getSubcategories,
    isLoading: query.isLoading,
    error: query.error,
  };
}
