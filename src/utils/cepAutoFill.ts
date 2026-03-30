/**
 * Utilitário de busca de CEP com preenchimento automático
 * Baseado no sistema PopDents + melhorias (latitude/longitude)
 *
 * APIs utilizadas:
 * - ViaCEP: Busca de endereço por CEP (gratuito, sem auth)
 * - OpenStreetMap Nominatim: Geocoding para lat/long (gratuito, sem auth)
 */

// =====================================================
// Interfaces
// =====================================================

/**
 * Resposta da API ViaCEP
 */
export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string; // estado
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Resposta da API Nominatim (OpenStreetMap)
 */
export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}

/**
 * Endereço formatado com todos os dados
 */
export interface EnderecoCompleto {
  cep: string;
  rua: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  ibge?: string;
  ddd?: string;
  latitude?: number;
  longitude?: number;
}

// =====================================================
// Funções de Formatação
// =====================================================

/**
 * Remove caracteres não numéricos do CEP
 */
export function formatCep(cep: string): string {
  return cep.replace(/\D/g, '');
}

/**
 * Formata CEP para exibição (00000-000)
 */
export function formatCepDisplay(cep: string): string {
  const cleaned = formatCep(cep);
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Valida se o CEP tem 8 dígitos
 */
export function isValidCep(cep: string): boolean {
  const cleaned = formatCep(cep);
  return cleaned.length === 8;
}

// =====================================================
// Funções de Busca
// =====================================================

/**
 * Busca endereço pelo CEP usando ViaCEP
 */
export async function fetchAddressByCep(cep: string): Promise<EnderecoCompleto | null> {
  try {
    const cleanCep = formatCep(cep);

    if (!isValidCep(cleanCep)) {
      console.warn('[CEP] CEP inválido:', cep);
      return null;
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

    if (!response.ok) {
      console.error('[CEP] Erro na requisição ViaCEP:', response.status);
      return null;
    }

    const data: ViaCepResponse = await response.json();

    if (data.erro) {
      console.warn('[CEP] CEP não encontrado:', cleanCep);
      return null;
    }

    return {
      cep: data.cep,
      rua: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      ibge: data.ibge || '',
      ddd: data.ddd || '',
    };
  } catch (error) {
    console.error('[CEP] Erro ao buscar endereço:', error);
    return null;
  }
}

/**
 * Busca coordenadas (lat/long) usando OpenStreetMap Nominatim
 * @param endereco - Endereço completo ou parcial para geocoding
 */
export async function fetchCoordinates(
  endereco: Pick<EnderecoCompleto, 'rua' | 'bairro' | 'cidade' | 'estado'>
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Montar query de busca
    const parts = [
      endereco.rua,
      endereco.bairro,
      endereco.cidade,
      endereco.estado,
      'Brasil',
    ].filter(Boolean);

    const query = encodeURIComponent(parts.join(', '));

    // Nominatim requer User-Agent
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`,
      {
        headers: {
          'User-Agent': 'YESlaser-Painel/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('[GEO] Erro na requisição Nominatim:', response.status);
      return null;
    }

    const data: NominatimResponse[] = await response.json();

    if (!data || data.length === 0) {
      // Tentar busca mais simples só com cidade e estado
      const simpleQuery = encodeURIComponent(`${endereco.cidade}, ${endereco.estado}, Brasil`);
      const simpleResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${simpleQuery}&format=json&limit=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'YESlaser-Painel/1.0',
          },
        }
      );

      const simpleData: NominatimResponse[] = await simpleResponse.json();

      if (!simpleData || simpleData.length === 0) {
        console.warn('[GEO] Coordenadas não encontradas para:', endereco);
        return null;
      }

      return {
        latitude: parseFloat(simpleData[0].lat),
        longitude: parseFloat(simpleData[0].lon),
      };
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('[GEO] Erro ao buscar coordenadas:', error);
    return null;
  }
}

/**
 * Busca endereço completo pelo CEP incluindo coordenadas
 * Combina ViaCEP + Nominatim
 */
export async function fetchAddressWithCoordinates(cep: string): Promise<EnderecoCompleto | null> {
  // Primeiro busca o endereço via CEP
  const endereco = await fetchAddressByCep(cep);

  if (!endereco) {
    return null;
  }

  // Depois busca as coordenadas
  const coordinates = await fetchCoordinates(endereco);

  if (coordinates) {
    endereco.latitude = coordinates.latitude;
    endereco.longitude = coordinates.longitude;
  }

  return endereco;
}

// =====================================================
// Helpers para Formulários
// =====================================================

/**
 * Cria função de lookup com debounce para usar em formulários
 * @param onSuccess - Callback chamado quando encontrar o endereço
 * @param onError - Callback opcional para erros
 * @param includeCoordinates - Se deve buscar lat/long (default: true)
 * @param debounceMs - Tempo de debounce em ms (default: 500)
 */
export function createCepLookup(
  onSuccess: (endereco: EnderecoCompleto) => void,
  onError?: (error: string) => void,
  includeCoordinates = true,
  debounceMs = 500
): (cep: string) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (cep: string) => {
    // Limpar timeout anterior
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Validar CEP
    if (!isValidCep(cep)) {
      return;
    }

    // Debounce
    timeoutId = setTimeout(async () => {
      try {
        const endereco = includeCoordinates
          ? await fetchAddressWithCoordinates(cep)
          : await fetchAddressByCep(cep);

        if (endereco) {
          onSuccess(endereco);
        } else {
          onError?.('CEP não encontrado');
        }
      } catch {
        onError?.('Erro ao buscar CEP');
      }
    }, debounceMs);
  };
}

/**
 * Formata endereço para exibição em uma linha
 */
export function formatEnderecoDisplay(endereco: Partial<EnderecoCompleto>): string {
  const parts = [];

  if (endereco.rua) parts.push(endereco.rua);
  if (endereco.bairro) parts.push(endereco.bairro);

  let location = '';
  if (endereco.cidade && endereco.estado) {
    location = `${endereco.cidade}/${endereco.estado}`;
  } else if (endereco.cidade) {
    location = endereco.cidade;
  }

  if (location) parts.push(location);

  return parts.join(' - ');
}

/**
 * Mapeia campos do endereço para campos do lead
 */
export const ENDERECO_TO_LEAD_MAPPING: Record<keyof EnderecoCompleto, string> = {
  cep: 'cep',
  rua: 'rua',
  numero: 'numero',
  complemento: 'complemento',
  bairro: 'bairro',
  cidade: 'cidade',
  estado: 'estado',
  ibge: 'ibge',
  ddd: 'ddd',
  latitude: 'latitude',
  longitude: 'longitude',
};

/**
 * Mapeia campos alternativos (para compatibilidade)
 */
export const CAMPO_LEAD_ALTERNATIVES: Record<string, string[]> = {
  rua: ['rua', 'logradouro', 'endereco', 'address', 'street'],
  bairro: ['bairro', 'neighborhood', 'district'],
  cidade: ['cidade', 'city', 'municipio', 'cidade_cep', 'localidade'],
  estado: ['estado', 'state', 'uf', 'estado_cep'],
  cep: ['cep', 'zipcode', 'postal_code'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon'],
};
