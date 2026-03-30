// =============================================================================
// THEME - Cores e constantes visuais centralizadas do site YESlaser
// =============================================================================
// Altere AQUI para mudar as cores em TODO o site de uma vez.
// Todos os componentes do /novosite importam deste arquivo.
// =============================================================================

export const BRAND = {
  // Cores principais da marca YESlaser
  primary: '#6B2D8B',       // Roxo/púrpura - cor principal do logo
  primaryHover: '#5B2378',  // Roxo escuro - hover states
  primaryDark: '#4A1A6B',   // Roxo mais escuro - active states
  primaryLight: '#F3E8FF',  // Roxo claro - backgrounds suaves (purple-50)
  primaryMuted: '#E9D5FF',  // Roxo muted - badges, borders (purple-200)

  secondary: '#7BB3D1',     // Azul claro - detalhes, acentos
  secondaryHover: '#6A9FBD', // Azul hover
  secondaryLight: '#E0F2FE', // Azul claro bg (sky-100)

  dark: '#1a1a2e',          // Navy escuro - footer, contraste
  text: '#4A4A4A',          // Cinza escuro - texto do logo "laser"

  white: '#FFFFFF',

  // Gradientes
  heroGradient: 'from-[#6B2D8B] via-[#7BB3D1] to-[#1a1a2e]',
  ctaGradient: 'from-[#6B2D8B] via-[#7BB3D1] to-[#1a1a2e]',
  promoGradient: 'from-purple-600 to-purple-800',
} as const;

// Classes Tailwind reutilizáveis baseadas na marca
export const THEME = {
  // Botão principal (CTA)
  buttonPrimary: 'bg-[#6B2D8B] hover:bg-[#5B2378] text-white',
  buttonPrimaryOutline: 'border-[#6B2D8B] text-[#6B2D8B] hover:bg-purple-50',

  // Botão secundário
  buttonSecondary: 'bg-[#7BB3D1] hover:bg-[#6A9FBD] text-white',

  // Botão WhatsApp
  buttonWhatsApp: 'bg-green-500 hover:bg-green-600 text-white',

  // Links
  link: 'text-[#6B2D8B] hover:text-[#5B2378]',

  // Badges
  badgePrimary: 'bg-purple-100 text-purple-700',
  badgeSecondary: 'bg-sky-100 text-sky-700',
  badgeSuccess: 'bg-green-100 text-green-700',

  // Ícones com fundo
  iconCircle: 'bg-purple-50 text-purple-600',
  iconCircleLg: 'w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center',
  iconCircleSm: 'w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0',

  // Cards
  cardHover: 'hover:border-purple-200 hover:shadow-md transition-all',

  // Seções
  sectionLight: 'bg-gray-50',
  sectionDark: 'bg-[#1a1a2e] text-white',
  sectionGradient: 'bg-gradient-to-br from-[#6B2D8B] via-[#7BB3D1] to-[#1a1a2e]',

  // Footer
  footerBg: 'bg-[#1a1a2e]',
} as const;

// WhatsApp
export const WHATSAPP_NUMBER = '5513991888100';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// Informações da clínica
export const CLINIC = {
  name: 'YESlaser',
  fullName: 'YESlaser Praia Grande',
  tagline: 'Depilação a Laser e Estética',
  phone: '(13) 99188-8100',
  email: 'contato@yeslaserpraiagrande.com.br',
  address: {
    street: 'Av. Presidente Kennedy, 6295 - Loja 18',
    city: 'Praia Grande',
    state: 'SP',
    zip: '11700-000',
    full: 'Av. Presidente Kennedy, 6295 - Loja 18, Praia Grande - SP, 11700-000',
  },
  hours: {
    weekdays: 'Segunda a Sexta: 09h às 19h',
    saturday: 'Sábado: 09h às 14h',
  },
  social: {
    instagram: 'https://instagram.com/yeslaser.praiagrande',
    facebook: 'https://facebook.com/yeslaserpraiagrande',
    whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
  },
  geo: {
    lat: -24.0058,
    lng: -46.4028,
    region: 'BR-SP',
    placename: 'Praia Grande',
  },
} as const;
