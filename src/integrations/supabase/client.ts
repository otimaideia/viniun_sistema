import { createClient } from '@supabase/supabase-js';
import { createSanitizedFetch } from '@/utils/unicodeSanitizer';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 🛡️ Proteção global: sanitiza TODOS os JSON bodies antes de enviar ao Supabase
// Resolve erro "no low surrogate in string" causado por surrogates UTF-16 órfãos
// que JSON.stringify do JavaScript NÃO detecta (produz \uDxxx inválido per RFC 8259)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createSanitizedFetch(),
  },
});

export async function getUnidadeData(unidade: string): Promise<{ cidade: string | null; estado: string | null; id_api: number | null }> {
  try {
    // Normaliza o nome removendo acentos para busca mais flexível
    const normalizedName = unidade
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    
    // Primeiro tenta busca exata
    let { data, error } = await supabase
      .from('mt_franchises')
      .select('id_api, nome_franquia, cidade, estado')
      .eq('nome_franquia', unidade)
      .limit(1)
      .maybeSingle();

    // Se não encontrou, tenta busca case-insensitive
    if (!data && !error) {
      const result2 = await supabase
        .from('mt_franchises')
        .select('id_api, nome_franquia, cidade, estado')
        .ilike('nome_franquia', `%${unidade}%`)
        .limit(1)
        .maybeSingle();
      
      data = result2.data;
      error = result2.error;
    }

    if (error) {
      console.error('Erro ao buscar dados da unidade:', error);
      return { cidade: null, estado: null, id_api: null };
    }

    const result = {
      cidade: data?.cidade || null,
      estado: data?.estado || null,
      id_api: data?.id_api ? Number(data.id_api) : null
    };
    
    return result;
  } catch (error) {
    console.error('Erro ao consultar Supabase:', error);
    return { cidade: null, estado: null, id_api: null };
  }
}
