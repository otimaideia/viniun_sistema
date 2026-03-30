import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/types/multitenant";
import { MapPin, Phone, Mail, Clock, Instagram, MessageCircle } from "lucide-react";
import { extractLocationHint, matchFranchiseByLocation } from "@/utils/franchiseLocation";
import { usePageMeta } from "@/hooks/usePageMeta";

// ============================================================================
// Identidade visual padrão Viniun (fallback quando sem branding do tenant)
// ============================================================================
const COLORS = {
  purple: "#753DA4",
  cyan: "#7CC4DA",
  green: "#25D366",
  gray900: "#111827",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray800: "#1F2937",
};

const LOGO_DEFAULT =
  "/images/landing/depilacao-a-laser-em-praia-grande-yeslaser.png";

interface FranchiseInfo {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  horario_funcionamento: Record<string, { abre: string; fecha: string } | null> | null;
}

interface BrandingInfo {
  logo_url: string | null;
  logo_branco_url: string | null;
  cor_primaria: string;
}

interface PublicPageLayoutProps {
  tenant: Tenant;
  children: React.ReactNode;
  subtitle: string;
  subtitleIcon: React.ReactNode;
  accentColor?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

function formatAddress(f: FranchiseInfo): string {
  const parts: string[] = [];
  if (f.endereco) parts.push(f.endereco);
  if (f.numero) parts.push(f.numero);
  if (f.bairro) parts.push(f.bairro);
  if (f.cidade && f.estado) parts.push(`${f.cidade} - ${f.estado}`);
  if (f.cep) parts.push(`CEP ${f.cep}`);
  return parts.join(", ");
}

function formatHorario(
  horario: Record<string, { abre: string; fecha: string } | null> | null
): string {
  if (!horario) return "";
  const seg = horario.segunda;
  const sab = horario.sabado;
  if (!seg) return "";
  let text = `Seg-Sex: ${seg.abre} - ${seg.fecha}`;
  if (sab) text += ` | Sab: ${sab.abre} - ${sab.fecha}`;
  return text;
}

// extractLocationHint importado de @/utils/franchiseLocation

export default function PublicPageLayout({
  tenant,
  children,
  subtitle,
  subtitleIcon,
  accentColor,
  hideHeader,
  hideFooter,
}: PublicPageLayoutProps) {
  const [branding, setBranding] = useState<BrandingInfo | null>(null);
  const [franchise, setFranchise] = useState<FranchiseInfo | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;

    const load = async () => {
      const hostname = window.location.hostname;
      const locationHint = extractLocationHint(hostname, tenant.slug);

      const [brandingRes, franchiseRes] = await Promise.all([
        supabase
          .from("mt_tenant_branding")
          .select("logo_url, logo_branco_url, cor_primaria")
          .eq("tenant_id", tenant.id)
          .single(),
        supabase
          .from("mt_franchises")
          .select(
            "id, nome, nome_fantasia, slug, endereco, numero, bairro, cidade, estado, cep, telefone, whatsapp, email, horario_funcionamento"
          )
          .eq("tenant_id", tenant.id)
          .eq("is_active", true)
          .not("endereco", "is", null)
          .order("nome"),
      ]);

      if (brandingRes.data) setBranding(brandingRes.data);

      if (franchiseRes.data?.length) {
        const selected = matchFranchiseByLocation(franchiseRes.data, locationHint);
        if (selected) setFranchise(selected as FranchiseInfo);
      }
    };

    load();
  }, [tenant?.id, tenant?.slug]);

  const logoUrl = branding?.logo_url || LOGO_DEFAULT;
  const logoWhiteUrl = branding?.logo_branco_url || null;
  const primaryColor = accentColor || branding?.cor_primaria || COLORS.purple;
  const displayName = tenant.nome_fantasia || tenant.slug;
  const franchiseDisplayName = franchise?.nome_fantasia || franchise?.nome || null;
  const address = franchise ? formatAddress(franchise) : null;
  const horario = franchise ? formatHorario(franchise.horario_funcionamento) : null;
  const whatsappNumber = franchise?.whatsapp || franchise?.telefone || null;

  // Atualiza título da aba e meta tags OG dinamicamente
  // Exemplo: "Viniun Centro | Imóveis"
  const pageTitle = franchiseDisplayName
    ? `${franchiseDisplayName} | ${subtitle}`
    : `${displayName} | ${subtitle}`;

  usePageMeta({
    title: pageTitle,
    description: `${subtitle} - ${franchiseDisplayName || displayName}. ${franchise?.cidade ? `${franchise.cidade} - ${franchise.estado}` : ""}`.trim(),
    image: logoUrl,
    siteName: displayName,
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "Montserrat, sans-serif", background: "#FAFAFA" }}>
      {/* ================================================================ */}
      {/* HEADER – sticky, branco, logo do tenant                          */}
      {/* ================================================================ */}
      {!hideHeader && (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <img src={logoUrl} alt={displayName} className="h-9 md:h-11" />
            <div
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: primaryColor }}
            >
              {subtitleIcon}
              <span className="hidden sm:inline">{subtitle}</span>
            </div>
          </div>
        </header>
      )}

      {/* ================================================================ */}
      {/* MAIN CONTENT                                                      */}
      {/* ================================================================ */}
      <main className="flex-1">{children}</main>

      {/* ================================================================ */}
      {/* FOOTER – escuro, dados da unidade                                */}
      {/* ================================================================ */}
      {!hideFooter && (
      <footer style={{ background: COLORS.gray900 }} className="text-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Coluna 1: Logo + Descrição */}
            <div>
              {logoWhiteUrl ? (
                <img src={logoWhiteUrl} alt={displayName} className="h-10 mb-4" />
              ) : (
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="h-10 mb-4"
                  style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.4))" }}
                />
              )}
              <p className="text-sm leading-relaxed" style={{ color: COLORS.gray400 }}>
                {tenant.nome_fantasia || displayName}
                {franchise?.cidade && ` — ${franchise.cidade}`}
              </p>
            </div>

            {/* Coluna 2: Contato da unidade */}
            <div className="space-y-3">
              <h4 className="font-bold text-lg mb-4">Contato</h4>
              {address && (
                <p className="text-sm flex items-start gap-2" style={{ color: COLORS.gray400 }}>
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: primaryColor }} />
                  {address}
                </p>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-2 hover:text-white transition-colors"
                  style={{ color: COLORS.gray400 }}
                >
                  <Phone className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                  {whatsappNumber}
                </a>
              )}
              {franchise?.email && (
                <a
                  href={`mailto:${franchise.email}`}
                  className="text-sm flex items-center gap-2 hover:text-white transition-colors"
                  style={{ color: COLORS.gray400 }}
                >
                  <Mail className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                  {franchise.email}
                </a>
              )}
              {horario && (
                <p className="text-sm flex items-center gap-2" style={{ color: COLORS.gray400 }}>
                  <Clock className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                  {horario}
                </p>
              )}
            </div>

            {/* Coluna 3: WhatsApp + Social */}
            <div className="space-y-3">
              <h4 className="font-bold text-lg mb-4">Atendimento</h4>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-2 transition-opacity hover:opacity-90 w-fit"
                  style={{ background: COLORS.green, color: "#fff" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Fale pelo WhatsApp
                </a>
              )}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={`https://instagram.com/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                  style={{ color: COLORS.gray500 }}
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div
            className="border-t mt-8 pt-6 text-center text-xs"
            style={{ borderColor: COLORS.gray800, color: COLORS.gray500 }}
          >
            &copy; {new Date().getFullYear()} {displayName}. Todos os direitos reservados.
            {franchise?.cidade && franchise.estado && (
              <span> | {franchise.cidade} - {franchise.estado}</span>
            )}
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
