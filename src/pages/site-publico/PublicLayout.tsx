// =============================================================================
// PUBLIC LAYOUT - Layout compartilhado para site publico imobiliario MT
// =============================================================================
// Header com nav + branding + Footer com dados do tenant
// Usa useTenantDetection para detectar tenant sem auth
// =============================================================================

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenantDetection } from '@/hooks/multitenant/useTenantDetection';
import { Button } from '@/components/ui/button';
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Building2,
  ChevronUp,
} from 'lucide-react';
import type { Branding, Tenant } from '@/types/multitenant';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PublicLayoutProps {
  children: ReactNode;
}

interface PublicTenantContext {
  tenant: Tenant | null;
  branding: Branding | null;
  isLoading: boolean;
  propertyCount: number;
}

// -----------------------------------------------------------------------------
// Hook: usePublicTenant (carrega tenant + branding sem auth)
// -----------------------------------------------------------------------------

export function usePublicTenant(): PublicTenantContext {
  const { tenant, isLoading: tenantLoading } = useTenantDetection();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [propertyCount, setPropertyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenant) {
      setIsLoading(tenantLoading);
      return;
    }

    async function loadPublicData() {
      try {
        // Carregar branding
        const { data: brandingData } = await supabase
          .from('mt_tenant_branding')
          .select('*')
          .eq('tenant_id', tenant!.id)
          .maybeSingle();

        if (brandingData) setBranding(brandingData as unknown as Branding);

        // Contar imoveis disponiveis
        const { count } = await supabase
          .from('mt_properties')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant!.id)
          .eq('situacao', 'disponivel')
          .is('deleted_at', null);

        setPropertyCount(count || 0);
      } catch (err) {
        console.error('Erro ao carregar dados publicos:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPublicData();
  }, [tenant, tenantLoading]);

  return { tenant, branding, isLoading, propertyCount };
}

// -----------------------------------------------------------------------------
// CSS Variables helper
// -----------------------------------------------------------------------------

function brandingToStyle(branding: Branding | null): React.CSSProperties {
  if (!branding) return {};
  return {
    '--pub-primary': branding.cor_primaria || '#1E3A5F',
    '--pub-primary-hover': branding.cor_primaria_hover || '#162D4A',
    '--pub-secondary': branding.cor_secundaria || '#D4A853',
    '--pub-text': branding.cor_texto || '#1a1a1a',
    '--pub-text-light': branding.cor_texto_secundario || '#666666',
    '--pub-bg': branding.cor_fundo || '#ffffff',
    '--pub-border': branding.cor_borda || '#e5e7eb',
  } as React.CSSProperties;
}

// -----------------------------------------------------------------------------
// NAV LINKS
// -----------------------------------------------------------------------------

const NAV_LINKS = [
  { label: 'Quem Somos', href: '#quem-somos' },
  { label: 'Servicos', href: '#servicos' },
  { label: 'Imoveis', href: '/busca' },
  { label: 'Contato', href: '#contato' },
];

// -----------------------------------------------------------------------------
// HEADER
// -----------------------------------------------------------------------------

