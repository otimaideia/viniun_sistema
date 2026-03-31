import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import type {
  Branding,
  BrandingCSSVariables,
  BrandingContextType,
  DEFAULT_CSS_VARIABLES,
} from '@/types/multitenant';

// =============================================================================
// BRANDING CONTEXT
// Gerencia o branding dinâmico e CSS variables por tenant
// =============================================================================

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Função para converter hex para HSL (formato usado pelo shadcn/Tailwind)
function hexToHSL(hex: string): string {
  // Remove # se presente
  hex = hex.replace(/^#/, '');

  // Parse valores RGB
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Retorna no formato "H S% L%" para CSS variables do shadcn
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Função para determinar se uma cor é clara ou escura
function isLightColor(hex: string): boolean {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Fórmula de luminância relativa
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

interface BrandingProviderProps {
  children: ReactNode;
}

// Função para converter branding em CSS variables
function brandingToCSSVariables(branding: Branding | null): BrandingCSSVariables {
  if (!branding) {
    return {
      '--color-primary': '#E91E63',
      '--color-primary-hover': '#C2185B',
      '--color-secondary': '#3F51B5',
      '--color-secondary-hover': '#303F9F',
      '--color-success': '#4CAF50',
      '--color-error': '#F44336',
      '--color-warning': '#FF9800',
      '--color-info': '#2196F3',
      '--color-background': '#F5F5F5',
      '--color-background-card': '#FFFFFF',
      '--color-text': '#212121',
      '--color-text-secondary': '#757575',
      '--color-border': '#E0E0E0',
      '--font-primary': 'Inter, sans-serif',
      '--font-secondary': 'Inter, sans-serif',
      '--border-radius': '8px',
      '--shadow-card': '0 2px 4px rgba(0,0,0,0.1)',
    };
  }

  return {
    // Cores principais
    '--color-primary': branding.cor_primaria || '#E91E63',
    '--color-primary-hover': branding.cor_primaria_hover || '#C2185B',
    '--color-primary-light': branding.cor_primaria_light || `${branding.cor_primaria}20`,
    '--color-secondary': branding.cor_secundaria || '#3F51B5',
    '--color-secondary-hover': branding.cor_secundaria_hover || '#303F9F',
    '--color-secondary-light': branding.cor_secundaria_light || `${branding.cor_secundaria}20`,

    // Cores de feedback
    '--color-success': branding.cor_sucesso || '#4CAF50',
    '--color-error': branding.cor_erro || '#F44336',
    '--color-warning': branding.cor_aviso || '#FF9800',
    '--color-info': branding.cor_info || '#2196F3',

    // Cores de fundo
    '--color-background': branding.cor_fundo || '#F5F5F5',
    '--color-background-secondary': branding.cor_fundo_secundario || '#FAFAFA',
    '--color-background-card': branding.cor_fundo_card || '#FFFFFF',
    '--color-background-sidebar': branding.cor_fundo_sidebar || '#FFFFFF',
    '--color-background-header': branding.cor_fundo_header || '#FFFFFF',

    // Cores de texto
    '--color-text': branding.cor_texto || '#212121',
    '--color-text-secondary': branding.cor_texto_secundario || '#757575',
    '--color-text-inverted': branding.cor_texto_invertido || '#FFFFFF',
    '--color-text-link': branding.cor_texto_link || branding.cor_primaria || '#E91E63',

    // Bordas
    '--color-border': branding.cor_borda || '#E0E0E0',
    '--color-border-input': branding.cor_borda_input || '#E0E0E0',

    // Tipografia
    '--font-primary': branding.fonte_primaria || 'Inter, sans-serif',
    '--font-secondary': branding.fonte_secundaria || 'Inter, sans-serif',
    '--font-size-base': branding.fonte_tamanho_base || '14px',

    // Visual
    '--border-radius': branding.border_radius || '8px',
    '--shadow-card': branding.sombra_cards || '0 2px 4px rgba(0,0,0,0.1)',
  };
}

// Função para aplicar CSS variables no document
function applyCSSVariables(variables: BrandingCSSVariables) {
  const root = document.documentElement;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Função para aplicar variáveis do shadcn/Tailwind (formato HSL)
function applyShadcnVariables(branding: Branding | null) {
  const root = document.documentElement;

  if (!branding) {
    // Restaurar valores padrão Viniun
    root.style.setProperty('--primary', '275 51% 37%'); // #662E8E
    root.style.setProperty('--secondary', '194 82% 65%'); // #5AC9EF
    root.style.setProperty('--accent', '275 40% 95%');
    root.style.setProperty('--ring', '275 51% 37%');
    root.style.setProperty('--sidebar-primary', '275 51% 37%');
    return;
  }

  // Cores principais
  if (branding.cor_primaria) {
    const primaryHSL = hexToHSL(branding.cor_primaria);
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--ring', primaryHSL);
    root.style.setProperty('--sidebar-primary', primaryHSL);

    // Cor de texto para primary (branco ou preto baseado na luminância)
    const primaryForeground = isLightColor(branding.cor_primaria) ? '275 30% 15%' : '0 0% 100%';
    root.style.setProperty('--primary-foreground', primaryForeground);
    root.style.setProperty('--sidebar-primary-foreground', primaryForeground);
  }

  if (branding.cor_secundaria) {
    const secondaryHSL = hexToHSL(branding.cor_secundaria);
    root.style.setProperty('--secondary', secondaryHSL);

    // Cor de texto para secondary
    const secondaryForeground = isLightColor(branding.cor_secundaria) ? '275 30% 15%' : '0 0% 100%';
    root.style.setProperty('--secondary-foreground', secondaryForeground);
  }

  // Cores de feedback
  if (branding.cor_sucesso) {
    root.style.setProperty('--success', hexToHSL(branding.cor_sucesso));
  }
  if (branding.cor_erro) {
    root.style.setProperty('--destructive', hexToHSL(branding.cor_erro));
  }
  if (branding.cor_aviso) {
    root.style.setProperty('--warning', hexToHSL(branding.cor_aviso));
  }
  if (branding.cor_info) {
    // Usar cor_info para accent
  }

  // Cores de fundo
  if (branding.cor_fundo) {
    root.style.setProperty('--background', hexToHSL(branding.cor_fundo));
  }
  if (branding.cor_fundo_card) {
    root.style.setProperty('--card', hexToHSL(branding.cor_fundo_card));
  }
  if (branding.cor_fundo_sidebar) {
    root.style.setProperty('--sidebar-background', hexToHSL(branding.cor_fundo_sidebar));
  }

  // Cores de texto
  if (branding.cor_texto) {
    const textHSL = hexToHSL(branding.cor_texto);
    root.style.setProperty('--foreground', textHSL);
    root.style.setProperty('--card-foreground', textHSL);
    root.style.setProperty('--sidebar-foreground', textHSL);
  }

  // Bordas
  if (branding.cor_borda) {
    const borderHSL = hexToHSL(branding.cor_borda);
    root.style.setProperty('--border', borderHSL);
    root.style.setProperty('--input', borderHSL);
    root.style.setProperty('--sidebar-border', borderHSL);
  }

  // Border radius
  if (branding.border_radius) {
    root.style.setProperty('--radius', branding.border_radius);
  }

}

// Função para remover CSS variables customizadas
function resetCSSVariables() {
  const root = document.documentElement;
  const defaultVars = brandingToCSSVariables(null);

  Object.entries(defaultVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const { branding: tenantBranding, isLoading: tenantLoading } = useTenantContext();

  // Estado local
  const [branding, setBranding] = useState<Branding | null>(null);
  const [cssVariables, setCSSVariables] = useState<BrandingCSSVariables>(
    brandingToCSSVariables(null)
  );
  const [isLoading, setIsLoading] = useState(true);

  // Aplicar branding quando mudar
  const applyBranding = useCallback(() => {
    const variables = brandingToCSSVariables(branding);
    setCSSVariables(variables);
    applyCSSVariables(variables);
    // Também aplicar nas variáveis do shadcn/Tailwind
    applyShadcnVariables(branding);
  }, [branding]);

  // Resetar para branding padrão
  const resetBranding = useCallback(() => {
    const defaultVariables = brandingToCSSVariables(null);
    setCSSVariables(defaultVariables);
    resetCSSVariables();
    // Também resetar variáveis do shadcn
    applyShadcnVariables(null);
  }, []);

  // Sincronizar branding do tenant
  useEffect(() => {
    setBranding(tenantBranding);
    setIsLoading(tenantLoading);
  }, [tenantBranding, tenantLoading]);

  // Aplicar CSS variables quando branding mudar
  useEffect(() => {
    if (!isLoading) {
      applyBranding();
    }
  }, [branding, isLoading, applyBranding]);

  // Aplicar favicon se disponível
  useEffect(() => {
    if (branding?.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = branding.favicon_url;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = branding.favicon_url;
        document.head.appendChild(newLink);
      }
    }
  }, [branding?.favicon_url]);

  // Aplicar título da página
  useEffect(() => {
    if (branding?.texto_login_titulo) {
      // Manter título atual mas poderia ser customizado
      // document.title = branding.texto_login_titulo;
    }
  }, [branding?.texto_login_titulo]);

  const value: BrandingContextType = {
    branding,
    cssVariables,
    isLoading,
    applyBranding,
    resetBranding,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

// Hook para usar o contexto de branding
export function useBrandingContext(): BrandingContextType {
  const context = useContext(BrandingContext);

  if (context === undefined) {
    throw new Error('useBrandingContext deve ser usado dentro de um BrandingProvider');
  }

  return context;
}

// Hook simplificado para branding
export function useBranding() {
  const { branding, cssVariables, isLoading, applyBranding } = useBrandingContext();

  return {
    branding,
    cssVariables,
    isLoading,
    applyBranding,

    // Helpers para acessar valores específicos
    primaryColor: branding?.cor_primaria || '#E91E63',
    secondaryColor: branding?.cor_secundaria || '#3F51B5',
    logoUrl: branding?.logo_url,
    logoWhiteUrl: branding?.logo_branco_url,

    // Textos
    loginTitle: branding?.texto_login_titulo,
    loginSubtitle: branding?.texto_login_subtitulo,
    welcomeText: branding?.texto_boas_vindas,
  };
}

export default BrandingContext;