function PublicHeader({
  tenant,
  branding,
  propertyCount,
}: {
  tenant: Tenant | null;
  branding: Branding | null;
  propertyCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fechar menu ao navegar
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const primaryColor = branding?.cor_primaria || '#1E3A5F';
  const phone = tenant?.telefone || '';
  const whatsappLink = phone
    ? `https://wa.me/55${phone.replace(/\D/g, '')}`
    : '#';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-lg' : ''
      }`}
      style={{ backgroundColor: primaryColor }}
    >
      {/* Top bar */}
      <div className="hidden md:block border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between text-white/80 text-sm">
          <span>
            {propertyCount > 0
              ? `Sao mais de ${propertyCount} imoveis para voce`
              : 'Encontre o imovel dos seus sonhos'}
          </span>
          {phone && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          )}
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          {branding?.logo_branco_url || branding?.logo_url ? (
            <img
              src={branding.logo_branco_url || branding.logo_url}
              alt={tenant?.nome_fantasia || 'Logo'}
              className="h-10 md:h-12 w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 text-white">
              <Building2 className="h-8 w-8" />
              <span className="text-xl font-bold">
                {tenant?.nome_fantasia || 'Imobiliaria'}
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-white/90 hover:text-white font-medium text-sm tracking-wide transition-colors"
            >
              {link.label}
            </a>
          ))}
          {phone && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white rounded-full px-4"
              >
                <Phone className="h-4 w-4 mr-1.5" />
                WhatsApp
              </Button>
            </a>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-white font-medium py-2 border-b border-white/10"
              >
                {link.label}
              </a>
            ))}
            {phone && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2"
              >
                <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp: {phone}
                </Button>
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// -----------------------------------------------------------------------------
// FOOTER
// -----------------------------------------------------------------------------

function PublicFooter({
  tenant,
  branding,
}: {
  tenant: Tenant | null;
  branding: Branding | null;
}) {
  const primaryColor = branding?.cor_primaria || '#1E3A5F';
  const year = new Date().getFullYear();
  const phone = tenant?.telefone || '';
  const whatsappLink = phone
    ? `https://wa.me/55${phone.replace(/\D/g, '')}`
    : '';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer style={{ backgroundColor: primaryColor }} className="text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Institucional */}
          <div>
            <h3 className="text-lg font-bold mb-4">Institucional</h3>
            <ul className="space-y-2 text-white/80">
              <li>
                <a href="#quem-somos" className="hover:text-white transition-colors">
                  Quem Somos
                </a>
              </li>
              <li>
                <a href="#servicos" className="hover:text-white transition-colors">
                  Nossos Servicos
                </a>
              </li>
              <li>
                <Link to="/busca" className="hover:text-white transition-colors">
                  Imoveis
                </Link>
              </li>
              <li>
                <a href="#contato" className="hover:text-white transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Servicos */}
          <div>
            <h3 className="text-lg font-bold mb-4">Servicos</h3>
            <ul className="space-y-2 text-white/80">
              <li>Venda de Imoveis</li>
              <li>Locacao</li>
              <li>Administracao de Imoveis</li>
              <li>Avaliacao de Imoveis</li>
              <li>Consultoria Imobiliaria</li>
            </ul>
          </div>

          {/* Col 3: Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4">Newsletter</h3>
            <p className="text-white/80 text-sm mb-4">
              Receba as melhores ofertas de imoveis no seu e-mail.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <input
                type="email"
                placeholder="Seu e-mail"
                className="flex-1 px-3 py-2 rounded-md text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
              >
                Assinar
              </Button>
            </form>
          </div>

          {/* Col 4: Contato */}
          <div id="contato">
            <h3 className="text-lg font-bold mb-4">Contato</h3>
            <ul className="space-y-3 text-white/80 text-sm">
              {(tenant?.endereco_logradouro || tenant?.endereco_cidade) && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {[
                      tenant.endereco_logradouro,
                      tenant.endereco_numero,
                      tenant.endereco_bairro,
                      tenant.endereco_cidade,
                      tenant.endereco_estado,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a
                    href={whatsappLink || `tel:${phone}`}
                    className="hover:text-white transition-colors"
                  >
                    {phone}
                  </a>
                </li>
              )}
              {tenant?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a
                    href={`mailto:${tenant.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {tenant.email}
                  </a>
                </li>
              )}
            </ul>

            {/* Social links */}
            <div className="flex gap-3 mt-4">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-white/60 text-xs">
          <span>
            &copy; {year} {tenant?.nome_fantasia || 'Imobiliaria'}. Todos os
            direitos reservados.
          </span>
          <span>
            {branding?.texto_rodape || 'Desenvolvido com tecnologia Viniun'}
          </span>
        </div>
      </div>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors"
        style={{ backgroundColor: primaryColor }}
        aria-label="Voltar ao topo"
      >
        <ChevronUp className="h-5 w-5 text-white" />
      </button>
    </footer>
  );
}

// -----------------------------------------------------------------------------
// PUBLIC LAYOUT (default export)
// -----------------------------------------------------------------------------

export default function PublicLayout({ children }: PublicLayoutProps) {
  const ctx = usePublicTenant();

  const style = useMemo(() => brandingToStyle(ctx.branding), [ctx.branding]);

  if (ctx.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={style}>
      <PublicHeader
        tenant={ctx.tenant}
        branding={ctx.branding}
        propertyCount={ctx.propertyCount}
      />

      {/* Spacer for fixed header */}
      <div className="h-[72px] md:h-[104px]" />

      <main className="flex-1">{children}</main>

      <PublicFooter tenant={ctx.tenant} branding={ctx.branding} />
    </div>
  );
}

export { PublicHeader, PublicFooter };
